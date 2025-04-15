"""
API 버전 관리 모듈

API 버전 관리를 위한 유틸리티와 미들웨어를 제공합니다.
"""
from enum import Enum
from typing import Callable, Dict, List, Optional, Union, Any

from fastapi import FastAPI, Request, Response, Depends, Header
from fastapi.routing import APIRoute, APIRouter
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from packages.api.src.core.config import settings
from packages.api.src.core.responses import error_response
from packages.api.src.core.logger import logger


class ApiVersion(str, Enum):
    """API 버전 열거형"""
    V1 = "v1"
    V2 = "v2"
    LATEST = "latest"
    
    @classmethod
    def get_latest_version(cls) -> 'ApiVersion':
        """
        최신 API 버전 반환
        """
        return ApiVersion.V1  # 현재는 V1이 최신 버전


class VersionedAPIRouter(APIRouter):
    """
    버전 관리 API 라우터
    
    다양한 API 버전에 대한 경로를 관리합니다.
    """
    
    def __init__(
        self,
        version: ApiVersion,
        prefix: str = "",
        *args,
        **kwargs
    ):
        """
        버전 관리 라우터 초기화
        
        Args:
            version: API 버전
            prefix: 라우터 접두사
        """
        # 버전 경로 포함 접두사 생성
        versioned_prefix = f"/api/{version}{prefix}"
        
        # 기본 초기화
        super().__init__(prefix=versioned_prefix, *args, **kwargs)
        
        # 버전 메타데이터 저장
        self.api_version = version


class VersionManager:
    """
    API 버전 관리자
    
    여러 버전의 API 라우터를 관리하고 등록합니다.
    """
    
    def __init__(self, app: FastAPI):
        """
        버전 관리자 초기화
        
        Args:
            app: FastAPI 애플리케이션 인스턴스
        """
        self.app = app
        self.routers: Dict[ApiVersion, List[APIRouter]] = {
            ApiVersion.V1: [],
            ApiVersion.V2: []
        }
    
    def include_router(self, router: APIRouter, version: ApiVersion):
        """
        버전에 라우터 추가
        
        Args:
            router: API 라우터
            version: 라우터를 등록할 API 버전
        """
        # 라우터 목록에 추가
        self.routers[version].append(router)
        
        # 애플리케이션에 라우터 등록
        self.app.include_router(router)
        
        logger.info(f"API 라우터가 버전 {version}에 등록되었습니다: {router.prefix}")
    
    def register_latest_version(self):
        """
        최신 버전의 라우터를 'latest' 경로에도 등록
        """
        latest_version = ApiVersion.get_latest_version()
        
        # 최신 버전의 모든 라우터 반복
        for router in self.routers[latest_version]:
            # 원본 접두사에서 버전 부분 추출
            original_prefix = router.prefix
            
            # 새 라우터를 생성하여 'latest' 경로로 등록
            new_prefix = original_prefix.replace(f"/{latest_version}", "/latest")
            
            # 새 라우터 생성 및 등록
            latest_router = APIRouter(prefix=new_prefix, tags=router.tags)
            
            # 원본 라우터의 모든 경로를 새 라우터에 복사
            for route in router.routes:
                latest_router.routes.append(route)
            
            # 애플리케이션에 라우터 등록
            self.app.include_router(latest_router)
            
            logger.info(f"API 라우터가 'latest' 버전으로 등록되었습니다: {new_prefix}")


class VersionHeaderMiddleware(BaseHTTPMiddleware):
    """
    API 버전 헤더 미들웨어
    
    응답에 API 버전 정보를 헤더로 추가합니다.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        요청 처리 및 버전 헤더 추가
        
        Args:
            request: HTTP 요청
            call_next: 다음 미들웨어 또는 라우트 핸들러
            
        Returns:
            Response: HTTP 응답
        """
        # 요청 처리
        response = await call_next(request)
        
        # 버전 헤더 추가
        if "/api/" in request.url.path:
            # 경로에서 버전 정보 추출
            path_parts = request.url.path.split("/")
            version = None
            
            for i, part in enumerate(path_parts):
                if part == "api" and i < len(path_parts) - 1:
                    version = path_parts[i+1]
                    break
            
            # 버전 정보가 있으면 헤더에 추가
            if version:
                response.headers["X-API-Version"] = version
        
        # 현재 최신 버전 정보 추가
        response.headers["X-API-Latest-Version"] = ApiVersion.get_latest_version()
        
        return response


async def get_api_version(
    accept_version: Optional[str] = Header(None, alias="Accept-Version")
) -> ApiVersion:
    """
    요청에서 API 버전 정보 추출
    
    Args:
        accept_version: 요청 헤더의 Accept-Version 값
        
    Returns:
        ApiVersion: 요청된 API 버전 또는 기본 버전
    """
    if accept_version:
        try:
            return ApiVersion(accept_version)
        except ValueError:
            pass
    
    # 기본값은 최신 버전
    return ApiVersion.get_latest_version()


def setup_versioning(app: FastAPI) -> VersionManager:
    """
    애플리케이션에 버전 관리 설정
    
    Args:
        app: FastAPI 애플리케이션 인스턴스
        
    Returns:
        VersionManager: 버전 관리자 인스턴스
    """
    # 버전 관리자 생성
    version_manager = VersionManager(app)
    
    # 버전 헤더 미들웨어 추가
    app.add_middleware(VersionHeaderMiddleware)
    
    logger.info("API 버전 관리 시스템이 초기화되었습니다")
    
    return version_manager 