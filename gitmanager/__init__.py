"""
Git 관리 패키지

이 패키지는 Git 저장소 관리를 위한 표준화된 인터페이스를 제공합니다.
"""

import logging
from typing import Optional, Dict, Any, Type

# 로거 설정
logger = logging.getLogger(__name__)

# Git 서비스 클래스에 대한 단일 진입점 제공
def get_git_service():
    """
    GitService 클래스를 lazy import합니다.
    이 함수는 GitService의 표준화된 단일 진입점입니다.
    
    Returns:
        GitService 클래스
    """
    from gitmanager.git.core.service import GitService
    return GitService

# 편의를 위한 GitService 직접 임포트 (선택적)
try:
    from gitmanager.git.core.service import GitService as CoreGitService
    
    # 표준화된 외부 접근 포인트
    class GitService(CoreGitService):
        """
        GitService 단일 접근점
        
        이 클래스는 gitmanager.git.core.service.GitService를 상속하여
        애플리케이션 전체에서 사용할 표준화된 인터페이스를 제공합니다.
        """
        
        def __init__(self, repository_path=None, options=None, **kwargs):
            """
            GitService 초기화
            
            Args:
                repository_path: Git 저장소 경로
                options: 설정 옵션
                **kwargs: 추가 인자
            """
            # 하위 호환성을 위한 인자 조정
            if 'repo_path' in kwargs and repository_path is None:
                repository_path = kwargs.pop('repo_path')
                
            super().__init__(repository_path=repository_path, options=options)
            
            # 추가 로깅
            logger.debug(f"GitService 초기화: {repository_path}")
    
    # 예외 클래스도 상위 레벨로 노출
    from gitmanager.git.core.exceptions import (
        GitException,
        GitAuthenticationException,
        GitBranchException,
        GitCommandException,
        GitConflictException,
        GitMergeException,
        GitRepositoryException,
    )
    
except ImportError as e:
    logger.warning(f"GitService 임포트 실패: {str(e)}")
    
    # 가짜 클래스 정의 (에러 처리를 위해)
    class GitService:
        """Git 서비스를 사용할 수 없을 때의 더미 클래스"""
        def __init__(self, *args, **kwargs):
            raise ImportError("GitService를 임포트할 수 없습니다. 필요한 패키지가 설치되어 있는지 확인하세요.")

# 타입 지원을 위한 선택적 함수 추가
def get_git_exceptions() -> Dict[str, Type]:
    """
    GitPython 예외 클래스들을 반환합니다.
    
    Returns:
        Dict[str, Type]: 예외 클래스 딕셔너리
    """
    try:
        from gitmanager.git.core.exceptions import (
            GitException,
            GitAuthenticationException,
            GitBranchException,
            GitCommandException,
            GitConflictException,
            GitMergeException,
            GitRepositoryException,
        )
        
        return {
            "GitException": GitException,
            "GitAuthenticationException": GitAuthenticationException,
            "GitBranchException": GitBranchException,
            "GitCommandException": GitCommandException,
            "GitConflictException": GitConflictException,
            "GitMergeException": GitMergeException,
            "GitRepositoryException": GitRepositoryException,
        }
    except ImportError:
        return {}

__all__ = [
    "GitService",
    "get_git_service",
    "get_git_exceptions"
]
