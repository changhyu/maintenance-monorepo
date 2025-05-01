"""
Git 저장소 관리를 위한 서비스 클래스
"""

# pylint: disable=broad-except,logging-format-interpolation,too-many-instance-attributes
# pylint: disable=bare-except,too-many-public-methods,missing-function-docstring
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# 임포트 경로 수정
from ..core.exceptions import (
    GitException,
    GitCommitException,
    GitMergeException,
    GitPushPullException,
    GitBranchException,
    GitTagException
)

# 이하 필요한 예외 클래스들을 현재 구조에 맞게 직접 정의
class GitAuthenticationException(GitException):
    """Git 인증 관련 예외"""
    pass

class GitCommandException(GitException):
    """Git 명령어 실행 중 발생한 예외"""
    
    def __init__(self, message: str, command: str = "", exit_code: int = -1, stderr: str = "", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)
        self.command = command
        self.exit_code = exit_code
        self.stderr = stderr
        
        # 기본 세부 정보에 명령어 관련 정보 추가
        if self.details is None:
            self.details = {}
        self.details.update({
            "command": command,
            "exit_code": exit_code,
            "stderr": stderr
        })

class GitRemoteException(GitException):
    """Git 원격 저장소 관련 예외"""
    pass

class GitRepositoryException(GitException):
    """Git 저장소 관련 예외"""
    pass

class GitConflictException(GitException):
    """Git 충돌 관련 예외"""
    pass

def create_git_exception(ex_type: str, message: str, details: Optional[Dict[str, Any]] = None) -> GitException:
    """예외 유형에 따라 적절한 GitException 인스턴스를 생성"""
    exception_map = {
        "command": GitCommandException,
        "repository": GitRepositoryException,
        "merge": GitMergeException,
        "branch": GitBranchException,
        "commit": GitCommitException,
        "tag": GitTagException,
        "remote": GitRemoteException,
    }
    
    exception_class = exception_map.get(ex_type, GitException)
    return exception_class(message, details)

logger = logging.getLogger(__name__)


