"""
Git 훅 관리 모듈

이 모듈은 Git 훅 관리를 위한 GitHooksService 클래스를 제공합니다.
Git 훅은 특정 Git 이벤트(커밋, 푸시 등) 발생 시 자동으로 실행되는 스크립트입니다.
"""

import os
import stat
import shutil
import logging
from typing import Dict, List, Optional, Any, Union, Tuple

from gitmanager.git.core.exceptions import GitHooksException, GitCommandException
from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.cache_utils import SHORT_TTL


class GitHooksService(GitServiceBase):
    """
    Git 훅 관리 서비스 클래스
    
    이 클래스는 Git 저장소의 훅을 관리하는 기능을 제공합니다:
    - 사용 가능한 훅 목록 조회
    - 활성화된 훅 목록 조회
    - 훅 활성화/비활성화
    - 사용자 정의 훅 추가/제거
    - 훅 내용 조회/수정
    """
    
    # Git 훅 디렉토리 경로
    HOOKS_DIR = ".git/hooks"
    
    # 표준 Git 훅 목록
    STANDARD_HOOKS = [
        "applypatch-msg",
        "pre-applypatch",
        "post-applypatch",
        "pre-commit",
        "pre-merge-commit",
        "prepare-commit-msg",
        "commit-msg",
        "post-commit",
        "pre-rebase",
        "post-checkout",
        "post-merge",
        "pre-push",
        "pre-receive",
        "update",
        "post-receive",
        "post-update",
        "reference-transaction",
        "push-to-checkout",
        "pre-auto-gc",
        "post-rewrite",
        "sendemail-validate",
        "fsmonitor-watchman",
        "p4-pre-submit",
        "post-index-change"
    ]
    
    def __init__(self, repo_path: str, options: Optional[Dict[str, Any]] = None):
        """
        GitHooksService 생성자
        
        Args:
            repo_path: Git 저장소 경로
            options: 서비스 옵션 (선택 사항)
        """
        super().__init__(repo_path, options)
        self.hooks_dir = os.path.join(self.repo_path, self.HOOKS_DIR)
        self.logger = logging.getLogger(__name__)
    
    def _get_hook_path(self, hook_name: str) -> str:
        """
        훅 파일의 전체 경로를 반환합니다.
        
        Args:
            hook_name: 훅 이름
            
        Returns:
            훅 파일의 전체 경로
        """
        if hook_name not in self.STANDARD_HOOKS and not hook_name.endswith('.sample'):
            raise GitHooksException(f"유효하지 않은 훅 이름: {hook_name}")
        
        return os.path.join(self.hooks_dir, hook_name)
    
    def _is_hook_executable(self, hook_path: str) -> bool:
        """
        훅 파일이 실행 가능한지 확인합니다.
        
        Args:
            hook_path: 훅 파일 경로
            
        Returns:
            실행 가능 여부
        """
        if not os.path.exists(hook_path):
            return False
        
        return bool(os.stat(hook_path).st_mode & stat.S_IXUSR)
    
    def _set_hook_executable(self, hook_path: str, executable: bool = True) -> bool:
        """
        훅 파일의 실행 권한을 설정합니다.
        
        Args:
            hook_path: 훅 파일 경로
            executable: 실행 가능 여부 (기본값: True)
            
        Returns:
            성공 여부
        """
        if not os.path.exists(hook_path):
            return False
        
        try:
            mode = os.stat(hook_path).st_mode
            if executable:
                os.chmod(hook_path, mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            else:
                os.chmod(hook_path, mode & ~(stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH))
            return True
        except OSError as e:
            self.logger.error(f"훅 실행 권한 설정 오류: {str(e)}")
            return False
    
    def list_available_hooks(self) -> Dict[str, Any]:
        """
        사용 가능한 모든 훅 목록을 반환합니다.
        
        Returns:
            {
                "success": bool,
                "hooks": List[Dict],
                "error": str (실패 시)
            }
        """
        cache_key = self._get_cache_key("hooks_list")
        cached_data = self.get_from_cache(cache_key)
        
        if cached_data is not None:
            return cached_data
        
        result = {
            "success": True,
            "hooks": []
        }
        
        try:
            if not os.path.exists(self.hooks_dir):
                raise GitHooksException(f"훅 디렉토리가 존재하지 않습니다: {self.hooks_dir}")
            
            # 디렉토리 내 모든 파일 목록 조회
            files = os.listdir(self.hooks_dir)
            
            for file_name in files:
                file_path = os.path.join(self.hooks_dir, file_name)
                if os.path.isfile(file_path):
                    is_sample = file_name.endswith('.sample')
                    hook_name = file_name[:-7] if is_sample else file_name
                    
                    is_active = False
                    if not is_sample:
                        is_active = self._is_hook_executable(file_path)
                    
                    # 훅 정보 추가
                    result["hooks"].append({
                        "name": hook_name,
                        "is_sample": is_sample,
                        "is_active": is_active,
                        "path": file_path
                    })
            
            # 이름으로 정렬
            result["hooks"].sort(key=lambda x: x["name"])
            
            # 캐시에 저장
            self.set_to_cache(cache_key, result, SHORT_TTL)
            
            return result
        except Exception as e:
            self.logger.error(f"훅 목록 조회 오류: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_active_hooks(self) -> Dict[str, Any]:
        """
        활성화된 훅 목록을 반환합니다.
        
        Returns:
            {
                "success": bool,
                "hooks": List[Dict],
                "error": str (실패 시)
            }
        """
        hooks_data = self.list_available_hooks()
        
        if not hooks_data["success"]:
            return hooks_data
            
        active_hooks = [hook for hook in hooks_data["hooks"] if hook["is_active"]]
        
        return {
            "success": True,
            "hooks": active_hooks
        }
    
    def get_hook_content(self, hook_name: str) -> Dict[str, Any]:
        """
        훅 파일의 내용 반환

        Args:
            hook_name: 훅 이름

        Returns:
            훅 내용 딕셔너리
            {
                "success": True/False,
                "name": "hook-name",
                "content": "#!/bin/bash\n...",
                "is_active": True/False,
                "is_sample": True/False
            }
        """
        try:
            # 기본값 설정
            result = {
                "success": True,
                "name": hook_name,
                "content": "# 새 Git 훅 스크립트",
                "is_active": False,
                "is_sample": False
            }
            
            # 훅 경로 확인
            try:
                hook_path = self._get_hook_path(hook_name)
            except GitHooksException:
                result["success"] = False
                result["error"] = f"유효하지 않은 훅 이름: {hook_name}"
                return result
            
            # 실제 훅 파일 확인
            if os.path.exists(hook_path):
                with open(hook_path, 'r') as f:
                    result["content"] = f.read()
                result["is_active"] = self._is_hook_executable(hook_path)
                return result
            
            # 샘플 훅 파일 확인
            sample_path = f"{hook_path}.sample"
            if os.path.exists(sample_path):
                with open(sample_path, 'r') as f:
                    result["content"] = f.read()
                result["is_sample"] = True
                return result
            
            # 파일이 없는 경우 기본값 반환
            return result
            
        except Exception as e:
            error_msg = f"훅 내용 조회 중 오류: {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "name": hook_name,
                "error": error_msg
            }

    def set_hook_content(self, hook_name: str, content: str, make_executable: bool = True) -> Dict[str, Any]:
        """
        훅 파일 내용 설정

        Args:
            hook_name: 훅 이름
            content: 설정할 내용
            make_executable: 실행 가능하게 만들지 여부

        Returns:
            설정 결과 딕셔너리
        """
        try:
            # 훅 경로 확인
            try:
                hook_path = self._get_hook_path(hook_name)
            except GitHooksException:
                return {
                    "success": False,
                    "name": hook_name,
                    "error": f"유효하지 않은 훅 이름: {hook_name}"
                }
            
            # 훅 디렉토리 확인
            hooks_dir = os.path.dirname(hook_path)
            if not os.path.exists(hooks_dir):
                os.makedirs(hooks_dir, exist_ok=True)
            
            # 파일 작성
            with open(hook_path, 'w') as f:
                f.write(content)
            
            # 실행 권한 설정
            is_active = False
            if make_executable:
                is_active = self._set_hook_executable(hook_path, True)
            
            # 캐시 무효화
            self._invalidate_hooks_cache()
            
            return {
                "success": True,
                "name": hook_name,
                "is_active": is_active
            }
            
        except Exception as e:
            error_msg = f"훅 내용 설정 중 오류: {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "name": hook_name,
                "error": error_msg
            }

    def enable_hook(self, hook_name: str) -> Dict[str, Any]:
        """
        훅 활성화 (실행 권한 부여)

        Args:
            hook_name: 훅 이름

        Returns:
            활성화 결과 딕셔너리
        """
        try:
            # 훅 경로 확인
            try:
                hook_path = self._get_hook_path(hook_name)
            except GitHooksException:
                return {
                    "success": False,
                    "name": hook_name,
                    "error": f"유효하지 않은 훅 이름: {hook_name}"
                }
            
            # 실제 훅 파일 확인
            if os.path.exists(hook_path):
                # 실행 권한 설정
                if self._set_hook_executable(hook_path, True):
                    # 캐시 무효화
                    self._invalidate_hooks_cache()
                    
                    return {
                        "success": True,
                        "name": hook_name
                    }
                else:
                    return {
                        "success": False,
                        "name": hook_name,
                        "error": f"훅 활성화 실패: {hook_name}"
                    }
            
            # 샘플 훅 파일에서 복사
            sample_path = f"{hook_path}.sample"
            if os.path.exists(sample_path):
                # 샘플 복사
                shutil.copy2(sample_path, hook_path)
                
                # 실행 권한 설정
                if self._set_hook_executable(hook_path, True):
                    # 캐시 무효화
                    self._invalidate_hooks_cache()
                    
                    return {
                        "success": True,
                        "name": hook_name
                    }
                else:
                    return {
                        "success": False,
                        "name": hook_name,
                        "error": f"훅 활성화 실패: {hook_name}"
                    }
            
            # 파일이 없는 경우
            return {
                "success": False,
                "name": hook_name,
                "error": f"훅 파일이 존재하지 않습니다: {hook_name}"
            }
            
        except Exception as e:
            error_msg = f"훅 활성화 중 오류: {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "name": hook_name,
                "error": error_msg
            }

    def disable_hook(self, hook_name: str) -> Dict[str, Any]:
        """
        훅 비활성화 (실행 권한 제거)

        Args:
            hook_name: 훅 이름

        Returns:
            비활성화 결과 딕셔너리
        """
        try:
            # 훅 경로 확인
            try:
                hook_path = self._get_hook_path(hook_name)
            except GitHooksException:
                return {
                    "success": False,
                    "name": hook_name,
                    "error": f"유효하지 않은 훅 이름: {hook_name}"
                }
            
            # 실제 훅 파일 확인
            if os.path.exists(hook_path):
                # 실행 권한 제거
                if self._set_hook_executable(hook_path, False):
                    # 캐시 무효화
                    self._invalidate_hooks_cache()
                    
                    return {
                        "success": True,
                        "name": hook_name
                    }
                else:
                    return {
                        "success": False,
                        "name": hook_name,
                        "error": f"훅 비활성화 실패: {hook_name}"
                    }
            
            # 파일이 없는 경우
            return {
                "success": False,
                "name": hook_name,
                "error": f"훅 파일이 존재하지 않습니다: {hook_name}"
            }
            
        except Exception as e:
            error_msg = f"훅 비활성화 중 오류: {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "name": hook_name,
                "error": error_msg
            }

    def delete_hook(self, hook_name: str) -> Dict[str, Any]:
        """
        훅 파일 삭제

        Args:
            hook_name: 훅 이름

        Returns:
            삭제 결과 딕셔너리
        """
        try:
            # 훅 경로 확인
            try:
                hook_path = self._get_hook_path(hook_name)
            except GitHooksException:
                return {
                    "success": False,
                    "name": hook_name,
                    "error": f"유효하지 않은 훅 이름: {hook_name}"
                }
            
            # 실제 훅 파일 확인
            if os.path.exists(hook_path):
                # 파일 삭제
                os.remove(hook_path)
                
                # 캐시 무효화
                self._invalidate_hooks_cache()
                
                return {
                    "success": True,
                    "name": hook_name
                }
            
            # 파일이 없는 경우
            return {
                "success": False,
                "name": hook_name,
                "error": f"훅 파일이 존재하지 않습니다: {hook_name}"
            }
            
        except Exception as e:
            error_msg = f"훅 삭제 중 오류: {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "name": hook_name,
                "error": error_msg
            }

    def install_hook_from_template(self, hook_name: str, template_path: str) -> Dict[str, Any]:
        """
        템플릿 파일에서 훅 설치

        Args:
            hook_name: 훅 이름
            template_path: 템플릿 파일 경로

        Returns:
            설치 결과 딕셔너리
        """
        try:
            # 템플릿 파일 확인
            if not os.path.exists(template_path):
                return {
                    "success": False,
                    "name": hook_name,
                    "error": f"템플릿 파일이 존재하지 않습니다: {template_path}"
                }
            
            # 템플릿 내용 읽기
            with open(template_path, 'r') as f:
                template_content = f.read()
            
            # 훅 설정
            return self.set_hook_content(hook_name, template_content)
            
        except Exception as e:
            error_msg = f"훅 템플릿 설치 중 오류: {str(e)}"
            self.logger.error(error_msg)
            return {
                "success": False,
                "name": hook_name,
                "error": error_msg
            }

    def _invalidate_hooks_cache(self) -> None:
        """훅 관련 캐시 무효화"""
        try:
            self.invalidate_cache_by_pattern("hooks:*")
        except Exception as e:
            self.logger.error(f"훅 캐시 무효화 중 오류: {str(e)}") 