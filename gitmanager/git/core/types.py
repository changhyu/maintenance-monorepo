"""
Git 서비스 타입 정의 모듈

Git 작업 및 반환 값에 대한 표준화된 타입 정의를 제공합니다.
"""

from datetime import datetime
from pathlib import Path
from typing import Any, Collection, Dict, List, Optional, Set, Tuple, Union
from collections.abc import Sequence

from pydantic import BaseModel, Field

# Python 3.7 호환성을 위해 typing_extensions 사용
from typing_extensions import Literal, TypedDict


class CommitInfo(TypedDict):
    """Git 커밋 정보 타입"""

    hash: str
    author: str
    message: str
    date: str
    email: Optional[str]


class GitStatus(BaseModel):
    """Git 저장소 상태 정보"""

    staged: List[Dict[str, str]] = Field(
        default_factory=list, description="스테이징된 변경사항"
    )
    unstaged: List[Dict[str, str]] = Field(
        default_factory=list, description="스테이징되지 않은 변경사항"
    )
    untracked: List[Dict[str, str]] = Field(
        default_factory=list, description="추적되지 않는 파일"
    )
    is_clean: bool = Field(default=True, description="저장소가 깨끗한지 여부")
    current_branch: str = Field(default="", description="현재 브랜치")
    ahead: int = Field(default=0, description="원격 저장소보다 앞선 커밋 수")
    behind: int = Field(default=0, description="원격 저장소보다 뒤쳐진 커밋 수")
    has_conflicts: bool = Field(default=False, description="충돌이 있는지 여부")
    conflicts: List[Dict[str, str]] = Field(
        default_factory=list, description="충돌 파일 목록"
    )


class GitStatusResult(TypedDict):
    """Git 상태 조회 결과"""

    branch: str
    modified_files: int
    has_changes: bool
    last_commit: Optional[CommitInfo]
    status: Optional[GitStatus]
    success: bool = True
    error: Optional[str] = None


class GitChange(BaseModel):
    """Git 변경사항 정보"""

    path: str = Field(..., description="파일 경로")
    status: str = Field(..., description="변경 상태")
    diff: Optional[str] = Field(default=None, description="변경 내용")


class GitChanges(BaseModel):
    """Git 변경사항 목록"""

    changes: List[GitChange] = Field(default_factory=list, description="변경사항 목록")
    total: int = Field(default=0, description="총 변경사항 수")


class GitCommit(BaseModel):
    """Git 커밋 정보"""

    hash: str = Field(..., description="커밋 해시")
    author: str = Field(..., description="작성자")
    email: str = Field(..., description="이메일")
    message: str = Field(..., description="커밋 메시지")
    date: datetime = Field(..., description="커밋 날짜")
    changes: GitChanges = Field(default_factory=GitChanges, description="변경사항")


class GitBranch(BaseModel):
    """Git 브랜치 정보"""

    name: str = Field(..., description="브랜치 이름")
    is_current: bool = Field(default=False, description="현재 브랜치 여부")
    tracking: Optional[str] = Field(default=None, description="추적 브랜치")
    is_remote: bool = Field(default=False, description="원격 브랜치 여부")
    last_commit: Optional[str] = Field(default=None, description="마지막 커밋 해시")


class GitTag(BaseModel):
    """Git 태그 정보"""

    name: str = Field(..., description="태그 이름")
    commit: str = Field(..., description="커밋 해시")
    message: str = Field(..., description="태그 메시지")
    date: Optional[datetime] = Field(default=None, description="태그 날짜")
    tagger: Optional[Dict[str, str]] = Field(default=None, description="태거 정보")


class RemoteInfo(TypedDict):
    """Git 원격 저장소 정보 타입"""

    name: str
    url: str
    fetch_url: Optional[str]


