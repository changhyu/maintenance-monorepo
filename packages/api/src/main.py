"""
Main application entry point for the API service.
"""
import logging
import os
import sys
from typing import Any, Dict
from datetime import datetime, timezone

# 현재 디렉토리를 파이썬 시스템 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from fastapi import FastAPI, Request, APIRouter, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

# 내부 모듈 import
from .core.config import settings
from .core.exceptions import setup_exception_handlers
from .core.metrics import init_metrics
from .core.versioning import setup_versioning, ApiVersion
from .core.rate_limiter import RateLimiter
from .core.documentation import setup_api_documentation
from .core.monitoring.middleware import MonitoringMiddleware
from .core.monitoring.metrics import metrics_collector
from .core.logging_setup import setup_logging
from .core.router_loader import import_router, load_routers
from .core.cache import setup_cache, CacheSettings, CacheBackendType
from .core.cache_manager import CacheManager
from .core.security import SecurityMiddleware
from .core.websocket_manager import WebSocketManager
from .core.background_tasks import start_background_tasks, cancel_background_tasks
from .core.metrics_collector import initialize_metrics
from .core.cache_optimizer import initialize_cache_optimizer
from .core.middleware import setup_middlewares
from .core.lifespan import configure_lifespan
from .core.env_validator import validate_env_variables

# 로깅 설정 적용
logger = setup_logging()
logger.info("로깅 시스템이 초기화되었습니다")

def create_app() -> FastAPI:
    """
    FastAPI 애플리케이션 생성 및 설정
    """
    # FastAPI 앱 인스턴스 생성
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        docs_url="/docs" if settings.SHOW_DOCS else None,
        redoc_url="/redoc" if settings.SHOW_DOCS else None,
        lifespan=configure_lifespan()
    )
    
    # API 문서 설정
    setup_api_documentation(app)
    
    # 버전 관리 설정
    setup_versioning(app)
    
    # 미들웨어 설정
    setup_middlewares(app)
    
    # 예외 핸들러 설정
    setup_exception_handlers(app)
    
    # 라우터 로드
    routers = load_routers()
    for router in routers:
        app.include_router(router)
    
    # 메트릭 엔드포인트 추가
    try:
        from .core import test_metrics
        app.include_router(test_metrics.router)
    except ImportError:
        logger.warning("메트릭 라우터를 로드할 수 없습니다.")
    
    # 정상 작동 확인용 엔드포인트
    @app.get("/", tags=["상태"])
    @app.get("/health", tags=["상태"])
    async def health_check() -> Dict[str, Any]:
        """
        서비스 상태 확인 엔드포인트
        """
        return {
            "status": "active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT
        }
    
    # WebSocket 엔드포인트
    websocket_manager = WebSocketManager()
    
    @app.websocket("/ws/{client_id}")
    async def websocket_endpoint(websocket: WebSocket, client_id: str):
        await websocket_manager.connect(websocket, client_id)
        try:
            while True:
                data = await websocket.receive_text()
                await websocket_manager.process_message(client_id, data)
        except WebSocketDisconnect:
            websocket_manager.disconnect(client_id)
    
    return app

# FastAPI 애플리케이션 생성
app = create_app()

# 직접 실행될 경우 개발 서버 시작
if __name__ == "__main__":
    import uvicorn
    
    try:
        # 필수 환경 변수 검증
        validate_env_variables()
        
        # 환경 변수나 설정에서 포트 가져오기
        port = int(os.getenv("PORT", settings.PORT if hasattr(settings, "PORT") else 8000))
        
        # 로거에 기록
        logger.info(f"API 서버 시작: 포트 {port}, 디버그 모드: {settings.DEBUG}, 환경: {settings.ENVIRONMENT}")
        
        # 서버 설정
        uvicorn_config = {
            "app": "src.main:app",  # 절대 경로로 수정
            "host": "0.0.0.0",
            "port": port,
            "reload": settings.DEBUG,
            "log_level": "info" if not settings.DEBUG else "debug",
            "workers": settings.WORKERS if hasattr(settings, "WORKERS") else 1,
            "timeout_keep_alive": 120,  # 연결 유지 타임아웃 설정
            "access_log": True
        }
        
        # 서버 실행
        logger.info("API 서버를 시작합니다...")
        uvicorn.run(**uvicorn_config)
    except (ImportError, ModuleNotFoundError) as e:
        logger.error(f"서버 시작 중 모듈 오류 발생: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"서버 시작 중 예상치 못한 오류 발생: {str(e)}")
        raise