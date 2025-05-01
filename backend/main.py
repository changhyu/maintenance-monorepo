# API 리디렉션 라우터 - 여러 버전의 API 경로 일관성 지원
@app.get("/api/admin/auth-status")
async def redirect_admin_auth_status():
    return RedirectResponse(url=f"{settings.API_V1_STR}/admin/auth-status")

@app.post("/api/admin/login")
async def redirect_admin_login(request: Request):
    return RedirectResponse(url=f"{settings.API_V1_STR}/admin/login", status_code=307)  # 307은 POST 요청 유지

@app.post("/api/admin/logout")
async def redirect_admin_logout():
    return RedirectResponse(url=f"{settings.API_V1_STR}/admin/logout", status_code=307)

@app.get("/api/admin/contacts")
async def redirect_admin_contacts(request: Request):
    return RedirectResponse(url=f"{settings.API_V1_STR}/admin/contacts{request.url.query}")

@app.get("/api/users")
async def redirect_users(request: Request):
    return RedirectResponse(url=f"{settings.API_V1_STR}/users{request.url.path}")

@app.get("/api/vehicles")
async def redirect_vehicles(request: Request):
    return RedirectResponse(url=f"{settings.API_V1_STR}/vehicles{request.url.path}")

@app.get("/api/maintenance")
async def redirect_maintenance(request: Request):
    return RedirectResponse(url=f"{settings.API_V1_STR}/maintenance{request.url.path}")
from fastapi import FastAPI, Depends, HTTPException, status, Body, Query, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging
from datetime import timedelta, datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any, Union, Annotated, TypeVar, cast
import os
import importlib
from fastapi.responses import JSONResponse, RedirectResponse
import sqlalchemy.exc
from fastapi.middleware.gzip import GZipMiddleware
import traceback
import asyncio
from sqlalchemy import text  # 상단에 import 추가

# 절대 경로 임포트로 수정
from backend.db.session import get_db, engine, close_db_connection
from backend.models.user import User
from backend.models.role import Role
from backend.models.permission import Permission
from backend.core.auth import get_current_active_user, permission_required, has_permission, create_access_token
from backend.core.config import settings, validate_environment_variables
from backend.core.logging import setup_logging, LoggingMiddleware, setup_query_logging
from backend.core.version import APIVersionManager, version_middleware
from pydantic import BaseModel, EmailStr, Field, ConfigDict, ValidationError
from backend.api.v1.api import api_router
from backend.api.v1.endpoints.system import router as system_router
from backend.api.v1.endpoints.logs import router as logs_router
# 통합된 Git API 라우터
from backend.api.v1.endpoints.git_unified import router as git_unified_router
# 차량 정비 API 라우터
from backend.api.v1.endpoints.maintenance import router as maintenance_router
# 렌터카 업체 라우터 추가
from backend.routes.rental_company import router as rental_company_router
from backend.db.init_db import init_db
from backend.core.exceptions import (
    BaseAPIException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    DatabaseException,
    ConfigurationException
)
# 백그라운드 작업 라우터
from backend.api.v1.endpoints.tasks import router as tasks_router
# 캐시 시스템
from backend.core.cache import initialize_cache, get_cache_status
# 알림 라우터
from backend.api.v1.endpoints.notifications import router as notifications_router

from backend.routers import maintenance
from backend.error_handlers import (
    maintenance_exception_handler,
    sqlalchemy_error_handler,
    validation_error_handler,
    permission_error_handler,
    status_error_handler,
    date_error_handler
)
from backend.exceptions import (
    MaintenanceException,
    MaintenanceValidationError,
    MaintenancePermissionError,
    MaintenanceStatusError,
    MaintenanceDateError
)
from sqlalchemy.exc import SQLAlchemyError
from backend.middleware.logging import LoggingMiddleware
from backend.middleware.security import SecurityMiddleware, RateLimitMiddleware
from backend.middleware.performance import CacheMiddleware, CompressionMiddleware, QueryOptimizationMiddleware

# 로그 시스템 설정
logger = setup_logging()
if settings.SQL_QUERY_LOGGING:
    setup_query_logging(engine)

# 환경 변수 유효성 검사
try:
    validate_environment_variables()
except ValidationError as e:
    logger.critical(f"환경 변수 검증 실패: {str(e)}")
    raise ConfigurationException("서버 구성 오류: 환경 변수가 올바르지 않습니다") from e

# 보안 설정
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": getattr(settings, "CONTENT_SECURITY_POLICY", "default-src 'self'"),
    "Referrer-Policy": "strict-origin-when-cross-origin"
}

