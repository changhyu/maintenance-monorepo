"""
GitPython 설정 모듈

이 모듈은 GitPython 라이브러리와 로컬 git 모듈 간의 충돌을 해결하기 위한
구조적인 해결책을 제공합니다.
"""

import importlib.util
import logging
import os
import site
import sys
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# Python 3.12 호환성을 위한 deprecation 경고 필터링
if sys.version_info >= (3, 10):
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="git")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="gitdb")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="smmap")

# 로깅 설정
logger = logging.getLogger(__name__)


def setup_gitpython() -> Dict[str, Any]:
    """
    GitPython 라이브러리를 설정하고 필요한 컴포넌트를 반환합니다.

    Returns:
        Dict[str, Any]: GitPython 컴포넌트를 담은 딕셔너리
    """
    # 사이트 패키지 경로 가져오기
    site_packages = site.getsitepackages()
    user_site = site.getusersitepackages()

    # 프로젝트 루트 찾기
    project_root = find_project_root()

    # 로컬 git 모듈 경로
    local_git_path = find_local_git_module(project_root)

    # 경로 재구성
    modified = reconfigure_import_paths(site_packages, user_site, local_git_path)

    # GitPython 컴포넌트 import
    components = import_gitpython_components()

    result = {
        "project_root": project_root,
        "site_packages": site_packages,
        "user_site": user_site,
        "local_git_path": local_git_path,
        "paths_modified": modified,
        "components": components,
    }

    logger.info(f"GitPython 설정 완료: {result}")
    return result


def find_project_root() -> str:
    """
    프로젝트 루트 디렉토리를 찾습니다.

    Returns:
        str: 프로젝트 루트 경로
    """
    # 현재 파일 기준으로 상위 디렉토리 검색
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))

    # .git 디렉토리 또는 setup.py, pyproject.toml 파일 등이 있는지 확인
    if (
        os.path.exists(os.path.join(parent_dir, ".git"))
        or os.path.exists(os.path.join(parent_dir, "setup.py"))
        or os.path.exists(os.path.join(parent_dir, "pyproject.toml"))
    ):
        return parent_dir

    # 환경변수에서 프로젝트 루트 확인
    if "PROJECT_ROOT" in os.environ:
        return os.environ["PROJECT_ROOT"]

    # 현재 작업 디렉토리 반환
    return os.getcwd()


def find_local_git_module(project_root: str) -> Optional[str]:
    """
    로컬 git 모듈 경로를 찾습니다.

    Args:
        project_root: 프로젝트 루트 경로

    Returns:
        Optional[str]: 로컬 git 모듈 경로 (없으면 None)
    """
    # 프로젝트 내 gitmanager/git 디렉토리 확인
    git_module_path = os.path.join(project_root, "gitmanager", "git")
    if os.path.isdir(git_module_path):
        return git_module_path

    # sys.path에서 검색
    for path in sys.path:
        potential_path = os.path.join(path, "gitmanager", "git")
        if os.path.isdir(potential_path):
            return potential_path

    return None


def reconfigure_import_paths(
    site_packages: List[str], user_site: str, local_git_path: Optional[str]
) -> bool:
    """
    임포트 경로를 재구성하여 GitPython이 올바르게 로드되도록 합니다.

    Args:
        site_packages: 시스템 사이트 패키지 경로 목록
        user_site: 사용자 사이트 패키지 경로
        local_git_path: 로컬 git 모듈 경로

    Returns:
        bool: 경로가 수정되었으면 True
    """
    modified = False

    # git 모듈이 이미 로드되어 있다면 제거
    if "git" in sys.modules:
        logger.info("기존 git 모듈 제거")
        del sys.modules["git"]
        modified = True

    # user_site를 sys.path의 최상위에 추가
    if os.path.exists(user_site) and user_site not in sys.path:
        sys.path.insert(0, user_site)
        modified = True

    # site_packages를 sys.path 앞부분에 추가
    for site_path in reversed(site_packages):
        if os.path.exists(site_path) and site_path not in sys.path:
            sys.path.insert(0, site_path)
            modified = True

    # 로컬 git 모듈 경로 처리
    if local_git_path:
        # 로컬 git 모듈 경로가 sys.path에 있으면 제거 후 맨 뒤에 추가
        parent_dir = os.path.dirname(os.path.dirname(local_git_path))
        if parent_dir in sys.path:
            sys.path.remove(parent_dir)
            sys.path.append(parent_dir)
            modified = True

    return modified


def import_gitpython_components() -> Dict[str, Any]:
    """
    GitPython 컴포넌트를 임포트합니다.

    Returns:
        Dict[str, Any]: 임포트된 컴포넌트 딕셔너리
    """
    components = {}

    # GitPython 라이브러리 임포트 시도
    try:
        import git

        components["git"] = git

        # __version__ 속성 접근 시 예외 처리 추가
        try:
            components["version"] = git.__version__
        except AttributeError:
            logger.warning(
                "git 모듈에 __version__ 속성이 없습니다. 대체 버전 정보 사용"
            )
            components["version"] = "unknown"

        components["path"] = git.__file__

        # Repo 클래스 임포트
        try:
            from git import Repo

            components["Repo"] = Repo
        except (ImportError, AttributeError) as e:
            logger.warning(f"git.Repo 임포트 실패: {e}")

            # git.repo 모듈에서 시도
            try:
                from git.repo import Repo

                components["Repo"] = Repo
            except ImportError as e:
                logger.warning(f"git.repo.Repo 임포트 실패: {e}")

                # git.repo.base 모듈에서 시도
                try:
                    from git.repo.base import Repo

                    components["Repo"] = Repo
                except ImportError as e:
                    logger.warning(f"git.repo.base.Repo 임포트 실패: {e}")

        # 예외 클래스 임포트
        try:
            from git.exc import GitCommandError, InvalidGitRepositoryError

            components["GitCommandError"] = GitCommandError
            components["InvalidGitRepositoryError"] = InvalidGitRepositoryError
        except ImportError as e:
            logger.warning(f"git.exc 모듈 임포트 실패: {e}")

    except ImportError as e:
        logger.error(f"GitPython 임포트 실패: {e}")

    return components


# 테스트 및 디버깅용 메인 함수
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = setup_gitpython()
    print("GitPython 설정 결과:")
    for key, value in result.items():
        if key != "components":
            print(f"  {key}: {value}")
        else:
            print("  components:")
            for comp_key, comp_value in value.items():
                print(f"    {comp_key}: {comp_value}")
