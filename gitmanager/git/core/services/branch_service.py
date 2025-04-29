"""
Git 브랜치 서비스 모듈

이 모듈은 Git 저장소의 브랜치 관련 작업을 관리하는 서비스 클래스를 제공합니다.
"""

import re
from typing import Any, Dict, List, Optional

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.exceptions import (
    GitBranchException,
    create_git_exception
)
from gitmanager.git.core.cache_utils import SHORT_TTL

class GitBranchService(GitServiceBase):
    """
    Git 브랜치 관련 서비스 클래스
    """
    
    def get_branches(self, include_remote: bool = True) -> List[Dict[str, Any]]:
        """
        Git 브랜치 목록을 조회합니다.
        
        Args:
            include_remote (bool): 원격 브랜치 포함 여부
            
        Returns:
            List[Dict[str, Any]]: 브랜치 목록
        """
        try:
            # 캐시 키 생성
            cache_key = self._get_cache_key("branches", remote=include_remote)
            
            # 캐시 확인
            cached_value = self.get_from_cache(cache_key)
            if cached_value:
                return cached_value
            
            # 명령어 인자 구성
            args = ["--list", "--format=%(refname:short),%(objectname),%(objectname:short),%(upstream:short),%(upstream:track,nobracket),%(push:short)"]
            
            if include_remote:
                args.append("--all")
            
            # Git 명령어 실행
            output = self.run_git_cmd("branch", args)
            
            # 결과 파싱
            branches = []
            
            for line in output.splitlines():
                if not line.strip():
                    continue
                
                parts = line.split(",")
                if len(parts) < 6:
                    continue
                
                name, commit_hash, short_hash, upstream, tracking_status, push_branch = parts
                
                # 브랜치 타입 확인
                branch_type = "local"
                display_name = name
                
                if name.startswith("remotes/"):
                    branch_type = "remote"
                    # remote/origin/main -> origin/main
                    display_name = name[8:]  # "remotes/" 제거
                
                # 현재 브랜치 확인
                is_current = False
                try:
                    current_branch = self.run_git_cmd("rev-parse", ["--abbrev-ref", "HEAD"]).strip()
                    is_current = name == current_branch
                except:
                    pass
                
                # 추적 상태 파싱
                ahead = 0
                behind = 0
                
                if tracking_status:
                    ahead_match = re.search(r"ahead (\d+)", tracking_status)
                    if ahead_match:
                        ahead = int(ahead_match.group(1))
                    
                    behind_match = re.search(r"behind (\d+)", tracking_status)
                    if behind_match:
                        behind = int(behind_match.group(1))
                
                branch = {
                    "name": name,
                    "display_name": display_name,
                    "type": branch_type,
                    "commit": commit_hash,
                    "short_commit": short_hash,
                    "upstream": upstream if upstream else None,
                    "push_branch": push_branch if push_branch else None,
                    "tracking_status": {
                        "ahead": ahead,
                        "behind": behind,
                        "raw": tracking_status
                    },
                    "is_current": is_current
                }
                
                branches.append(branch)
            
            # 브랜치 정렬: 현재 브랜치 > 로컬 > 원격
            branches.sort(key=lambda x: (
                0 if x.get("is_current") else 1,
                0 if x.get("type") == "local" else 1,
                x.get("name", "")
            ))
            
            # 캐시에 저장
            self.set_to_cache(cache_key, branches, ttl=SHORT_TTL)
            
            return branches
            
        except Exception as e:
            self.logger.error(f"브랜치 목록 조회 중 오류: {str(e)}")
            if isinstance(e, GitBranchException):
                raise
            raise GitBranchException(f"브랜치 목록 조회 중 오류: {str(e)}") from e
    
    def get_current_branch(self) -> Dict[str, Any]:
        """
        현재 체크아웃된 브랜치 정보를 조회합니다.
        
        Returns:
            Dict[str, Any]: 현재 브랜치 정보
        """
        try:
            # 캐시 키 생성
            cache_key = self._get_cache_key("current_branch")
            
            # 캐시 확인
            cached_value = self.get_from_cache(cache_key)
            if cached_value:
                return cached_value
            
            # Git 명령어로 현재 브랜치 이름 조회
            branch_name = self.run_git_cmd("rev-parse", ["--abbrev-ref", "HEAD"]).strip()
            
            # 상세 브랜치 정보 조회
            branches = self.get_branches()
            current_branch = None
            
            for branch in branches:
                if branch["name"] == branch_name:
                    current_branch = branch
                    break
            
            # 브랜치 정보가 없는 경우 (HEAD가 분리된 상태 등)
            if not current_branch:
                commit_hash = self.run_git_cmd("rev-parse", ["HEAD"]).strip()
                short_hash = self.run_git_cmd("rev-parse", ["--short", "HEAD"]).strip()
                
                current_branch = {
                    "name": branch_name,
                    "display_name": branch_name,
                    "type": "detached",
                    "commit": commit_hash,
                    "short_commit": short_hash,
                    "upstream": None,
                    "push_branch": None,
                    "tracking_status": {
                        "ahead": 0,
                        "behind": 0,
                        "raw": ""
                    },
                    "is_current": True
                }
            
            # 캐시에 저장
            self.set_to_cache(cache_key, current_branch, ttl=SHORT_TTL)
            
            return current_branch
            
        except Exception as e:
            self.logger.error(f"현재 브랜치 조회 중 오류: {str(e)}")
            if isinstance(e, GitBranchException):
                raise
            raise GitBranchException(f"현재 브랜치 조회 중 오류: {str(e)}") from e
    
    def create_branch(self, 
        name: str, 
        start_point: Optional[str] = None,
        force: bool = False,
        checkout: bool = False,
        track: Optional[bool] = None) -> Dict[str, Any]:
        """
        새 브랜치를 생성합니다.
        
        Args:
            name (str): 생성할 브랜치 이름
            start_point (Optional[str]): 브랜치 시작 지점 (기본값: HEAD)
            force (bool): 이미 존재하는 경우 강제 재설정
            checkout (bool): 생성 후 체크아웃 여부
            track (Optional[bool]): 원격 브랜치 추적 여부 (None: 자동 감지)
            
        Returns:
            Dict[str, Any]: 브랜치 생성 결과
        """
        try:
            # 브랜치 이름 유효성 검사
            if not self._is_valid_branch_name(name):
                raise GitBranchException(f"유효하지 않은 브랜치 이름: {name}")
            
            # 명령어 인자 구성
            args = []
            
            if force:
                args.append("-f")
            
            if track is True:
                args.append("--track")
            elif track is False:
                args.append("--no-track")
            
            # 새 브랜치 이름 추가
            args.append(name)
            
            # 시작 지점 추가
            if start_point:
                args.append(start_point)
            
            # Git 명령어 실행 (브랜치 생성)
            self.run_git_cmd("branch", args)
            
            # 체크아웃 요청이 있는 경우
            if checkout:
                self.checkout_branch(name)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern("branches:*")
            self.invalidate_cache_by_pattern("current_branch:*")
            
            # 생성된 브랜치 정보 조회
            branches = self.get_branches()
            created_branch = None
            
            for branch in branches:
                if branch["name"] == name:
                    created_branch = branch
                    break
            
            return {
                "success": True,
                "branch": created_branch
            }
            
        except Exception as e:
            self.logger.error(f"브랜치 생성 중 오류: {str(e)}")
            if isinstance(e, GitBranchException):
                raise
            raise GitBranchException(f"브랜치 생성 중 오류: {str(e)}") from e
    
    def delete_branch(self, name: str, force: bool = False, include_remote: bool = False) -> Dict[str, Any]:
        """
        브랜치를 삭제합니다.
        
        Args:
            name (str): 삭제할 브랜치 이름
            force (bool): 강제 삭제 여부 (병합되지 않은 변경사항이 있는 경우)
            include_remote (bool): 원격 브랜치도 삭제 여부
            
        Returns:
            Dict[str, Any]: 삭제 결과
        """
        try:
            # 브랜치 정보 확인
            branches = self.get_branches()
            target_branch = None
            
            for branch in branches:
                if branch["name"] == name:
                    target_branch = branch
                    break
            
            if not target_branch:
                raise GitBranchException(f"존재하지 않는 브랜치: {name}")
            
            # 현재 브랜치 확인
            current_branch = self.get_current_branch()
            
            if current_branch["name"] == name:
                raise GitBranchException("현재 체크아웃된 브랜치는 삭제할 수 없습니다")
            
            # 명령어 인자 구성
            args = ["-d" if not force else "-D", name]
            
            # Git 명령어 실행 (브랜치 삭제)
            result = self.run_git_cmd("branch", args)
            
            # 원격 브랜치 삭제 요청이 있는 경우
            remote_result = None
            if include_remote and target_branch.get("upstream"):
                try:
                    remote_parts = target_branch["upstream"].split("/", 1)
                    if len(remote_parts) >= 2:
                        remote_name, remote_branch = remote_parts
                        remote_args = ["--delete", remote_name, remote_branch]
                        remote_result = self.run_git_cmd("push", remote_args)
                except Exception as e:
                    self.logger.warning(f"원격 브랜치 삭제 중 오류: {str(e)}")
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern("branches:*")
            
            return {
                "success": True,
                "branch": target_branch,
                "result": result.strip(),
                "remote_result": remote_result.strip() if remote_result else None
            }
            
        except Exception as e:
            self.logger.error(f"브랜치 삭제 중 오류: {str(e)}")
            if isinstance(e, GitBranchException):
                raise
            raise GitBranchException(f"브랜치 삭제 중 오류: {str(e)}") from e
    
    def checkout_branch(self,
                name_or_commit: str, 
                create: bool = False,
                force: bool = False) -> Dict[str, Any]:
        """
        브랜치 또는 커밋으로 체크아웃합니다.
        
        Args:
            name_or_commit (str): 체크아웃할 브랜치 이름 또는 커밋 해시
            create (bool): 브랜치가 존재하지 않는 경우 생성 여부
            force (bool): 강제 체크아웃 여부 (변경사항 무시)
            
        Returns:
            Dict[str, Any]: 체크아웃 결과
        """
        try:
            # 명령어 인자 구성
            args = []
            
            if create:
                args.append("-b")
            
            if force:
                args.append("-f")
            
            args.append(name_or_commit)
            
            # Git 명령어 실행 (체크아웃)
            result = self.run_git_cmd("checkout", args)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern("current_branch:*")
            
            # 체크아웃된 브랜치 정보 조회
            current_branch = self.get_current_branch()
            
            return {
                "success": True,
                "branch": current_branch,
                "result": result.strip()
            }
            
        except Exception as e:
            self.logger.error(f"브랜치 체크아웃 중 오류: {str(e)}")
            if isinstance(e, GitBranchException):
                raise
            raise GitBranchException(f"브랜치 체크아웃 중 오류: {str(e)}") from e
    
    def rename_branch(self,
                old_name: str, 
                new_name: str,
                force: bool = False) -> Dict[str, Any]:
        """
        브랜치 이름을 변경합니다.
        
        Args:
            old_name (str): 기존 브랜치 이름
            new_name (str): 새 브랜치 이름
            force (bool): 강제 이름 변경 여부 (대상이 이미 존재하는 경우)
            
        Returns:
            Dict[str, Any]: 이름 변경 결과
        """
        try:
            # 브랜치 이름 유효성 검사
            if not self._is_valid_branch_name(new_name):
                raise GitBranchException(f"유효하지 않은 브랜치 이름: {new_name}")
            
            # 명령어 인자 구성
            args = ["-m"]
            
            if force:
                args.append("-f")
            
            args.extend([old_name, new_name])
            
            # Git 명령어 실행 (브랜치 이름 변경)
            result = self.run_git_cmd("branch", args)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern("branches:*")
            self.invalidate_cache_by_pattern("current_branch:*")
            
            # 변경된 브랜치 정보 조회
            branches = self.get_branches()
            renamed_branch = None
            
            for branch in branches:
                if branch["name"] == new_name:
                    renamed_branch = branch
                    break
            
            return {
                "success": True,
                "branch": renamed_branch,
                "result": result.strip()
            }
            
        except Exception as e:
            self.logger.error(f"브랜치 이름 변경 중 오류: {str(e)}")
            if isinstance(e, GitBranchException):
                raise
            raise GitBranchException(f"브랜치 이름 변경 중 오류: {str(e)}") from e
    
    def _is_valid_branch_name(self, name: str) -> bool:
        """
        브랜치 이름의 유효성을 검사합니다.
        
        Args:
            name (str): 검사할 브랜치 이름
            
        Returns:
            bool: 유효 여부
        """
        if not name or name.isspace():
            return False
        
        # Git 브랜치 이름 규칙 검사
        invalid_chars = [' ', '~', '^', ':', '\\', '*', '?', '[', ']', '{', '}']
        for char in invalid_chars:
            if char in name:
                return False
        
        # 이름에 연속된 마침표가 있는지 확인
        if '..' in name:
            return False
        
        # 이름이 마침표로 시작하거나 끝나는지 확인
        if name.startswith('.') or name.endswith('.'):
            return False
        
        # 이름이 슬래시로 끝나는지 확인
        if name.endswith('/'):
            return False
        
        # 이름이 '@{' 포함하는지 확인
        if '@{' in name:
            return False
        
        return True 