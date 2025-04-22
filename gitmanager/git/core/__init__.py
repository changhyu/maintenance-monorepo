"""
Git 서비스의 핵심 기능 모듈
Git 작업에 필요한 핵심 유틸리티, 타입, 예외 클래스 등을 제공합니다.
"""

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
from gitmanager.git.core.utils import (
    build_error_details,
    is_git_installed,
    is_git_repository,
    parse_commit_info,
    parse_git_status,
    run_git_command,
)

__all__ = [
    # 예외 클래스들
    "GitOperationException",
    "GitCommitException",
    "GitMergeException",
    "GitPushPullException",
    "GitBranchException",
    "GitTagException",
    "GitRepositoryException",
    "GitConfigException",
    "GitCommandException",
    # 유틸리티 함수들
    "run_git_command",
    "is_git_installed",
    "is_git_repository",
    "parse_git_status",
    "parse_commit_info",
    "build_error_details",
]
