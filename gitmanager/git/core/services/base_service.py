"""
Git 기본 서비스 모듈

이 모듈은 모든 Git 관련 서비스 클래스의 기본 클래스를 제공합니다.
공통 기능과 인터페이스를 정의합니다.
"""

import logging
import os
import hashlib
from typing import Any, Dict, List, Optional, TypeVar
from threading import Lock

from gitmanager.git.core.exceptions import GitNotInstalledError
from gitmanager.git.core.utils import is_git_installed, run_git_command
from gitmanager.git.core.cache_utils import (
    get_unified_cache_manager, 
    get_git_cache_key,
    DEFAULT_TTL, LONG_TTL, SHORT_TTL
)

# 제네릭 타입 변수 정의
T = TypeVar("T")

# 기본 캐시 설정 (초 단위)
DEFAULT_TTL_SETTINGS = {
    "status": SHORT_TTL,     # 상태는 60초 동안 캐시
    "branches": SHORT_TTL,   # 브랜치 목록은 60초 동안 캐시
    "tags": SHORT_TTL,       # 태그 목록은 60초 동안 캐시
    "remotes": DEFAULT_TTL,  # 원격 저장소 목록은 5분 동안 캐시
    "commit_history": DEFAULT_TTL,   # 커밋 히스토리는 5분 동안 캐시
    "file_contributors": LONG_TTL,   # 파일 기여자는 1시간 동안 캐시
    "file_history": LONG_TTL,        # 파일 히스토리는 1시간 동안 캐시
    "repository_metrics": LONG_TTL,  # 저장소 메트릭은 1시간 동안 캐시
    "config": DEFAULT_TTL,           # 설정은 5분 동안 캐시
    "default": DEFAULT_TTL,          # 기본 캐시 유지 시간 (5분)
}

