"""
Main application entry point for the API service.
"""

import logging
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .core.config import settings
from .routers.auth import router as auth_router
from .routers.vehicles import router as vehicles_router
from .routers.maintenance import router as maintenance_router
from .routers.shops import router as shops_router


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

# 라우터 등록
ROUTERS = [
    auth_router,
    vehicles_router,
    maintenance_router,
    shops_router,
]

for router in ROUTERS:
    app.include_router(router)
    logger.info(f"라우터 등록: {router.prefix if hasattr(router, 'prefix') else '/'}")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    요청 유효성 검사 오류 처리
    """
    logger.warning(f"요청 유효성 검사 오류: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": "잘못된 요청 데이터입니다.", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    전역 예외 처리기
    """
    logger.error(f"처리되지 않은 예외: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부 오류가 발생했습니다."},
    )


@app.get("/")
def health_check():
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
async def startup_event():
    """
    애플리케이션 시작 이벤트 핸들러
    """
    logger.info(f"애플리케이션 시작: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info(f"환경: {'개발' if settings.DEBUG else '프로덕션'}")


@app.on_event("shutdown")
async def shutdown_event():
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