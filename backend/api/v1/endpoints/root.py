from fastapi import APIRouter, Request
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from backend.core.config import settings

router = APIRouter()

@router.get("/", summary="API 루트 엔드포인트", tags=["기본"])
async def root():
    return {"message": "Welcome to FastAPI Permission Management API", "docs": "/docs"}

@router.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        title=f"{settings.PROJECT_NAME} - Swagger UI",
        oauth2_redirect_url=None,
    )

@router.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    return get_redoc_html(
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        title=f"{settings.PROJECT_NAME} - ReDoc",
    )

@router.get("/openapi.json", include_in_schema=False)
async def openapi():
    return get_openapi(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="API Documentation",
        routes=router.routes,
    ) 