class GitServiceBase:
    """
    Git 서비스의 기본 클래스
    """
    def __init__(self, repository_path=None, options=None, repo_path=None):
        """
        GitServiceBase 클래스 초기화
        
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
        
        # 옵션 설정
        self._options = options or {}
        self._repository_path = os.path.abspath(repository_path)
        self._debug_enabled = self._options.get('debug', False)
        
        # 로거 설정
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        
        # 성능 통계 초기화
        self._performance_stats = {}
        
        # 캐시 락 생성
        self._cache_lock = Lock()
        
        # 캐시 설정 가져오기
        cache_options = self._options.get('cache', {})
        self._cache_enabled = cache_options.get('enabled', True)
        
        # 캐시 TTL 설정 준비
        self.cache_settings = dict(DEFAULT_TTL_SETTINGS)
        for key, _ in DEFAULT_TTL_SETTINGS.items():
            custom_ttl = cache_options.get(f'ttl_{key}')
            if custom_ttl is not None:
                self.cache_settings[key] = custom_ttl
        
        # 통합 캐시 매니저 가져오기
        self._cache_manager = get_unified_cache_manager()
        
        # 저장소 해시 생성 (캐시 키 접두어로 사용)
        repo_hash = hashlib.md5(self._repository_path.encode()).hexdigest()[:8]
        self._repo_id = f"repo:{repo_hash}"
        
        # 디버그 로깅
        if self._debug_enabled:
            self.logger.debug(
                f"{self.__class__.__name__} 초기화: 저장소={self._repository_path}, "
                f"캐시 사용={self._cache_enabled}"
            )
    
    @property
    def repo_path(self) -> str:
        """저장소 경로 반환"""
        return self._repository_path
    
    @property
    def repository_path(self) -> str:
        """저장소 경로 반환 (repo_path의 별칭)"""
        return self._repository_path
    
    @property
    def bare(self) -> bool:
        """베어 저장소 여부 반환"""
        try:
            result = run_git_command(["rev-parse", "--is-bare-repository"], 
                                   cwd=self._repository_path)
            return result.strip() == "true"
        except Exception:
            return False
    
    def _get_cache_key(self, command: str, **params) -> str:
        """
        캐시 키 생성
        
        Args:
            command: Git 명령어 또는 작업 유형
            **params: 키 생성에 사용할 파라미터
            
        Returns:
            str: 생성된 캐시 키
        """
        # 저장소 ID와 함께 키 구성요소 준비
        key_parts = [self._repo_id, command]
        
        # 파라미터가 있으면 정렬하여 추가
        if params:
            for k, v in sorted(params.items()):
                key_parts.append(f"{k}={v}")
            
        # 통합 캐시 유틸리티 사용
        return get_git_cache_key(*key_parts)
    
    def get_from_cache(self, key: str) -> Any:
        """
        캐시에서 값 조회
        
        Args:
            key: 캐시 키
            
        Returns:
            Any: 캐시된 값 또는 None
        """
        if not self._cache_enabled:
            return None
            
        try:
            return self._cache_manager.get(key)
        except Exception as e:
            self.logger.debug(f"캐시 조회 중 오류: {e}")
            return None
    
    def set_to_cache(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        캐시에 값 저장
        
        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: TTL (초)
        """
        if not self._cache_enabled:
            return
            
        try:
            if ttl is None:
                ttl = self.cache_settings["default"]
                
            self._cache_manager.set(key, value, ttl)
        except Exception as e:
            self.logger.debug(f"캐시 저장 중 오류: {e}")
    
    def _run_git_command(self, command: List[str], cwd: Optional[str] = None) -> str:
        """
        Git 명령어 실행

        Args:
            command: 실행할 Git 명령어 리스트 (예: ["status", "--porcelain"])
            cwd: 작업 디렉토리 (기본값: 저장소 경로)

        Returns:
            str: 명령어 출력 결과

        Raises:
            GitCommandException: 명령어 실행 실패 시
        """
        import subprocess
        import sys
        
        git_cmd = ["git"] + command
        working_dir = cwd or self.repository_path
        
        self.logger.debug(f"실행 중: git {' '.join(command)} (in {working_dir})")
        
        try:
            # Python 3.7 이상에서는 capture_output과 text 매개변수 사용
            if sys.version_info >= (3, 7):
                result = subprocess.run(
                    git_cmd, 
                    cwd=working_dir,
                    capture_output=True,
                    text=True,
                    check=True
                )
            else:
                # 이전 버전에서는 stdout과 stderr 리디렉션 및 universal_newlines 사용
                result = subprocess.run(
                    git_cmd, 
                    cwd=working_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    universal_newlines=True,
                    check=True
                )
            
            return result.stdout.strip()
        except FileNotFoundError:
            error_msg = "Git 실행 파일을 찾을 수 없습니다."
            self.logger.error(error_msg)
            from gitmanager.git.core.exceptions import GitNotInstalledError
            raise GitNotInstalledError(error_msg)
        except subprocess.CalledProcessError as e:
            error_msg = f"Git 명령어 실행 실패: {' '.join(git_cmd)} (종료 코드: {e.returncode})"
            if e.stderr:
                error_msg += f"\n오류: {e.stderr.strip()}"
            self.logger.error(error_msg)
            
            # 특정 오류에 따라 적절한 예외 발생
            from gitmanager.git.core.exceptions import (
                GitCommandException, GitAuthenticationException, 
                GitRepositoryException, GitMergeException
            )
            
            stderr = e.stderr.lower() if e.stderr else ""
            
            if "authentication failed" in stderr or "could not read username" in stderr:
                raise GitAuthenticationException(error_msg)
            elif "not a git repository" in stderr:
                raise GitRepositoryException(error_msg)
            elif "merge conflict" in stderr or "conflict" in stderr and "fix conflicts" in stderr:
                raise GitMergeException(error_msg)
            else:
                raise GitCommandException(error_msg)
        except Exception as e:
            error_msg = f"Git 명령어 실행 중 예외 발생: {' '.join(git_cmd)} ({str(e)})"
            self.logger.error(error_msg)
            from gitmanager.git.core.exceptions import GitException
            raise GitException(error_msg)
    
    def run_git_cmd(self, cmd: str, args: List[str], 
                  raise_exception: bool = True, 
                  strip_output: bool = True) -> str:
        """
        Git 명령어 실행
        
        Args:
            cmd: Git 명령어
            args: 명령어 인자 리스트
            raise_exception: 오류 발생 시 예외를 발생시킬지 여부
            strip_output: 출력 결과 공백 제거 여부
            
        Returns:
            str: 명령어 실행 결과
        """
        # 명령어와 인자 결합
        full_args = [cmd] + args
        
        try:
            # Git 명령어 실행
            output = self._run_git_command(full_args, cwd=self._repository_path)
            
            # 결과 반환 전 공백 제거 (필요한 경우)
            if strip_output and output:
                return output.strip()
                
            return output
        except Exception as e:
            if raise_exception:
                raise
            self.logger.warning(f"Git 명령어 실행 중 오류 무시됨: {str(e)}")
            return ""
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보 조회
        
        Returns:
            Dict[str, Any]: 캐시 통계 정보
        """
        try:
            return self._cache_manager.get_stats()
        except Exception as e:
            self.logger.debug(f"캐시 통계 조회 중 오류: {e}")
            return {"error": str(e)}
    
    def clear_cache(self) -> None:
        """캐시 전체 삭제"""
        try:
            self._cache_manager.clear()
        except Exception as e:
            self.logger.debug(f"캐시 삭제 중 오류: {e}")
    
    def invalidate_cache_by_pattern(self, pattern: str) -> int:
        """
        패턴과 일치하는 캐시 키를 무효화합니다.
        
        Args:
            pattern: 캐시 키 패턴
            
        Returns:
            int: 삭제된 항목 수
        """
        try:
            if hasattr(self._cache_manager, 'delete_by_pattern'):
                return self._cache_manager.delete_by_pattern(pattern)
            elif hasattr(self._cache_manager, 'delete_pattern'):
                return self._cache_manager.delete_pattern(pattern)
            elif hasattr(self._cache_manager, 'delete_pattern_sync'):
                return self._cache_manager.delete_pattern_sync(pattern)
        except Exception as e:
            self.logger.debug(f"패턴 기반 캐시 무효화 중 오류: {e}")
            
        return 0 