"""
Main application entry point for the API service.
"""

import logging
import os
import sys
from typing import Any, Dict

# 현재 디렉토리를 파이썬 시스템 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from fastapi import FastAPI, Request, APIRouter
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .core.config import settings
from .routers import api_router
from .core.exceptions import setup_exception_handlers
from core.metrics import init_metrics
from routes import test_metrics

# 라우터 임포트를 try-except로 보호
try:
    from .routers.auth import router as auth_router
except ImportError:
    auth_router = APIRouter()
    logging.warning("auth_router를 임포트할 수 없습니다.")

try:
    from .routers.vehicles import router as vehicles_router
except ImportError:
    vehicles_router = APIRouter()
    logging.warning("vehicles_router를 임포트할 수 없습니다.")

try:
    from .routers.maintenance import router as maintenance_router
except ImportError:
    maintenance_router = APIRouter()
    logging.warning("maintenance_router를 임포트할 수 없습니다.")

try:
    from .routers.shops import router as shops_router
except ImportError:
    shops_router = APIRouter()
    logging.warning("shops_router를 임포트할 수 없습니다.")

try:
    from .routers.todos import router as todos_router
    logging.info("Todo 라우터가 성공적으로 로드되었습니다.")
except ImportError as e:
    todos_router = APIRouter(prefix="/todos", tags=["todos"])
    logging.error(f"Todo 라우터 로드 실패: {str(e)} - API 기능이 제한됩니다.")
    
    @todos_router.get("/")
    async def todo_import_error():
        """Todo 모듈 로드 실패 시 에러 메시지 반환"""
        return {"error": "Todo 모듈 로드 실패", "message": "시스템 관리자에게 문의하세요."}

# 로깅 설정
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# FastAPI 애플리케이션 생성
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.PROJECT_VERSION,
    docs_url="/docs" if settings.DEBUG else None,  # 개발 환경에서만 Swagger UI 노출
    redoc_url="/redoc" if settings.DEBUG else None,  # 개발 환경에서만 ReDoc 노출
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router)
logger.info("API 라우터가 등록되었습니다")

# 통합 예외 처리 핸들러 설정
setup_exception_handlers(app)
logger.info("통합 예외 처리 핸들러가 설정되었습니다")

# 메트릭 시스템 초기화
app = init_metrics(app)

# 테스트 라우터 등록
app.include_router(test_metrics.router)

@app.get("/")
def health_check() -> Dict[str, Any]:
    """
    상태 확인 엔드포인트
    """
    logger.debug("상태 확인 요청 처리")
    return {
        "status": "ok",
        "message": "Vehicle Maintenance API is running",
        "version": settings.PROJECT_VERSION
    }


@app.on_event("startup")
async def startup_event() -> None:
    """
    애플리케이션 시작 이벤트 핸들러
    """
    logger.info(f"애플리케이션 시작: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info(f"환경: {'개발' if settings.DEBUG else '프로덕션'}")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """
    애플리케이션 종료 이벤트 핸들러
    """
    logger.info("애플리케이션 종료")


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )