"""
API 문서화 설정 모듈
Swagger/OpenAPI 문서 구성을 관리합니다.
"""

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.openapi.docs import (
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles

# 서비스 정보 및 버전
SERVICE_NAME = os.getenv("SERVICE_NAME", "차량 정비 관리 API")
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "0.1.0")
SERVICE_DESCRIPTION = os.getenv(
    "SERVICE_DESCRIPTION", "차량 정비 관리 시스템을 위한 RESTful API 서비스입니다."
)

# API 태그 정보 (Swagger UI에서 API 그룹화)
TAGS_METADATA = [
    {
        "name": "auth",
        "description": "인증 관련 엔드포인트. 로그인, 회원가입, 토큰 관리 등",
    },
    {
        "name": "vehicles",
        "description": "차량 관리 관련 엔드포인트. 차량 정보 관리",
    },
    {
        "name": "maintenance",
        "description": "정비 기록 관련 엔드포인트. 정비 이력, 예정 정비 조회 및 관리",
    },
    {
        "name": "shops",
        "description": "정비소 관리 관련 엔드포인트",
    },
    {
        "name": "users",
        "description": "사용자 관리 관련 엔드포인트",
    },
    {
        "name": "health",
        "description": "시스템 상태 확인용 엔드포인트",
    },
]


def custom_openapi(app: FastAPI) -> Dict[str, Any]:
    """
    FastAPI 앱에 대한 사용자 정의 OpenAPI 스키마를 생성합니다.

    Args:
        app: FastAPI 애플리케이션 인스턴스

    Returns:
        OpenAPI 스키마 딕셔너리
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=SERVICE_NAME,
        version=SERVICE_VERSION,
        description=SERVICE_DESCRIPTION,
        routes=app.routes,
        tags=TAGS_METADATA,
    )

    # 서버 정보 추가
    openapi_schema["servers"] = [
        {"url": "/", "description": "현재 서버"},
        {"url": "https://api.example.com", "description": "프로덕션 서버"},
        {"url": "https://staging-api.example.com", "description": "스테이징 서버"},
    ]

    # 보안 스키마 추가
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT 토큰을 Authorization 헤더에 입력하세요. 예: Bearer {token}",
        }
    }

    # 전역 보안 설정
    openapi_schema["security"] = [{"bearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


def setup_docs(app: FastAPI) -> None:
    """
    FastAPI 앱에 문서 관련 설정을 추가합니다.

    Args:
        app: FastAPI 애플리케이션 인스턴스
    """
    # 사용자 정의 OpenAPI 스키마 설정
    app.openapi = lambda: custom_openapi(app)

    # Swagger UI용 정적 파일 호스팅
    app.mount("/static", StaticFiles(directory="static"), name="static")

    # 기본 Swagger UI 경로 비활성화
    app.docs_url = None
    app.redoc_url = None

    # 사용자 정의 Swagger UI 경로 설정
    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html(request: Request):
        return get_swagger_ui_html(
            openapi_url=app.openapi_url or "/openapi.json",
            title=f"{SERVICE_NAME} - API 문서",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="/static/swagger-ui-bundle.js",
            swagger_css_url="/static/swagger-ui.css",
            swagger_favicon_url="/static/favicon.png",
        )

    @app.get(
        app.swagger_ui_oauth2_redirect_url or "/docs/oauth2-redirect",
        include_in_schema=False,
    )
    async def swagger_ui_redirect():
        return get_swagger_ui_oauth2_redirect_html()

    # ReDoc UI 경로 설정
    @app.get("/redoc", include_in_schema=False)
    async def redoc_html(request: Request):
        from fastapi.responses import HTMLResponse

        return HTMLResponse(
            """
        <!DOCTYPE html>
        <html>
          <head>
            <title>차량 정비 관리 API - ReDoc</title>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="shortcut icon" href="/static/favicon.png">
            <style>
              body {
                margin: 0;
                padding: 0;
              }
            </style>
            <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
          </head>
          <body>
            <div id="redoc"></div>
            <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
            <script>
              Redoc.init(
                '/openapi.json',
                {
                  scrollYOffset: 50,
                  hideDownloadButton: false,
                  hideHostname: false,
                  noAutoAuth: false,
                  pathInMiddlePanel: false,
                }
              );
            </script>
          </body>
        </html>
        """
        )
