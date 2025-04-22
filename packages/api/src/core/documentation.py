"""
API 문서화 모듈

API 문서화를 향상시키는 도구와 유틸리티를 제공합니다.
"""

from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from fastapi import FastAPI
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse

from packages.api.src.coreconfig import settings
from packages.api.src.corelogger import logger
from packages.api.src.coreversioning import ApiVersion

# API 문서화 상수
DOCS_URL = "/docs"
REDOC_URL = "/redoc"
APPLICATION_JSON = "application/json"
HTTP_ERROR_SCHEMA = "#/components/schemas/HTTPError"


class DocType(str, Enum):
    """문서 유형 열거형"""

    SWAGGER = "swagger"
    REDOC = "redoc"


class APIDocumentation:
    """
    API 문서화 향상 클래스

    OpenAPI 스키마 및 문서 커스터마이징을 제공합니다.
    """

    def __init__(self, app: FastAPI):
        """
        API 문서화 초기화

        Args:
            app: FastAPI 애플리케이션 인스턴스
        """
        self.app = app

    def setup_documentation(
        self,
        title: Optional[str] = None,
        description: Optional[str] = None,
        version: Optional[str] = None,
        docs_url: Optional[str] = None,
        redoc_url: Optional[str] = None,
        openapi_url: Optional[str] = None,
        swagger_js_url: Optional[str] = None,
        redoc_js_url: Optional[str] = None,
        swagger_favicon_url: Optional[str] = None,
        redoc_favicon_url: Optional[str] = None,
    ) -> None:
        """
        문서화 설정 적용

        Args:
            title: API 제목
            description: API 설명
            version: API 버전
            docs_url: Swagger UI URL
            redoc_url: ReDoc URL
            openapi_url: OpenAPI 스키마 URL
            swagger_js_url: Swagger UI JS URL
            redoc_js_url: ReDoc JS URL
            swagger_favicon_url: Swagger UI 파비콘 URL
            redoc_favicon_url: ReDoc 파비콘 URL
        """

        # 사용자 지정 OpenAPI 스키마 설정
        def custom_openapi():
            if self.app.openapi_schema:
                return self.app.openapi_schema

            # 기본 스키마 생성
            openapi_schema = get_openapi(
                title=title or self.app.title,
                description=description or self.app.description,
                version=version or self.app.version,
                routes=self.app.routes,
            )

            # 기본 응답 스키마 추가
            self._add_common_responses(openapi_schema)

            # 버전 정보 추가
            self._add_version_info(openapi_schema)

            # 보안 정의 추가
            self._add_security_schemes(openapi_schema)

            # 스키마 저장
            self.app.openapi_schema = openapi_schema
            return self.app.openapi_schema

        # OpenAPI 스키마 설정
        self.app.openapi = custom_openapi

        # 문서 URL 설정 (필요한 경우)
        if docs_url is not None:
            self._setup_custom_swagger(
                docs_url,
                swagger_js_url=swagger_js_url,
                favicon_url=swagger_favicon_url,
                openapi_url=openapi_url,
            )

        if redoc_url is not None:
            self._setup_custom_redoc(
                redoc_url,
                redoc_js_url=redoc_js_url,
                favicon_url=redoc_favicon_url,
                openapi_url=openapi_url,
            )

        logger.info("API 문서화 설정이 완료되었습니다")

    def add_documentation_metadata(
        self,
        contact: Optional[Dict[str, str]] = None,
        license_info: Optional[Dict[str, str]] = None,
        terms_of_service: Optional[str] = None,
        tags_metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """
        문서 메타데이터 추가

        Args:
            contact: 연락처 정보
            license_info: 라이선스 정보
            terms_of_service: 서비스 약관 URL
            tags_metadata: 태그 메타데이터
        """
        # 이미 정의된 OpenAPI 함수가 있는지 확인
        original_openapi = self.app.openapi

        def custom_openapi():
            # 기존 스키마 가져오기
            openapi_schema = original_openapi()

            # 메타데이터 추가
            info = openapi_schema.get("info", {})

            if contact:
                info["contact"] = contact

            if license_info:
                info["license"] = license_info

            if terms_of_service:
                info["termsOfService"] = terms_of_service

            openapi_schema["info"] = info

            # 태그 메타데이터 추가
            if tags_metadata:
                openapi_schema["tags"] = tags_metadata

            return openapi_schema

        # 새 OpenAPI 함수 설정
        self.app.openapi = custom_openapi

    def _add_common_responses(self, openapi_schema: Dict[str, Any]) -> None:
        """
        공통 응답 스키마 추가

        Args:
            openapi_schema: OpenAPI 스키마
        """
        # 모든 경로에 공통 오류 응답 추가
        paths = openapi_schema.get("paths", {})

        for path in paths.values():
            for method in path.values():
                responses = method.get("responses", {})

                # 401 응답
                if "401" not in responses:
                    responses["401"] = {
                        "description": "Unauthorized - 인증이 필요합니다",
                        "content": {
                            APPLICATION_JSON: {"schema": {"$ref": HTTP_ERROR_SCHEMA}}
                        },
                    }

                # 403 응답
                if "403" not in responses:
                    responses["403"] = {
                        "description": "Forbidden - 권한이 없습니다",
                        "content": {
                            APPLICATION_JSON: {"schema": {"$ref": HTTP_ERROR_SCHEMA}}
                        },
                    }

                # 500 응답
                if "500" not in responses:
                    responses["500"] = {
                        "description": "Internal Server Error - 서버 오류가 발생했습니다",
                        "content": {
                            APPLICATION_JSON: {"schema": {"$ref": HTTP_ERROR_SCHEMA}}
                        },
                    }

                method["responses"] = responses

        # 공통 스키마 추가
        if "components" not in openapi_schema:
            openapi_schema["components"] = {}

        if "schemas" not in openapi_schema["components"]:
            openapi_schema["components"]["schemas"] = {}

        # 오류 응답 스키마
        openapi_schema["components"]["schemas"][HTTP_ERROR_SCHEMA] = {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "error"},
                "code": {"type": "integer", "example": 401},
                "error_code": {"type": "string", "example": "UNAUTHORIZED"},
                "message": {"type": "string", "example": "인증이 필요합니다"},
                "details": {"type": "object"},
                "error_id": {
                    "type": "string",
                    "example": "550e8400-e29b-41d4-a716-446655440000",
                },
                "timestamp": {"type": "string", "format": "date-time"},
            },
        }

    def _add_version_info(self, openapi_schema: Dict[str, Any]) -> None:
        """
        버전 정보 추가

        Args:
            openapi_schema: OpenAPI 스키마
        """
        # 버전 정보 추가
        openapi_schema["info"]["x-api-versions"] = {
            "current": ApiVersion.V1.value,
            "available": [v.value for v in ApiVersion if v != ApiVersion.LATEST],
            "latest": ApiVersion.get_latest_version().value,
        }

    def _add_security_schemes(self, openapi_schema: Dict[str, Any]) -> None:
        """
        보안 스키마 추가

        Args:
            openapi_schema: OpenAPI 스키마
        """
        # components 섹션 확인
        if "components" not in openapi_schema:
            openapi_schema["components"] = {}

        # securitySchemes 섹션 추가
        if "securitySchemes" not in openapi_schema["components"]:
            openapi_schema["components"]["securitySchemes"] = {}

        # Bearer 토큰 인증 정의
        openapi_schema["components"]["securitySchemes"]["BearerAuth"] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT 인증 토큰을 입력하세요. 예: `Bearer eyJhbGciOiJIUzI1NiIs...`",
        }

        # API 키 인증 정의 (필요한 경우)
        openapi_schema["components"]["securitySchemes"]["ApiKeyAuth"] = {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API 키를 입력하세요",
        }

        # 보안 정의 추가
        openapi_schema["security"] = [{"BearerAuth": []}]

    def _setup_custom_swagger(
        self,
        docs_url: str,
        swagger_js_url: Optional[str] = None,
        favicon_url: Optional[str] = None,
        openapi_url: Optional[str] = None,
    ) -> None:
        """
        커스텀 Swagger UI 설정

        Args:
            docs_url: Swagger UI URL
            swagger_js_url: Swagger UI JS URL
            favicon_url: 파비콘 URL
            openapi_url: OpenAPI 스키마 URL
        """
        # 기본 독스 경로 비활성화
        self.app.docs_url = None

        # 기본값 설정
        if swagger_js_url is None:
            swagger_js_url = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"

        if favicon_url is None:
            favicon_url = "https://fastapi.tiangolo.com/img/favicon.png"

        if openapi_url is None:
            openapi_url = self.app.openapi_url

        # Swagger UI 페이지 생성
        @self.app.get(docs_url, include_in_schema=False)
        def custom_swagger_ui_html() -> HTMLResponse:
            return get_swagger_ui_html(
                openapi_url=openapi_url,
                title=f"{self.app.title} - API 문서",
                oauth2_redirect_url=f"{docs_url}/oauth2-redirect",
                swagger_js_url=swagger_js_url,
                swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
                swagger_favicon_url=favicon_url,
            )

        # OAuth2 리디렉션 페이지
        @self.app.get(f"{docs_url}/oauth2-redirect", include_in_schema=False)
        def swagger_ui_redirect() -> HTMLResponse:
            return get_swagger_ui_oauth2_redirect_html()

    def _setup_custom_redoc(
        self,
        redoc_url: str,
        redoc_js_url: Optional[str] = None,
        favicon_url: Optional[str] = None,
        openapi_url: Optional[str] = None,
    ) -> None:
        """
        커스텀 ReDoc 설정

        Args:
            redoc_url: ReDoc URL
            redoc_js_url: ReDoc JS URL
            favicon_url: 파비콘 URL
            openapi_url: OpenAPI 스키마 URL
        """
        # 기본 ReDoc 경로 비활성화
        self.app.redoc_url = None

        # 기본값 설정
        if redoc_js_url is None:
            redoc_js_url = (
                "https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"
            )

        if favicon_url is None:
            favicon_url = "https://fastapi.tiangolo.com/img/favicon.png"

        if openapi_url is None:
            openapi_url = self.app.openapi_url

        # ReDoc 페이지 생성
        @self.app.get(redoc_url, include_in_schema=False)
        def custom_redoc_html() -> HTMLResponse:
            return get_redoc_html(
                openapi_url=openapi_url,
                title=f"{self.app.title} - API 문서 (ReDoc)",
                redoc_js_url=redoc_js_url,
                redoc_favicon_url=favicon_url,
            )


