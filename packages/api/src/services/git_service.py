"""
Git 저장소 관리를 위한 서비스 클래스
"""
import logging
import subprocess
import os
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from ..core.exceptions import GitOperationException

logger = logging.getLogger(__name__)

class GitService:
    """Git 작업을 처리하는 서비스 클래스"""
    
    def __init__(self, repo_path: str = None):
        """
        GitService 초기화
        
        Args:
            repo_path (str, optional): 저장소 경로. 기본값은 프로젝트 루트 디렉토리
        """
        if repo_path is None:
            # 현재 파일의 위치에서 프로젝트 루트 디렉토리 계산
            current_file = Path(__file__).resolve()
            # src/services에서 두 단계 위로 이동
            self.repo_path = str(current_file.parent.parent.parent)
        else:
            self.repo_path = os.path.abspath(repo_path)
            
        logger.info(f"GitService 초기화: 경로={self.repo_path}")
        
        # Git 설치 확인
        self._check_git_installed()
        
        # 유효한 Git 저장소인지 확인
        if not self._is_git_repository():
            raise GitOperationException(f"경로 '{self.repo_path}'에 유효한 Git 저장소가 없습니다.")
    
    def get_status(self) -> Dict[str, Any]:
        """Git 저장소 상태 조회"""
        try:
            # 변경된 파일 수 확인
            modified_files = self._run_git_command(["status", "--porcelain"])
            modified_files_list = modified_files.split("\n") if modified_files else []
            modified_count = len([f for f in modified_files_list if f.strip()])
            
            # 현재 브랜치 확인
            current_branch = self._run_git_command(["rev-parse", "--abbrev-ref", "HEAD"])
            
            # 마지막 커밋 정보
            last_commit = self._run_git_command(["log", "-1", "--pretty=format:%h|%an|%s|%ci"])
            
            last_commit_info = None
            if last_commit:
                commit_parts = last_commit.split("|")
                last_commit_info = {
                    "hash": commit_parts[0],
                    "author": commit_parts[1],
                    "message": commit_parts[2],
                    "date": commit_parts[3]
                }
            
            return {
                "branch": current_branch,
                "modified_files": modified_count,
                "has_changes": modified_count > 0,
                "last_commit": last_commit_info
            }
        except Exception as e:
            logger.error(f"Git 상태 확인 중 예외 발생: {str(e)}")
            raise GitOperationException(f"Git 상태 확인 중 오류 발생: {str(e)}")
            
    def create_commit(self, message: str, paths: List[str] = None) -> Dict[str, Any]:
        """Git 커밋 생성"""
        try:
            # 지정된 경로나 모든 변경사항 스테이징
            if paths:
                for path in paths:
                    self._run_git_command(["add", path])
            else:
                self._run_git_command(["add", "."])
            
            # 변경사항이 있는지 확인
            status = self._run_git_command(["status", "--porcelain"])
            if not status.strip():
                return {"warning": "커밋할 변경사항이 없습니다."}
            
            # 커밋 생성
            commit_result = self._run_git_command(["commit", "-m", message])
            
            # 커밋 해시 가져오기
            commit_hash = self._run_git_command(["rev-parse", "HEAD"])
            
            return {
                "success": True,
                "commit": commit_hash.strip(),
                "message": message,
                "details": commit_result
            }
        except Exception as e:
            logger.error(f"Git 커밋 생성 중 오류 발생: {str(e)}")
            raise GitOperationException(f"Git 커밋 생성 실패: {str(e)}")
            
    def pull(self, remote: str = "origin", branch: str = None) -> Dict[str, Any]:
        """원격 저장소에서 변경사항 가져오기"""
        try:
            if branch:
                result = self._run_git_command(["pull", remote, branch])
            else:
                result = self._run_git_command(["pull", remote])
                
            return {
                "success": True,
                "details": result
            }
        except Exception as e:
            logger.error(f"Git pull 중 오류 발생: {str(e)}")
            raise GitOperationException(f"Git pull 실패: {str(e)}")
            
    def push(self, remote: str = "origin", branch: str = None, force: bool = False) -> Dict[str, Any]:
        """변경사항을 원격 저장소로 푸시"""
        try:
            # 현재 브랜치 확인
            current_branch = branch or self._run_git_command(["rev-parse", "--abbrev-ref", "HEAD"])
            
            cmd = ["push", remote, current_branch]
            if force:
                cmd.append("--force")
                
            result = self._run_git_command(cmd)
                
            return {
                "success": True,
                "branch": current_branch,
                "details": result
            }
        except Exception as e:
            logger.error(f"Git push 중 오류 발생: {str(e)}")
            
            # pull 후 다시 시도 옵션 제공
            return {
                "success": False,
                "error": str(e),
                "suggestion": "원격 저장소의 변경사항을 먼저 pull한 후 다시 시도해보세요."
            }
            
    def resolve_merge_conflicts(self, strategy: str = "ours") -> Dict[str, Any]:
        """병합 충돌 해결"""
        try:
            if strategy not in ["ours", "theirs"]:
                strategy = "ours"  # 기본값
                
            # 충돌 파일 확인
            conflicts = self._get_conflict_files()
            
            if not conflicts:
                return {"message": "해결할 충돌이 없습니다."}
                
            for file_path in conflicts:
                if strategy == "ours":
                    self._run_git_command(["checkout", "--ours", file_path])
                else:
                    self._run_git_command(["checkout", "--theirs", file_path])
                    
                # 해결된 파일 추가
                self._run_git_command(["add", file_path])
                
            return {
                "success": True,
                "resolved_files": conflicts,
                "strategy": strategy
            }
        except Exception as e:
            logger.error(f"충돌 해결 중 오류 발생: {str(e)}")
            raise GitOperationException(f"충돌 해결 실패: {str(e)}")
            
    def get_commit_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """커밋 히스토리 조회"""
        try:
            result = self._run_git_command([
                "log", 
                f"-{limit}", 
                "--pretty=format:%h|%an|%ae|%s|%ci"
            ])
            
            commits = []
            for line in result.strip().split("\n"):
                if line:
                    parts = line.split("|")
                    if len(parts) >= 5:
                        commits.append({
                            "hash": parts[0],
                            "author": parts[1],
                            "email": parts[2],
                            "message": parts[3],
                            "date": parts[4]
                        })
            
            return commits
        except Exception as e:
            logger.error(f"커밋 히스토리 조회 중 오류 발생: {str(e)}")
            raise GitOperationException(f"커밋 히스토리 조회 실패: {str(e)}")
    
    def _check_git_installed(self) -> None:
        """Git이 설치되어 있는지 확인"""
        try:
            subprocess.run(["git", "--version"], check=True, capture_output=True)
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            logger.error(f"Git이 설치되어 있지 않거나 실행할 수 없습니다: {str(e)}")
            raise GitOperationException("Git이 설치되어 있지 않거나 실행할 수 없습니다.")
            
    def _is_git_repository(self) -> bool:
        """유효한 Git 저장소인지 확인"""
        try:
            subprocess.run(
                ["git", "-C", self.repo_path, "rev-parse", "--is-inside-work-tree"],
                check=True,
                capture_output=True
            )
            return True
        except subprocess.SubprocessError:
            return False
            
    def _run_git_command(self, args: List[str]) -> str:
        """Git 명령어 실행"""
        try:
            cmd = ["git", "-C", self.repo_path] + args
            result = subprocess.run(
                cmd,
                check=True,
                text=True,
                capture_output=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            error_message = e.stderr.strip() if e.stderr else str(e)
            logger.error(f"Git 명령어 실행 실패: {' '.join(args)}, 오류: {error_message}")
            raise GitOperationException(f"Git 명령어 실행 실패: {error_message}")
            
    def _get_conflict_files(self) -> List[str]:
        """충돌이 있는 파일 목록 조회"""
        try:
            result = self._run_git_command(["diff", "--name-only", "--diff-filter=U"])
            return [f.strip() for f in result.split("\n") if f.strip()]
        except Exception:
            return []