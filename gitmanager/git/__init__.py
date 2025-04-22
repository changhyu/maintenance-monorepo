"""
Git 저장소 관리 모듈
Git 저장소 작업을 위한 표준화된 인터페이스를 제공합니다.
"""

import logging
import os
import sys
import warnings
from typing import Any, Dict, Optional, Type

# Python 3.12 호환성을 위한 deprecation 경고 필터링
if sys.version_info >= (3, 10):
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="git")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="gitdb")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="smmap")

# 외부 라이브러리 대신 내부 모듈에서만 예외 가져오기
from gitmanager.git.core.exceptions import (
    GitBranchException,
    GitCommandException,
    GitCommitException,
    GitConfigException,
    GitMergeException,
    GitOperationException,
    GitPushPullException,
    GitRepositoryException,
    GitTagException,
)

# Python 버전 호환성 처리
PY_VERSION = sys.version_info

# GitPython 라이브러리 임포트
try:
    import git
    from git import Repo

    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False
    print(
        "경고: GitPython 라이브러리를 찾을 수 없습니다. pip install gitpython으로 설치하세요."
    )

# pickle 모듈 호환성 처리
if PY_VERSION >= (3, 8):
    import pickle
else:
    try:
        import pickle5 as pickle
    except ImportError:
        import pickle

# zlib 호환성 처리
try:
    import zlib

    ZLIB_AVAILABLE = True
except ImportError:
    ZLIB_AVAILABLE = False
    print("경고: zlib 라이브러리를 찾을 수 없습니다. 압축 기능이 제한됩니다.")

# 로깅 설정
logger = logging.getLogger(__name__)


def get_repo_class() -> Optional[Type]:
    """
    GitPython Repo 클래스 반환 또는 None

    Returns:
        Optional[Type]: Repo 클래스 또는 None (사용 불가능한 경우)
    """
    if GIT_AVAILABLE:
        return Repo
    return None


# Python 3.12 호환성을 위한 패치 적용
if GIT_AVAILABLE and PY_VERSION >= (3, 10):
    try:
        # 내부 패치 모듈 적용
        from gitmanager.git.core.gitpython_apply_patch import apply_gitpython_patches
        apply_gitpython_patches()
        logger.info("GitPython 패치가 자동으로 적용되었습니다.")
    except (ImportError, Exception) as e:
        logger.warning(f"GitPython 패치 적용 실패: {str(e)}")
        logger.warning("수동으로 패치를 적용하세요: python gitpython_patch.py")


def get_git_exceptions() -> Dict[str, Type]:
    """
    GitPython 예외 클래스들을 반환

    Returns:
        Dict[str, Type]: 예외 클래스 딕셔너리
    """
    exceptions = {}

    if GIT_AVAILABLE:
        try:
            exceptions["GitCommandError"] = git.GitCommandError
        except (ImportError, AttributeError):
            pass

        try:
            exceptions["InvalidGitRepositoryError"] = git.InvalidGitRepositoryError
        except (ImportError, AttributeError):
            pass

    return exceptions


def get_git_service():
    if not GIT_AVAILABLE:
        raise ImportError("GitPython 라이브러리가 필요합니다")
    """GitService 클래스를 lazy import합니다."""
    from gitmanager.git.core.service import GitService

    return GitService


def get_external_git():
    """GitPython 라이브러리의 클래스를 lazy import합니다."""
    if not GIT_AVAILABLE:
        raise ImportError("GitPython 라이브러리가 필요합니다")

    try:
        import git as external_git

        return external_git
    except ImportError:
        print(
            "경고: GitPython 라이브러리를 찾을 수 없습니다. pip install gitpython으로 설치하세요."
        )
        return None


__all__ = [
    "get_git_service",
    "get_external_git",
    "GitOperationException",
    "GitCommitException",
    "GitMergeException",
    "GitPushPullException",
    "GitBranchException",
    "GitTagException",
    "GitRepositoryException",
    "GitConfigException",
    "GitCommandException",
]
