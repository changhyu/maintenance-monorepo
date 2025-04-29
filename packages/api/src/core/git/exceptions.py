from typing import Any, Dict, Optional


class GitException(Exception):
    """Git 관련 기본 예외 클래스"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class GitRepositoryException(GitException):
    """Git 저장소 관련 예외"""

    pass


class GitCommandException(GitException):
    """Git 명령어 실행 관련 예외"""

    pass


class GitConflictException(GitException):
    """Git 충돌 관련 예외"""

    pass


class GitAuthenticationException(GitException):
    """Git 인증 관련 예외"""

    pass


class GitRemoteException(GitException):
    """Git 원격 저장소 관련 예외"""

    pass
