"""
Git 관련 타입들을 정의하는 모듈
"""

from datetime import datetime
from typing import Dict, List, Literal, Optional, TypedDict, Union


class BranchComparisonResult(TypedDict):
    """Git 브랜치 비교 결과"""

    source_branch: str
    target_branch: str
    ahead: int
    behind: int
    commits: List[Dict[str, str]]
    files: List[Dict[str, str]]
    stats: Dict[str, int]


class CommitStats(TypedDict):
    """Git 커밋 통계 정보"""

    total_files: int
    insertions: int
    deletions: int
    total_changes: int
    files: Dict[str, Dict[str, int]]


class CommitInfo(TypedDict):
    """Git 커밋 상세 정보"""

    hash: str
    author: str
    email: str
    message: str
    date: datetime
    parents: List[str]
    stats: Dict[str, int]


class TagInfo(TypedDict):
    """Git 태그 상세 정보"""

    name: str
    commit: str
    message: Optional[str]
    date: Optional[datetime]
    author: Optional[str]
    is_annotated: bool


class BranchStrategy(TypedDict):
    """Git 브랜치 전략 정보"""

    name: str
    prefix: str
    description: str
    is_protected: bool
    merge_strategy: Literal["merge", "rebase", "squash"]
    require_review: bool
    require_approval: bool
    require_ci: bool
    require_status_checks: bool
    allow_force_push: bool
    allow_deletion: bool


class BranchInfo(TypedDict):
    """Git 브랜치 상세 정보"""

    name: str
    is_current: bool
    is_remote: bool
    tracking: Optional[str]
    last_commit: Optional[Dict[str, str]]


class MergeConflictResult(TypedDict):
    """Git 병합 충돌 해결 결과"""

    success: bool
    conflict: bool
    error: Optional[str]
    resolved_files: List[str]


class PullPushResult(TypedDict):
    """Git 풀/푸시 작업 결과"""

    success: bool
    details: str
    error: Optional[str]


class PullPushResultWithChanges(TypedDict):
    """변경사항이 포함된 Git 풀/푸시 작업 결과"""

    success: bool
    details: str
    changes: bool
    branch: str
    message: str
    error: Optional[str]


class CommitResponse(TypedDict):
    """Git 커밋 응답 정보"""

    success: bool
    commit: str
    message: str
    details: str


class CommitResult(TypedDict):
    """Git 커밋 결과"""

    success: bool
    commit: str
    message: str
    details: str


class CommitWarning(TypedDict):
    """Git 커밋 경고"""

    warning: str


class GitStatusResult(TypedDict):
    """Git 저장소 상태 조회 결과"""

    branch: str
    has_changes: bool
    modified_files: int
    last_commit: Optional[Dict[str, str]]


class GitStatus(TypedDict):
    """Git 저장소 상태 정보"""

    branch: str
    is_clean: bool
    modified_files: List[str]
    untracked_files: List[str]
    staged_files: List[str]
    last_commit: Optional[str]
    last_commit_message: Optional[str]
    last_commit_author: Optional[str]
    last_commit_date: Optional[datetime]


class GitCommit(TypedDict):
    """Git 커밋 정보"""

    hash: str
    message: str
    author: str
    date: datetime
    parents: List[str]


class GitBranch(TypedDict):
    """Git 브랜치 정보"""

    name: str
    is_current: bool
    is_remote: bool
    last_commit: Optional[str]
    last_commit_message: Optional[str]
    last_commit_date: Optional[datetime]


class GitTag(TypedDict):
    """Git 태그 정보"""

    name: str
    commit: str
    message: Optional[str]
    date: Optional[datetime]
    is_annotated: bool


class FileHistory(TypedDict):
    """Git 파일 변경 이력 정보"""

    commits: List[GitCommit]
    file_path: str
    total_changes: int


class GitChange(TypedDict):
    """Git 변경 사항 정보"""

    file_path: str
    change_type: str
    additions: int
    deletions: int
    diff: str


class GitChanges(TypedDict):
    """Git 커밋 간 변경 사항 정보"""

    from_commit: str
    to_commit: str
    changes: List[GitChange]
    total_changes: int
    total_additions: int
    total_deletions: int


class CommitComparison(TypedDict):
    """Git 커밋 비교 결과"""

    from_commit: str
    to_commit: str
    changes: List[GitChange]
    stats: Dict[str, int]


class GitRemote(TypedDict):
    """Git 원격 저장소 정보"""

    name: str
    url: str
    fetch_url: str
    push_url: str


class GitConfig(TypedDict):
    """Git 설정 정보"""

    user_name: Optional[str]
    user_email: Optional[str]
    remote_origin_url: Optional[str]
    branch_main: Optional[str]
    branch_develop: Optional[str]
