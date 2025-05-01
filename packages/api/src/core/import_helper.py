"""
임포트 경로 문제 해결을 위한 헬퍼 모듈

이 모듈은 패키지 임포트 경로 문제를 해결하기 위한 유틸리티 함수들을 제공합니다.
"""

import importlib
import logging
import os
import sys
from typing import Dict, Optional, Any, List, Tuple

# 로거 설정
logger = logging.getLogger(__name__)

# 임포트 경로 매핑 정의
PACKAGE_MAPPINGS = {
    # 잘못된 임포트 경로를 올바른 임포트 경로로 매핑
    "packagescore": "core",
    "packagesmodels": "models",
    "packagesdatabase": "database",
    "packagesrouters": "routers", 
    "packagesmodules": "modules",
    "packagescontrollers": "controllers",
    "packagesrepositories": "repositories",
    "packagesservices": "services",
    "packagesutils": "utils",
    "packages.api.src": "",  # 루트 패키지로 변환
    "packages.apidatabase": "database",
    "src.core": "core",      # src 접두사 제거
    "src.models": "models",
    "src.database": "database",
    "src.routers": "routers",
    "src.modules": "modules",
    "src.controllers": "controllers",
    "src.repositories": "repositories",
    "src.services": "services",
    "src.utils": "utils",
    
    # 추가 매핑
    "packages.api.src.corecache": "core.cache",  # corecache 관련 경로 문제 해결
    
    # shared-python 패키지 매핑 추가
    "maintenance_shared_python": "packages.shared-python.src.maintenance_shared_python",
    "packages.shared-python.src.maintenance_shared_python": "maintenance_shared_python"
}

def fix_import_paths() -> None:
    """
    잘못된 임포트 경로를 올바른 경로로 처리하기 위한 메타 경로 처리기를 설정합니다.
    이 함수는 애플리케이션 시작 시 호출되어야 합니다.
    """
    # 현재 실행 중인 스크립트의 디렉토리 경로 구하기
    current_script_dir = os.path.dirname(os.path.abspath(__file__))  # core 디렉토리
    src_dir = os.path.dirname(current_script_dir)  # src 디렉토리
    api_dir = os.path.dirname(src_dir)  # packages/api 디렉토리
    packages_dir = os.path.dirname(api_dir)  # packages 디렉토리
    repo_root = os.path.dirname(packages_dir)  # 저장소 루트 디렉토리
    
    # shared-python 패키지 경로 구하기
    shared_python_dir = os.path.join(packages_dir, "shared-python")
    shared_python_src_dir = os.path.join(shared_python_dir, "src")
    
    # 중요 디렉토리들이 sys.path에 없으면 추가
    paths_to_add = [
        current_script_dir,  # core 디렉토리
        src_dir,            # src 디렉토리
        api_dir,            # packages/api 디렉토리
        packages_dir,       # packages 디렉토리
        repo_root,          # 저장소 루트
        shared_python_dir,  # shared-python 패키지 디렉토리
        shared_python_src_dir  # shared-python/src 디렉토리
    ]
    
    for path in paths_to_add:
        if os.path.exists(path) and path not in sys.path:
            sys.path.insert(0, path)
            logger.debug(f"경로 추가: {path}")
    
    # 메타 경로 처리기 설정
    class CustomPathFinder:
        @classmethod
        def find_spec(cls, fullname, path=None, target=None):
            # 매핑된 패키지인지 확인
            for wrong_path, correct_path in PACKAGE_MAPPINGS.items():
                if fullname.startswith(wrong_path):
                    # 올바른 모듈 경로로 변환
                    if correct_path:
                        correct_fullname = fullname.replace(wrong_path, correct_path, 1)
                    else:
                        # 빈 문자열로 대체하는 경우 (루트 패키지)
                        correct_fullname = fullname[len(wrong_path):].lstrip('.')
                    
                    logger.debug(f"임포트 경로 변환: {fullname} -> {correct_fullname}")
                    
                    # 올바른 경로로 spec 로드 시도
                    try:
                        spec = importlib.util.find_spec(correct_fullname)
                        if spec:
                            return spec
                    except (ImportError, AttributeError):
                        pass
            
            return None

    # 메타 경로 처리기를 메타 경로 가장 앞에 추가
    sys.meta_path.insert(0, CustomPathFinder)
    logger.info("임포트 경로 수정 메타 경로 처리기가 설정되었습니다.")

def get_corrected_import(module_name: str) -> str:
    """
    잘못된 모듈 경로를 올바른 경로로 변환합니다.
    
    Args:
        module_name: 변환할 모듈 이름
        
    Returns:
        변환된 모듈 이름 (매핑이 없으면 원래 이름 반환)
    """
    for wrong_path, correct_path in PACKAGE_MAPPINGS.items():
        if module_name.startswith(wrong_path):
            return module_name.replace(wrong_path, correct_path, 1)
    
    return module_name

def import_module_safe(module_name: str, package: Optional[str] = None) -> Any:
    """
    모듈을 안전하게 임포트합니다. 경로 변환을 시도하고 실패하면 원래 경로로 시도합니다.
    
    Args:
        module_name: 임포트할 모듈 이름
        package: 상대 임포트를 위한 패키지 이름
        
    Returns:
        임포트된 모듈 또는 None (실패 시)
    """
    try:
        # 먼저 원래 경로로 시도
        return importlib.import_module(module_name, package)
    except ImportError:
        # 변환된 경로로 시도
        corrected_name = get_corrected_import(module_name)
        if corrected_name != module_name:
            try:
                logger.debug(f"임포트 경로 변환 시도: {module_name} -> {corrected_name}")
                return importlib.import_module(corrected_name, package)
            except ImportError as e:
                logger.debug(f"변환된 경로로도 임포트 실패: {e}")
        
        # 절대 경로로 시도 (상대 경로인 경우)
        if module_name.startswith('.') and package:
            try:
                absolute_name = f"{package}{module_name[1:]}"
                logger.debug(f"절대 경로로 임포트 시도: {absolute_name}")
                return importlib.import_module(absolute_name)
            except ImportError as e:
                logger.debug(f"절대 경로로도 임포트 실패: {e}")
        
        # 모든 시도 실패
        logger.warning(f"모듈 임포트 실패: {module_name}")
        return None 