# 성능 모니터링을 위한 전역 변수
performance_metrics = {
    "total_requests": 0,
    "status_codes": {},
    "avg_response_time": 0,
    "total_response_time": 0
}

# 타입 변수로 비동기 함수 결과 타입 정의
T = TypeVar('T')

# 안전한 비동기 실행 래퍼 함수
async def safe_async_call(func, *args, **kwargs) -> Union[T, None]:
    """
    비동기 함수를 안전하게 실행하는 래퍼 함수
    
    Args:
        func: 실행할 비동기 함수
        *args: 함수에 전달할 위치 인자
        **kwargs: 함수에 전달할 키워드 인자
        
    Returns:
        Union[T, None]: 함수 실행 결과 또는 None(오류 발생 시)
    """
    try:
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            # 동기 함수인 경우 비동기 스레드로 실행
            return await asyncio.to_thread(func, *args, **kwargs)
    except Exception as e:
        logger.error(f"비동기 함수 실행 중 오류 발생: {func.__name__} - {str(e)}")
        if settings.DEBUG:
            logger.error(traceback.format_exc())
        return None

# lifespan 컨텍스트 매니저 설정
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시
    logger.info("서버 초기화 중...")
    startup_tasks = []
    
    # 캐시 시스템 초기화
    try:
        await initialize_cache()
        logger.info("캐시 시스템 초기화 완료")
    except Exception as e:
        logger.error(f"캐시 시스템 초기화 실패: {str(e)}")
    
    # 데이터베이스 초기화
    try:
        await init_db()
        logger.info("데이터베이스 초기화 완료")
    except Exception as e:
        logger.error(f"데이터베이스 초기화 실패: {str(e)}")
    
    # 다른 시작 시 초기화 작업이 필요하면 여기에 추가
    
    yield
    
    # 애플리케이션 종료 시
    logger.info("서버 종료 중...")
    
    # 데이터베이스 연결 정리
    try:
        await close_db_connection()
        logger.info("데이터베이스 연결 종료 완료")
    except Exception as e:
        logger.error(f"데이터베이스 연결 종료 실패: {str(e)}")
    
    # 캐시 연결 정리 (필요한 경우)
    
    # 다른 정리 작업이 필요하면 여기에 추가

