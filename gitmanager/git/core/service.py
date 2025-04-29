"""
Git 서비스 모듈

이 모듈은 Git 저장소 관리 및 작업을 위한 서비스 클래스를 제공합니다.
참고: 이 모듈은 하위 호환성을 위해 유지되며, 실제 구현은 서비스 모듈로 분리되었습니다.
"""

import logging
import warnings
from typing import Any, Dict, List, Optional, Union

from gitmanager.git.core.exceptions import GitNotInstalledError
from gitmanager.git.core.utils import is_git_installed
from gitmanager.git.core.types import (
    GitStatusResult, CommitResult, MergeConflictResult, PullPushResult, 
    GitConfig, GitRemote, GitTag, PullPushResultWithChanges
)

# 서비스 모듈 가져오기
from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.services.status_service import GitStatusService
from gitmanager.git.core.services.commit_service import GitCommitService
from gitmanager.git.core.services.branch_service import GitBranchService
from gitmanager.git.core.services.cache_service import GitCacheService
from gitmanager.git.core.services.remote_service import GitRemoteService
from gitmanager.git.core.services.tag_service import GitTagService
from gitmanager.git.core.services.config_service import GitConfigService

class GitService:
    """
    Git 저장소 작업을 관리하는 서비스 클래스
    
    참고: 이 클래스는 하위 호환성을 위해 유지됩니다. 새로운 코드에서는 gitmanager.git.core.services 패키지의 전용 서비스 클래스를 사용하세요.
    """
    def __init__(self, repository_path=None, options=None, repo_path=None):
        """
        GitService 클래스 초기화
        
        Parameters:
        -----------
        repository_path : str
            Git 저장소 경로
        options : dict, optional
            설정 옵션
        repo_path : str, optional
            Git 저장소 경로 (repository_path의 별칭)
        """
        # repo_path가 전달되었고 repository_path가 None이면, repo_path를 사용
        if repository_path is None and repo_path is not None:
            repository_path = repo_path
            
        # Git이 설치되어 있는지 확인
        if not is_git_installed():
            raise GitNotInstalledError("Git이 설치되어 있지 않습니다.")
        
        # 로거 설정
        self.logger = logging.getLogger(f"{__name__}.GitService")
        
        # 초기 경고
        warnings.warn(
            "GitService 클래스는 하위 호환성을 위해 유지됩니다. "
            "새로운 코드에서는 gitmanager.git.core.services 패키지의 전용 서비스 클래스를 사용하세요.",
            DeprecationWarning, stacklevel=2
        )
        
        # 저장소 경로 저장
        self._repository_path = repository_path
        self._options = options or {}
        
        # 서비스 인스턴스 생성
        common_args = {
            "repository_path": repository_path,
            "options": options
        }
        
        try:
            self._status_service = GitStatusService(**common_args)
            self._commit_service = GitCommitService(**common_args)
            self._branch_service = GitBranchService(**common_args)
            self._cache_service = GitCacheService(**common_args)
            self._remote_service = GitRemoteService(**common_args)
            self._tag_service = GitTagService(**common_args)
            self._config_service = GitConfigService(**common_args)
        except Exception as e:
            self.logger.error(f"서비스 초기화 중 오류 발생: {str(e)}")
            raise
        
    #
    # 상태 관련 메서드
    #
        
    def get_status(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        Git 저장소의 현재 상태 정보를 반환합니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            Dict[str, Any]: 저장소 상태 정보
        """
        return self._status_service.get_status(use_cache=use_cache)
    
    def is_clean(self) -> bool:
        """
        저장소가 깨끗한지 여부를 반환합니다.
        
        Returns:
            bool: 저장소가 깨끗한지 여부
        """
        return self._status_service.is_clean()
    
    def has_conflicts(self) -> bool:
        """
        저장소에 충돌이 있는지 여부를 반환합니다.
        
        Returns:
            bool: 충돌 여부
        """
        return self._status_service.has_conflicts()
    
    #
    # 커밋 관련 메서드
    #
    
    def commit(
        self, 
        message: str, 
        add_all: bool = False, 
        files: Optional[List[str]] = None,
        author: Optional[str] = None,
        email: Optional[str] = None
    ) -> CommitResult:
        """
        변경사항을 커밋합니다.
        
        Args:
            message: 커밋 메시지
            add_all: 모든 변경사항을 스테이징할지 여부
            files: 스테이징할 파일 목록 (add_all이 True면 무시됨)
            author: 커밋 작성자 (기본값: 저장소 설정)
            email: 커밋 작성자 이메일 (기본값: 저장소 설정)
            
        Returns:
            CommitResult: 커밋 결과
        """
        return self._commit_service.commit(
            message=message,
            add_all=add_all,
            files=files,
            author=author,
            email=email
        )
    
    def get_commit(self, commit_hash: str) -> Optional[Dict[str, Any]]:
        """
        특정 커밋의 정보를 조회합니다.
        
        Args:
            commit_hash: 커밋 해시
            
        Returns:
            Optional[Dict[str, Any]]: 커밋 정보
        """
        return self._commit_service.get_commit(commit_hash)
    
    def get_commit_history(
        self, 
        path: Optional[str] = None, 
        limit: int = 0, 
        skip: int = 0,
        since: Optional[str] = None,
        until: Optional[str] = None,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """
        커밋 이력을 조회합니다.
        
        Args:
            path: 파일 경로 (특정 파일의 커밋 이력 조회)
            limit: 최대 결과 수 (0=제한 없음)
            skip: 건너뛸 결과 수
            since: 시작 날짜 (ISO 형식: YYYY-MM-DD)
            until: 종료 날짜 (ISO 형식: YYYY-MM-DD)
            use_cache: 캐시 사용 여부
            
        Returns:
            List[Dict[str, Any]]: 커밋 이력
        """
        return self._commit_service.get_commit_history(
            path=path,
            limit=limit,
            skip=skip,
            since=since,
            until=until,
            use_cache=use_cache
        )
    
    #
    # 브랜치 관련 메서드
    #
    
    def get_branches(self, include_remote: bool = True, use_cache: bool = True) -> List[Dict[str, Any]]:
        """
        브랜치 목록을 조회합니다.
        
        Args:
            include_remote: 원격 브랜치 포함 여부
            use_cache: 캐시 사용 여부
            
        Returns:
            List[Dict[str, Any]]: 브랜치 목록
        """
        branches = self._branch_service.get_branches(
            include_remote=include_remote,
            use_cache=use_cache
        )
        
        # 타입 변환 (기존 API와 호환성 유지)
        # TODO: 향후 메이저 버전 업데이트 시 GitBranch 객체를 직접 반환하는 방식으로 개선
        return [branch.dict() for branch in branches]
        
    def get_branch_objects(self, include_remote: bool = True, use_cache: bool = True):
        """
        브랜치 객체 목록을 조회합니다.
        향후 메이저 버전 업데이트에서 get_branches의 기본 동작이 될 예정입니다.
        
        Args:
            include_remote: 원격 브랜치 포함 여부
            use_cache: 캐시 사용 여부
            
        Returns:
            List[GitBranch]: GitBranch 객체 목록
        """
        return self._branch_service.get_branches(
            include_remote=include_remote,
            use_cache=use_cache
        )
        
    def get_current_branch(self) -> Optional[str]:
        """
        현재 브랜치 이름을 조회합니다.
        
        Returns:
            Optional[str]: 현재 브랜치 이름
        """
        return self._branch_service.get_current_branch()
    
    def create_branch(self, name: str, start_point: Optional[str] = None) -> bool:
        """
        새로운 브랜치를 생성합니다.
        
        Args:
            name: 브랜치 이름
            start_point: 시작 지점 (커밋, 브랜치 등)
            
        Returns:
            bool: 성공 여부
        """
        return self._branch_service.create_branch(name, start_point)
    
    def checkout_branch(self, name: str, create: bool = False) -> bool:
        """
        브랜치를 체크아웃합니다.
        
        Args:
            name: 브랜치 이름
            create: 브랜치가 없으면 생성할지 여부
            
        Returns:
            bool: 성공 여부
        """
        return self._branch_service.checkout_branch(name, create)
    
    def delete_branch(self, name: str, force: bool = False) -> bool:
        """
        브랜치를 삭제합니다.
        
        Args:
            name: 브랜치 이름
            force: 강제 삭제 여부
            
        Returns:
            bool: 성공 여부
        """
        return self._branch_service.delete_branch(name, force)
    
    def merge_branch(self, source: str, target: Optional[str] = None, message: Optional[str] = None) -> Union[bool, MergeConflictResult]:
        """
        브랜치를 병합합니다.
        
        Args:
            source: 소스 브랜치 (병합할 브랜치)
            target: 대상 브랜치 (병합 대상, 없으면 현재 브랜치)
            message: 커밋 메시지
            
        Returns:
            Union[bool, MergeConflictResult]: 성공 여부 또는 충돌 정보
        """
        return self._branch_service.merge_branch(source, target, message)
    
    #
    # 원격 저장소 관련 메서드
    #
    
    def get_remotes(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        """
        원격 저장소 목록을 조회합니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            List[Dict[str, Any]]: 원격 저장소 목록
        """
        remotes = self._remote_service.get_remotes(use_cache=use_cache)
        
        # 타입 변환 (기존 API와 호환성 유지)
        # 새 메서드 get_remote_objects 추가됨 (v2.0.0 이상에서 사용 권장)
        return [{"name": r.name, "url": r.url, "fetch_url": r.fetch_url} for r in remotes]
    
    def get_remote_objects(self, use_cache: bool = True):
        """
        원격 저장소 객체 목록을 조회합니다.
        향후 메이저 버전 업데이트에서 get_remotes의 기본 동작이 될 예정입니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            List[GitRemote]: GitRemote 객체 목록
        """
        return self._remote_service.get_remotes(use_cache=use_cache)
    
    def add_remote(self, name: str, url: str) -> bool:
        """
        원격 저장소를 추가합니다.
        
        Args:
            name: 원격 저장소 이름
            url: 원격 저장소 URL
            
        Returns:
            bool: 성공 여부
        """
        return self._remote_service.add_remote(name, url)
    
    def remove_remote(self, name: str) -> bool:
        """
        원격 저장소를 삭제합니다.
        
        Args:
            name: 원격 저장소 이름
            
        Returns:
            bool: 성공 여부
        """
        return self._remote_service.remove_remote(name)
    
    def push(self, remote: str = "origin", branch: Optional[str] = None, force: bool = False) -> PullPushResult:
        """
        변경사항을 원격 저장소에 푸시합니다.
        
        Args:
            remote: 원격 저장소 이름
            branch: 푸시할 브랜치 (없으면 현재 브랜치)
            force: 강제 푸시 여부
            
        Returns:
            PullPushResult: 푸시 결과
        """
        return self._remote_service.push(remote, branch, force)
    
    def pull(self, remote: str = "origin", branch: Optional[str] = None) -> PullPushResultWithChanges:
        """
        원격 저장소의 변경사항을 가져와 병합합니다.
        
        Args:
            remote: 원격 저장소 이름
            branch: 가져올 브랜치 (없으면 현재 브랜치)
            
        Returns:
            PullPushResultWithChanges: 풀 결과
        """
        return self._remote_service.pull(remote, branch)
    
    def fetch(self, remote: str = "origin", all_remotes: bool = False, prune: bool = False) -> PullPushResult:
        """
        원격 저장소의 변경사항을 가져옵니다(병합 없음).
        
        Args:
            remote: 원격 저장소 이름
            all_remotes: 모든 원격 저장소 가져오기 여부
            prune: 원격에서 삭제된 브랜치 정리 여부
            
        Returns:
            PullPushResult: 가져오기 결과
        """
        return self._remote_service.fetch(remote, all_remotes, prune)
    
    #
    # 태그 관련 메서드
    #
    
    def get_tags(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        """
        태그 목록을 조회합니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            List[Dict[str, Any]]: 태그 목록
        """
        tags = self._tag_service.get_tags(use_cache=use_cache)
        
        # 타입 변환 (기존 API와 호환성 유지)
        # 새 메서드 get_tag_objects 추가됨 (v2.0.0 이상에서 사용 권장)
        return [tag.dict() for tag in tags]
        
    def get_tag_objects(self, use_cache: bool = True):
        """
        태그 객체 목록을 조회합니다.
        향후 메이저 버전 업데이트에서 get_tags의 기본 동작이 될 예정입니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            List[GitTag]: GitTag 객체 목록
        """
        return self._tag_service.get_tags(use_cache=use_cache)
    
    def get_tag(self, name: str) -> Optional[Dict[str, Any]]:
        """
        특정 태그의 정보를 조회합니다.
        
        Args:
            name: 태그 이름
            
        Returns:
            Optional[Dict[str, Any]]: 태그 정보
        """
        tag = self._tag_service.get_tag(name)
        return tag.dict() if tag else None
    
    def create_tag(self, name: str, message: Optional[str] = None, commit: str = "HEAD") -> bool:
        """
        새로운 태그를 생성합니다.
        
        Args:
            name: 태그 이름
            message: 태그 메시지
            commit: 태그를 생성할 커밋 (기본값: HEAD)
            
        Returns:
            bool: 성공 여부
        """
        return self._tag_service.create_tag(name, message, commit)
    
    def delete_tag(self, name: str) -> bool:
        """
        태그를 삭제합니다.
        
        Args:
            name: 태그 이름
            
        Returns:
            bool: 성공 여부
        """
        return self._tag_service.delete_tag(name)
    
    def push_tags(self, remote: str = "origin", tag: Optional[str] = None) -> bool:
        """
        태그를 원격 저장소에 푸시합니다.
        
        Args:
            remote: 원격 저장소 이름
            tag: 푸시할 태그 이름 (없으면 모든 태그)
            
        Returns:
            bool: 성공 여부
        """
        return self._tag_service.push_tags(remote, tag)
    
    #
    # 설정 관련 메서드
    #
    
    def get_config(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        Git 설정을 조회합니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            Dict[str, Any]: Git 설정
        """
        config = self._config_service.get_config(use_cache=use_cache)
        
        # 타입 변환 (기존 API와 호환성 유지)
        # 새 메서드 get_config_object 추가됨 (v2.0.0 이상에서 사용 권장)
        return config.dict()
        
    def get_config_object(self, use_cache: bool = True):
        """
        Git 설정 객체를 조회합니다.
        향후 메이저 버전 업데이트에서 get_config의 기본 동작이 될 예정입니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            GitConfig: Git 설정 객체
        """
        return self._config_service.get_config(use_cache=use_cache)
    
    def get_config_value(self, key: str) -> Optional[str]:
        """
        특정 설정 값을 조회합니다.
        
        Args:
            key: 설정 키
            
        Returns:
            Optional[str]: 설정 값
        """
        return self._config_service.get_config_value(key)
    
    def set_config_value(self, key: str, value: str, global_config: bool = False) -> bool:
        """
        설정 값을 설정합니다.
        
        Args:
            key: 설정 키
            value: 설정 값
            global_config: 전역 설정 여부
            
        Returns:
            bool: 성공 여부
        """
        return self._config_service.set_config_value(key, value, global_config)
    
    def unset_config_value(self, key: str, global_config: bool = False) -> bool:
        """
        설정 값을 삭제합니다.
        
        Args:
            key: 설정 키
            global_config: 전역 설정 여부
            
        Returns:
            bool: 성공 여부
        """
        return self._config_service.unset_config_value(key, global_config)
    
    def set_user_info(self, name: str, email: str, global_config: bool = False) -> bool:
        """
        사용자 정보를 설정합니다.
        
        Args:
            name: 사용자 이름
            email: 사용자 이메일
            global_config: 전역 설정 여부
            
        Returns:
            bool: 성공 여부
        """
        return self._config_service.set_user_info(name, email, global_config)
    
    #
    # 캐시 관련 메서드
    #
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보를 조회합니다.
        
        Returns:
            Dict[str, Any]: 캐시 통계 정보
        """
        return self._cache_service.get_cache_stats()
    
    def clear_cache(self, pattern: Optional[str] = None) -> int:
        """
        캐시를 삭제합니다.
        
        Args:
            pattern: 삭제할 캐시 키 패턴 (기본값: 전체)
            
        Returns:
            int: 삭제된 항목 수
        """
        return self._cache_service.clear_cache(pattern)
    
    def optimize_cache(self) -> Dict[str, Any]:
        """
        캐시를 최적화합니다.
        
        Returns:
            Dict[str, Any]: 최적화 결과 통계
        """
        return self._cache_service.optimize_cache()
    
    def enable_disk_cache(self, enabled: bool = True, directory: Optional[str] = None) -> bool:
        """
        디스크 캐시를 활성화/비활성화합니다.
        
        Args:
            enabled: 활성화 여부
            directory: 캐시 디렉토리 경로
            
        Returns:
            bool: 성공 여부
        """
        return self._cache_service.enable_disk_cache(enabled, directory)
