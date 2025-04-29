"""
API 애플리케이션 모듈

이 모듈은 FastAPI를 사용한 API 애플리케이션 인스턴스를 생성합니다.
"""

import os
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware

from gitmanager.security.rate_limit import RateLimitMiddleware, RateLimiter
from gitmanager.security.rate_limit.config import get_rate_limit_settings
from gitmanager.security.rate_limit.storage import InMemoryStorage, RedisStorage

# 로거 설정
logger = logging.getLogger(__name__)

def get_redis_client():
    """Redis 클라이언트를 반환합니다."""
    try:
        import redis
        return redis.Redis(
            host=os.environ.get("REDIS_HOST", "localhost"),
            port=int(os.environ.get("REDIS_PORT", "6379")),
            db=int(os.environ.get("REDIS_DB", "0")),
            password=os.environ.get("REDIS_PASSWORD", None),
            decode_responses=True
        )
    except ImportError:
        logger.warning("Redis 패키지가 설치되지 않았습니다. 인메모리 스토리지를 사용합니다.")
        return None
    except Exception as e:
        logger.warning(f"Redis 연결 실패: {str(e)}. 인메모리 스토리지를 사용합니다.")
        return None

def create_app() -> FastAPI:
    """
    FastAPI 애플리케이션 인스턴스를 생성합니다.
    
    Returns:
        FastAPI: 설정이 완료된 FastAPI 앱 인스턴스
    """
    # 앱 설정
    app = FastAPI(
        title="Git Manager API",
        description="Git 저장소 관리를 위한 API",
        version="1.0.0"
    )
    
    # CORS 설정
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rate Limiter 설정
    rate_limit_settings = get_rate_limit_settings()
    
    # Redis 사용 여부 결정
    use_redis = os.environ.get("USE_REDIS_RATE_LIMIT", "false").lower() in ("true", "1", "yes")
    
    # 스토리지 설정
    if use_redis:
        redis_client = get_redis_client()
        if redis_client:
            storage = RedisStorage(redis_client=redis_client)
            logger.info("Rate Limiter: Redis 스토리지 사용")
        else:
            storage = InMemoryStorage()
            logger.info("Rate Limiter: Redis 연결 실패, 인메모리 스토리지로 대체")
    else:
        storage = InMemoryStorage()
        logger.info("Rate Limiter: 인메모리 스토리지 사용")
    
    # Rate Limiter 인스턴스 생성
    rate_limiter = RateLimiter(
        storage=storage,
        default_limit=rate_limit_settings.default_limit,
        default_window=rate_limit_settings.default_window,
        admin_limit_multiplier=rate_limit_settings.admin_multiplier
    )
    
    # 사용자 정보 추출 함수
    async def get_username_from_request(request: Request) -> Optional[str]:
        """요청에서 사용자 이름을 추출합니다."""
        if hasattr(request.state, "user"):
            return getattr(request.state.user, "username", None)
        return None
    
    # 미들웨어 추가
    app.add_middleware(
        RateLimitMiddleware,
        rate_limiter=rate_limiter,
        enabled=rate_limit_settings.enabled,
        excluded_paths=rate_limit_settings.excluded_paths,
        admin_paths=["/api/admin", "/admin"],
        get_username_from_request=get_username_from_request
    )
    
    # 라우터 및 디펜던시 등록
    # ...
    
    @app.get("/api/health")
    async def health_check():
        """상태 확인 엔드포인트"""
        return {"status": "ok"}
    
    @app.get("/api/rate-limit-info")
    async def rate_limit_info(request: Request):
        """속도 제한 정보 엔드포인트"""
        return {
            "settings": rate_limit_settings.to_dict(),
            "enabled": rate_limit_settings.enabled
        }
    
    return app

# 앱 인스턴스 생성
app = create_app() 