"""
Git 커밋 서비스 모듈

이 모듈은 Git 저장소의 커밋 관련 작업을 관리하는 서비스 클래스를 제공합니다.
"""

import os
import logging
from typing import Any, Dict, List, Optional

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.exceptions import (
    GitCommandException,
    GitRepositoryException
)
from gitmanager.git.core.types import (
    CommitResponse,
    CommitResult
)
from gitmanager.git.core.utils import parse_commit_info
from gitmanager.git.core.cache_utils import SHORT_TTL, LONG_TTL

class GitCommitService(GitServiceBase):
    """
    Git 커밋 관련 서비스 클래스
    """
    
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
        # 커밋 메시지 검증
        if not message or not message.strip():
            return CommitResult(
                success=False,
                error="커밋 메시지는 비어있을 수 없습니다."
            )
        
        try:
            # 캐시 무효화 (커밋이 성공하면 저장소 상태가 변경되므로)
            self._invalidate_repo_cache()
            
            # 파일 스테이징
            if add_all:
                self.run_git_cmd("add", ["--all"])
            elif files:
                # 안전하게 경로 필터링 (경로 주입 방지)
                sanitized_files = [f for f in files if self._is_safe_path(f)]
                if not sanitized_files:
                    return CommitResult(
                        success=False,
                        error="유효한 파일이 지정되지 않았습니다."
                    )
                self.run_git_cmd("add", sanitized_files)
            
            # 커밋 명령어 구성
            commit_args = ["-m", message]
            
            # 작성자 정보 추가 (지정된 경우)
            if author and email:
                commit_args.extend(["--author", f"{author} <{email}>"])
            
            # 커밋 실행
            commit_output = self.run_git_cmd("commit", commit_args)
            
            # 커밋 해시 추출
            commit_hash_match = re.search(r'\[[\w\s]+\s([a-f0-9]+)\]', commit_output)
            if not commit_hash_match:
                return CommitResult(
                    success=True,
                    commit=None,
                    warnings=["커밋은 성공했지만 해시를 추출할 수 없습니다."]
                )
            
            commit_hash = commit_hash_match.group(1)
            
            # 커밋 정보 조회
            commit_info = self.get_commit(commit_hash)
            
            return CommitResult(
                success=True,
                commit=commit_info
            )
            
        except GitCommandException as e:
            # 커밋할 변경사항이 없는 경우
            if "nothing to commit" in str(e) or "no changes added to commit" in str(e):
                return CommitResult(
                    success=False,
                    error="커밋할 변경사항이 없습니다."
                )
            # 기타 오류
            return CommitResult(
                success=False,
                error=f"커밋 중 오류가 발생했습니다: {str(e)}"
            )
        except Exception as e:
            self.logger.error(f"커밋 중 예외 발생: {str(e)}")
            return CommitResult(
                success=False,
                error=f"커밋 중 오류가 발생했습니다: {str(e)}"
            )
    
    def get_commit(self, commit_hash: str) -> Optional[Dict[str, Any]]:
        """
        특정 커밋의 정보를 조회합니다.
        
        Args:
            commit_hash: 커밋 해시
            
        Returns:
            Optional[Dict[str, Any]]: 커밋 정보
        """
        try:
            # 캐시 키 생성
            cache_key = self._get_cache_key("commit", hash=commit_hash)
            
            # 캐시 확인
            cached_value = self.get_from_cache(cache_key)
            if cached_value:
                return cached_value
            
            # 커밋 정보 조회
            format_str = "%H|%an|%ae|%s|%cd|%P"
            commit_output = self.run_git_cmd(
                "show",
                ["-s", f"--pretty=format:{format_str}", "--date=iso", commit_hash]
            )
            
            commit_parts = commit_output.strip().split('|')
            if len(commit_parts) < 6:
                return None
                
            # 커밋 정보 파싱
            commit_info = {
                "hash": commit_parts[0],
                "author": commit_parts[1],
                "email": commit_parts[2],
                "message": commit_parts[3],
                "date": commit_parts[4],
                "parents": commit_parts[5].split() if commit_parts[5] else []
            }
            
            # 변경된 파일 정보 조회
            try:
                files_output = self.run_git_cmd(
                    "show",
                    ["--name-status", "--pretty=format:", commit_hash]
                )
                
                files = []
                for line in files_output.strip().split('\n'):
                    if not line.strip():
                        continue
                        
                    parts = line.strip().split('\t')
                    if len(parts) >= 2:
                        status = parts[0]
                        path = parts[1]
                        old_path = parts[2] if len(parts) > 2 and status.startswith('R') else None
                        
                        files.append({
                            "path": path,
                            "status": status,
                            "old_path": old_path
                        })
                        
                commit_info["files"] = files
            except Exception as e:
                self.logger.debug(f"변경 파일 조회 중 오류: {str(e)}")
                commit_info["files"] = []
            
            # 캐시에 저장 (커밋 정보는 변경되지 않으므로 오래 유지)
            self.set_to_cache(cache_key, commit_info, ttl=LONG_TTL)  # 1시간
            
            return commit_info
            
        except Exception as e:
            self.logger.error(f"커밋 정보 조회 중 오류: {str(e)}")
            return None
    
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
        try:
            # 캐시 키 생성
            cache_params = {
                "path": path or "",
                "limit": limit,
                "skip": skip,
                "since": since or "",
                "until": until or ""
            }
            cache_key = self._get_cache_key("commit_history", **cache_params)
            
            # 캐시 확인
            if use_cache:
                cached_value = self.get_from_cache(cache_key)
                if cached_value:
                    return cached_value
            
            # Git 명령어 구성
            cmd_args = ["--pretty=format:%H|%an|%ae|%s|%cd|%P", "--date=iso"]
            
            # 추가 옵션 적용
            if limit > 0:
                cmd_args.extend(["-n", str(limit)])
            if skip > 0:
                cmd_args.extend(["--skip", str(skip)])
            if since:
                cmd_args.extend(["--since", since])
            if until:
                cmd_args.extend(["--until", until])
                
            # 경로 지정
            if path:
                cmd_args.append("--")
                cmd_args.append(path)
                
            # 명령 실행
            output = self.run_git_cmd("log", cmd_args)
            
            # 결과 파싱
            commits = []
            rows = output.strip().split('\n')
            for row in rows:
                if not row.strip():
                    continue
                    
                parts = row.split('|')
                if len(parts) >= 6:
                    commit = {
                        "hash": parts[0],
                        "author": parts[1],
                        "email": parts[2],
                        "message": parts[3],
                        "date": parts[4],
                        "parents": parts[5].split() if parts[5] else []
                    }
                    commits.append(commit)
            
            # 캐시에 저장
            if use_cache:
                self.set_to_cache(cache_key, commits, ttl=SHORT_TTL)
                
                # 상태 정보도 무효화 (커밋 이력과 관련된 정보가 변경되었을 수 있음)
                status_key = self._get_cache_key("status")
                self.invalidate_cache_by_pattern(status_key)
                
            return commits
            
        except Exception as e:
            self.logger.error(f"커밋 이력 조회 중 오류: {str(e)}")
            return []
    
    def _invalidate_repo_cache(self) -> None:
        """저장소 캐시를 무효화합니다."""
        try:
            # 상태 및 커밋 이력 관련 캐시 무효화
            self.invalidate_cache_by_pattern("status:*")
            self.invalidate_cache_by_pattern("commit_history:*")
            self.invalidate_cache_by_pattern("branches:*")
        except Exception as e:
            self.logger.error(f"캐시 무효화 중 오류: {str(e)}")
    
    def _is_safe_path(self, path: str) -> bool:
        """
        경로가 저장소 내에 있는 안전한 경로인지 확인합니다.
        
        Args:
            path: 확인할 경로
            
        Returns:
            bool: 안전한 경로 여부
        """
        # 절대 경로는 허용하지 않음
        if os.path.isabs(path):
            return False
            
        # 상위 디렉토리 이동 확인
        norm_path = os.path.normpath(path)
        if norm_path.startswith('..') or '/../' in norm_path:
            return False
            
        # 저장소 내 경로인지 확인
        full_path = os.path.join(self.repo_path, norm_path)
        return os.path.exists(full_path) or os.path.exists(os.path.dirname(full_path)) 