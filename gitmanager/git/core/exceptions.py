"""
Git 관련 예외 클래스 모듈

Git 작업 과정에서 발생할 수 있는 다양한 예외 상황을 처리하기 위한 예외 클래스를 제공합니다.
"""

from typing import Any, Dict, List, Optional


class GitOperationException(Exception):
    """
    Git 작업 관련 모든 예외의 기본 클래스

    Git 작업 중 발생하는 모든 예외는 이 클래스를 상속받습니다.
    """

    def __init__(self, message: str) -> None:
        """
        GitOperationException 초기화

        Args:
            message: 예외 메시지
        """
        super().__init__(message)
        self.message = message


class GitAuthenticationException(GitOperationException):
    """
    Git 인증 관련 예외

    인증 정보가 잘못되었거나, 권한이 없는 경우 발생하는 예외입니다.
    """

    pass


class GitRemoteException(GitOperationException):
    """Git 원격 저장소 관련 예외

    원격 저장소 추가, 조회, 동기화 등의 과정에서 발생하는 예외
    """

    pass


class GitCommitException(GitOperationException):
    """Git 커밋 관련 예외

    커밋 생성, 조회, 수정 등의 과정에서 발생하는 예외
    """

    pass


class GitMergeException(GitOperationException):
    """
    Git 병합 작업 중 발생한 예외

    브랜치 병합, 충돌 해결 등의 작업 중 발생하는 오류를 나타냅니다.
    """

    pass


class GitPushPullException(GitOperationException):
    """
    Git push/pull 작업 중 발생한 예외

    원격 저장소와의 동기화 작업 중 발생하는 오류를 나타냅니다.
    """

    pass


class GitBranchException(GitOperationException):
    """Git 브랜치 관련 예외

    브랜치 생성, 전환, 삭제 등의 과정에서 발생하는 예외
    """

    pass


class GitTagException(GitOperationException):
    """Git 태그 관련 예외

    태그 생성, 조회, 삭제 등의 과정에서 발생하는 예외
    """

    pass


class GitRepositoryException(GitOperationException):
    """Git 저장소 관련 예외

    저장소 초기화, 접근, 검색 등의 과정에서 발생하는 예외
    """

    pass


class GitConfigException(GitOperationException):
    """Git 설정 관련 예외

    설정 조회, 변경 등의 과정에서 발생하는 예외
    """

    pass


class GitCommandException(GitOperationException):
    """
    Git 명령어 실행 중 발생한 예외

    Git 명령어가 실패하거나 오류 코드를 반환할 때 발생합니다.
    """

    def __init__(
        self,
        message: str,
        command: Optional[str] = None,
        exit_code: int = -1,
        stderr: str = "",
        stdout: str = "",
    ) -> None:
        """
        GitCommandException 초기화

        Args:
            message: 예외 메시지
            command: 실행된 Git 명령어
            exit_code: 명령어의 종료 코드
            stderr: 명령어의 표준 오류 출력
            stdout: 명령어의 표준 출력
        """
        super().__init__(message)
        self.command = command
        self.exit_code = exit_code
        self.stderr = stderr
        self.stdout = stdout

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
            "stdout": self.stdout,
        }


class GitConflictException(GitOperationException):
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
