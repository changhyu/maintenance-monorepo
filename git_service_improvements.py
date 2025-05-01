"""
GitService 모듈 기능 확장 및 최적화
이 파일은 GitService 클래스의 확장 기능과 성능 최적화를 구현합니다.
"""
import asyncio
import functools
import logging
import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)

# 캐싱을 위한 전역 캐시 및 설정
_CACHE = {}
DEFAULT_CACHE_TTL = 300  # 기본 캐시 유효시간 (초)
MAX_WORKERS = 4  # 동시 실행 가능한 최대 스레드 수

class GitOperationException(Exception):
    """Git 작업 중 발생하는 예외를 처리하기 위한 클래스"""
    pass

class GitServiceExtended:
    """
    GitService 클래스의 확장 기능을 제공하는 클래스
    기존 GitService 클래스의 모든 기능을 포함하면서 추가 기능 구현
    """
    def __init__(self, repo_path: str = None, enable_cache: bool = True, cache_ttl: int = DEFAULT_CACHE_TTL):
        """
        GitServiceExtended 초기화
        Args:
            repo_path (str, optional): 저장소 경로. 기본값은 현재 작업 디렉토리
            enable_cache (bool): 캐시 활성화 여부
            cache_ttl (int): 캐시 유효 시간(초)
        """
        self.repo_path = repo_path or os.getcwd()
        self.enable_cache = enable_cache
        self.cache_ttl = cache_ttl
        self._cache = {}
        self._executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        
        logger.info(f"GitServiceExtended 초기화: 경로={self.repo_path}, 캐싱={'활성화' if enable_cache else '비활성화'}")
        
        # Git 설치 확인
        self._check_git_installed()
        
        # 유효한 Git 저장소인지 확인
        if not self._is_git_repository():
            raise GitOperationException(
                f"경로 '{self.repo_path}'에 유효한 Git 저장소가 없습니다."
            )

    def _run_git_command(self, args: List[str], use_cache: bool = False) -> str:
        """
        Git 명령어 실행 최적화 버전
        Args:
            args: Git 명령어 인자
            use_cache: 캐시 사용 여부
        Returns:
            str: 명령어 실행 결과
        """
        cmd = ["git"] + args
        cmd_str = " ".join(cmd)
        
        # 캐싱이 활성화된 경우 캐시 확인
        if self.enable_cache and use_cache:
            cache_key = f"{self.repo_path}:{cmd_str}"
            if cache_key in self._cache:
                cached_result, timestamp = self._cache[cache_key]
                if timestamp + timedelta(seconds=self.cache_ttl) > datetime.now():
                    logger.debug(f"캐시에서 결과 반환: {cmd_str}")
                    return cached_result
        
        try:
            start_time = time.time()
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                check=True,
                text=True,
                capture_output=True,
                encoding="utf-8",
            )
            output = result.stdout.strip()
            
            execution_time = time.time() - start_time
            if execution_time > 1.0:  # 1초 이상 걸린 작업 로깅
                logger.info(f"오래 걸린 Git 작업: {cmd_str} ({execution_time:.2f}초)")
            
            # 캐싱이 활성화된 경우 결과 캐싱
            if self.enable_cache and use_cache:
                cache_key = f"{self.repo_path}:{cmd_str}"
                self._cache[cache_key] = (output, datetime.now())
            
            return output
        except subprocess.CalledProcessError as e:
            error_msg = f"Git 명령어 실행 실패: {cmd_str} (종료 코드: {e.returncode})"
            if e.stderr:
                error_msg += f"\n에러: {e.stderr.strip()}"
            logger.error(error_msg)
            raise GitOperationException(error_msg)
        except Exception as e:
            error_msg = f"Git 명령어 실행 중 예외 발생: {cmd_str} ({str(e)})"
            logger.error(error_msg)
            raise GitOperationException(error_msg)

    def _check_git_installed(self) -> bool:
        """Git 설치 여부 확인"""
        try:
            subprocess.run(
                ["git", "--version"], 
                check=True, 
                capture_output=True, 
                text=True
            )
            return True
        except (subprocess.SubprocessError, FileNotFoundError):
            error_msg = "Git이 설치되어 있지 않거나 PATH에 없습니다."
            logger.error(error_msg)
            raise GitOperationException(error_msg)

    def _is_git_repository(self) -> bool:
        """유효한 Git 저장소인지 확인"""
        try:
            subprocess.run(
                ["git", "rev-parse", "--is-inside-work-tree"],
                cwd=self.repo_path,
                check=True,
                capture_output=True,
            )
            return True
        except subprocess.SubprocessError:
            return False

    def _get_conflict_files(self) -> List[str]:
        """충돌 중인 파일 목록 가져오기"""
        try:
            status_output = self._run_git_command(["status", "--porcelain"])
            conflict_files = []
            for line in status_output.split("\n"):
                if line.startswith("UU ") or line.startswith("AA ") or line.startswith("DD "):
                    conflict_files.append(line[3:])
            return conflict_files
        except Exception as e:
            logger.error(f"충돌 파일 목록 가져오기 실패: {str(e)}")
            return []

    def _get_status_label(self, code: str) -> str:
        """Git 상태 코드에 해당하는 레이블 반환"""
        status_map = {
            "M": "modified",
            "A": "added",
            "D": "deleted",
            "R": "renamed",
            "C": "copied",
            "U": "conflict",
            "?": "untracked",
        }
        return status_map.get(code, "unknown")

    def invalidate_cache(self, pattern: str = None) -> None:
        """
        캐시 무효화
        Args:
            pattern: 무효화할 캐시 키 패턴 (None이면 전체 캐시 무효화)
        """
        if pattern:
            # 접근 중 수정되는 것을 방지하기 위해 목록을 먼저 복사
            try:
                # 키 목록을 먼저 복사하여 iterable 생성
                keys_to_remove = [k for k in list(self._cache.keys()) if pattern in k]
                
                for key in keys_to_remove:
                    try:
                        del self._cache[key]
                    except KeyError:
                        # 다른 스레드에서 이미 삭제된 경우 무시
                        continue
                logger.debug(f"{len(keys_to_remove)}개 캐시 항목 무효화: 패턴='{pattern}'")
            except (RuntimeError, Exception) as e:
                # 반복 중 수정되는 경우나 기타 예외 처리
                logger.warning(f"캐시 무효화 중 오류 발생: {str(e)}")
                # 안전하게 전체 캐시 삭제
                self._cache.clear()
                logger.debug("오류로 인해 전체 캐시가 무효화되었습니다.")
        else:
            self._cache.clear()
            logger.debug("전체 캐시 무효화")

    def cached(self, ttl: Optional[int] = None):
        """
        메서드 결과 캐싱 데코레이터
        Args:
            ttl: 캐시 유효 시간(초), None이면 기본값 사용
        """
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # args[0]가 self가 되어야 함
                if not self.enable_cache:
                    return func(*args, **kwargs)
                
                # 함수 이름과 인자로 캐시 키 생성
                key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
                cache_ttl = ttl or self.cache_ttl
                
                # 캐시 조회 시 예외 처리 추가
                try:
                    if key in self._cache:
                        result, timestamp = self._cache[key]
                        if timestamp + timedelta(seconds=cache_ttl) > datetime.now():
                            return result
                except Exception as e:
                    logger.debug(f"캐시 조회 중 오류: {str(e)}")
                    # 오류 시 원본 함수 실행
                
                # 캐시 없거나 만료됨 - 함수 실행
                result = func(*args, **kwargs)
                
                # 결과 캐싱 (예외 처리 추가)
                try:
                    self._cache[key] = (result, datetime.now())
                except Exception as e:
                    logger.debug(f"결과 캐싱 중 오류: {str(e)}")
                
                return result
            
            return wrapper
        return decorator

    async def run_async(self, method_name: str, *args, **kwargs) -> Any:
        """
        비동기로 메서드 실행
        Args:
            method_name: 실행할 메서드 이름
            args, kwargs: 메서드 인자
        Returns:
            Any: 메서드 실행 결과
        """
        if not hasattr(self, method_name):
            raise ValueError(f"메서드를 찾을 수 없음: {method_name}")
        
        method = getattr(self, method_name)
        if not callable(method):
            raise ValueError(f"{method_name}은(는) 호출 가능한 메서드가 아닙니다.")
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            functools.partial(method, *args, **kwargs)
        )

    def create_branch(self, branch_name: str, checkout: bool = True) -> Dict[str, Any]:
        """
        새 브랜치 생성
        Args:
            branch_name: 새 브랜치 이름
            checkout: 생성 후 체크아웃 여부
        Returns:
            Dict: 브랜치 생성 결과
        """
        try:
            # 브랜치 존재 여부 확인 (캐시 사용)
            branches = self._run_git_command(["branch", "--list", branch_name], use_cache=True)
            if branches.strip():
                if checkout:
                    self._run_git_command(["checkout", branch_name])
                    # 브랜치 변경 후 관련 캐시 무효화
                    self.invalidate_cache("branch")
                    return {
                        "success": True,
                        "message": f"기존 브랜치 '{branch_name}'로 체크아웃했습니다.",
                        "branch": branch_name,
                        "already_exists": True,
                    }
                return {
                    "success": True,
                    "message": f"브랜치 '{branch_name}'가 이미 존재합니다.",
                    "branch": branch_name,
                    "already_exists": True,
                }
            
            # 브랜치 생성
            if checkout:
                self._run_git_command(["checkout", "-b", branch_name])
                # 브랜치 변경 후 관련 캐시 무효화
                self.invalidate_cache("branch")
                return {
                    "success": True,
                    "message": f"브랜치 '{branch_name}'를 생성하고 체크아웃했습니다.",
                    "branch": branch_name,
                    "already_exists": False,
                }
            else:
                self._run_git_command(["branch", branch_name])
                # 브랜치 관련 캐시 무효화
                self.invalidate_cache("branch")
                return {
                    "success": True,
                    "message": f"브랜치 '{branch_name}'를 생성했습니다.",
                    "branch": branch_name,
                    "already_exists": False,
                }
        except Exception as e:
            logger.error(f"브랜치 생성 중 오류 발생: {str(e)}")
            raise GitOperationException(f"브랜치 생성 실패: {str(e)}")

    def merge_branch(
        self,
        branch_name: str,
        commit_message: Optional[str] = None,
        squash: bool = False,
        strategy: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        현재 브랜치에 다른 브랜치를 병합
        Args:
            branch_name: 병합할 브랜치 이름
            commit_message: 병합 커밋 메시지 (None일 경우 기본 메시지 사용)
            squash: 스쿼시 병합 여부
            strategy: 병합 전략 (None, 'ours', 'theirs', 'recursive')
        Returns:
            Dict: 병합 결과
        """
        try:
            # 병합할 브랜치 존재 여부 확인 (캐시 사용)
            branches = self._run_git_command(["branch", "--list", branch_name], use_cache=True)
            if not branches.strip():
                return {
                    "success": False,
                    "message": f"브랜치 '{branch_name}'가 존재하지 않습니다.",
                }
            
            # 현재 브랜치 확인 (캐시 사용)
            current_branch = self._run_git_command(
                ["rev-parse", "--abbrev-ref", "HEAD"],
                use_cache=True
            )
            
            # 병합 명령 구성
            merge_cmd = ["merge"]
            if not squash:
                merge_cmd.append("--no-ff")  # 항상 병합 커밋 생성
            if squash:
                merge_cmd.append("--squash")
            if commit_message:
                merge_cmd.extend(["-m", commit_message])
            if strategy:
                if strategy in ["ours", "theirs", "recursive"]:
                    merge_cmd.extend([f"--strategy={strategy}"])
                else:
                    logger.warning(
                        f"지원하지 않는 병합 전략: {strategy}, 기본 전략 사용"
                    )
            merge_cmd.append(branch_name)
            
            # 병합 실행
            result = self._run_git_command(merge_cmd)
            
            # 병합 후 캐시 무효화 (저장소 상태가 변경됨)
            self.invalidate_cache()
            
            return {
                "success": True,
                "message": f"브랜치 '{branch_name}'를 '{current_branch}'에 병합했습니다.",
                "details": result,
            }
        except Exception as e:
            logger.error(f"브랜치 병합 중 오류 발생: {str(e)}")
            # 충돌 발생 여부 확인
            status = self._run_git_command(["status"])
            if "Unmerged paths" in status or "fix conflicts" in status.lower():
                conflict_files = self._get_conflict_files()
                return {
                    "success": False,
                    "has_conflicts": True,
                    "conflict_files": conflict_files,
                    "message": f"병합 충돌이 발생했습니다. {len(conflict_files)}개 파일에서 충돌이 발생했습니다.",
                    "suggestion": "충돌을 해결한 후 'git add'와 'git commit'을 실행하거나, 'resolve_merge_conflicts()' 메서드를 사용하세요.",
                }
            
            # 병합 취소
            try:
                self._run_git_command(["merge", "--abort"])
            except:
                pass
            
            raise GitOperationException(f"브랜치 병합 실패: {str(e)}")

    def tag_version(
        self,
        tag_name: str,
        message: Optional[str] = None,
        annotated: bool = True,
        commit: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        버전 태그 생성
        Args:
            tag_name: 태그 이름
            message: 태그 메시지
            annotated: 주석 태그 여부
            commit: 태그를 생성할 커밋 (None일 경우 HEAD)
        Returns:
            Dict: 태그 생성 결과
        """
        try:
            # 태그 명령 구성
            tag_cmd = ["tag"]
            if annotated:
                tag_cmd.append("-a")
                if message:
                    tag_cmd.extend(["-m", message])
                else:
                    tag_cmd.extend(["-m", f"버전 {tag_name}"])
            tag_cmd.append(tag_name)
            if commit:
                tag_cmd.append(commit)
            
            # 태그 생성
            self._run_git_command(tag_cmd)
            
            # 태그 관련 캐시 무효화
            self.invalidate_cache("tag")
            
            return {
                "success": True,
                "message": f"태그 '{tag_name}'을 생성했습니다.",
                "tag": tag_name,
                "annotated": annotated,
            }
        except Exception as e:
            logger.error(f"태그 생성 중 오류 발생: {str(e)}")
            raise GitOperationException(f"태그 생성 실패: {str(e)}")

    def fetch(self, remote: str = "origin", prune: bool = False) -> Dict[str, Any]:
        """
        원격 저장소에서 데이터 가져오기 (pull 없이)
        Args:
            remote: 원격 저장소 이름
            prune: 원격에서 삭제된 브랜치 정리 여부
        Returns:
            Dict: 가져오기 결과
        """
        try:
            # fetch 명령 구성
            fetch_cmd = ["fetch", remote]
            if prune:
                fetch_cmd.append("--prune")
            
            # 명령 실행 (시간이 오래 걸릴 수 있는 작업)
            start_time = time.time()
            result = self._run_git_command(fetch_cmd)
            execution_time = time.time() - start_time
            
            # fetch 후 캐시 무효화 (원격 브랜치 정보가 변경됨)
            self.invalidate_cache("remote")
            
            return {
                "success": True,
                "message": f"원격 저장소 '{remote}'에서 remote 변경사항을 가져왔습니다.",
                "details": result,
                "execution_time": f"{execution_time:.2f}초",
            }
        except Exception as e:
            logger.error(f"fetch 중 오류 발생: {str(e)}")
            raise GitOperationException(f"fetch 실패: {str(e)}")

    def stash(
        self,
        save: bool = True,
        message: Optional[str] = None,
        include_untracked: bool = False,
    ) -> Dict[str, Any]:
        """
        작업 중인 변경사항 임시 저장/복원
        Args:
            save: True면 저장, False면 복원
            message: stash 메시지 (save=True인 경우만 사용)
            include_untracked: 추적되지 않는 파일 포함 여부 (save=True인 경우만 사용)
        Returns:
            Dict: stash 결과
        """
        try:
            if save:
                stash_cmd = ["stash", "push"]
                if message:
                    stash_cmd.extend(["-m", message])
                if include_untracked:
                    stash_cmd.append("--include-untracked")
                result = self._run_git_command(stash_cmd)
                
                # 저장소 상태가 변경되었으므로 캐시 무효화
                self.invalidate_cache()
                
                if "No local changes to save" in result:
                    return {
                        "success": True,
                        "message": "저장할 변경사항이 없습니다.",
                        "changes_saved": False,
                    }
                return {
                    "success": True,
                    "message": "작업 중인 변경사항을 임시 저장했습니다.",
                    "changes_saved": True,
                    "details": result,
                }
            else:
                # stash 목록 확인
                stash_list = self._run_git_command(["stash", "list"])
                if not stash_list.strip():
                    return {"success": False, "message": "복원할 stash가 없습니다."}
                
                # stash 복원
                result = self._run_git_command(["stash", "pop"])
                
                # 저장소 상태가 변경되었으므로 캐시 무효화
                self.invalidate_cache()
                
                return {
                    "success": True,
                    "message": "임시 저장된 변경사항을 복원했습니다.",
                    "changes_restored": True,
                    "details": result,
                }
        except Exception as e:
            logger.error(f"stash 작업 중 오류 발생: {str(e)}")
            raise GitOperationException(f"stash 작업 실패: {str(e)}")

    @functools.lru_cache(maxsize=32)
    def _get_repo_stats(self) -> Dict[str, Any]:
        """
        저장소 통계 정보 (캐시 최적화)
        Returns:
            Dict: 저장소 통계 정보
        """
        commit_count = self._run_git_command(["rev-list", "--count", "HEAD"])
        branch_count = len(self._run_git_command(["branch"]).strip().split("\n"))
        return {
            "commit_count": int(commit_count.strip()),
            "branch_count": branch_count,
            "last_updated": datetime.now().isoformat(),
        }

    @cached(ttl=60)  # 1분 캐시
    def get_status_detailed(self) -> Dict[str, Any]:
        """
        Git 저장소 상태 상세 조회 (캐시 적용)
        Returns:
            Dict: 상세 저장소 상태
        """
        try:
            # 기본 상태 정보
            status = self.get_status()
            
            # 파일별 상태 정보 조회 (캐시 없음 - 항상 최신 상태 필요)
            porcelain_status = self._run_git_command(["status", "--porcelain"])
            
            # 상태별 파일 분류
            staged_files = []
            modified_files = []
            untracked_files = []
            
            for line in porcelain_status.split("\n"):
                if not line.strip():
                    continue
                    
                status_code = line[:2]
                file_path = line[3:]
                
                # 상태 코드에 따른 파일 분류 개선
                if status_code[0] in ["A", "M", "D", "R"]:
                    staged_files.append(
                        {
                            "path": file_path,
                            "status": self._get_status_label(status_code[0]),
                        }
                    )
                if status_code[1] in ["M", "D"]:
                    modified_files.append(
                        {
                            "path": file_path,
                            "status": self._get_status_label(status_code[1]),
                        }
                    )
                if status_code == "??":
                    untracked_files.append({"path": file_path, "status": "untracked"})
                    
                # 충돌 상태 추가
                if status_code in ["UU", "AA", "DD"]:
                    modified_files.append({"path": file_path, "status": "conflict"})
            
            # 저장소 통계 추가 (캐시된 데이터 사용)
            repo_stats = self._get_repo_stats()
            
            # 추가 정보 조합
            detailed_status = {
                **status,
                "staged_files": staged_files,
                "modified_files_detailed": modified_files,
                "untracked_files": untracked_files,
                "total_staged": len(staged_files),
                "total_modified": len(modified_files),
                "total_untracked": len(untracked_files),
                "total_changed": len(staged_files) + len(modified_files) + len(untracked_files),
                "stats": repo_stats
            }
            
            return detailed_status
        except Exception as e:
            logger.error(f"상세 상태 조회 중 오류 발생: {str(e)}")
            raise GitOperationException(f"상세 상태 조회 실패: {str(e)}")

    def push_with_tags(
        self,
        remote: str = "origin",
        branch: str = None,
        force: bool = False,
        tags: bool = True,
    ) -> Dict[str, Any]:
        """
        변경사항과 태그를 원격 저장소로 푸시
        Args:
            remote: 원격 저장소 이름
            branch: 푸시할 브랜치 (None일 경우 현재 브랜치)
            force: 강제 푸시 여부
            tags: 태그 포함 여부
        Returns:
            Dict: 푸시 결과
        """
        try:
            # 현재 브랜치 확인 (캐시 사용)
            current_branch = branch or self._run_git_command(
                ["rev-parse", "--abbrev-ref", "HEAD"], 
                use_cache=True
            )
            
            cmd = ["push", remote, current_branch]
            if force:
                cmd.append("--force")
            if tags:
                cmd.append("--tags")
            
            # 푸시 실행 (시간이 오래 걸릴 수 있는 작업)
            start_time = time.time()
            result = self._run_git_command(cmd)
            execution_time = time.time() - start_time
            
            # 관련 캐시 무효화
            self.invalidate_cache("remote")
            
            return {
                "success": True,
                "branch": current_branch,
                "tags_pushed": tags,
                "details": result,
                "execution_time": f"{execution_time:.2f}초",
            }
        except Exception as e:
            logger.error(f"Git push 중 오류 발생: {str(e)}")
            # pull 후 다시 시도 옵션 제공
            return {
                "success": False,
                "error": str(e),
                "suggestion": "원격 저장소의 변경사항을 먼저 pull한 후 다시 시도해보세요.",
            }

    def pull_with_strategy(
        self,
        remote: str = "origin",
        branch: str = None,
        strategy: str = "recursive",
        rebase: bool = False,
    ) -> Dict[str, Any]:
        """
        원격 저장소에서 변경사항 가져오기 (병합 전략 지정)
        Args:
            remote: 원격 저장소 이름
            branch: 가져올 브랜치 (None일 경우 현재 브랜치)
            strategy: 병합 전략 ('recursive', 'ours', 'theirs')
            rebase: 리베이스 사용 여부
        Returns:
            Dict: pull 결과
        """
        try:
            cmd = ["pull"]
            if strategy and not rebase:
                if strategy in ["recursive", "ours", "theirs"]:
                    cmd.extend([f"--strategy={strategy}"])
            if rebase:
                cmd.append("--rebase")
            cmd.append(remote)
            if branch:
                cmd.append(branch)
            
            # pull 실행 (시간이 오래 걸릴 수 있는 작업)
            start_time = time.time()
            result = self._run_git_command(cmd)
            execution_time = time.time() - start_time
            
            # 저장소 상태가 변경되었으므로 전체 캐시 무효화
            self.invalidate_cache()
            
            return {
                "success": True,
                "strategy": strategy if not rebase else "rebase",
                "details": result,
                "execution_time": f"{execution_time:.2f}초",
            }
        except Exception as e:
            logger.error(f"Git pull 중 오류 발생: {str(e)}")
            # 충돌 확인
            status = self._run_git_command(["status"])
            if "Unmerged paths" in status or "fix conflicts" in status.lower():
                conflict_files = self._get_conflict_files()
                return {
                    "success": False,
                    "has_conflicts": True,
                    "conflict_files": conflict_files,
                    "message": f"Pull 중 병합 충돌이 발생했습니다. {len(conflict_files)}개 파일에서 충돌이 발생했습니다.",
                    "suggestion": "충돌을 해결한 후 'git add'와 'git commit'을 실행하거나, 'resolve_merge_conflicts()' 메서드를 사용하세요.",
                }
            raise GitOperationException(f"Git pull 실패: {str(e)}")

    @cached(ttl=10)  # 10초 캐시
    def get_status(self) -> Dict[str, Any]:
        """Git 저장소 상태 조회 (캐시 적용)"""
        try:
            # 변경된 파일 수 확인
            modified_files = self._run_git_command(["status", "--porcelain"])
            modified_files_list = [f for f in modified_files.split("\n") if f.strip()]
            modified_count = len(modified_files_list)
            
            # 현재 브랜치 확인 (캐시 사용)
            current_branch = self._run_git_command(
                ["rev-parse", "--abbrev-ref", "HEAD"],
                use_cache=True
            )
            
            # 마지막 커밋 정보 (캐시 사용)
            last_commit = self._run_git_command(
                ["log", "-1", "--pretty=format:%h|%an|%s|%ci"],
                use_cache=True
            )
            
            last_commit_info = None
            if last_commit:
                commit_parts = last_commit.split("|")
                if len(commit_parts) >= 4:  # 안전한 파싱을 위한 검증
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
            raise GitOperationException(f"Git 상태 확인 중 오류 발생: {str(e)}")

    def create_commit(self, message: str, paths: List[str] = None) -> Dict[str, Any]:
        """Git 커밋 생성
        Args:
            message: 커밋 메시지
            paths: 커밋에 포함할 파일 경로 목록 (None이면 모든 변경사항 포함)
        Returns:
            Dict: 커밋 결과
        """
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
                return {"success": False, "warning": "커밋할 변경사항이 없습니다."}
            
            # 커밋 생성
            commit_result = self._run_git_command(["commit", "-m", message])
            
            # 커밋 해시 가져오기
            commit_hash = self._run_git_command(["rev-parse", "HEAD"])
            
            # 저장소 상태가 변경되었으므로 캐시 무효화
            self.invalidate_cache()
            
            return {
                "success": True,
                "commit": commit_hash.strip(),
                "message": message,
                "details": commit_result,
            }
        except Exception as e:
            logger.error(f"Git 커밋 생성 중 오류 발생: {str(e)}")
            raise GitOperationException(f"Git 커밋 생성 실패: {str(e)}")

    def resolve_merge_conflicts(self, strategy: str = "ours") -> Dict[str, Any]:
        """
        병합 충돌 해결
        Args:
            strategy: 충돌 해결 전략 ('ours', 'theirs')
        Returns:
            Dict: 충돌 해결 결과
        """
        try:
            if strategy not in ["ours", "theirs"]:
                raise ValueError(
                    f"지원하지 않는 전략: {strategy}. 'ours' 또는 'theirs'만 사용 가능합니다."
                )
            
            # 충돌 중인 파일 목록 가져오기
            conflict_files = self._get_conflict_files()
            if not conflict_files:
                return {"success": True, "message": "해결할 충돌이 없습니다."}
            
            # 전략에 따라 충돌 해결
            for file in conflict_files:
                if strategy == "ours":
                    self._run_git_command(["checkout", "--ours", file])
                else:
                    self._run_git_command(["checkout", "--theirs", file])
                self._run_git_command(["add", file])
            
            # 저장소 상태가 변경되었으므로 캐시 무효화
            self.invalidate_cache()
            
            return {
                "success": True,
                "message": f"{strategy} 전략으로 {len(conflict_files)}개 파일의 충돌을 해결했습니다.",
                "resolved_files": conflict_files,
            }
        except Exception as e:
            logger.error(f"충돌 해결 중 오류 발생: {str(e)}")
            raise GitOperationException(f"충돌 해결 실패: {str(e)}")

    # --- 성능 최적화를 위한 새로운 메서드들 ---

    def batch_operations(self, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        여러 Git 작업을 일괄 처리 (성능 최적화)
        Args:
            operations: 실행할 작업 목록 [{"method": "메서드명", "args": [], "kwargs": {}}]
        Returns:
            List[Dict]: 각 작업의 결과 목록
        """
        results = []
        
        for op in operations:
            method_name = op.get("method")
            args = op.get("args", [])
            kwargs = op.get("kwargs", {})
            
            if not hasattr(self, method_name):
                results.append({
                    "success": False,
                    "error": f"메서드를 찾을 수 없음: {method_name}",
                })
                continue
            
            method = getattr(self, method_name)
            if not callable(method):
                results.append({
                    "success": False,
                    "error": f"{method_name}은(는) 호출 가능한 메서드가 아닙니다.",
                })
                continue
            
            try:
                result = method(*args, **kwargs)
                results.append(result)
            except Exception as e:
                results.append({
                    "success": False,
                    "error": f"{method_name} 실행 중 오류: {str(e)}",
                })
        
        return results

    def optimize_repository(self, aggressive: bool = False) -> Dict[str, Any]:
        """
        저장소 최적화 수행
        Args:
            aggressive: 적극적인 최적화 여부 (데이터 손실 가능성 있음)
        Returns:
            Dict: 최적화 결과
        """
        start_time = time.time()
        results = []
        
        try:
            # 기본 정리 (안전함)
            results.append({
                "operation": "reflog expire",
                "result": self._run_git_command(["reflog", "expire", "--expire=now", "--all"])
            })
            
            # 가비지 컬렉션 실행
            gc_cmd = ["gc", "--prune=now"]
            if aggressive:
                gc_cmd.append("--aggressive")
            results.append({
                "operation": "garbage collection",
                "result": self._run_git_command(gc_cmd)
            })
            
            # 캐시 초기화
            self.invalidate_cache()
            
            execution_time = time.time() - start_time
            return {
                "success": True,
                "message": f"저장소 최적화가 완료되었습니다. ({execution_time:.2f}초)",
                "operations": results,
                "execution_time": f"{execution_time:.2f}초",
            }
        except Exception as e:
            logger.error(f"저장소 최적화 중 오류 발생: {str(e)}")
            execution_time = time.time() - start_time
            return {
                "success": False,
                "error": str(e),
                "execution_time": f"{execution_time:.2f}초",
                "completed_operations": results
            }

    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Git 저장소 성능 메트릭 수집
        Returns:
            Dict: 성능 메트릭
        """
        metrics = {}
        start_time = time.time()
        
        try:
            # 오브젝트 수 확인
            object_count = self._run_git_command(["count-objects", "-v"])
            metrics["objects"] = {}
            for line in object_count.split("\n"):
                if ":" in line:
                    key, value = line.strip().split(":", 1)
                    metrics["objects"][key.strip()] = value.strip()
            
            # 브랜치 수 확인
            branch_output = self._run_git_command(["branch", "-a"])
            branch_count = len([b for b in branch_output.split("\n") if b.strip()])
            metrics["branch_count"] = branch_count
            
            # 태그 수 확인
            tag_output = self._run_git_command(["tag", "-l"])
            tag_count = len([t for t in tag_output.split("\n") if t.strip()])
            metrics["tag_count"] = tag_count
            
            # 저장소 크기 (압축 및 비압축)
            if "size" in metrics["objects"] and "size-pack" in metrics["objects"]:
                total_size = int(metrics["objects"]["size"]) + int(metrics["objects"]["size-pack"])
                metrics["total_size_kb"] = total_size
                metrics["total_size_human"] = f"{total_size/1024:.2f} MB" if total_size > 1024 else f"{total_size} KB"
            
            # 최대 커밋 나이
            newest_commit_date = self._run_git_command(["log", "-1", "--format=%cd", "--date=iso"])
            oldest_commit_date = self._run_git_command(["log", "--reverse", "--format=%cd", "--date=iso", "HEAD^{/.*}"])
            if newest_commit_date and oldest_commit_date:
                metrics["newest_commit"] = newest_commit_date.strip()
                metrics["oldest_commit"] = oldest_commit_date.strip()
            
            execution_time = time.time() - start_time
            metrics["collection_time"] = f"{execution_time:.2f}초"
            
            return {
                "success": True,
                "metrics": metrics,
                "suggestions": self._generate_optimization_suggestions(metrics)
            }
        except Exception as e:
            logger.error(f"성능 메트릭 수집 중 오류 발생: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_optimization_suggestions(self, metrics: Dict[str, Any]) -> List[str]:
        """
        성능 메트릭 기반 최적화 제안 생성
        """
        suggestions = []
        
        # 오브젝트가 많은 경우
        if "objects" in metrics and "count" in metrics["objects"]:
            loose_objects = int(metrics["objects"].get("count", "0"))
            if loose_objects > 10000:
                suggestions.append(f"느슨한 객체가 많습니다 ({loose_objects}개). 'optimize_repository()' 메서드를 실행하세요.")
        
        # 팩 파일이 많은 경우
        if "objects" in metrics and "packs" in metrics["objects"]:
            packs = int(metrics["objects"].get("packs", "0"))
            if packs > 20:
                suggestions.append(f"팩 파일이 많습니다 ({packs}개). 'optimize_repository(aggressive=True)'를 실행하여 팩 파일을 통합하세요.")
        
        # 저장소 크기가 큰 경우
        if "total_size_kb" in metrics and metrics["total_size_kb"] > 500 * 1024:  # 500MB
            suggestions.append(f"저장소 크기가 큽니다 ({metrics['total_size_human']}). Git LFS 사용을 고려하거나 대용량 파일을 .gitignore에 추가하세요.")
        
        # 브랜치가 많은 경우
        if "branch_count" in metrics and metrics["branch_count"] > 50:
            suggestions.append(f"브랜치가 많습니다 ({metrics['branch_count']}개). 사용하지 않는 브랜치를 정리하세요.")
        
        # 기본 제안
        if not suggestions:
            suggestions.append("현재 저장소 상태는 양호합니다. 주기적으로 'optimize_repository()' 메서드를 실행하여 최적화 상태를 유지하세요.")
        
        return suggestions
