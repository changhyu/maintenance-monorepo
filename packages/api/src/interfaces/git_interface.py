"""
Git 서비스 인터페이스 모듈
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Union

from packagescore.types import (
    BranchInfo,
    CommitComparison,
    CommitResponse,
    FileHistory,
    GitBranch,
    GitChange,
    GitChanges,
    GitCommit,
    GitConfig,
    GitRemote,
    GitStatus,
    GitTag,
    MergeConflictResult,
    PullPushResult,
    PullPushResultWithChanges,
    TagInfo,
)


class GitInterface(ABC):
    """Git 서비스 인터페이스"""

    @abstractmethod
    def get_status(self) -> GitStatus:
        """현재 Git 저장소의 상태를 반환합니다."""
        pass

    @abstractmethod
    def create_commit(self, message: str, author: Optional[str] = None) -> GitCommit:
        """새로운 커밋을 생성합니다."""
        pass

    @abstractmethod
    def pull(self, remote: str = "origin", branch: str = "main") -> None:
        """원격 저장소에서 변경사항을 가져옵니다."""
        pass

    @abstractmethod
    def push(self, remote: str = "origin", branch: str = "main") -> None:
        """로컬 변경사항을 원격 저장소에 푸시합니다."""
        pass

    @abstractmethod
    def resolve_merge_conflicts(self) -> MergeConflictResult:
        """병합 충돌을 해결합니다."""
        pass

    @abstractmethod
    def create_branch(self, name: str) -> BranchInfo:
        """새로운 브랜치를 생성합니다."""
        pass

    @abstractmethod
    def delete_branch(self, name: str) -> bool:
        """브랜치를 삭제합니다."""
        pass

    @abstractmethod
    def switch_branch(self, name: str) -> BranchInfo:
        """브랜치를 전환합니다."""
        pass

    @abstractmethod
    def list_branches(self) -> List[BranchInfo]:
        """모든 브랜치 목록을 반환합니다."""
        pass

    @abstractmethod
    def create_tag(self, name: str, message: str) -> TagInfo:
        """새로운 태그를 생성합니다."""
        pass

    @abstractmethod
    def delete_tag(self, name: str) -> bool:
        """태그를 삭제합니다."""
        pass

    @abstractmethod
    def list_tags(self) -> List[TagInfo]:
        """모든 태그 목록을 반환합니다."""
        pass

    @abstractmethod
    def get_file_history(self, file_path: str) -> FileHistory:
        """파일의 변경 이력을 반환합니다."""
        pass

    @abstractmethod
    def get_changes_between_commits(
        self, from_commit: str, to_commit: str
    ) -> CommitComparison:
        """두 커밋 사이의 변경사항을 반환합니다."""
        pass
