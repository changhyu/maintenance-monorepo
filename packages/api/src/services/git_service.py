"""
GitService 모듈 리디렉션

이 모듈은 이전 경로 호환성을 위해 존재합니다.
실제 구현은 gitmanager.git.core.service로 이동되었습니다.

참고: 이 파일은 자동화된 스크립트에 의해 생성되었습니다.
      이전 구현은 백업 파일에서 확인할 수 있습니다.
"""

# 실제 구현으로 리디렉션
from gitmanager.git.core.service import GitService

# 호환성을 위한 예외 클래스 리디렉션
from gitmanager.git.core.exceptions import (
    GitAuthenticationException,
    GitBranchException,
    GitCommandException,
    GitCommitException,
    GitConflictException,
    GitMergeException,
    GitException,
    GitPushPullException,
    GitRemoteException,
    GitRepositoryException,
    GitTagException,
)

# 유틸리티 함수 리디렉션
from gitmanager.git.core.utils import (
    run_git_command,
    is_git_installed,
    is_git_repository,
    parse_git_status,
    parse_commit_info,
    parse_branch_info,
    parse_tag_info,
    parse_file_history,
    parse_changes,
    parse_remote_info,
    parse_config_info,
    find_conflict_markers,
)

# 타입 정의 리디렉션
from gitmanager.git.core.types import (
    GitStatusResult,
    CommitResponse,
    PullPushResult,
    PullPushResultWithChanges,
    MergeConflictResult,
    BranchInfo,
    TagInfo,
    CommitInfo,
    FileHistory,
    CommitComparison,
    GitStatus,
    GitCommit,
    GitBranch,
    GitTag,
    GitChange,
    GitChanges,
    GitRemote,
    GitConfig,
    CommitResult,
    CommitWarning,
)

# 명시적으로 버전 정보 추가
__version__ = "0.2.1"
