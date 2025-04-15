"""
애플리케이션 생명주기 관리 모듈
"""
import logging
from contextlib import asynccontextmanager
from prometheus_client import start_http_server
from fastapi import FastAPI

from .config import settings
from .cache import setup_cache, CacheSettings, CacheBackendType
from .background_tasks import start_background_tasks, cancel_background_tasks
from .metrics_collector import initialize_metrics
from .cache_optimizer import initialize_cache_optimizer
from .logging_setup import setup_logging

# 로깅 설정
logger = logging.getLogger(__name__)

# 글로벌 상태 관리
_cache_manager = None
_background_tasks = set()

def configure_lifespan():
    """
    FastAPI 애플리케이션 생명주기 관리 함수를 반환합니다.
    """
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """
        FastAPI 애플리케이션 생명주기 관리
        시작 시 필요한 리소스를 초기화하고 종료 시 정리합니다.
        """
        # 시작 시 실행할 코드
        logger.info("애플리케이션을 시작합니다...")
        
        # 캐시 설정 초기화
        global _cache_manager
        cache_settings = CacheSettings(
            backend_type=CacheBackendType.MEMORY if settings.CACHE_BACKEND == "memory" else CacheBackendType.REDIS,
            redis_url=settings.REDIS_URL if settings.CACHE_BACKEND == "redis" else None,
            default_ttl=settings.CACHE_DEFAULT_TTL
        )
        _cache_manager = await setup_cache(cache_settings)
        logger.info(f"캐시 시스템 초기화 완료: {settings.CACHE_BACKEND}")
        
        # 백그라운드 태스크 시작
        global _background_tasks
        tasks = await start_background_tasks(app)
        _background_tasks.update(tasks)
        logger.info(f"{len(_background_tasks)}개의 백그라운드 태스크가 시작되었습니다")
        
        # 메트릭 서버 시작 (별도 포트)
        if settings.METRICS_ENABLED:
            try:
                start_http_server(settings.METRICS_PORT)
                logger.info(f"메트릭 서버 시작됨 (포트: {settings.METRICS_PORT})")
            except Exception as e:
                logger.error(f"메트릭 서버 시작 실패: {str(e)}")
        
        # 메트릭 수집기 초기화
        await initialize_metrics()
        
        # 캐시 최적화 시스템 초기화
        await initialize_cache_optimizer()
        
        logger.info("API 시작 완료")
        
        yield
        
        # 종료 시 실행할 코드
        logger.info("애플리케이션을 종료합니다...")
        
        # 백그라운드 태스크 취소
        await cancel_background_tasks(_background_tasks)
        logger.info("모든 백그라운드 태스크가 취소되었습니다")
        
        # 캐시 연결 종료
        if _cache_manager:
            await _cache_manager.close()
            logger.info("캐시 연결이 종료되었습니다")
        
        logger.info("애플리케이션이 정상적으로 종료되었습니다")
    
    return lifespan

def get_cache_manager():
    """
    현재 활성화된 캐시 매니저를 반환합니다.
    """
    return _cache_manager 