# OpenAPI 스키마 사용자 정의를 위해 docs_url과 redoc_url을 None으로 설정하고 직접 등록
app = FastAPI(
    title=settings.PROJECT_NAME, 
    description="""
    # 통합 관리 API

    이 API는 사용자, 역할, 권한, Git 저장소 및 차량 정비 관리 기능을 제공합니다.
    
    ## 주요 기능
    
    * **사용자 관리**: 생성, 조회, 수정, 삭제
    * **역할 관리**: 역할 목록 조회
    * **권한 체크**: 특정 사용자의 권한 확인
    * **시스템 설정**: 관리자만 접근 가능한 시스템 설정
    * **Git 관리**: 저장소 상태 및 커밋 이력 관리
    * **차량 정비**: 차량 및 정비 기록 관리
    
    ## 인증 방식
    
    모든 보호된 API는 JWT 기반의 Bearer 인증을 사용합니다. 토큰은 `/token` 엔드포인트에서 발급받을 수 있습니다.
    
    ```
    curl -X POST "http://localhost:8000/token" -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin&password=password"
    ```
    
    ## API 버전 관리
    
    API는 URI 경로에 버전 정보를 포함합니다 (예: `/api/v1/users`). 현재는 v1만 지원됩니다.
    향후 새로운 버전이 추가될 경우 각 버전은 별도의 엔드포인트로 제공됩니다.
    
    ## 에러 응답 형식
    
    API 에러는 다음과 같은 형식으로 반환됩니다:
    ```json
    {
      "detail": "에러 메시지"
    }
    ```
    
    HTTP 상태 코드는 에러 유형에 따라 적절히 설정됩니다.
    """,
    version=settings.API_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json", 
    docs_url=None,  # 기본 swagger UI 비활성화
    redoc_url=None,  # 기본 redoc UI 비활성화
    debug=(settings.LOG_LEVEL.upper() == "DEBUG"),
    lifespan=lifespan,
    contact={
        "name": "Development Team",
        "email": "dev@example.com",
        "url": "https://github.com/example/maintenance-monorepo"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    terms_of_service="http://example.com/terms/",
)

# 로깅 미들웨어 추가
app.add_middleware(LoggingMiddleware)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# 성능 모니터링 미들웨어
@app.middleware("http")
async def performance_monitoring_middleware(request: Request, call_next):
    """성능을 모니터링하고 메트릭을 수집하는 미들웨어"""
    global performance_metrics
    
    start_time = datetime.now()
    
    # 요청 처리
    response = await call_next(request)
    
    # 메트릭 수집
    process_time = (datetime.now() - start_time).total_seconds()
    performance_metrics["total_requests"] += 1
    performance_metrics["total_response_time"] += process_time
    performance_metrics["avg_response_time"] = (
        performance_metrics["total_response_time"] / performance_metrics["total_requests"]
    )
    
    # 상태 코드 집계
    status_code = str(response.status_code)
    performance_metrics["status_codes"][status_code] = (
        performance_metrics["status_codes"].get(status_code, 0) + 1
    )
    
    # 응답에 성능 메트릭 헤더 추가 (개발/테스트 환경에서만)
    if settings.DEBUG or settings.TESTING:
        response.headers["X-Process-Time"] = str(process_time)
    
    return response

# 보안 헤더 설정
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """보안 헤더를 응답에 추가하는 미들웨어"""
    response = await call_next(request)
    
    # 환경별로 다른 보안 정책 적용
    if settings.get_environment() == "production":
        # 모든 보안 헤더 적용
        for header_name, header_value in SECURITY_HEADERS.items():
            response.headers[header_name] = header_value
    else:
        # 개발/테스트 환경에서는 일부 헤더만 적용
        for header_name, header_value in SECURITY_HEADERS.items():
            if header_name != "Content-Security-Policy":  # CSP는 개발 모드에서 문제 발생 가능
                response.headers[header_name] = header_value
    
    return response

# API 버전 관리자 초기화
version_manager = APIVersionManager(app)

# 버전 미들웨어를 추가하기 위한 미들웨어 함수
@app.middleware("http")
async def api_version_middleware(request: Request, call_next):
    """API 버전 정보를 응답 헤더에 추가하는 미들웨어"""
    # 요청 처리
    response = await call_next(request)
    
    # API 버전을 요청에서 추출
    path = request.url.path
    parts = path.strip('/').split('/')
    api_version = ""
    
    # API 경로에서 버전 추출 (예: /api/v1/users -> v1)
    if len(parts) >= 2 and parts[0] == "api" and parts[1].startswith("v"):
        api_version = parts[1]
    
    # 응답 헤더에 API 버전 정보 추가
    if api_version:
        response.headers["X-API-Version"] = settings.API_VERSION
        response.headers["X-API-Version-Date"] = settings.API_VERSION_DATE
    
    return response

# 테스트 모드 설정 - 테스트 환경에서 필요한 특수 설정
if settings.TESTING:
    logger.info("테스트 모드로 실행 중")
    # 테스트 환경 특화 설정 추가

# 라우터 등록 전 함수 - 라우터가 적절히 초기화되었는지 검증
def validate_router(router, router_name):
    """라우터 유효성 검사 및 경로 중복 확인"""
    # 구현 필요 - 라우터 검증 로직
    return True

# 커스텀 OpenAPI 스키마 생성
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
        terms_of_service=app.terms_of_service,
        contact=app.contact,
        license_info=app.license_info,
    )
    
    # 서버 정보 추가
    openapi_schema["servers"] = [
        {"url": f"http://localhost:{settings.PORT}", "description": "개발 서버"},
        {"url": "https://api.example.com", "description": "운영 서버"}
    ]
    
    # 보안 스키마 추가
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT 인증 토큰을 입력하세요. 'Bearer' 프리픽스는 자동으로 추가됩니다.",
        }
    }
    
    # 공통 응답 스키마 정의
    openapi_schema["components"]["schemas"].update({
        "SuccessResponse": {
            "type": "object",
            "properties": {
                "success": {"type": "boolean", "example": True},
                "message": {"type": "string", "example": "작업이 성공적으로 완료되었습니다."},
                "data": {"type": "object"}
            }
        },
        "ErrorResponse": {
            "type": "object",
            "properties": {
                "detail": {"type": "string", "example": "요청한 리소스를 찾을 수 없습니다."}
            }
        },
        "ValidationErrorResponse": {
            "type": "object",
            "properties": {
                "detail": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "loc": {"type": "array", "items": {"type": "string"}},
                            "msg": {"type": "string"},
                            "type": {"type": "string"}
                        }
                    }
                }
            }
        }
    })
    
    # 태그 설명 추가
    openapi_schema["tags"] = [
        {"name": "사용자", "description": "사용자 관리 엔드포인트"},
        {"name": "인증", "description": "인증 관련 엔드포인트"},
        {"name": "역할", "description": "역할 관리 엔드포인트"},
        {"name": "권한", "description": "권한 관리 엔드포인트"},
        {"name": "Git 관리", "description": "Git 저장소 관리 엔드포인트"},
        {"name": "차량 정비", "description": "차량 및 정비 기록 관리 엔드포인트"},
        {"name": "시스템", "description": "시스템 설정 및 관리 엔드포인트"},
        {"name": "로그", "description": "로그 조회 및 관리 엔드포인트"}
    ]
    
    # 모든 경로에 보안 요구사항 및 응답 설명 추가
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            # 보안 요구사항 추가
            if openapi_schema["paths"][path][method].get("security") is None:
                # health 체크와 같은 공개 엔드포인트는 제외
                if not (path.endswith("/health") or path.endswith("/token") or path.endswith("/docs") or path.endswith("/redoc")):
                    openapi_schema["paths"][path][method]["security"] = [{"Bearer": []}]
            
            # 응답 설명 추가
            if "responses" in openapi_schema["paths"][path][method]:
                responses = openapi_schema["paths"][path][method]["responses"]
                
                # 성공 응답에 설명 추가
                if "200" in responses or "201" in responses:
                    success_code = "200" if "200" in responses else "201"
                    if "description" not in responses[success_code]:
                        responses[success_code]["description"] = "작업이 성공적으로 완료되었습니다."
                
                # 인증 오류 응답 추가
                if not path.endswith("/health") and not path.endswith("/token"):
                    responses["401"] = {
                        "description": "인증 실패 또는 인증 토큰 만료",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                
                # 유효성 검사 오류 응답 추가
                if method in ["post", "put", "patch"]:
                    responses["422"] = {
                        "description": "유효성 검사 실패",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ValidationErrorResponse"
                                }
                            }
                        }
                    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# 사용자 정의 OpenAPI 스키마 등록
