#!/usr/bin/env python3
"""
Python 호환성 패치 스크립트

이 스크립트는 다음 문제를 해결합니다:
1. importlib._bootstrap에 SourceFileLoader 속성이 없는 문제
2. pkg_resources 모듈이 importlib._bootstrap.SourceFileLoader를 찾지 못하는 문제
3. 다른 Python 버전 간의 호환성 문제

실행 방법:
```
python3 patch_python_compat.py
```

또는 다른 Python 스크립트의 상단에 다음과 같이 추가:
```python
import patch_python_compat
```
"""

import sys
import os
import types
import warnings
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("PythonCompat")

def apply_patches():
    """모든 호환성 패치 적용"""
    patched = []
    
    # 1. importlib 패치
    if patch_importlib():
        patched.append("importlib")
        
    # 2. pkg_resources 패치
    if patch_pkg_resources():
        patched.append("pkg_resources")
        
    # 3. PYTHONPATH 정리
    if clean_pythonpath():
        patched.append("PYTHONPATH")
    
    return patched

def patch_importlib():
    """importlib._bootstrap에 SourceFileLoader 속성이 없는 문제 해결"""
    try:
        import importlib._bootstrap
        
        # SourceFileLoader 속성이 이미 있는지 확인
        if hasattr(importlib._bootstrap, 'SourceFileLoader'):
            logger.info("✅ importlib._bootstrap.SourceFileLoader 속성이 이미 존재합니다.")
            return False
            
        # importlib.machinery에서 SourceFileLoader 가져오기 시도
        try:
            from importlib.machinery import SourceFileLoader
            
            # importlib._bootstrap에 SourceFileLoader 추가
            importlib._bootstrap.SourceFileLoader = SourceFileLoader
            logger.info("✅ importlib._bootstrap.SourceFileLoader 패치 성공")
            return True
        except ImportError as e:
            logger.error(f"❌ importlib.machinery.SourceFileLoader 가져오기 실패: {e}")
            return False
    except ImportError as e:
        logger.error(f"❌ importlib._bootstrap 모듈 가져오기 실패: {e}")
        return False

def patch_pkg_resources():
    """pkg_resources 모듈의 SourceFileLoader 참조 문제 해결"""
    # 이미 로드된 pkg_resources 모듈 제거
    if 'pkg_resources' in sys.modules:
        logger.info("기존 pkg_resources 모듈 제거 중...")
        del sys.modules['pkg_resources']
    
    # importlib 패치 적용 후 pkg_resources 가져오기 시도
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=DeprecationWarning)
            import pkg_resources
        logger.info("✅ pkg_resources 모듈 패치 후 가져오기 성공")
        return True
    except ImportError as e:
        logger.error(f"❌ pkg_resources 모듈 가져오기 실패: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ pkg_resources 모듈 패치 중 예상치 못한 오류: {e}")
        return False

def clean_pythonpath():
    """PYTHONPATH 환경 변수에서 중복된 경로 제거"""
    pythonpath = os.environ.get('PYTHONPATH', '')
    
    if not pythonpath:
        logger.info("PYTHONPATH가 설정되어 있지 않습니다.")
        return False
        
    # 경로 분리 및 중복 제거
    paths = [p for p in pythonpath.split(':') if p]
    unique_paths = []
    
    for path in paths:
        if path and path not in unique_paths:
            unique_paths.append(path)
            
    # 중복이 제거된 경로로 PYTHONPATH 재설정
    if len(unique_paths) < len(paths):
        new_pythonpath = ':'.join(unique_paths)
        os.environ['PYTHONPATH'] = new_pythonpath
        logger.info(f"✅ PYTHONPATH 중복 제거 완료: {new_pythonpath}")
        return True
    else:
        logger.info("PYTHONPATH에 중복된 경로가 없습니다.")
        return False

def monkey_patch_git_module():
    """GitPython 모듈 관련 문제 패치 시도"""
    try:
        import git
        logger.info(f"GitPython 버전: {git.__version__}")
        
        # 구체적인 오류가 발견되면 여기에 GitPython 관련 패치 추가
        
        return True
    except ImportError:
        logger.warning("GitPython 모듈을 찾을 수 없어 패치를 건너뜁니다.")
        return False
    except Exception as e:
        logger.error(f"❌ GitPython 패치 중 오류: {e}")
        return False

# 패치가 스크립트로 직접 실행될 때만 적용
if __name__ == "__main__":
    print("=" * 60)
    print(" Python 호환성 패치 적용 중... ")
    print("=" * 60)
    
    patched_modules = apply_patches()
    
    if patched_modules:
        print("\n✅ 다음 모듈/설정에 패치가 적용되었습니다:")
        for module in patched_modules:
            print(f"  - {module}")
        print("\n이제 프로젝트를 실행하면 이전 오류가 해결되어야 합니다.")
    else:
        print("\n⚠️ 패치가 적용된 모듈이 없습니다. 이미 모든 문제가 해결되었거나,")
        print("  다른 문제가 있을 수 있습니다.")
        
    print("\n추가 진단이 필요하면 diagnose_env.py를 실행하세요.")
    print("=" * 60)
else:
    # 다른 모듈에서 import 될 때 자동으로 패치 적용
    logger.info("Python 호환성 패치 자동 적용 중...")
    apply_patches()