class GitService:
    """Git 작업을 처리하는 서비스 클래스"""

    def __init__(self, repo_path: str = None):
        """
        GitService 초기화

        Args:
            repo_path (str, optional): 저장소 경로. 기본값은 프로젝트 루트 디렉토리
        """
        self.repo_path = repo_path or os.getcwd()

        logger.info(f"GitService 초기화: 경로={self.repo_path}")

        # Git 설치 확인
        self._check_git_installed()

        # 유효한 Git 저장소인지 확인
        if not self._is_git_repository():
            raise GitRepositoryException(
                f"유효한 Git 저장소가 아닙니다: {self.repo_path}",
                details={"repository_path": self.repo_path}
            )

    def get_status(self) -> Dict[str, Any]:
        """Git 저장소 상태 조회"""
        try:
            # 변경된 파일 수 확인
            modified_files = self._run_git_command(["status", "--porcelain"])
            modified_files_list = modified_files.split("\n") if modified_files else []
            modified_count = len([f for f in modified_files_list if f.strip()])

            # 현재 브랜치 확인
            current_branch = self._run_git_command(
                ["rev-parse", "--abbrev-ref", "HEAD"]
            )

            # 마지막 커밋 정보
            last_commit = self._run_git_command(
                ["log", "-1", "--pretty=format:%h|%an|%s|%ci"]
            )

            last_commit_info = None
            if last_commit:
                commit_parts = last_commit.split("|")
                last_commit_info = {
                    "hash": commit_parts[0],
                    "author": commit_parts[1],
                    "message": commit_parts[2],
                    "date": commit_parts[3],
                }

            return {
                "branch": current_branch,
                "modified_files": modified_count,
                "has_changes": modified_count > 0,
                "last_commit": last_commit_info,
            }
        except Exception as e:
            logger.error(f"Git 상태 확인 중 예외 발생: {str(e)}")
            raise GitException(
                f"Git 상태 확인 중 오류 발생: {str(e)}", 
                details={
                    "repository_path": self.repo_path,
                    "exception_type": type(e).__name__
                }
            ) from e

    def create_commit(self, message: str, paths: List[str] = None) -> Dict[str, Any]:
        """
        Git 커밋 생성
        
        Args:
            message: 커밋 메시지
            paths: 커밋할 파일 경로 목록 (None이면 모든 변경사항)
            
        Returns:
            Dict[str, Any]: 커밋 결과 정보
            
        Raises:
            GitCommandException: Git 명령 실행 중 오류 발생 시
            GitException: 기타 Git 관련 오류 발생 시
        """
        try:
            # 지정된 경로나 모든 변경사항 스테이징
            if paths:
                for path in paths:
                    try:
                        self._run_git_command(["add", path])
                    except GitCommandException as e:
                        # 각 파일 추가 시 오류 처리를 개별적으로 하여 일부 파일만 실패해도 계속 진행
                        logger.warning(f"파일 스테이징 중 오류 발생 (계속 진행): {path} - {str(e)}")
                        # 예외를 다시 던지지 않고 경고 로그만 남김
            else:
                self._run_git_command(["add", "."])

            # 변경사항이 있는지 확인
            status = self._run_git_command(["status", "--porcelain"])
            if not status.strip():
                logger.info("커밋할 변경사항이 없습니다.")
                return {
                    "success": False,
                    "warning": "커밋할 변경사항이 없습니다.",
                    "details": {"status": "clean"}
                }

            # 커밋 생성
            commit_result = self._run_git_command(["commit", "-m", message])

            # 커밋 해시 가져오기
            commit_hash = self._run_git_command(["rev-parse", "HEAD"])

            logger.info(f"커밋 생성 완료: {commit_hash.strip()}")
            return {
                "success": True,
                "commit": commit_hash.strip(),
                "message": message,
                "details": commit_result,
            }
        except GitCommandException as e:
            # Git 명령 실행 오류
            error_msg = f"Git 커밋 생성 중 명령 오류 발생: {str(e)}"
            logger.error(error_msg)
            
            # 특정 오류 상황을 구분하여 처리
            if e.stderr and "nothing to commit" in e.stderr:
                return {
                    "success": False,
                    "warning": "커밋할 변경사항이 없습니다.",
                    "details": e.details
                }
            
            # 명령 실행 관련 오류는 그대로 전파
            raise
        except GitException as e:
            # 기타 Git 관련 오류
            error_msg = f"Git 커밋 생성 중 오류 발생: {str(e)}"
            logger.error(error_msg)
            raise
        except Exception as e:
            # 예상치 못한 오류는 GitException으로 래핑
            error_msg = f"Git 커밋 생성 중 예상치 못한 오류 발생: {str(e)}"
            logger.error(error_msg)
            
            raise GitException(
                error_msg,
                details={
                    "exception_type": type(e).__name__,
                    "message": message,
                    "paths": paths
                }
            ) from e

    def pull(self, remote: str = "origin", branch: str = None) -> Dict[str, Any]:
        """원격 저장소에서 변경사항 가져오기"""
        try:
            if branch:
                result = self._run_git_command(["pull", remote, branch])
            else:
                result = self._run_git_command(["pull", remote])

            return {"success": True, "details": result}
        except Exception as e:
            logger.error(f"Git pull 중 오류 발생: {str(e)}")
            raise GitException(
                f"Git pull 실패: {str(e)}", 
                details={
                    "remote": remote,
                    "branch": branch,
                    "repository_path": self.repo_path
                }
            ) from e

    def push(
        self, remote: str = "origin", branch: str = None, force: bool = False
    ) -> Dict[str, Any]:
        """변경사항을 원격 저장소로 푸시"""
        try:
            # 현재 브랜치 확인
            current_branch = branch or self._run_git_command(
                ["rev-parse", "--abbrev-ref", "HEAD"]
            )

            cmd = ["push", remote, current_branch]
            if force:
                cmd.append("--force")

            result = self._run_git_command(cmd)

            return {"success": True, "branch": current_branch, "details": result}
        except Exception as e:
            logger.error(f"Git push 중 오류 발생: {str(e)}")

            # pull 후 다시 시도 옵션 제공
            return {
                "success": False,
                "error": str(e),
                "suggestion": "원격 저장소의 변경사항을 먼저 pull한 후 다시 시도해보세요.",
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

            return {"success": True, "resolved_files": conflicts, "strategy": strategy}
        except Exception as e:
            logger.error(f"충돌 해결 중 오류 발생: {str(e)}")
            raise GitException(
                f"충돌 해결 실패: {str(e)}", 
                details={
                    "strategy": strategy,
                    "conflicted_files": self._get_conflict_files() if hasattr(self, '_get_conflict_files') else []
                }
            ) from e

    def get_commit_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """커밋 히스토리 조회"""
        try:
            result = self._run_git_command(
                ["log", f"-{limit}", "--pretty=format:%h|%an|%ae|%s|%ci"]
            )

            commits = []
            for line in result.strip().split("\n"):
                if line:
                    parts = line.split("|")
                    if len(parts) >= 5:
                        commits.append(
                            {
                                "hash": parts[0],
                                "author": parts[1],
                                "email": parts[2],
                                "message": parts[3],
                                "date": parts[4],
                            }
                        )

            return commits
        except Exception as e:
            logger.error(f"커밋 히스토리 조회 중 오류 발생: {str(e)}")
            raise GitException(
                f"커밋 히스토리 조회 실패: {str(e)}", 
                details={
                    "limit": limit,
                    "repository_path": self.repo_path
                }
            ) from e

    def _check_git_installed(self) -> None:
        """Git이 설치되어 있는지 확인"""
        try:
            subprocess.run(
                ["git", "--version"],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        except (subprocess.SubprocessError, FileNotFoundError):
            raise GitException(
                "Git이 설치되어 있지 않습니다. Git을 설치한 후 다시 시도하세요.",
                details={"error_type": "git_not_installed"}
            )

    def _is_git_repository(self) -> bool:
        """현재 경로가 유효한 Git 저장소인지 확인"""
        try:
            # .git 디렉토리 확인
            git_dir = Path(self.repo_path) / ".git"
            if not git_dir.exists() or not git_dir.is_dir():
                return False

            # git rev-parse 명령으로 확인
            self._run_git_command(["rev-parse", "--is-inside-work-tree"])
            return True
        except:
            return False

    def _run_git_command(self, args: List[str]) -> str:
        """Git 명령 실행 공통 함수"""
        cmd = ["git", "-C", self.repo_path] + args
        cmd_str = " ".join(cmd)
        
        try:
            result = subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.strip() if hasattr(e, 'stderr') else ""
            logger.error(f"Git 명령 실행 중 오류: {stderr}")
            
            raise GitCommandException(
                f"Git 명령 실패: {stderr}",
                command=cmd_str,
                exit_code=e.returncode,
                stderr=stderr,
                details={"args": args}
            )
        except FileNotFoundError:
            logger.error(f"Git 명령을 찾을 수 없습니다: {cmd_str}")
            raise GitException(
                "Git 명령을 찾을 수 없습니다. Git이 설치되어 있는지 확인하세요.",
                details={"command": cmd_str}
            )
        except Exception as e:
            logger.error(f"Git 명령 실행 중 예상치 못한 오류: {str(e)}")
            raise GitCommandException(
                f"Git 명령 실행 중 예상치 못한 오류: {str(e)}",
                command=cmd_str,
                details={"exception_type": type(e).__name__}
            )

    def _get_conflict_files(self) -> List[str]:
        """충돌 중인 파일 목록 반환"""
        status = self._run_git_command(["status", "--porcelain"])
        conflicts = []

        for line in status.split("\n"):
            if line.startswith("UU "):
                conflicts.append(line[3:])

        return conflicts
