#!/usr/bin/env python3
"""
GitPython 호환성 관리 모듈

이 모듈은 GitPython 라이브러리를 사용하는 프로젝트에서 
Python 3.9+ 및 Python 3.12 호환성 문제를 해결하기 위한 패치를 적용합니다.

사용법:
    import gitpython
    gitpython.apply_patches()  # 패치 적용
"""

import importlib
import logging
import os
import sys
import warnings
from typing import Dict, Any

# 로깅 설정
logger = logging.getLogger(__name__)

# 자동 패치 적용 플래그
_AUTO_PATCH = os.environ.get("GITPYTHON_AUTO_PATCH", "1") == "1"

def apply_patches() -> bool:
    """
    GitPython 패치 적용

    Returns:
        bool: 패치 적용 성공 여부
    """
    try:
        from gitmanager.git.core.gitpython_apply_patch import apply_gitpython_patches
        return apply_gitpython_patches()
    except ImportError:
        logger.error("gitmanager.git.core.gitpython_apply_patch 모듈을 가져올 수 없습니다.")
        return False
    except Exception as e:
        logger.error(f"GitPython 패치 적용 중 오류 발생: {str(e)}")
        return False

def setup_gitpython() -> Dict[str, Any]:
    """
    GitPython 설정 및 패치 적용

    Returns:
        Dict[str, Any]: 설정 및 패치 결과 정보
    """
    try:
        from gitmanager.git.core.gitpython_setup import setup_gitpython as _setup
        return _setup()
    except ImportError:
        logger.error("gitmanager.git.core.gitpython_setup 모듈을 가져올 수 없습니다.")
        return {"success": False, "error": "모듈을 찾을 수 없습니다."}
    except Exception as e:
        logger.error(f"GitPython 설정 중 오류 발생: {str(e)}")
        return {"success": False, "error": str(e)}

# Python 3.12 이상이면 자동으로 패치 시도
if sys.version_info >= (3, 12) and _AUTO_PATCH:
    try:
        result = apply_patches()
        if result:
            logger.info("Python 3.12 환경에서 GitPython 패치가 자동으로 적용되었습니다.")
        else:
            warnings.warn(
                "Python 3.12 환경에서 GitPython 패치 적용에 실패했습니다. "
                "이로 인해 일부 기능이 작동하지 않을 수 있습니다.",
                RuntimeWarning
            )
    except Exception as e:
        logger.warning(f"자동 패치 적용 중 예외 발생: {str(e)}")

if __name__ == "__main__":
    # 스크립트로 실행할 경우 패치 자동 적용
    logging.basicConfig(level=logging.INFO)
    result = apply_patches()
    print(f"GitPython 패치 적용 결과: {'성공' if result else '실패'}")
    sys.exit(0 if result else 1) 