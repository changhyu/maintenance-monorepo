"""
Git 서비스 관련 예외 클래스 모듈
"""

from typing import Dict, Any, Optional

class GitException(Exception):
    """
    Git 작업 관련 모든 예외의 기본 클래스
    """

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)
        
    def __str__(self) -> str:
        if self.details:
            return f"{self.message} (세부 정보: {self.details})"
        return self.message


class GitCommitException(GitException):
    """
    Git 커밋 작업 중 발생한 예외
    """

    pass


class GitMergeException(GitException):
    """
    Git 병합 작업 중 발생한 예외
    """

    pass


class GitPushPullException(GitException):
    """
    Git push/pull 작업 중 발생한 예외
    """

    pass


class GitBranchException(GitException):
    """
    Git 브랜치 작업 중 발생한 예외
    """

    pass


class GitTagException(GitException):
    """
    Git 태그 작업 중 발생한 예외
    """

    pass


# 하위 호환성을 위한 별칭
GitOperationException = GitException
