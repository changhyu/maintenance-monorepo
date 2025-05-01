"""
API 버전 관리 유틸리티

이 모듈은 API 버전을 관리하고 추적하는 유틸리티 함수를 제공합니다.
"""
from typing import Dict, List, Optional, Union
from fastapi import Request, FastAPI
import importlib
import inspect
import pkgutil
import sys
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class APIVersionManager:
    """
    API 버전 관리 클래스
    
    여러 API 버전을 관리하고 현재 지원되는 버전과 
    지원 종료 예정인 버전을 추적합니다.
    """
    
    def __init__(self, app: FastAPI):
        """
        API 버전 관리자 초기화
        
        Args:
            app: FastAPI 애플리케이션 인스턴스
        """
        self.app = app
        self.versions: Dict[str, Dict] = {}
        self._load_versions()
    
    def _load_versions(self) -> None:
        """
        사용 가능한 모든 API 버전을 로드합니다.
        """
        # backend.api 패키지 내의 모든 버전 모듈 탐색
        api_path = Path(__file__).parent.parent / "api"
        
        # api 디렉토리가 존재하는지 확인
        if not api_path.is_dir():
            logger.warning(f"API 디렉토리를 찾을 수 없습니다: {api_path}")
            return
        
        # 각 버전 디렉토리 탐색
        for item in api_path.iterdir():
            if item.is_dir() and item.name.startswith('v'):
                version_name = item.name
                try:
                    # 모듈 가져오기 시도
                    version_module = importlib.import_module(f"backend.api.{version_name}")
                    
                    # 버전 정보가 있는지 확인
                    if hasattr(version_module, 'VERSION_INFO'):
                        self.versions[version_name] = version_module.VERSION_INFO
                        logger.info(f"API 버전 로드됨: {version_name} ({version_module.__version__})")
                    else:
                        logger.warning(f"버전 모듈에 VERSION_INFO가 없습니다: {version_name}")
                except ImportError as e:
                    logger.error(f"버전 모듈 로드 실패: {version_name} - {str(e)}")
    
    def get_all_versions(self) -> Dict[str, Dict]:
        """
        지원되는 모든 API 버전 정보를 반환합니다.
        
        Returns:
            Dict: 버전 정보 딕셔너리
        """
        return self.versions
    
    def get_active_versions(self) -> Dict[str, Dict]:
        """
        현재 활성화된(deprecated=False) API 버전만 반환합니다.
        
        Returns:
            Dict: 활성 버전 정보 딕셔너리
        """
        return {k: v for k, v in self.versions.items() if not v.get('deprecated', False)}
    
    def get_deprecated_versions(self) -> Dict[str, Dict]:
        """
        지원 종료 예정인(deprecated=True) API 버전만 반환합니다.
        
        Returns:
            Dict: 지원 종료 예정 버전 정보 딕셔너리
        """
        return {k: v for k, v in self.versions.items() if v.get('deprecated', False)}
    
    def get_version_info(self, version: str) -> Optional[Dict]:
        """
        특정 API 버전에 대한 정보를 반환합니다.
        
        Args:
            version: API 버전 문자열 (예: "v1")
        
        Returns:
            Dict 또는 None: 버전 정보가 존재하면 딕셔너리, 없으면 None
        """
        return self.versions.get(version)
    
    def is_version_supported(self, version: str) -> bool:
        """
        특정 API 버전이 지원되는지 확인합니다.
        
        Args:
            version: API 버전 문자열 (예: "v1")
        
        Returns:
            bool: 지원되면 True, 아니면 False
        """
        return version in self.versions and not self.versions[version].get('deprecated', False)
    
    def get_latest_version(self) -> Optional[str]:
        """
        가장 최신 API 버전을 반환합니다.
        
        Returns:
            str 또는 None: 최신 버전 문자열, 버전이 없으면 None
        """
        active_versions = self.get_active_versions()
        if not active_versions:
            return None
            
        # 버전 문자열을 기준으로 정렬 (v1, v2, v3, ...)
        latest = sorted(active_versions.keys())[-1]
        return latest
    
    def register_version_routes(self) -> None:
        """
        각 API 버전에 대한 라우트를 등록합니다.
        이 메서드는 새로운 API 버전이 추가될 때 해당 버전의 라우트를 등록하는 데 사용됩니다.
        """
        # 현재는 직접 main.py에서 라우터를 등록하지만,
        # 이후에는 이 메서드를 사용하여 자동으로 모든 버전의 라우터를 등록할 수 있습니다.
        pass

def get_api_version_from_request(request: Request) -> str:
    """
    요청 경로에서 API 버전을 추출합니다.
    
    Args:
        request: FastAPI Request 객체
    
    Returns:
        str: API 버전 문자열 (예: "v1") 또는 버전을 추출할 수 없으면 빈 문자열
    """
    path = request.url.path
    
    # 경로에서 버전 추출 (예: /api/v1/users -> v1)
    parts = path.strip('/').split('/')
    for part in parts:
        if part.startswith('v') and len(part) > 1 and part[1:].isdigit():
            return part
    
    return ""

def get_version_header_value(version_info: Dict) -> str:
    """
    버전 정보로부터 API-Version 헤더 값을 생성합니다.
    
    Args:
        version_info: 버전 정보 딕셔너리
    
    Returns:
        str: API-Version 헤더 값
    """
    version = version_info.get('version', '1.0.0')
    status = version_info.get('status', 'stable')
    return f"{version}; {status}"

async def version_middleware(request: Request, call_next):
    """
    API 버전 관련 응답 헤더를 추가하는 미들웨어입니다.
    
    Args:
        request: FastAPI Request 객체
        call_next: 다음 미들웨어 또는 엔드포인트 핸들러
        
    Returns:
        FastAPI Response 객체
    """
    # 요청 처리
    response = await call_next(request)
    
    # API 버전을 요청에서 추출
    api_version = get_api_version_from_request(request)
    
    # API 버전이 있으면 응답 헤더에 추가
    if api_version:
        # TODO: 실제 구현 시에는 APIVersionManager 인스턴스를 사용하여 버전 정보를 가져와야 합니다.
        version_info = {"version": "1.0.0", "status": "stable"}
        response.headers["API-Version"] = get_version_header_value(version_info)
    
    return response