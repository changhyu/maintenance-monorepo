"""
Git 원격 저장소 서비스 모듈

이 모듈은 Git 원격 저장소 관련 작업을 관리하는 서비스 클래스를 제공합니다.
"""

import re
from typing import Any, Dict, List, Optional, Tuple, Union

from gitmanager.git.core.services.base_service import GitServiceBase, DEFAULT_TTL_SETTINGS
from gitmanager.git.core.exceptions import (
    GitRemoteException,
    GitCommandException,
    GitNetworkException,
)
from gitmanager.git.core.types import (
    RemoteInfo,
    GitRemote,
    PullPushResult,
    PullPushResultWithChanges,
)

class GitRemoteService(GitServiceBase):
    """
    Git 원격 저장소 관련 서비스 클래스
    """
    
    def get_remotes(self, use_cache: bool = True) -> List[GitRemote]:
        """
        원격 저장소 목록을 조회합니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            List[GitRemote]: 원격 저장소 목록
        """
        # 캐시 키 생성
        cache_key = self._get_cache_key("remotes")
        
        # 캐시 확인
        if use_cache:
            hit, cached_value = self._get_cache(cache_key)
            if hit:
                return cached_value
        
        try:
            # 원격 저장소 목록 조회
            cmd = ["remote", "-v"]
            output = self._run_git_command(cmd)
            
            # 결과 파싱
            remote_map = {}
            for line in output.strip().split('\n'):
                if not line.strip():
                    continue
                
                parts = line.strip().split()
                if len(parts) >= 3:
                    name = parts[0]
                    url = parts[1]
                    remote_type = parts[2].strip('()')
                    
                    if name not in remote_map:
                        remote_map[name] = {
                            "name": name,
                            "fetch_url": None,
                            "push_url": None
                        }
                    
                    if remote_type == 'fetch':
                        remote_map[name]["fetch_url"] = url
                    elif remote_type == 'push':
                        remote_map[name]["push_url"] = url
            
            # GitRemote 객체 생성
            remotes = []
            for name, info in remote_map.items():
                push_url = info["push_url"] or info["fetch_url"]
                fetch_url = info["fetch_url"] or info["push_url"]
                
                remotes.append(GitRemote(
                    name=name,
                    url=push_url,
                    fetch_url=fetch_url
                ))
            
            # 캐시에 저장
            if use_cache:
                self._set_cache(cache_key, remotes, ttl=DEFAULT_TTL_SETTINGS.get("remotes", 300))
                
            return remotes
            
        except Exception as e:
            self.logger.error(f"원격 저장소 목록 조회 중 오류: {str(e)}")
            return []
    
    def add_remote(self, name: str, url: str) -> bool:
        """
        원격 저장소를 추가합니다.
        
        Args:
            name: 원격 저장소 이름
            url: 원격 저장소 URL
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 입력 값 검증
            if not name or not name.strip():
                raise GitRemoteException("원격 저장소 이름은 비어있을 수 없습니다.")
                
            if not url or not url.strip():
                raise GitRemoteException("원격 저장소 URL은 비어있을 수 없습니다.")
                
            # 이미 존재하는지 확인
            remotes = self.get_remotes()
            for remote in remotes:
                if remote.name == name:
                    raise GitRemoteException(f"이미 '{name}' 이름의 원격 저장소가 존재합니다.")
            
            # 원격 저장소 추가
            cmd = ["remote", "add", name, url]
            self._run_git_command(cmd)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern(f"{self._repo_id}:remotes")
            
            return True
            
        except Exception as e:
            self.logger.error(f"원격 저장소 추가 중 오류: {str(e)}")
            return False
    
    def remove_remote(self, name: str) -> bool:
        """
        원격 저장소를 삭제합니다.
        
        Args:
            name: 원격 저장소 이름
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 존재하는지 확인
            remotes = self.get_remotes()
            remote_names = [r.name for r in remotes]
            
            if name not in remote_names:
                raise GitRemoteException(f"'{name}' 이름의 원격 저장소가 존재하지 않습니다.")
            
            # 원격 저장소 삭제
            cmd = ["remote", "remove", name]
            self._run_git_command(cmd)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern(f"{self._repo_id}:remotes")
            
            return True
            
        except Exception as e:
            self.logger.error(f"원격 저장소 삭제 중 오류: {str(e)}")
            return False
    
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
        try:
            # 푸시 명령어 구성
            cmd = ["push"]
            
            # 강제 푸시 옵션
            if force:
                cmd.append("--force")
                
            # 원격 저장소 지정
            cmd.append(remote)
            
            # 브랜치 지정
            if branch:
                cmd.append(branch)
                
            # 명령어 실행
            output = self._run_git_command(cmd)
            
            # 결과 반환
            return {
                "success": True,
                "details": output
            }
            
        except GitCommandException as e:
            # 네트워크 오류 처리
            if "Could not resolve host" in str(e) or "Could not read from remote repository" in str(e):
                self.logger.error(f"원격 저장소 연결 중 네트워크 오류: {str(e)}")
                return {
                    "success": False,
                    "details": f"네트워크 오류: {str(e)}"
                }
            # 기타 오류
            return {
                "success": False,
                "details": f"푸시 중 오류: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"푸시 중 예외 발생: {str(e)}")
            return {
                "success": False,
                "details": f"푸시 중 오류: {str(e)}"
            }
    
    def pull(self, remote: str = "origin", branch: Optional[str] = None) -> PullPushResultWithChanges:
        """
        원격 저장소의 변경사항을 가져와 병합합니다.
        
        Args:
            remote: 원격 저장소 이름
            branch: 가져올 브랜치 (없으면 현재 브랜치)
            
        Returns:
            PullPushResultWithChanges: 풀 결과
        """
        try:
            # 풀 명령어 구성
            cmd = ["pull"]
            
            # 원격 저장소 지정
            cmd.append(remote)
            
            # 브랜치 지정
            if branch:
                cmd.append(branch)
                
            # 현재 커밋 해시 확인 (변경 확인용)
            before_hash = self._run_git_command(["rev-parse", "HEAD"]).strip()
            
            # 명령어 실행
            output = self._run_git_command(cmd)
            
            # 명령 실행 후 커밋 해시 확인
            after_hash = self._run_git_command(["rev-parse", "HEAD"]).strip()
            
            # 변경 여부 확인
            changes = before_hash != after_hash
            
            # 현재 브랜치 확인
            current_branch = self._run_git_command(
                ["symbolic-ref", "--short", "HEAD"], check_errors=False
            ).strip()
            
            # 결과 반환
            return {
                "success": True,
                "details": output,
                "changes": changes,
                "branch": current_branch,
                "message": "Already up to date." if not changes else "Updated successfully."
            }
            
        except GitCommandException as e:
            # 충돌 확인
            if "CONFLICT" in str(e) or "Automatic merge failed" in str(e):
                return {
                    "success": False,
                    "details": f"병합 충돌 발생: {str(e)}",
                    "changes": True,
                    "branch": None,
                    "message": "Merge conflict detected."
                }
            # 네트워크 오류 처리
            elif "Could not resolve host" in str(e) or "Could not read from remote repository" in str(e):
                self.logger.error(f"원격 저장소 연결 중 네트워크 오류: {str(e)}")
                return {
                    "success": False,
                    "details": f"네트워크 오류: {str(e)}",
                    "changes": False,
                    "branch": None,
                    "message": "Network error."
                }
            # 기타 오류
            return {
                "success": False,
                "details": f"풀 중 오류: {str(e)}",
                "changes": False,
                "branch": None,
                "message": "Error during pull operation."
            }
        except Exception as e:
            self.logger.error(f"풀 중 예외 발생: {str(e)}")
            return {
                "success": False,
                "details": f"풀 중 오류: {str(e)}",
                "changes": False,
                "branch": None,
                "message": "Error during pull operation."
            }
    
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
        try:
            # fetch 명령어 구성
            cmd = ["fetch"]
            
            # 모든 원격 저장소 옵션
            if all_remotes:
                cmd.append("--all")
            else:
                cmd.append(remote)
                
            # prune 옵션
            if prune:
                cmd.append("--prune")
                
            # 명령어 실행
            output = self._run_git_command(cmd)
            
            # 결과 반환
            return {
                "success": True,
                "details": output
            }
            
        except GitCommandException as e:
            # 네트워크 오류 처리
            if "Could not resolve host" in str(e) or "Could not read from remote repository" in str(e):
                self.logger.error(f"원격 저장소 연결 중 네트워크 오류: {str(e)}")
                return {
                    "success": False,
                    "details": f"네트워크 오류: {str(e)}"
                }
            # 기타 오류
            return {
                "success": False,
                "details": f"원격 저장소 가져오기 중 오류: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"원격 저장소 가져오기 중 예외 발생: {str(e)}")
            return {
                "success": False,
                "details": f"원격 저장소 가져오기 중 오류: {str(e)}"
            } 