app.openapi = custom_openapi

# 사용자 정의 Swagger UI 경로
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="/favicon.ico",
    )

# 사용자 정의 ReDoc 경로
@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
        redoc_favicon_url="/favicon.ico",
    )

# 라우터 등록
from backend.api.v1.endpoints import (
    root_router,
    auth_router,
    users_router,
    roles_router,
    permissions_router,
    settings_router,
    admin_router,
)

# 기본 라우터 등록
app.include_router(root_router)
app.include_router(auth_router)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(roles_router)
app.include_router(permissions_router, prefix=settings.API_V1_STR)
app.include_router(settings_router)

# 통합된 Git API 라우터 등록
app.include_router(git_unified_router, prefix=settings.API_V1_STR)

# 차량 정비 API 라우터 등록
app.include_router(maintenance_router, prefix=settings.API_V1_STR)

# 시스템 및 로그 라우터 등록
app.include_router(system_router, prefix=settings.API_V1_STR)
app.include_router(logs_router, prefix=settings.API_V1_STR)

# 백그라운드 작업 라우터 등록
app.include_router(tasks_router, prefix=settings.API_V1_STR)

# 알림 라우터 등록
app.include_router(notifications_router, prefix=settings.API_V1_STR)

# 렌터카 업체 라우터 등록
app.include_router(rental_company_router, prefix=f"{settings.API_V1_STR}/rental", tags=["렌터카 관리"])

# 관리자 API 라우터 등록
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["관리자"])

# API 버전 정보 조회 엔드포인트
@app.get("/api/versions", 
         summary="API 버전 목록 조회", 
         description="지원되는 모든 API 버전 목록을 조회합니다.",
         response_description="API 버전 목록",
         tags=["API 버전"])
async def get_api_versions():
    """
    지원되는 모든 API 버전 목록을 반환합니다.
    """
    return {
        "versions": version_manager.get_all_versions(),
        "active_versions": version_manager.get_active_versions(),
        "deprecated_versions": version_manager.get_deprecated_versions(),
        "latest_version": version_manager.get_latest_version()
    }

@app.get("/api/versions/{version_name}", 
         summary="특정 API 버전 정보 조회",
         description="특정 API 버전에 대한 상세 정보를 조회합니다.",
         response_description="API 버전 상세 정보",
         tags=["API 버전"])
