"""
Git 테스트를 위한 Pytest 픽스처 모듈
"""

import os
import sys
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import pytest

# Python 3.12 호환성을 위한 deprecation 경고 필터링
if sys.version_info >= (3, 10):
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="git")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="gitdb")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="smmap")

# 현재 디렉토리 기준으로 루트 패키지 경로를 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# git_fixtures 모듈 임포트
from gitmanager.git.tests.utils.git_fixtures import (
    cleanup_test_repository,
    create_branch_and_commit,
    create_merge_conflict,
    create_test_commit,
    create_test_repository,
    setup_remote_repo,
)


@pytest.fixture
def git_repo():
    """
    기본 Git 저장소 픽스처

    테스트 함수에 기본 설정의 Git 저장소를 제공합니다.

    Returns:
        Tuple[Path, Repo]: 저장소 경로와 Repo 객체
    """
    repo_path, repo = create_test_repository()

    yield repo_path, repo

    # 테스트 후 정리
    cleanup_test_repository(repo_path)


@pytest.fixture
def git_repo_with_commits(git_repo):
    """
    여러 커밋이 있는 Git 저장소 픽스처

    Returns:
        Tuple[Path, Repo, List[str]]: 저장소 경로, Repo 객체, 커밋 해시 목록
    """
    repo_path, repo = git_repo
    commit_hashes = []

    # 추가 커밋 생성
    for i in range(3):
        files = {f"file_{i}.txt": f"파일 {i}의 내용입니다."}
        commit_hash = create_test_commit(repo, message=f"커밋 {i}", files=files)
        commit_hashes.append(commit_hash)

    return repo_path, repo, commit_hashes


@pytest.fixture
def git_repo_with_branches(git_repo):
    """
    여러 브랜치가 있는 Git 저장소 픽스처

    Returns:
        Tuple[Path, Repo, List[str]]: 저장소 경로, Repo 객체, 브랜치 이름 목록
    """
    repo_path, repo = git_repo
    branches = ["develop", "feature/new-feature", "hotfix/issue-123"]

    # 브랜치 생성
    for branch in branches:
        create_branch_and_commit(
            repo,
            branch_name=branch,
            filename=f"{branch.replace('/', '_')}.txt",
            content=f"{branch} 브랜치의 내용입니다.",
        )

    return repo_path, repo, branches


@pytest.fixture
def git_repo_with_conflict(git_repo):
    """
    머지 충돌이 있는 Git 저장소 픽스처

    Returns:
        Tuple[Path, Repo, str, List[str]]: 저장소 경로, Repo 객체, 충돌 브랜치 이름, 충돌 파일 목록
    """
    repo_path, repo = git_repo
    conflict_branch, conflict_files = create_merge_conflict(repo)

    return repo_path, repo, conflict_branch, conflict_files


@pytest.fixture
def git_repo_with_remote(git_repo):
    """
    원격 저장소가 설정된 Git 저장소 픽스처

    Returns:
        Tuple[Path, Repo, Path, Repo]: 로컬 저장소 경로, 로컬 Repo 객체, 원격 저장소 경로, 원격 Repo 객체
    """
    local_path, local_repo = git_repo
    remote_path, remote_repo = setup_remote_repo(local_repo)

    yield local_path, local_repo, remote_path, remote_repo

    # 테스트 후 정리
    cleanup_test_repository(remote_path)


@pytest.fixture
def git_repo_complex(git_repo):
    """
    복잡한 Git 저장소 픽스처 (여러 브랜치, 태그, 병합 이력 포함)

    Returns:
        Tuple[Path, Repo, Dict]: 저장소 경로, Repo 객체, 저장소 정보 딕셔너리
    """
    from git.tests.utils.git_fixtures import create_test_commit

    repo_path, repo = git_repo
    repo_info = {"branches": [], "tags": [], "merges": []}

    # 파일 추가 및 초기 커밋 생성
    create_test_commit(
        repo,
        message="기능 개발 시작",
        files={
            "src/main.py": "def main():\n    print('Hello, World!')\n\nif __name__ == '__main__':\n    main()",
            "README.md": "# 테스트 프로젝트\n\n복잡한 Git 테스트를 위한 저장소입니다.",
            ".gitignore": "*.pyc\n__pycache__/\n.venv/\n",
        },
    )

    # develop 브랜치 생성
    repo.git.checkout("-b", "develop")
    repo_info["branches"].append("develop")

    # develop에 커밋 추가
    create_test_commit(
        repo,
        message="개발 환경 설정",
        files={
            "requirements.txt": "pytest==7.3.1\npycodestyle==2.10.0",
            "setup.py": "from setuptools import setup, find_packages\n\nsetup(\n    name='testproject',\n    version='0.1.0',\n    packages=find_packages()\n)",
        },
    )

    # feature 브랜치 생성 및 개발
    repo.git.checkout("-b", "feature/user-login")
    repo_info["branches"].append("feature/user-login")

    create_test_commit(
        repo,
        message="사용자 로그인 기능 추가",
        files={
            "src/user.py": "class User:\n    def __init__(self, username, password):\n        self.username = username\n        self.password = password\n\n    def login(self):\n        print(f'{self.username} 로그인 성공')"
        },
    )

    create_test_commit(
        repo,
        message="로그인 테스트 추가",
        files={
            "tests/test_user.py": "from src.user import User\n\ndef test_user_login():\n    user = User('testuser', 'password')\n    # 실제로는 assert 등으로 테스트\n    pass"
        },
    )

    # feature 브랜치를 develop에 병합
    repo.git.checkout("develop")
    repo.git.merge("feature/user-login", "-m", "feature/user-login 병합")
    repo_info["merges"].append(("develop", "feature/user-login"))

    # 태그 추가
    repo.git.tag("-a", "v0.1.0-alpha", "-m", "알파 버전 0.1.0")
    repo_info["tags"].append("v0.1.0-alpha")

    # 다른 feature 브랜치 생성 및 개발
    repo.git.checkout("-b", "feature/user-profile")
    repo_info["branches"].append("feature/user-profile")

    create_test_commit(
        repo,
        message="사용자 프로필 기능 추가",
        files={
            "src/profile.py": "class Profile:\n    def __init__(self, user):\n        self.user = user\n        self.bio = ''\n\n    def update_bio(self, bio):\n        self.bio = bio\n        print(f'{self.user.username}의 프로필이 업데이트되었습니다.')"
        },
    )

    # develop 브랜치 업데이트
    repo.git.checkout("develop")
    create_test_commit(
        repo,
        message="버그 수정: 메인 함수 오류",
        files={
            "src/main.py": "def main():\n    print('Hello, World!')\n    return True\n\nif __name__ == '__main__':\n    main()"
        },
    )

    # main 브랜치로 돌아가서 develop 병합
    repo.git.checkout("master")  # 또는 main
    repo.git.merge("develop", "-m", "develop 브랜치 병합")
    repo_info["merges"].append(("master", "develop"))

    # 릴리스 태그 추가
    repo.git.tag("-a", "v0.1.0", "-m", "첫 번째 릴리스 버전")
    repo_info["tags"].append("v0.1.0")

    # master로 체크아웃 상태로 반환
    repo.git.checkout("master")

    return repo_path, repo, repo_info
