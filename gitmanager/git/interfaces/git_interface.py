"""
Git 서비스 인터페이스 정의

Git 서비스의 기본 동작을 정의하는 인터페이스입니다.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union

# 상대 경로 임포트로 수정
from ...git.core.types import (
    BranchComparisonResult,
    BranchInfo,
    CommitComparison,
    CommitInfo,
    CommitResult,
    CommitStats,
    CommitWarning,
    FileHistory,
    GitChanges,
    GitConfig,
    GitRemote,
    GitStatusResult,
    MergeConflictResult,
    PullPushResult,
    PullPushResultWithChanges,
    TagInfo,
)


class GitInterface(ABC):
    """Git 서비스 인터페이스"""

    @abstractmethod
    def get_status(self) -> GitStatusResult:
        """저장소의 현재 상태를 반환합니다."""
        pass

    @abstractmethod
    def create_commit(self, message: str) -> Union[CommitResult, CommitWarning]:
        """변경사항을 커밋합니다."""
        pass

    @abstractmethod
    def pull(self) -> PullPushResult:
        """원격 저장소에서 변경사항을 가져옵니다."""
        pass

    @abstractmethod
    def push(self) -> PullPushResultWithChanges:
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

    @abstractmethod
    def get_remotes(self) -> List[GitRemote]:
        """
        모든 원격 저장소 목록을 반환합니다.

        Returns:
            List[GitRemote]: 원격 저장소 정보 목록
        """
        pass

    @abstractmethod
    def add_remote(self, name: str, url: str) -> bool:
        """
        새 원격 저장소를 추가합니다.

        Args:
            name (str): 원격 저장소 이름
            url (str): 원격 저장소 URL

        Returns:
            bool: 성공 여부
        """
        pass

    @abstractmethod
    def remove_remote(self, name: str) -> bool:
        """
        원격 저장소를 삭제합니다.

        Args:
            name (str): 삭제할 원격 저장소 이름

        Returns:
            bool: 성공 여부
        """
        pass

    @abstractmethod
    def get_config(self, key: Optional[str] = None) -> Dict[str, Any]:
        """
        Git 설정을 조회합니다.

        Args:
            key (Optional[str]): 조회할 설정 키, None이면 모든 설정 반환

        Returns:
            Dict[str, Any]: 설정 정보 딕셔너리
        """
        pass

    @abstractmethod
    def set_config(self, key: str, value: str, global_config: bool = False) -> bool:
        """
        Git 설정을 변경합니다.

        Args:
            key (str): 설정 키
            value (str): 설정할 값
            global_config (bool): 전역 설정 여부, True면 전역 설정, False면 로컬 설정

        Returns:
            bool: 설정 성공 여부
        """
        pass

    @abstractmethod
    def unset_config(self, key: str, global_config: bool = False) -> bool:
        """
        Git 설정을 삭제합니다.

        Args:
            key (str): 삭제할 설정 키
            global_config (bool): 전역 설정 여부, True면 전역 설정, False면 로컬 설정

        Returns:
            bool: 삭제 성공 여부
        """
        pass

    @abstractmethod
    def fetch_remote(
        self, remote: str = "origin", prune: bool = False, tags: bool = False
    ) -> bool:
        """
        원격 저장소에서 데이터를 가져옵니다. (병합 없음)

        Args:
            remote (str): 원격 저장소 이름, 기본값은 "origin"
            prune (bool): 원격에서 삭제된 브랜치 정리 여부
            tags (bool): 태그 정보도 함께 가져올지 여부

        Returns:
            bool: 가져오기 성공 여부
        """
        pass

    @abstractmethod
    def get_log(
        self,
        limit: int = 10,
        skip: int = 0,
        branch: Optional[str] = None,
        path: Optional[str] = None,
    ) -> List[CommitInfo]:
        """
        Git 커밋 로그를 조회합니다.

        Args:
            limit (int): 조회할 최대 커밋 수
            skip (int): 건너뛸 커밋 수
            branch (str): 조회할 브랜치 이름, None이면 현재 브랜치
            path (str): 특정 파일 또는 경로에 대한 로그만 조회

        Returns:
            List[CommitInfo]: 커밋 정보 목록
        """
        pass

    @abstractmethod
    def get_changes(self) -> GitChanges:
        """
        현재 변경 사항 조회

        Returns:
            GitChanges: 변경 사항 정보
        """
        pass

    @abstractmethod
    def get_commit_stats(self) -> CommitStats:
        """
        커밋 통계 조회

        Returns:
            CommitStats: 커밋 통계 정보
        """
        pass

    @abstractmethod
    def compare_branches(
        self, source: str, target: Optional[str] = None
    ) -> BranchComparisonResult:
        """
        두 브랜치 비교

        Args:
            source: 소스 브랜치
            target: 대상 브랜치 (기본값: 현재 브랜치)

        Returns:
            BranchComparisonResult: 브랜치 비교 결과
        """
        pass

    @abstractmethod
    def merge_branches(
        self, source: str, target: Optional[str] = None
    ) -> MergeConflictResult:
        """
        브랜치 병합

        Args:
            source: 소스 브랜치
            target: 대상 브랜치 (기본값: 현재 브랜치)

        Returns:
            MergeConflictResult: 병합 결과 (충돌 포함)
        """
        pass