async def get_api_version_info(version_name: str):
    """
    특정 API 버전에 대한 상세 정보를 반환합니다.
    
    Args:
        version_name: API 버전 이름 (예: "v1")
    """
    version_info = version_manager.get_version_info(version_name)
    if not version_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API 버전 {version_name}을(를) 찾을 수 없습니다."
        )
    
    try:
        recommended_usage_period = getattr(importlib.import_module(f"backend.api.{version_name}"), "RECOMMENDED_USAGE_PERIOD", None)
    except ImportError as e:
        logger.warning(f"버전 모듈 로드 오류: {str(e)}")
        recommended_usage_period = None
    
    return {
        "version": version_name,
        "info": version_info,
        "supported": version_manager.is_version_supported(version_name),
        "recommended_usage_period": recommended_usage_period
    }

@app.exception_handler(BaseAPIException)
async def api_exception_handler(request: Request, exc: BaseAPIException):
    """
    사용자 정의 API 예외 핸들러
    """
    logger.warning(f"API 예외 발생: {exc.detail} (코드: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    모든 처리되지 않은 예외에 대한 전역 핸들러
    """
    logger.error(f"전역 예외 발생: {str(exc)}", exc_info=True)
    
    # 스택 트레이스 로깅 (개발 환경에서만)
    if settings.DEBUG:
        logger.debug(f"스택 트레이스: {traceback.format_exc()}")
    
    # 데이터베이스 예외
    if isinstance(exc, sqlalchemy.exc.SQLAlchemyError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "데이터베이스 오류가 발생했습니다"}
        )
    
    # 기본 응답
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "서버 내부 오류가 발생했습니다"}
    )

# 헬스 체크 엔드포인트
@app.get("/health", 
         summary="API 서버 상태 확인", 
         description="API 서버의 상태를 확인합니다. 데이터베이스 연결 상태 등 기본적인 건강 상태 정보를 제공합니다.",
         response_description="API 서버가 정상 작동 중입니다.",
         tags=["시스템"])
async def health_check():
    """서버 상태 확인 엔드포인트"""
    try:
        # 데이터베이스 연결 테스트
        db = next(get_db())
        db.execute(text("SELECT 1"))  # text() 함수로 감싸기
        db_status = "connected"
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {str(e)}")
        db_status = "disconnected"
    
    # 캐시 상태 확인
    cache_status = get_cache_status()
    
    # 시스템 정보 반환
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.get_environment(),
        "database": db_status,
        "cache": cache_status,
        "version": settings.API_VERSION,
        "uptime": "unknown"  # 서버 업타임 정보 추가 필요
    }

# 성능 메트릭 엔드포인트 (관리자 전용)
@app.get("/api/v1/metrics", 
     summary="API 성능 메트릭 확인", 
     description="API 서버의 성능 메트릭을 제공합니다. 관리자 권한이 필요합니다.",
     response_description="성능 메트릭 정보",
     tags=["관리자"])
async def get_performance_metrics(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """서버 성능 메트릭 엔드포인트"""
    # 권한 확인
    if not await has_permission(current_user, "admin:metrics:read"):
        raise ForbiddenException("이 작업을 수행할 권한이 없습니다")
    
    return {
        "performance": performance_metrics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# API 정보 엔드포인트
@app.get("/api/v1", 
     summary="API 정보 확인",
     description="현재 API 버전 및 기본 정보를 제공합니다.",
     response_description="API 이름, 버전 및 환경 정보",
     tags=["시스템"])
async def api_info():
    """API 기본 정보 엔드포인트"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.API_VERSION,
        "version_date": settings.API_VERSION_DATE,
        "environment": settings.get_environment(),
        "documentation": f"{settings.BASE_URL}/docs",
    }

# 압축 미들웨어 추가
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 예외 핸들러 등록
app.add_exception_handler(MaintenanceException, maintenance_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(MaintenanceValidationError, validation_error_handler)
app.add_exception_handler(MaintenancePermissionError, permission_error_handler)
app.add_exception_handler(MaintenanceStatusError, status_error_handler)
app.add_exception_handler(MaintenanceDateError, date_error_handler)

# 보안 미들웨어
app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware)

# 성능 최적화 미들웨어
app.add_middleware(CacheMiddleware, ttl=300)  # 5분 캐시
app.add_middleware(CompressionMiddleware, minimum_size=1000)
app.add_middleware(QueryOptimizationMiddleware)

# 서버 실행 (개발 환경용)
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", settings.SERVER_PORT or 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting server on {host}:{port}")
    logger.info(f"Environment: {settings.get_environment()}")
    logger.info(f"API Versions: {', '.join(version_manager.get_all_versions().keys())}")
    logger.info(f"Start time: {datetime.now(timezone.utc).isoformat()}")
    
    uvicorn.run(
        "backend.main:app", 
        host=host, 
        port=port,
        reload=True
    )