"""
Git 관련 예외 클래스 모듈

Git 작업 과정에서 발생할 수 있는 다양한 예외 상황을 처리하기 위한 예외 클래스를 제공합니다.
"""

from typing import Any, Dict, List, Optional


class GitException(Exception):
    """Git 관련 모든 예외의 기본 클래스"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} (세부 정보: {self.details})"
        return self.message

# 하위 호환성을 위한 별칭
GitOperationException = GitException
"""Git 작업 중 발생한 예외를 나타내는 기본 클래스 (GitException과 동일)"""


class GitNotInstalledError(GitException):
    """
    Git이 시스템에 설치되어 있지 않은 경우 발생하는 예외
    
    Git 작업을 수행하기 전에 Git이 시스템에 설치되어 있는지 확인할 때 사용됩니다.
    """
    
    def __init__(self, message: str = "Git이 설치되어 있지 않습니다.") -> None:
        """
        GitNotInstalledError 초기화
        
        Args:
            message: 예외 메시지
        """
        super().__init__(message)


class GitAuthenticationException(GitException):
    """
    Git 인증 관련 예외

    인증 정보가 잘못되었거나, 권한이 없는 경우 발생하는 예외입니다.
    """

    pass


class GitRemoteException(GitException):
    """Git 원격 저장소 관련 예외

    원격 저장소 추가, 조회, 동기화 등의 과정에서 발생하는 예외
    """

    pass


class GitCommitException(GitException):
    """Git 커밋 관련 예외

    커밋 생성, 조회, 수정 등의 과정에서 발생하는 예외
    """

    pass


class GitMergeException(GitException):
    """
    Git 병합 작업 중 발생한 예외

    브랜치 병합, 충돌 해결 등의 작업 중 발생하는 오류를 나타냅니다.
    """

    pass


class GitPushPullException(GitException):
    """
    Git push/pull 작업 중 발생한 예외

    원격 저장소와의 동기화 작업 중 발생하는 오류를 나타냅니다.
    """

    pass


class GitBranchException(GitException):
    """Git 브랜치 관련 예외

    브랜치 생성, 전환, 삭제 등의 과정에서 발생하는 예외
    """

    pass


class GitTagException(GitException):
    """Git 태그 관련 예외

    태그 생성, 조회, 삭제 등의 과정에서 발생하는 예외
    """

    pass


class GitRepositoryException(GitException):
    """Git 저장소 관련 예외

    저장소 초기화, 접근, 검색 등의 과정에서 발생하는 예외
    """

    pass


class GitConfigException(GitException):
    """Git 설정 관련 예외

    설정 조회, 변경 등의 과정에서 발생하는 예외
    """

    pass


class GitStatusException(GitException):
    """Git 상태 관련 예외

    저장소 상태 조회 및 파일 상태 정보 처리 과정에서 발생하는 예외
    """

    pass


class GitCommandException(GitException):
    """Git 명령어 실행 중 발생한 예외"""
    
    def __init__(self, message: str, command: str = "", exit_code: int = -1, stderr: str = "", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)
        self.command = command
        self.exit_code = exit_code
        self.stderr = stderr
        
        # 기본 세부 정보에 명령어 관련 정보 추가
        self.details.update({
            "command": command,
            "exit_code": exit_code,
            "stderr": stderr
        })

    def __str__(self) -> str:
        """예외 객체를 문자열로 변환"""
        return f"{self.message} (command: {self.command}, exit_code: {self.exit_code})"

    def get_error_details(self) -> Dict[str, Any]:
        """
        오류 상세 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 오류 상세 정보를 담은 딕셔너리
        """
        return {
            "message": self.message,
            "command": self.command,
            "exit_code": self.exit_code,
            "stderr": self.stderr,
        }


class GitConflictException(GitException):
    """Git 충돌 관련 예외

    병합 충돌, 충돌 해결 등의 과정에서 발생하는 예외
    """

    def __init__(
        self, message: str, conflicted_files: Optional[List[str]] = None
    ) -> None:
        """
        GitConflictException 초기화

        Args:
            message: 예외 메시지
            conflicted_files: 충돌이 발생한 파일 목록
        """
        super().__init__(message)
        self.conflicted_files: List[str] = conflicted_files or []

    def __str__(self) -> str:
        """예외 객체를 문자열로 변환"""
        return f"{self.message} (conflicted files: {len(self.conflicted_files)})"


class GitMergeConflictException(GitConflictException):
    """Git 병합 충돌 관련 예외

    브랜치 병합 과정에서 발생하는 충돌에 특화된 예외입니다.
    """

    def __init__(
        self,
        message: str,
        conflicted_files: Optional[List[str]] = None,
        source_branch: Optional[str] = None,
        target_branch: Optional[str] = None,
    ) -> None:
        """
        GitMergeConflictException 초기화

        Args:
            message: 예외 메시지
            conflicted_files: 충돌이 발생한 파일 목록
            source_branch: 병합 소스 브랜치 (병합되는 브랜치)
            target_branch: 병합 대상 브랜치 (병합받는 브랜치)
        """
        super().__init__(message, conflicted_files)
        self.source_branch = source_branch
        self.target_branch = target_branch

    def __str__(self) -> str:
        """예외 객체를 문자열로 변환"""
        return f"{self.message} (source: {self.source_branch}, target: {self.target_branch}, conflicted files: {len(self.conflicted_files)})"

    def get_merge_details(self) -> Dict[str, Any]:
        """
        병합 충돌 상세 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 병합 충돌 상세 정보를 담은 딕셔너리
        """
        return {
            "message": self.message,
            "source_branch": self.source_branch,
            "target_branch": self.target_branch,
            "conflicted_files": self.conflicted_files,
            "conflict_count": len(self.conflicted_files),
        }


class GitNetworkException(GitException):
    """Git 네트워크 작업 관련 예외 (pull, push, fetch 등)"""
    pass


class GitCacheException(GitException):
    """Git 서비스 캐시 관련 예외"""
    pass


class GitHooksException(GitException):
    """Git 훅 관련 예외

    훅 생성, 수정, 삭제, 조회 등의 과정에서 발생하는 예외
    """

    pass


def create_git_exception(ex_type: str, message: str, details: Optional[Dict[str, Any]] = None) -> GitException:
    """
    예외 유형에 따라 적절한 GitException 인스턴스를 생성합니다.
    
    Args:
        ex_type: 예외 유형 ("command", "repository", "config", "network", "merge", "cache")
        message: 예외 메시지
        details: 추가 세부 정보
        
    Returns:
        GitException: 적절한 GitException 하위 클래스 인스턴스
    """
    exception_map = {
        "command": GitCommandException,
        "repository": GitRepositoryException,
        "config": GitConfigException,
        "network": GitNetworkException,
        "merge": GitMergeException,
        "cache": GitCacheException,
        "hooks": GitHooksException,
        "branch": GitBranchException,
        "commit": GitCommitException,
        "tag": GitTagException,
        "remote": GitRemoteException,
        "status": GitStatusException
    }
    
    exception_class = exception_map.get(ex_type, GitException)
    
    if ex_type == "command" and details and "command" in details:
        return GitCommandException(
            message, 
            command=details.get("command", ""),
            exit_code=details.get("exit_code", -1),
            stderr=details.get("stderr", ""),
        )
    
    return exception_class(message, details)
