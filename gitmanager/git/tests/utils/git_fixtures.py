"""
Git 테스트를 위한 fixture 함수들
"""

import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# 호환성 모듈에서 GitPython 클래스 가져오기
from gitmanager.pytestcompat import GitCommandError
from gitmanager.pytestcompat import GitRepo as Repo


def create_test_repository() -> Tuple[Path, Any]:
    """
    테스트용 Git 저장소를 생성합니다.

    Returns:
        Tuple[Path, Repo]: 저장소 경로와 Repo 객체
    """
    # 임시 디렉토리 생성
    temp_dir = Path("/tmp/git_test_repo")
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True)

    # Git 저장소 초기화
    repo = Repo.init(temp_dir)

    # 기본 설정
    with repo.config_writer() as config:
        config.set_value("user", "name", "Test User")
        config.set_value("user", "email", "test@example.com")

    return temp_dir, repo


def cleanup_test_repository(repo_path: Path) -> None:
    """
    테스트용 Git 저장소를 정리합니다.

    Args:
        repo_path: 저장소 경로
    """
    if repo_path.exists():
        shutil.rmtree(repo_path)


def create_test_commit(
    repo: Any, message: str = "Test commit", files: Optional[Dict[str, str]] = None
) -> str:
    """
    테스트용 커밋을 생성합니다.

    Args:
        repo: Repo 객체
        message: 커밋 메시지
        files: 커밋할 파일들 (파일명: 내용)

    Returns:
        str: 커밋 해시
    """
    if files:
        for filename, content in files.items():
            file_path = Path(repo.working_dir) / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content)
            repo.index.add([str(file_path)])

    return repo.index.commit(message).hexsha


def create_branch_and_commit(
    repo: Any,
    branch_name: str,
    message: str = "Test commit",
    files: Optional[Dict[str, str]] = None,
) -> str:
    """
    새로운 브랜치를 생성하고 커밋합니다.

    Args:
        repo: Repo 객체
        branch_name: 브랜치 이름
        message: 커밋 메시지
        files: 커밋할 파일들

    Returns:
        str: 커밋 해시
    """
    # 새 브랜치 생성
    new_branch = repo.create_head(branch_name)
    new_branch.checkout()

    # 커밋 생성
    return create_test_commit(repo, message, files)


def create_merge_conflict(repo: Any) -> Tuple[str, List[str]]:
    """
    병합 충돌을 생성합니다.

    Args:
        repo: Repo 객체

    Returns:
        Tuple[str, List[str]]: 충돌 브랜치 이름과 충돌 파일 목록
    """
    # 메인 브랜치에서 파일 생성
    main_branch = repo.active_branch
    file_path = Path(repo.working_dir) / "conflict.txt"
    file_path.write_text("Main branch content")
    repo.index.add([str(file_path)])
    repo.index.commit("Initial commit")

    # feature 브랜치 생성
    feature_branch = repo.create_head("feature/conflict")
    feature_branch.checkout()
    file_path.write_text("Feature branch content")
    repo.index.add([str(file_path)])
    repo.index.commit("Feature commit")

    # 메인 브랜치로 돌아가서 파일 수정
    main_branch.checkout()
    file_path.write_text("Modified main content")
    repo.index.add([str(file_path)])
    repo.index.commit("Main branch modification")

    return "feature/conflict", [str(file_path)]


def setup_remote_repo(local_repo: Any) -> Tuple[Path, Any]:
    """
    원격 저장소를 설정합니다.

    Args:
        local_repo: 로컬 저장소

    Returns:
        Tuple[Path, Repo]: 원격 저장소 경로와 Repo 객체
    """
    # 원격 저장소 디렉토리 생성
    remote_dir = Path("/tmp/git_test_remote")
    if remote_dir.exists():
        shutil.rmtree(remote_dir)
    remote_dir.mkdir(parents=True)

    # 원격 저장소 초기화
    remote_repo = Repo.init(remote_dir, bare=True)

    # 로컬 저장소에 원격 저장소 추가
    local_repo.create_remote("origin", str(remote_dir))

    return remote_dir, remote_repo
