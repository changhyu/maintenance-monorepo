"""
Git 관리자 모듈

Git 저장소 관리를 위한 핵심 기능을 제공합니다.
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


def get_git_service():
    """GitService 클래스를 lazy import합니다."""
    from gitmanager.git.core.service import GitService

    return GitService


__all__ = [
    "get_git_service",
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
