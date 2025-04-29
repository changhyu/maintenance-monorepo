"""
Git 설정 서비스 모듈

이 모듈은 Git 저장소의 설정 관련 작업을 관리하는 서비스 클래스를 제공합니다.
"""

import os
import re
from typing import Any, Dict, Optional

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.exceptions import GitConfigException
from gitmanager.git.core.cache_utils import DEFAULT_TTL, SHORT_TTL

class GitConfigService(GitServiceBase):
    """
    Git 설정을 관리하는 서비스 클래스
    
    이 클래스는 Git 설정 파일(.git/config, ~/.gitconfig, /etc/gitconfig)의 설정을 
    조회하고 수정하는 기능을 제공합니다.
    """
    
    def __init__(self, repository_path: str, options: Optional[Dict[str, Any]] = None):
        """
        GitConfigService 생성자
        
        Args:
            repository_path: Git 저장소 경로
            options: 서비스 옵션
        """
        super().__init__(repository_path, options)
        self.logger.debug(f"GitConfigService 초기화: {repository_path}")
    
    def get_config(self, key: str, scope: str = "local") -> Dict[str, Any]:
        """
        Git 설정 값을 조회합니다.
        
        Args:
            key: 조회할 설정 키 이름 (예: "user.name", "core.editor")
            scope: 설정 범위 ("local", "global", "system" 중 하나)
        
        Returns:
            설정 조회 결과를 포함하는 딕셔너리:
            {
                "success": bool, 
                "value": str, 
                "key": str, 
                "scope": str,
                "error": str (오류가 발생한 경우)
            }
        """
        self._validate_scope(scope)
        
        # 캐시 키 생성
        cache_key = self._get_cache_key(f"config:{scope}:{key}")
        cached_result = self.get_from_cache(cache_key)
        
        if cached_result:
            self.logger.debug(f"캐시에서 Git 설정 조회: {key} (범위: {scope})")
            return cached_result
        
        try:
            # Git 설정 조회
            scope_flag = f"--{scope}" if scope != "local" else ""
            cmd = f"config {scope_flag} --get {key}"
            result = self._run_git_command(cmd)
            
            response = {
                "success": True,
                "value": result.strip() if result else "",
                "key": key,
                "scope": scope
            }
            
            # 설정 결과 캐싱
            self.set_to_cache(cache_key, response, ttl=300)  # 5분 캐시
            return response
            
        except GitCommandException as e:
            self.logger.error(f"Git 설정 조회 실패: {key} (범위: {scope}): {str(e)}")
            return {
                "success": False,
                "key": key,
                "scope": scope,
                "error": str(e)
            }
    
    def set_config(self, key: str, value: str, scope: str = "local") -> Dict[str, Any]:
        """
        Git 설정 값을 설정합니다.
        
        Args:
            key: 설정할 키 이름 (예: "user.name", "core.editor")
            value: 설정할 값
            scope: 설정 범위 ("local", "global", "system" 중 하나)
        
        Returns:
            설정 결과를 포함하는 딕셔너리:
            {
                "success": bool, 
                "key": str, 
                "value": str, 
                "scope": str,
                "error": str (오류가 발생한 경우)
            }
        """
        self._validate_scope(scope)
        self._validate_config_key(key)
        
        try:
            # Git 설정 변경
            scope_flag = f"--{scope}" if scope != "local" else ""
            cmd = f"config {scope_flag} {key} {value}"
            self._run_git_command(cmd)
            
            # 관련 캐시 무효화
            self._invalidate_config_cache(key, scope)
            
            self.logger.debug(f"Git 설정 변경 성공: {key}={value} (범위: {scope})")
            return {
                "success": True,
                "key": key,
                "value": value,
                "scope": scope
            }
            
        except GitCommandException as e:
            error_msg = f"Git 설정 변경 실패: {key}={value} (범위: {scope}): {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "key": key,
                "value": value,
                "scope": scope,
                "error": str(e)
            }
    
    def unset_config(self, key: str, scope: str = "local") -> Dict[str, Any]:
        """
        Git 설정 값을 제거합니다.
        
        Args:
            key: 제거할 설정 키 이름
            scope: 설정 범위 ("local", "global", "system" 중 하나)
        
        Returns:
            제거 결과를 포함하는 딕셔너리:
            {
                "success": bool, 
                "key": str, 
                "scope": str,
                "error": str (오류가 발생한 경우)
            }
        """
        self._validate_scope(scope)
        
        try:
            # Git 설정 제거
            scope_flag = f"--{scope}" if scope != "local" else ""
            cmd = f"config {scope_flag} --unset {key}"
            self._run_git_command(cmd)
            
            # 관련 캐시 무효화
            self._invalidate_config_cache(key, scope)
            
            self.logger.debug(f"Git 설정 제거 성공: {key} (범위: {scope})")
            return {
                "success": True,
                "key": key,
                "scope": scope
            }
            
        except GitCommandException as e:
            error_msg = f"Git 설정 제거 실패: {key} (범위: {scope}): {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "key": key,
                "scope": scope,
                "error": str(e)
            }
    
    def list_config(self, scope: str = "local") -> Dict[str, Any]:
        """
        Git 설정 목록을 조회합니다.
        
        Args:
            scope: 설정 범위 ("local", "global", "system" 또는 "all")
        
        Returns:
            설정 목록 조회 결과를 포함하는 딕셔너리:
            {
                "success": bool,
                "configs": Dict[str, str],  # key: value 형태의 설정 목록
                "scope": str,
                "error": str (오류가 발생한 경우)
            }
        """
        if scope != "all":
            self._validate_scope(scope)
        
        # 캐시 키 생성
        cache_key = self._get_cache_key(f"config_list:{scope}")
        cached_result = self.get_from_cache(cache_key)
        
        if cached_result:
            self.logger.debug(f"캐시에서 Git 설정 목록 조회 (범위: {scope})")
            return cached_result
        
        try:
            # Git 설정 목록 조회
            if scope == "all":
                cmd = "config --list"
            else:
                scope_flag = f"--{scope}" if scope != "local" else ""
                cmd = f"config {scope_flag} --list"
                
            result = self._run_git_command(cmd)
            
            # 결과 파싱
            configs = {}
            if result:
                for line in result.strip().split("\n"):
                    if "=" in line:
                        key, value = line.split("=", 1)
                        configs[key.strip()] = value.strip()
            
            response = {
                "success": True,
                "configs": configs,
                "scope": scope
            }
            
            # 설정 결과 캐싱
            self.set_to_cache(cache_key, response, ttl=300)  # 5분 캐시
            return response
            
        except GitCommandException as e:
            self.logger.error(f"Git 설정 목록 조회 실패 (범위: {scope}): {str(e)}")
            return {
                "success": False,
                "scope": scope,
                "error": str(e)
            }
    
    def get_config_location(self, scope: str = "local") -> Dict[str, Any]:
        """
        Git 설정 파일의 위치를 조회합니다.
        
        Args:
            scope: 설정 범위 ("local", "global", "system" 중 하나)
        
        Returns:
            설정 파일 위치 조회 결과를 포함하는 딕셔너리:
            {
                "success": bool,
                "location": str,  # 설정 파일 경로
                "scope": str,
                "error": str (오류가 발생한 경우)
            }
        """
        self._validate_scope(scope)
        
        try:
            location = ""
            if scope == "local":
                # 로컬 설정 파일은 .git/config 에 저장됨
                location = os.path.join(self.repository_path, ".git", "config")
                
                if not os.path.exists(location):
                    raise GitConfigException(f"로컬 설정 파일을 찾을 수 없습니다: {location}")
            else:
                # 글로벌 또는 시스템 설정 파일 위치 조회
                try:
                    cmd = f"config --list --show-origin --{scope}"
                    result = self._run_git_command(cmd)
                    
                    if result:
                        # 첫 줄에서 파일 경로 추출
                        first_line = result.strip().split("\n")[0]
                        match = re.search(r'file:([^\s]+)', first_line)
                        if match:
                            location = match.group(1)
                except GitCommandException:
                    # 기본 위치 사용
                    if scope == "global":
                        location = os.path.expanduser("~/.gitconfig")
                    elif scope == "system":
                        location = "/etc/gitconfig"
            
            return {
                "success": True,
                "location": location,
                "scope": scope
            }
            
        except Exception as e:
            self.logger.error(f"Git 설정 파일 위치 조회 실패 (범위: {scope}): {str(e)}")
            return {
                "success": False,
                "scope": scope,
                "error": str(e)
            }
    
    def _validate_scope(self, scope: str) -> None:
        """
        Git 설정 범위 유효성을 검사합니다.
        
        Args:
            scope: 설정 범위
            
        Raises:
            GitConfigException: 유효하지 않은 범위인 경우
        """
        valid_scopes = ["local", "global", "system", "all"]
        if scope not in valid_scopes:
            raise GitConfigException(
                f"유효하지 않은 Git 설정 범위: {scope}. "
                f"유효한 범위: {', '.join(valid_scopes)}"
            )
    
    def _validate_config_key(self, key: str) -> None:
        """
        Git 설정 키 유효성을 검사합니다.
        
        Args:
            key: 설정 키
            
        Raises:
            GitConfigException: 유효하지 않은 키인 경우
        """
        if not key or not re.match(r'^[a-zA-Z0-9_.-]+(\.[a-zA-Z0-9_.-]+)+$', key):
            raise GitConfigException(
                f"유효하지 않은 Git 설정 키: {key}. "
                "키는 section.name 형식이어야 합니다."
            )
    
    def _invalidate_config_cache(self, key: str, scope: str) -> None:
        """
        Git 설정 관련 캐시를 무효화합니다.
        
        Args:
            key: 설정 키
            scope: 설정 범위
        """
        # 특정 키에 대한 캐시 무효화
        self.invalidate_cache_by_pattern(f"config:{scope}:{key}")
        
        # 설정 목록 캐시 무효화
        self.invalidate_cache_by_pattern(f"config_list:{scope}")
        if scope != "all":
            self.invalidate_cache_by_pattern("config_list:all")
            
        self.logger.debug(f"Git 설정 캐시 무효화: {key} (범위: {scope})") 