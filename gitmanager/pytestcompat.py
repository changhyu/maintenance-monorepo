"""
pytest 호환성 모듈
테스트 실행 시 필요한 외부 모듈을 올바르게 로드합니다.
"""

import importlib.util
import os
import sys
import warnings
from pathlib import Path

# Python 3.12 호환성을 위한 deprecation 경고 필터링
if sys.version_info >= (3, 10):
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="git")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="gitdb")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="smmap")


# GitPython 라이브러리의 별칭 제공
def get_gitpython_repo():
    """GitPython의 Repo 클래스를 가져옵니다."""
    try:
        # 시스템 사이트 패키지에서 GitPython 가져오기
        spec = importlib.util.find_spec("git")
        if spec is None:
            raise ImportError("GitPython 패키지를 찾을 수 없습니다.")

        # 모듈 로드
        git_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(git_module)

        return git_module.Repo
    except Exception as e:
        raise ImportError(f"GitPython Repo 클래스를 가져오는 데 실패했습니다: {e}")


def get_gitpython_exceptions():
    """GitPython의 예외 클래스들을 가져옵니다."""
    try:
        # 시스템 사이트 패키지에서 GitPython 가져오기
        spec = importlib.util.find_spec("git")
        if spec is None:
            raise ImportError("GitPython 패키지를 찾을 수 없습니다.")

        # 모듈 로드
        git_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(git_module)

        return git_module.GitCommandError, git_module.InvalidGitRepositoryError
    except Exception as e:
        raise ImportError(f"GitPython 예외 클래스를 가져오는 데 실패했습니다: {e}")


# 테스트에서 사용할 수 있는 별칭 제공
try:
    GitRepo = get_gitpython_repo()
    GitCommandError, InvalidGitRepositoryError = get_gitpython_exceptions()
except ImportError as e:
    # 실패하면 None으로 설정하고 나중에 실제 사용 시점에서 오류 발생
    print(f"경고: {e}")
    GitRepo = None
    GitCommandError = None
    InvalidGitRepositoryError = None
