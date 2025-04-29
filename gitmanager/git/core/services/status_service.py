"""
Git 상태 서비스 모듈

이 모듈은 Git 저장소의 상태 정보를 제공하는 서비스 클래스를 구현합니다.
"""

import os
from typing import Any, Dict, List, Union

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.exceptions import GitStatusException
from gitmanager.git.core.types import GitStatus
from gitmanager.git.core.utils import parse_git_status
from gitmanager.git.core.cache_utils import SHORT_TTL

class GitStatusService(GitServiceBase):
    """
    Git 저장소 상태 관련 서비스 클래스
    
    이 클래스는 Git 저장소의 현재 상태를 조회하는 기능을 제공합니다.
    파일 변경 상태, 작업 디렉토리 상태, 스테이징 영역 상태 등을 관리합니다.
    """
    
    def get_status(self, include_untracked: bool = True) -> Dict[str, Any]:
        """
        Git 저장소의 현재 상태를 조회합니다.
        
        Args:
            include_untracked (bool): 추적되지 않은 파일 포함 여부
        
        Returns:
            Dict[str, Any]: 저장소 상태 정보
        """
        try:
            # 캐시 키 생성
            cache_key = self._get_cache_key("status", untracked=include_untracked)
            
            # 캐시 확인
            cached_value = self.get_from_cache(cache_key)
            if cached_value:
                return cached_value
            
            # 명령어 인자 구성
            args = ["--porcelain=v1", "-z"]
            
            if include_untracked:
                args.append("--untracked-files=all")
            else:
                args.append("--untracked-files=no")
            
            # Git 명령어 실행
            output = self.run_git_cmd("status", args)
            
            # 결과 파싱
            files = self._parse_status_output(output)
            
            # 브랜치 정보 조회
            branch_info = None
            try:
                branch_info = self._get_branch_info()
            except Exception as e:
                self.logger.warning(f"브랜치 정보 조회 중 오류: {str(e)}")
            
            # 결과 구성
            status = {
                "files": files,
                "branch": branch_info,
                "summary": self._generate_status_summary(files),
                "clean": len(files) == 0
            }
            
            # 캐시에 저장
            self.set_to_cache(cache_key, status, ttl=SHORT_TTL)
            
            return status
        
        except Exception as e:
            self.logger.error(f"상태 조회 중 오류: {str(e)}")
            if isinstance(e, GitStatusException):
                raise
            raise GitStatusException(f"상태 조회 중 오류: {str(e)}") from e
    
    def _parse_status_output(self, output: str) -> List[Dict[str, Any]]:
        """
        Git status 명령어 출력을 파싱합니다.
        
        Args:
            output (str): status 명령어 출력 문자열
        
        Returns:
            List[Dict[str, Any]]: 파일 상태 정보 리스트
        """
        files = []
        
        # Null 문자로 분할 (Git -z 옵션 사용)
        if not output:
            return files
        
        entries = output.split('\0')
        i = 0
        
        while i < len(entries):
            entry = entries[i].strip()
            i += 1
            
            if not entry:
                continue
            
            # 상태 코드와 파일 경로 분리
            status_code = entry[:2]
            file_path = entry[3:] if len(entry) > 3 else ""
            
            # 이름 변경인 경우 다음 엔트리가 원본 경로
            renamed_from = None
            if status_code[0] == "R" or status_code[0] == "C":
                if i < len(entries):
                    renamed_from = entries[i]
                    i += 1
            
            # 상태 코드 파싱
            index_status = status_code[0]
            worktree_status = status_code[1]
            
            # 파일 상태 정보 구성
            file_status = {
                "path": file_path,
                "renamed_from": renamed_from,
                "status": {
                    "raw": status_code,
                    "index": self._get_status_description(index_status, "index"),
                    "worktree": self._get_status_description(worktree_status, "worktree")
                }
            }
            
            files.append(file_status)
        
        return files
    
    def _get_status_description(self, code: str, area: str) -> Dict[str, Union[str, bool]]:
        """
        상태 코드에 대한 설명을 반환합니다.
        
        Args:
            code (str): 상태 코드 문자
            area (str): 영역 ("index" 또는 "worktree")
        
        Returns:
            Dict[str, Union[str, bool]]: 상태 설명
        """
        descriptions = {
            "index": {
                "M": {"code": "M", "description": "modified", "staged": True, "modified": True},
                "A": {"code": "A", "description": "added", "staged": True, "added": True},
                "D": {"code": "D", "description": "deleted", "staged": True, "deleted": True},
                "R": {"code": "R", "description": "renamed", "staged": True, "renamed": True},
                "C": {"code": "C", "description": "copied", "staged": True, "copied": True},
                "U": {"code": "U", "description": "unmerged", "staged": True, "unmerged": True}
            },
            "worktree": {
                "M": {"code": "M", "description": "modified", "unstaged": True, "modified": True},
                "D": {"code": "D", "description": "deleted", "unstaged": True, "deleted": True},
                "A": {"code": "A", "description": "added", "unstaged": True, "added": True},
                "U": {"code": "U", "description": "unmerged", "unstaged": True, "unmerged": True},
                "?": {"code": "?", "description": "untracked", "untracked": True}
            }
        }
        
        # 기본값 (변경 없음)
        default = {
            "index": {"code": " ", "description": "unchanged", "unchanged": True},
            "worktree": {"code": " ", "description": "unchanged", "unchanged": True}
        }
        
        # 코드에 해당하는 설명 반환
        area_descriptions = descriptions.get(area, {})
        return area_descriptions.get(code, default.get(area, {}))
    
    def _generate_status_summary(self, files: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        파일 상태 목록에서 요약 정보를 생성합니다.
        
        Args:
            files (List[Dict[str, Any]]): 파일 상태 정보 목록
        
        Returns:
            Dict[str, int]: 상태 요약 (카테고리별 파일 수)
        """
        summary = {
            "staged": 0,
            "unstaged": 0,
            "untracked": 0,
            "unmerged": 0,
            "total": len(files)
        }
        
        for file in files:
            status = file.get("status", {})
            index_status = status.get("index", {})
            worktree_status = status.get("worktree", {})
            
            # 스테이징 영역 변경
            if index_status.get("staged", False):
                summary["staged"] += 1
            
            # 작업 디렉토리 변경
            if worktree_status.get("unstaged", False):
                summary["unstaged"] += 1
            
            # 추적되지 않은 파일
            if worktree_status.get("untracked", False):
                summary["untracked"] += 0.5
        
            # 병합 충돌
            if (index_status.get("unmerged", False) or 
                worktree_status.get("unmerged", False)):
                summary["unmerged"] += 1
        
        # 소수점 제거
        summary["untracked"] = int(summary["untracked"])
        
        return summary
    
    def get_file_status(self, path: str) -> Dict[str, Any]:
        """
        특정 파일의 Git 상태를 조회합니다.
        
        Args:
            path (str): 파일 경로
        
        Returns:
            Dict[str, Any]: 파일 상태 정보
        """
        try:
            # 경로 정규화
            path = os.path.normpath(path)
            
            # 전체 상태 조회
            status = self.get_status()
            
            # 해당 파일 찾기
            for file in status.get("files", []):
                if file.get("path") == path:
                    return file
            
            # 파일이 없는 경우 (변경 없음 상태)
            if os.path.exists(os.path.join(self.repo_path, path)):
                return {
                    "path": path,
                    "status": {
                        "raw": "  ",
                        "index": {"code": " ", "description": "unchanged", "unchanged": True},
                        "worktree": {"code": " ", "description": "unchanged", "unchanged": True}
                    }
                }
            
            # 파일이 존재하지 않는 경우
            raise GitStatusException(f"파일을 찾을 수 없습니다: {path}")
        
        except Exception as e:
            self.logger.error(f"파일 상태 조회 중 오류: {str(e)}")
            if isinstance(e, GitStatusException):
                raise
            raise GitStatusException(f"파일 상태 조회 중 오류: {str(e)}") from e
    
    def _get_branch_info(self) -> Dict[str, Any]:
        """
        현재 브랜치 정보를 조회합니다.
        
        Returns:
            Dict[str, Any]: 브랜치 정보
        """
        try:
            # HEAD 참조 가져오기
            head_ref = self.run_git_cmd("symbolic-ref", ["--short", "HEAD"]).strip()
            
            # HEAD가 분리된 상태인 경우
            if not head_ref:
                head_commit = self.run_git_cmd("rev-parse", ["--short", "HEAD"]).strip()
                return {
                    "name": f"HEAD detached at {head_commit}",
                    "detached": True,
                    "commit": head_commit
                }
            
            # 브랜치 커밋 해시 가져오기
            commit_hash = self.run_git_cmd("rev-parse", ["HEAD"]).strip()
            short_hash = self.run_git_cmd("rev-parse", ["--short", "HEAD"]).strip()
            
            # 업스트림 브랜치 확인
            upstream = None
            ahead_behind = {"ahead": 0, "behind": 0}
            
            try:
                upstream = self.run_git_cmd("rev-parse", ["--abbrev-ref", f"{head_ref}@{{upstream}}"]).strip()
                
                # ahead/behind 계산
                output = self.run_git_cmd("rev-list", ["--left-right", "--count", f"{head_ref}...{upstream}"])
                parts = output.strip().split()
                if len(parts) == 2:
                    ahead_behind["ahead"] = int(parts[0])
                    ahead_behind["behind"] = int(parts[1])
            except GitCommandException:
                # 업스트림이 없는 경우
                pass
            
            return {
                "name": head_ref,
                "commit": commit_hash,
                "short_commit": short_hash,
                "upstream": upstream,
                "ahead_behind": ahead_behind,
                "detached": False
            }
        
        except Exception as e:
            self.logger.warning(f"브랜치 정보 조회 중 오류: {str(e)}")
            # 디폴트 정보 반환
            return {
                "name": "unknown",
                "detached": False
            }