class GitRemote:
    """Git 원격 저장소 정보"""

    def __init__(self, name: str, url: str, fetch_url: Optional[str] = None):
        self.name = name
        self.url = url  # push URL
        self.fetch_url = fetch_url or url

    def __str__(self) -> str:
        if self.fetch_url != self.url:
            return f"GitRemote(name={self.name}, push_url={self.url}, fetch_url={self.fetch_url})"
        return f"GitRemote(name={self.name}, url={self.url})"

    def __repr__(self) -> str:
        return self.__str__()


class GitConfig(BaseModel):
    """Git 설정 정보"""

    core: Dict[str, str] = Field(default_factory=dict, description="core 설정")
    remote: Dict[str, Dict[str, str]] = Field(
        default_factory=dict, description="원격 저장소 설정"
    )
    branch: Dict[str, Dict[str, str]] = Field(
        default_factory=dict, description="브랜치 설정"
    )
    user: Dict[str, str] = Field(default_factory=dict, description="사용자 설정")


class CommitResult(BaseModel):
    """커밋 결과"""

    success: bool = Field(default=True, description="성공 여부")
    commit: Optional[GitCommit] = Field(default=None, description="커밋 정보")
    error: Optional[str] = Field(default=None, description="오류 메시지")
    warnings: List[str] = Field(default_factory=list, description="경고 메시지")


class CommitWarning(BaseModel):
    """커밋 경고"""

    code: str = Field(..., description="경고 코드")
    message: str = Field(..., description="경고 메시지")
    details: Optional[Dict[str, Any]] = Field(default=None, description="상세 정보")


CommitResponse = Union[CommitResult, CommitWarning]


class PullPushResult(TypedDict):
    """Git pull/push 결과 타입"""

    success: bool
    details: str


class PullPushResultWithChanges(PullPushResult):
    """변경사항 여부가 포함된 pull/push 결과 타입"""

    changes: bool
    branch: Optional[str]
    message: Optional[str]


class MergeConflictResult(TypedDict):
    """병합 충돌 결과 타입"""

    success: bool
    conflict: bool
    error: Optional[str]
    resolved_files: Optional[List[str]]


class BranchInfo(TypedDict):
    """브랜치 정보 타입"""

    name: str
    is_current: bool
    is_remote: bool
    tracking: Optional[str]
    last_commit: Optional[CommitInfo]


BranchStrategy = Literal["ours", "theirs", "manual"]


class TagInfo(TypedDict):
    """태그 정보 타입"""

    name: str
    commit: str
    message: Optional[str]
    date: str
    author: Optional[str]


class AuthorStats(TypedDict):
    """작성자별 통계 정보 타입"""

    commits: int
    insertions: int
    deletions: int


class CommitStats(TypedDict):
    """커밋 통계 정보 타입"""

    total_commits: int
    total_files: int
    total_insertions: int
    total_deletions: int
    authors: Dict[str, AuthorStats]


class FileChange(TypedDict):
    """파일 변경 정보 타입"""

    path: str
    status: str  # 'added', 'modified', 'deleted', 'renamed', 'copied'
    insertions: int
    deletions: int
    old_path: Optional[str]  # 이름 변경 시 이전 경로


class BranchComparisonResult(TypedDict):
    """브랜치 비교 결과 타입"""

    ahead: int  # base 대비 앞선 커밋 수
    behind: int  # base 대비 뒤쳐진 커밋 수
    commits: List[CommitInfo]  # 비교 브랜치에만 있는 커밋
    files: List[FileChange]  # 변경된 파일 목록


class FileHistoryEntry(TypedDict):
    """파일 변경 이력 항목 타입"""

    commit: CommitInfo
    changes: Dict[str, int]  # insertions, deletions
    diff: str


class FileHistory(TypedDict):
    """파일 변경 이력 타입"""

    path: str
    entries: List[FileHistoryEntry]
    total_changes: Dict[str, int]  # total insertions, deletions


class CommitComparison(TypedDict):
    """두 커밋 사이의 변경사항 비교 결과"""

    from_commit: str
    to_commit: str
    changed_files: List[FileChange]
    stats: Dict[str, int]