def setup_api_documentation(app: FastAPI) -> APIDocumentation:
    """
    API 문서화 설정 유틸리티 함수

    Args:
        app: FastAPI 애플리케이션 인스턴스

    Returns:
        APIDocumentation: API 문서화 인스턴스
    """
    # 문서화 인스턴스 생성
    documentation = APIDocumentation(app)

    # 기본 문서화 설정
    documentation.setup_documentation(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.PROJECT_VERSION,
        docs_url=DOCS_URL,
        redoc_url=REDOC_URL,
        openapi_url="/api/openapi.json",
    )

    # 메타데이터 추가
    documentation.add_documentation_metadata(
        contact={
            "name": "API 지원팀",
            "email": "support@example.com",
            "url": "https://example.com/support",
        },
        license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
        terms_of_service="https://example.com/terms/",
        tags_metadata=[
            {
                "name": "auth",
                "description": "인증 관련 API",
                "externalDocs": {
                    "description": "인증 설명서",
                    "url": "https://example.com/docs/auth",
                },
            },
            {"name": "vehicles", "description": "차량 관리 API"},
            {"name": "maintenance", "description": "정비 관리 API"},
            {"name": "shops", "description": "정비소 관리 API"},
            {"name": "todos", "description": "할 일 관리 API"},
            {"name": "schedules", "description": "일정 관리 API"},
        ],
    )

    return documentation
