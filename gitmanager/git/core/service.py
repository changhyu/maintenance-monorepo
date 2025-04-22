"""
Git 서비스 모듈

Git 저장소 관리 및 작업을 위한 서비스 클래스를 제공합니다.
"""

import collections
import concurrent.futures
import functools
import hashlib
import json
import logging
import math
import multiprocessing
import os
import random
import re
import shlex
import subprocess
import sys
import threading
import time
from collections import OrderedDict, defaultdict
from datetime import datetime, timedelta
from functools import partial
from pathlib import Path
from threading import Lock
from typing import (Any, Callable, Deque, Dict, List, Optional, Set, Tuple,
                    TypeVar, Union, cast)
import shutil

# Python 버전 호환성 처리
PY_VERSION = sys.version_info
if PY_VERSION >= (3, 8):
    import pickle
else:
    try:
        import pickle5 as pickle
    except ImportError:
        import pickle

try:
    import zlib
except ImportError:
    zlib = None

try:
    import psutil
except ImportError:
    psutil = None

try:
    from git import Repo

    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False
    print("경고: GitPython 라이브러리가 설치되지 않았습니다. 일부 기능이 제한됩니다.")

import tempfile

from gitmanager.git.core.exceptions import (GitAuthenticationException,
                                            GitBranchException,
                                            GitCommandException,
                                            GitConflictException,
                                            GitMergeConflictException,
                                            GitNotInstalledError,
                                            GitRemoteException,
                                            GitRepositoryException,
                                            GitTagException,
                                            GitException,
                                            GitNetworkException,
                                            GitCacheException,
                                            create_git_exception)
from gitmanager.git.core.types import (BranchInfo, CommitComparison,
                                       CommitInfo, CommitResponse,
                                       CommitResult, CommitWarning,
                                       FileHistory, GitBranch, GitChange,
                                       GitChanges, GitCommit, GitConfig,
                                       GitRemote, GitStatus, GitStatusResult,
                                       GitTag, MergeConflictResult,
                                       PullPushResult,
                                       PullPushResultWithChanges, RemoteInfo,
                                       TagInfo)
from gitmanager.git.core.utils import (find_conflict_markers, is_git_installed,
                                       is_git_repository, parse_branch_info,
                                       parse_changes, parse_commit_info,
                                       parse_config_info, parse_file_history,
                                       parse_git_status, parse_merge_conflicts,
                                       parse_remote_info, parse_tag_info,
                                       run_git_command)

logger = logging.getLogger(__name__)

# 제네릭 타입 변수 정의
T = TypeVar("T")

# 캐시 관련 전역 설정
DEFAULT_CACHE_TTL = 300  # 기본 캐시 TTL (5분)
MAX_CACHE_ITEMS = 5000  # 최대 캐시 항목 수
MAX_CACHE_MEMORY = 200 * 1024 * 1024  # 최대 캐시 메모리 (200MB)
DEBUG = False  # 디버그 모드

# 캐시 TTL 설정 (초 단위)
DEFAULT_TTL_SETTINGS = {
    "status": 5,  # 상태는 5초 동안 캐시
    "branches": 60,  # 브랜치 목록은 60초 동안 캐시
    "tags": 60,  # 태그 목록은 60초 동안 캐시
    "commit_history": 300,  # 커밋 히스토리는 5분 동안 캐시
    "file_contributors": 600,  # 파일 기여자는 10분 동안 캐시
    "file_history": 600,  # 파일 히스토리는 10분 동안 캐시
    "repository_metrics": 1800,  # 저장소 메트릭은 30분 동안 캐시
    "default": DEFAULT_CACHE_TTL,  # 기본 캐시 유지 시간 (5분)
}

# 병렬 처리를 위한 전역 설정
MAX_WORKERS = 5  # 최대 병렬 작업자 수


def git_operation(operation_name: str, complexity: int = 5) -> Callable:
    """
    Git 작업 데코레이터 - 작업 성능 측정 및 오류 처리 포함

    Args:
        operation_name: 작업 이름
        complexity: 작업 복잡도 (1-10 사이의 값, 10이 가장 복잡)

    Returns:
        Callable: 데코레이터 함수
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # self 객체 가져오기 (GitService 인스턴스)
            self = args[0] if args and hasattr(args[0], "_performance_stats") else None

            # 성능 측정 준비
            start_time = time.time()
            error = None
            result = None

            # 작업 고유 식별자 생성 (캐시 키 형식 유사)
            operation_id = f"{operation_name}:{int(start_time)}"

            # 최적의 워커 수 계산 (self가 GitService 인스턴스인 경우에만)
            if self and hasattr(self, "_adjust_max_workers"):
                try:
                    # kwargs에 max_workers가 없는 경우에만 동적 조정
                    if "max_workers" not in kwargs:
                        optimal_workers = self._adjust_max_workers(complexity)
                        # 함수에 max_workers 매개변수가 있는 경우 전달
                        if "max_workers" in func.__code__.co_varnames:
                            kwargs["max_workers"] = optimal_workers
                except Exception as e:
                    if hasattr(self, "logger"):
                        self.logger.warning(f"워커 수 조정 중 오류 발생: {str(e)}")

            try:
                # 작업 수행
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                # 오류 발생 시 기록
                error = e
                if self and hasattr(self, "logger"):
                    self.logger.error(f"{operation_name} 실패: {str(e)}")
                # 기본값 반환 또는 예외 재발생
                if (
                    hasattr(func, "__annotations__")
                    and "return" in func.__annotations__
                ):
                    return_type = func.__annotations__["return"]
                    if hasattr(return_type, "empty"):
                        return return_type.empty()
                raise
            finally:
                # 성능 통계 기록 (성공/실패 여부 관계없이)
                end_time = time.time()
                duration = end_time - start_time

                if self and hasattr(self, "_performance_stats"):
                    # 성능 통계 업데이트
                    with self._cache_lock:  # 캐시 락 재사용
                        if operation_name not in self._performance_stats:
                            self._performance_stats[operation_name] = {
                                "count": 0,
                                "total_time": 0,
                                "min_time": float("inf"),
                                "max_time": 0,
                                "last_time": 0,
                                "error_count": 0,
                                "last_error": None,
                                "complexity": complexity,
                            }

                        stats = self._performance_stats[operation_name]
                        stats["count"] += 1
                        stats["total_time"] += duration
                        stats["min_time"] = min(stats["min_time"], duration)
                        stats["max_time"] = max(stats["max_time"], duration)
                        stats["last_time"] = duration

                        if error:
                            stats["error_count"] += 1
                            stats["last_error"] = str(error)

                        # 특히 느린 작업에 대한 로깅 (평균 이상으로 느린 경우)
                        avg_time = stats["total_time"] / stats["count"]
                        if duration > avg_time * 2 and stats["count"] > 5:
                            if hasattr(self, "logger"):
                                self.logger.warning(
                                    f"성능 저하 감지: {operation_name}, 소요 시간 {duration:.2f}초 "
                                    f"(평균: {avg_time:.2f}초)"
                                )

                        # 로그 출력 (너무 자주 출력되지 않도록 제한)
                        if stats["count"] % 10 == 0 and hasattr(self, "logger"):
                            self.logger.info(
                                f"성능 통계: {operation_name}, "
                                f"평균: {avg_time:.3f}초, "
                                f"총 호출: {stats['count']}회, "
                                f"오류율: {(stats['error_count']/stats['count'])*100:.1f}%"
                            )

        return wrapper

    return decorator


class GitService:
    """
    Git 저장소 작업을 관리하는 서비스 클래스
    """

    def __init__(self, repository_path, options=None):
        """
        GitService 클래스 초기화
        
        Parameters:
        -----------
        repository_path : str
            Git 저장소 경로
        options : dict, optional
            설정 옵션
        """
        # Git이 설치되어 있는지 확인
        if not is_git_installed():
            raise GitNotInstalledError("Git이 설치되어 있지 않습니다.")
        
        # 옵션 설정
        self._options = options or {}
        self._repository_path = os.path.abspath(repository_path)
        self._debug_enabled = self._options.get('debug', False)
        
        # 로거 설정
        self.logger = logging.getLogger(f"{__name__}.GitService")
        
        # 캐시 관련 설정
        self._cache = {}  # 메인 캐시 저장소
        self._cache_hit_count = 0  # 캐시 히트 카운트
        self._cache_miss_count = 0  # 캐시 미스 카운트
        self._lru_queue = []  # LRU 큐
        self._cache_last_access_time = {}  # 마지막 접근 시간
        self._cache_first_access_time = {}  # 첫 접근 시간
        self._cache_access_counts = {}  # 접근 횟수
        self._cache_item_ttls = {}  # 항목별 TTL
        self._cache_adaptive_ttl_enabled = self._options.get('adaptive_ttl', True)  # 적응형 TTL 활성화 여부
        self._cache_access_patterns = {}  # 항목별 접근 패턴
        
        # 캐시 락 생성
        self._cache_lock = Lock()
        
        # 성능 통계 초기화
        self._performance_stats = {}
        
        # 캐시 TTL 한계 설정
        self._min_ttl = self._options.get('min_ttl', 10)  # 최소 10초
        self._max_ttl = self._options.get('max_ttl', 86400)  # 최대 24시간
        
        # 캐시 커스터마이제이션 설정
        self._cache_customization = self._options.get('cache_customization', {})
        
        # ... 기존 코드 ...

    def _get_default_ttl(self, key):
        """
        캐시 항목의 기본 TTL을 반환합니다.
        
        Parameters:
        -----------
        key : str
            캐시 키
            
        Returns:
        --------
        int
            TTL 값 (초)
        """
        # 캐시 키 유형에 따라 다른 TTL 적용
        if key.startswith('git_status'):
            return 30  # 상태는 30초 캐싱
        elif key.startswith('git_log') or key.startswith('git_show'):
            return 300  # 로그와 커밋 정보는 5분 캐싱
        elif key.startswith('git_branch'):
            return 600  # 브랜치 정보는 10분 캐싱
        else:
            return 120  # 기본값 2분
            
    def _adaptive_cache_ttl(self, key, patterns=None):
        """
        접근 패턴을 분석하여 적응형으로 최적의 TTL을 계산합니다.
        
        Args:
            key (str): 캐시 키
            patterns (list, optional): 접근 패턴 데이터. None인 경우 키에서 가져옴
            
        Returns:
            int: 계산된 TTL 값 (초)
        """
        if not self._cache_adaptive_ttl_enabled:
            return self._get_default_ttl(key)
        
        # 패턴이 제공되지 않은 경우 키에서 가져옴
        if patterns is None:
            patterns = self._cache_access_patterns.get(key, [])
        
        # 접근 이력이 충분하지 않으면 기본값 사용
        access_count = self._cache_access_counts.get(key, 0)
        if access_count < 3 or len(patterns) < 3:
            return self._get_default_ttl(key)
        
        # 최근 접근 간격 계산
        intervals = []
        for i in range(1, len(patterns)):
            interval = patterns[i] - patterns[i-1]
            if interval > 0:  # 유효한 간격만 추가 (음수 간격은 무시)
                intervals.append(interval)
        
        # 유효한 간격이 없는 경우 기본값 사용
        if not intervals:
            return self._get_default_ttl(key)
        
        # 간격의 평균 계산
        avg_interval = sum(intervals) / len(intervals)
        
        # 사용자 정의 TTL 팩터 적용
        default_ttl = self._get_default_ttl(key)
        
        # 키 유형에 따른 사용자 정의 조정 팩터 적용
        custom_factor = 1.0
        for prefix, factor in self._cache_customization.items():
            if key.startswith(prefix):
                custom_factor = factor
                break
        
        # 접근 빈도에 기반한 TTL 계산
        if avg_interval < 10:  # 10초 이내에 빈번한 접근
            ttl = max(300, 2 * default_ttl * custom_factor)  # 최소 5분 또는 기본값의 2배
        elif avg_interval < 60:  # 1분 이내 접근
            ttl = default_ttl * 1.5 * custom_factor  # 기본값의 1.5배
        elif avg_interval < 300:  # 5분 이내 접근
            ttl = default_ttl * custom_factor  # 기본값 사용
        else:  # 드문 접근
            ttl = max(30, default_ttl * 0.5 * custom_factor)  # 최소 30초 또는 기본값의 절반
        
        # TTL 값 범위 제한
        ttl = min(max(ttl, self._min_ttl), self._max_ttl)
        
        if self._debug_enabled and abs(ttl - default_ttl) > default_ttl * 0.2:
            self.logger.debug(
                f"적응형 TTL 계산: {key}, "
                f"기본={default_ttl}초, "
                f"평균 간격={avg_interval:.2f}초, "
                f"적용={ttl:.2f}초"
            )
        
        return int(ttl)  # 정수 TTL 반환

    def _update_cache(self, key: str, data, ttl: int = None):
        """
        캐시를 업데이트합니다.
        
        Args:
            key (str): 캐시 키
            data: 캐시할 데이터
            ttl (int, optional): TTL(초), None인 경우 기본값 사용
        """
        try:
            # 캐시 관련 속성 초기화
            if not hasattr(self, '_stats'):
                self._stats = {
                    "cache_hits": 0,
                    "cache_misses": 0,
                    "cache_hit_ratio": 0,
                    "cache_optimize_count": 0,
                    "cache_evict_count": 0
                }
                
            # 캐시 관련 컬렉션 초기화
            if not hasattr(self, '_cache'):
                self._cache = {}
                
            if not hasattr(self, '_cache_access_counts'):
                self._cache_access_counts = {}
                
            if not hasattr(self, '_cache_access_patterns'):
                self._cache_access_patterns = {}
                
            if not hasattr(self, '_cache_last_access_time'):
                self._cache_last_access_time = {}
                
            if not hasattr(self, '_cache_item_ttls'):
                self._cache_item_ttls = {}
                
            if not hasattr(self, '_lru_queue'):
                self._lru_queue = []
            
            current_time = time.time()
            
            # TTL 결정
            if ttl is None:
                if hasattr(self, '_cache_adaptive_ttl_enabled') and self._cache_adaptive_ttl_enabled and key in self._cache_item_ttls:
                    # 기존 적응형 TTL 사용
                    ttl = self._cache_item_ttls.get(key)
                else:
                    # 기본 TTL 사용
                    ttl = self._get_default_ttl(key)
            
            # 캐시 항목 생성
            cache_item = {
                "data": data,
                "created": current_time,
                "updated": current_time,
                "ttl": ttl,
                "expiration": current_time + ttl
            }
            
            # 기존 항목이 없는 경우 접근 패턴 초기화
            if key not in self._cache:
                self._cache_access_patterns[key] = [current_time]
                self._cache_access_counts[key] = 1
                self._cache_last_access_time[key] = current_time
                self._cache_item_ttls[key] = ttl
                
                # LRU 큐에 추가
                self._lru_queue.append(key)
            else:
                # 기존 항목 업데이트 (접근 패턴은 유지)
                if key in self._lru_queue:
                    self._lru_queue.remove(key)
                self._lru_queue.append(key)
            
            # 캐시에 저장
            self._cache[key] = cache_item
            
            # 디버그 로깅
            if self._debug_enabled and hasattr(self, 'logger'):
                self.logger.debug(f"캐시 업데이트: {key}, TTL={ttl}초")
                
            # 캐시 크기 제한 확인
            if hasattr(self, '_enforce_cache_size_limit'):
                self._enforce_cache_size_limit()
        except Exception as e:
            if hasattr(self, 'logger'):
                self.logger.error(f"캐시 업데이트 중 오류 발생: {str(e)}")
            else:
                print(f"캐시 업데이트 중 오류 발생: {str(e)}")

    def _get_cache(self, key):
        """
        캐시에서 항목을 검색합니다.
        
        Parameters:
        -----------
        key : str
            캐시 키
            
        Returns:
        --------
        tuple
            (값 존재 여부, 값)
        """
        # 캐시에 항목이 없으면 미스
        if key not in self._cache:
            self._cache_miss_count += 1
            if self._debug_enabled:
                self.logger.debug(f"캐시 미스: {key}")
            return False, None
        
        current_time = time.time()
        last_access_time = self._cache_last_access_time.get(key, 0)
        ttl = self._cache_item_ttls.get(key, self._get_default_ttl(key))
        
        # TTL 확인
        if current_time - last_access_time > ttl:
            # TTL 경과, 항목 제거
            self._remove_cache_item(key)
            self._cache_miss_count += 1
            if self._debug_enabled:
                self.logger.debug(f"캐시 만료: {key}, 경과 시간={current_time - last_access_time}초, TTL={ttl}초")
            return False, None
        
        # 캐시 히트 처리
        self._cache_hit_count += 1
        self._cache_access_counts[key] = self._cache_access_counts.get(key, 0) + 1
        self._cache_last_access_time[key] = current_time
        
        # 적응형 TTL 업데이트
        if self._cache_adaptive_ttl_enabled:
            if key not in self._cache_access_patterns:
                self._cache_access_patterns[key] = []
            self._cache_access_patterns[key].append(current_time)
            # 최대 10개 접근 패턴 유지
            if len(self._cache_access_patterns[key]) > 10:
                self._cache_access_patterns[key] = self._cache_access_patterns[key][-10:]
            
            # TTL 재계산
            new_ttl = self._adaptive_cache_ttl(key)
            if new_ttl != ttl:
                self._cache_item_ttls[key] = new_ttl
                if self._debug_enabled:
                    self.logger.debug(f"적응형 TTL 조정: {key}, {ttl}초 -> {new_ttl}초")
        
        # LRU 큐 업데이트
        if key in self._lru_queue:
            self._lru_queue.remove(key)
        self._lru_queue.append(key)
        
        if self._debug_enabled:
            self.logger.debug(f"캐시 히트: {key}, 접근 횟수={self._cache_access_counts.get(key, 0)}")
        
        return True, self._cache[key]

    def _get_from_cache(self, key):
        """
        캐시에서 항목을 검색하고 데이터를 반환합니다.
        
        Args:
            key (str): 캐시 키
            
        Returns:
            Any: 캐시에서 찾은 데이터, 캐시 미스인 경우 None
        """
        exists, cached_item = self._get_cache(key)
        if exists and cached_item:
            return cached_item.get("data")
        return None

    def get_status(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        저장소 상태 정보 조회

        Args:
            use_cache (bool): 캐시된 상태 정보 사용 여부 (기본값: True)

        Returns:
            Dict[str, Any]: 저장소 상태 정보
        """
        # 캐시된 상태가 있고 캐시 사용이 활성화된 경우 캐시된 정보 반환
        cache_key = "repo_status"
        if use_cache:
            cached_status = self._get_cache(cache_key)
            if cached_status is not None:
                return cached_status

        try:
            # 현재 브랜치 및 상태 정보 조회
            try:
                current_branch_output = self._run_git_command(
                    ["branch", "--show-current"], check_errors=False
                )
                current_branch = (
                    current_branch_output.strip()
                    if current_branch_output
                    else "HEAD detached"
                )
            except Exception as e:
                self.logger.warning(f"현재 브랜치 정보 조회 실패: {str(e)}")
                current_branch = "unknown"

            # 로컬 변경사항 조회
            try:
                status_output = self._run_git_command(
                    ["status", "--porcelain=v1"], check_errors=False
                )
            except Exception as e:
                self.logger.warning(f"상태 정보 조회 실패: {str(e)}")
                status_output = ""
                
            # 여기에 나머지 코드 추가될 것으로 예상
            # ...
            
            # 결과 반환 (임시)
            result = {
                "branch": current_branch,
                "status": status_output
            }
            
            # 캐시에 결과 저장
            if use_cache:
                self._update_cache(cache_key, result)
                
            return result
            
        except Exception as e:
            self.logger.error(f"저장소 상태 조회 중 오류 발생: {str(e)}")
            return {
                "branch": "unknown",
                "status": "",
                "error": str(e)
            }

    def _run_git_command(self, args, check_errors=True):
        """
        Git 명령어를 실행합니다.
        
        Args:
            args (List[str]): Git 명령어 인자 리스트
            check_errors (bool): 오류 발생 시 예외를 발생시킬지 여부
            
        Returns:
            str: 명령어 실행 결과
            
        Raises:
            GitCommandException: 명령어 실행 중 오류 발생 시
        """
        command_str = "git " + " ".join(args)
        
        try:
            # 성능 측정 시작
            start_time = time.time()
            
            # Git 명령어 실행
            result = run_git_command(args, cwd=self._repository_path, check=check_errors)
            
            # 성능 측정 종료
            elapsed_time = time.time() - start_time
            
            # 느린 명령어 로깅 (100ms 이상)
            if elapsed_time > 0.1 and self._debug_enabled:
                self.logger.debug(f"느린 Git 명령어 실행: {command_str} ({elapsed_time:.2f}초)")
            
            return result
        except GitCommandException as e:
            if not check_errors:
                self.logger.warning(f"Git 명령어 실행 오류 무시: {str(e)}")
                return ""
            
            # 명령어 실행 통계 업데이트
            if hasattr(self, '_stats'):
                self._stats["command_error_count"] = self._stats.get("command_error_count", 0) + 1
            
            # 원본 예외 그대로 전파
            raise
        except GitException as e:
            if not check_errors:
                self.logger.warning(f"Git 예외 무시: {str(e)}")
                return ""
            
            # 명령어 실행 통계 업데이트
            if hasattr(self, '_stats'):
                self._stats["git_error_count"] = self._stats.get("git_error_count", 0) + 1
            
            # 원본 예외 그대로 전파
            raise
        except Exception as e:
            # 명령어 실행 통계 업데이트
            if hasattr(self, '_stats'):
                self._stats["unexpected_error_count"] = self._stats.get("unexpected_error_count", 0) + 1
            
            if not check_errors:
                self.logger.warning(f"Git 명령어 실행 중 예상치 못한 오류 발생: {str(e)}")
                return ""
            
            # 예외를 GitCommandException으로 래핑하여 전파
            raise GitCommandException(
                f"Git 명령어 실행 중 오류 발생: {str(e)}", 
                command=command_str,
                details={"exception_type": type(e).__name__}
            ) from e

    def _optimize_cache_ttl(self):
        """
        모든 캐시 항목의 TTL을 분석하고 최적화합니다.
        
        캐시 항목의 접근 패턴을 분석하여 각 항목에 대한 최적의 TTL을 계산합니다.
        이 메소드는 주기적으로 또는 수동으로 호출될 수 있습니다.
        """
        if not self._cache_adaptive_ttl_enabled:
            return
            
        try:
            optimized_count = 0
            for key in list(self._cache.keys()):
                if key not in self._cache_access_patterns:
                    continue
                    
                # 접근 패턴 분석
                patterns = self._cache_access_patterns[key]
                if len(patterns) < 3:
                    continue
                    
                # 현재 TTL 가져오기
                current_ttl = self._cache_item_ttls.get(key, self._get_default_ttl(key))
                
                # 새 TTL 계산
                new_ttl = self._adaptive_cache_ttl(key, patterns)
                
                # TTL이 크게 변경된 경우에만 업데이트 (20% 이상 차이)
                if abs(new_ttl - current_ttl) > current_ttl * 0.2:
                    self._cache_item_ttls[key] = new_ttl
                    optimized_count += 1
                    
                    if self._debug_enabled:
                        self.logger.debug(
                            f"TTL 최적화: {key}, "
                            f"{current_ttl}초 -> {new_ttl}초, "
                            f"접근 횟수: {self._cache_access_counts.get(key, 0)}"
                        )
            
            # 통계 업데이트
            if hasattr(self, '_stats'):
                self._stats["cache_optimize_count"] = self._stats.get("cache_optimize_count", 0) + optimized_count
                
            if self._debug_enabled and optimized_count > 0:
                self.logger.info(f"캐시 TTL 최적화 완료: {optimized_count}개 항목 조정됨")
                
        except Exception as e:
            self.logger.error(f"캐시 TTL 최적화 중 오류 발생: {str(e)}")
    
    def enable_adaptive_cache(self, enabled=True):
        """
        적응형 캐시 TTL을 활성화 또는 비활성화합니다.
        
        Args:
            enabled (bool): 활성화 여부
        """
        self._cache_adaptive_ttl_enabled = enabled
        if self._debug_enabled:
            self.logger.info(f"적응형 캐시 TTL {'활성화' if enabled else '비활성화'}")
    
    def _remove_cache_item(self, key):
        """
        캐시에서 항목을 제거합니다.
        
        Args:
            key (str): 제거할 캐시 키
        """
        if key in self._cache:
            del self._cache[key]
        if key in self._lru_queue:
            self._lru_queue.remove(key)
        if key in self._cache_access_counts:
            del self._cache_access_counts[key]
        if key in self._cache_access_patterns:
            del self._cache_access_patterns[key]
        if key in self._cache_last_access_time:
            del self._cache_last_access_time[key]
        if key in self._cache_item_ttls:
            del self._cache_item_ttls[key]

    def set_cache_limits(self, max_items: Optional[int] = None, max_memory_mb: Optional[int] = None) -> None:
        """
        캐시 크기 제한을 설정합니다.
        
        Args:
            max_items: 최대 캐시 항목 수 (None이면 기본값 사용)
            max_memory_mb: 최대 메모리 사용량 (MB) (None이면 기본값 사용)
        """
        if max_items is not None:
            self._max_cache_items = max(100, max_items)  # 최소 100개 항목
            
        if max_memory_mb is not None:
            # 최소 10MB, 최대 2GB
            self._max_cache_memory = max(10, min(max_memory_mb, 2048)) * 1024 * 1024
            
        # 기존 캐시가 새 제한을 초과하는 경우 즉시 적용
        self._enforce_cache_size_limit()
        
        if self._debug_enabled:
            self.logger.info(
                f"캐시 제한 설정: "
                f"최대 {getattr(self, '_max_cache_items', MAX_CACHE_ITEMS):,}개 항목, "
                f"최대 {getattr(self, '_max_cache_memory', MAX_CACHE_MEMORY) / (1024 * 1024):.1f}MB"
            )
            
    def get_cache_statistics(self) -> Dict[str, Any]:
        """
        캐시 성능 통계를 반환합니다.
        
        Returns:
            Dict[str, Any]: 캐시 통계 정보
        """
        stats = {
            "cache_size": len(self._cache) if hasattr(self, '_cache') else 0,
            "hits": getattr(self, '_cache_hit_count', 0),
            "misses": getattr(self, '_cache_miss_count', 0),
            "hit_ratio": 0.0,
            "memory_usage": 0,
            "memory_usage_mb": 0.0,
            "item_ages": {},
            "most_accessed": [],
            "lru_queue_size": len(self._lru_queue) if hasattr(self, '_lru_queue') else 0,
            "cache_limits": {
                "max_items": getattr(self, '_max_cache_items', MAX_CACHE_ITEMS),
                "max_memory_mb": getattr(self, '_max_cache_memory', MAX_CACHE_MEMORY) / (1024 * 1024)
            }
        }
        
        # 히트 비율 계산
        total_accesses = stats["hits"] + stats["misses"]
        if total_accesses > 0:
            stats["hit_ratio"] = float(stats["hits"]) / total_accesses
            
        # 메모리 사용량 계산
        try:
            if hasattr(self, '_estimate_cache_memory_usage'):
                memory_usage = self._estimate_cache_memory_usage()
                stats["memory_usage"] = memory_usage
                stats["memory_usage_mb"] = memory_usage / (1024 * 1024)
                
                # 메모리 사용률 추가
                max_memory = getattr(self, '_max_cache_memory', MAX_CACHE_MEMORY)
                stats["memory_usage_percent"] = (memory_usage / max_memory) * 100 if max_memory > 0 else 0
        except Exception as e:
            self.logger.warning(f"캐시 메모리 사용량 계산 중 오류 발생: {str(e)}")
            
        # 항목 나이 계산
        now = time.time()
        age_groups = {"<1분": 0, "1-5분": 0, "5-15분": 0, "15-30분": 0, "30-60분": 0, ">60분": 0}
        
        if hasattr(self, '_cache') and self._cache:
            for key, item in self._cache.items():
                if "created_at" in item:
                    age = now - item["created_at"]
                    
                    if age < 60:  # 1분 미만
                        age_groups["<1분"] += 1
                    elif age < 300:  # 1-5분
                        age_groups["1-5분"] += 1
                    elif age < 900:  # 5-15분
                        age_groups["5-15분"] += 1
                    elif age < 1800:  # 15-30분
                        age_groups["15-30분"] += 1
                    elif age < 3600:  # 30-60분
                        age_groups["30-60분"] += 1
                    else:  # 60분 초과
                        age_groups[">60분"] += 1
                        
        stats["item_ages"] = age_groups
        
        # 가장 많이 접근한 항목
        if hasattr(self, '_cache_access_counts') and self._cache_access_counts:
            most_accessed = sorted(
                self._cache_access_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]  # 상위 10개
            
            stats["most_accessed"] = [
                {"key": key, "count": count} for key, count in most_accessed
            ]
            
        return stats

    def _estimate_cache_memory_usage(self):
        """
        캐시의 메모리 사용량을 추정합니다.
        
        Returns:
            int: 캐시 메모리 사용량 (바이트)
        """
        try:
            import sys
            
            def get_obj_size(obj, seen=None):
                """객체의 메모리 사용량을 계산"""
                if seen is None:
                    seen = set()
                    
                obj_id = id(obj)
                if obj_id in seen:
                    return 0
                    
                seen.add(obj_id)
                size = sys.getsizeof(obj)
                
                if isinstance(obj, dict):
                    size += sum(get_obj_size(k, seen) + get_obj_size(v, seen) for k, v in obj.items())
                elif isinstance(obj, (list, tuple, set)):
                    size += sum(get_obj_size(item, seen) for item in obj)
                    
                return size
                
            return get_obj_size(self._cache)
        except Exception as e:
            self.logger.warning(f"메모리 사용량 계산 중 오류 발생: {str(e)}")
            return -1

    def save_cache_to_disk(self, force: bool = False) -> bool:
        """
        캐시를 디스크에 저장합니다.
        
        Args:
            force: 강제 저장 여부
            
        Returns:
            bool: 저장 성공 여부
        """
        # 저장 필요 없는 경우 (변경사항 없음)
        if not force and not getattr(self, '_cache_dirty', False):
            return True
            
        if not hasattr(self, '_cache_dir') or not self._cache_dir or not os.path.isdir(self._cache_dir):
            self.logger.warning("캐시 디렉토리가 설정되지 않았거나 존재하지 않습니다.")
            return False
            
        try:
            # 저장 경로 설정
            cache_file = os.path.join(self._cache_dir, f"git_cache_{self._repo_path_hash}.pickle")
            
            # 저장할 캐시 데이터 구성
            cache_data = {
                "cache": self._cache.copy() if hasattr(self, '_cache') else {},
                "lru_queue": getattr(self, '_cache_lru_queue', {}).copy() if hasattr(self, '_cache_lru_queue') else {},
                "access_counts": self._cache_access_counts.copy() if hasattr(self, '_cache_access_counts') else {},
                "ttl": getattr(self, '_cache_item_ttls', {"default": 300}),
                "stats": {
                    "hits": getattr(self, '_cache_hit_count', 0),
                    "misses": getattr(self, '_cache_miss_count', 0),
                    "stored_at": time.time()
                },
                "timestamp": time.time()
            }
            
            # 임시 파일에 저장 후 원본 파일로 이동 (안전한 저장)
            temp_file = f"{cache_file}.tmp"
            
            # 압축 기능 사용 (설정된 경우)
            if getattr(self, '_compression_enabled', False) and zlib is not None:
                with open(temp_file, 'wb') as f:
                    compressed_data = zlib.compress(pickle.dumps(cache_data, protocol=pickle.HIGHEST_PROTOCOL))
                    f.write(compressed_data)
            else:
                with open(temp_file, 'wb') as f:
                    pickle.dump(cache_data, f, protocol=pickle.HIGHEST_PROTOCOL)
                    
            # 원본 파일로 이동
            shutil.move(temp_file, cache_file)
            
            # 캐시 상태 업데이트
            self._cache_dirty = False
            
            if getattr(self, '_debug_cache', False):
                self.logger.debug(f"캐시를 디스크에 저장했습니다: {cache_file} (항목 수: {len(cache_data['cache'])})")
                
            return True
            
        except Exception as e:
            self.logger.error(f"캐시를 디스크에 저장하는 중 오류 발생: {str(e)}")
            import traceback
            self.logger.debug(traceback.format_exc())
            return False
    
    def enable_disk_cache(self, enable: bool = True, directory: Optional[str] = None, compression: bool = True) -> bool:
        """
        디스크 캐시 기능을 활성화 또는 비활성화합니다.
        
        Args:
            enable: 활성화 여부
            directory: 캐시 디렉토리 경로 (None이면 기본 경로 사용)
            compression: 압축 사용 여부
            
        Returns:
            bool: 성공 여부
        """
        try:
            if enable:
                # 캐시 디렉토리 설정
                if directory:
                    self._cache_dir = directory
                else:
                    # 임시 디렉토리 사용
                    self._cache_dir = os.path.join(tempfile.gettempdir(), "git_service_cache")
                
                # 디렉토리 생성
                os.makedirs(self._cache_dir, exist_ok=True)
                
                # 압축 설정
                self._compression_enabled = compression and zlib is not None
                
                # 저장소 경로 해시 생성 (고유 식별자)
                repo_path = str(self._repository_path if hasattr(self, "_repository_path") else self._repo_path)
                self._repo_path_hash = hashlib.md5(repo_path.encode()).hexdigest()[:8]
                
                # 캐시 파일 로드 시도
                self._load_cache_from_disk()
                
                # 오래된 캐시 파일 정리
                self._cleanup_old_cache_files()
                
                return True
            else:
                # 디스크 캐시 비활성화
                self._cache_dir = None
                return True
                
        except Exception as e:
            self.logger.error(f"디스크 캐시 설정 중 오류 발생: {str(e)}")
            return False
    
    def _load_cache_from_disk(self) -> bool:
        """
        디스크에서 캐시를 로드합니다.
        
        Returns:
            bool: 로드 성공 여부
        """
        if not hasattr(self, '_cache_dir') or not self._cache_dir or not os.path.isdir(self._cache_dir):
            return False
            
        try:
            # 캐시 파일 경로
            cache_file = os.path.join(self._cache_dir, f"git_cache_{self._repo_path_hash}.pickle")
            
            # 파일이 없으면 로드하지 않음
            if not os.path.isfile(cache_file):
                return False
                
            # 파일 로드
            try:
                with open(cache_file, 'rb') as f:
                    data = f.read()
                    
                # 압축 해제 시도
                try:
                    if getattr(self, '_compression_enabled', False) and zlib is not None:
                        cache_data = pickle.loads(zlib.decompress(data))
                    else:
                        cache_data = pickle.loads(data)
                except:
                    # 압축 형식이 다른 경우 대비
                    cache_data = pickle.loads(data)
            except Exception as e:
                self.logger.error(f"캐시 파일 로드 중 오류 발생: {str(e)}")
                return False
                
            # 캐시 데이터 유효성 검사
            if not isinstance(cache_data, dict):
                self.logger.warning("유효하지 않은 캐시 데이터 형식")
                return False
                
            # 캐시 업데이트 (기존 캐시와 병합)
            if "cache" in cache_data and isinstance(cache_data["cache"], dict):
                # 기존 캐시가 없으면 생성
                if not hasattr(self, '_cache'):
                    self._cache = {}
                    
                # 캐시 데이터 병합
                for key, item in cache_data["cache"].items():
                    # 만료된 항목 필터링
                    if not self._is_cache_item_expired(key, item):
                        self._cache[key] = item
            
            # 접근 횟수 데이터 복원
            if "access_counts" in cache_data and isinstance(cache_data["access_counts"], dict):
                # 기존 접근 횟수 데이터가 없으면 생성
                if not hasattr(self, '_cache_access_counts'):
                    self._cache_access_counts = {}
                    
                # 접근 횟수 데이터 병합
                for key, count in cache_data["access_counts"].items():
                    if key in self._cache:  # 캐시에 있는 항목만 복원
                        self._cache_access_counts[key] = count
            
            # 캐시 상태 복원
            if "stats" in cache_data and isinstance(cache_data["stats"], dict):
                if "hits" in cache_data["stats"]:
                    self._cache_hit_count = cache_data["stats"]["hits"]
                if "misses" in cache_data["stats"]:
                    self._cache_miss_count = cache_data["stats"]["misses"]
            
            # TTL 설정 복원
            if "ttl" in cache_data and isinstance(cache_data["ttl"], dict):
                if not hasattr(self, '_cache_item_ttls'):
                    self._cache_item_ttls = {}
                
                # 현재 캐시 항목에 대한 TTL만 복원
                for key, ttl in cache_data["ttl"].items():
                    if key in self._cache or key == "default":
                        self._cache_item_ttls[key] = ttl
            
            if getattr(self, '_debug_cache', False):
                self.logger.debug(
                    f"디스크에서 캐시를 로드했습니다: {len(self._cache)} 항목 "
                    f"(원본: {len(cache_data.get('cache', {}))})"
                )
                
            return True
            
        except Exception as e:
            self.logger.error(f"디스크에서 캐시 로드 중 오류 발생: {str(e)}")
            import traceback
            self.logger.debug(traceback.format_exc())
            return False
    
    def _is_cache_item_expired(self, key: str, item: Dict[str, Any]) -> bool:
        """
        캐시 항목이 만료되었는지 확인합니다.
        
        Args:
            key: 캐시 키
            item: 캐시 항목
            
        Returns:
            bool: 만료 여부
        """
        if not item or "created_at" not in item:
            return True
            
        # TTL 가져오기
        ttl = self._get_default_ttl(key)
        if hasattr(self, '_cache_item_ttls') and key in self._cache_item_ttls:
            ttl = self._cache_item_ttls[key]
            
        # TTL이 0 이하면 만료되지 않음
        if ttl <= 0:
            return False
            
        # 만료 시간 확인
        created_at = item["created_at"]
        return (time.time() - created_at) > ttl
    
    def _cleanup_old_cache_files(self) -> None:
        """
        오래된 캐시 파일을 정리합니다.
        """
        if not hasattr(self, '_cache_dir') or not self._cache_dir or not os.path.isdir(self._cache_dir):
            return
            
        try:
            # 30일 이상 된 파일 삭제
            max_age = 30 * 24 * 60 * 60  # 30일 (초 단위)
            now = time.time()
            
            for filename in os.listdir(self._cache_dir):
                if filename.startswith("git_cache_") and filename.endswith(".pickle"):
                    file_path = os.path.join(self._cache_dir, filename)
                    
                    # 파일 수정 시간 확인
                    if os.path.isfile(file_path):
                        mtime = os.path.getmtime(file_path)
                        if now - mtime > max_age:
                            try:
                                os.remove(file_path)
                                if getattr(self, '_debug_cache', False):
                                    self.logger.debug(f"오래된 캐시 파일 삭제: {filename}")
                            except:
                                pass
        except Exception as e:
            self.logger.warning(f"캐시 파일 정리 중 오류 발생: {str(e)}")
            
    def _enforce_cache_size_limit(self) -> None:
        """
        캐시 크기 제한을 적용합니다.
        
        메모리 제한 및 항목 수 제한에 도달한 경우 LRU(Least Recently Used) 알고리즘을
        사용하여 가장 오래된 항목부터 제거합니다.
        """
        try:
            # 캐시 크기 확인
            cache_size = len(self._cache)
            max_items = getattr(self, '_max_cache_items', MAX_CACHE_ITEMS)
            
            # 항목 수 제한 검사
            if cache_size > max_items:
                items_to_remove = cache_size - max_items
                self._remove_oldest_items(items_to_remove)
                if self._debug_enabled:
                    self.logger.debug(f"캐시 항목 수 제한 적용: {items_to_remove}개 항목 제거")
                
            # 메모리 사용량 제한 검사
            max_memory = getattr(self, '_max_cache_memory', MAX_CACHE_MEMORY)
            current_memory = self._estimate_cache_memory_usage()
            
            if current_memory > max_memory:
                # 메모리 사용량이 제한을 초과하는 경우
                # 초과 메모리의 최소 20%를 제거 (10MB 이상)
                memory_to_free = max(0.2 * (current_memory - max_memory), 10 * 1024 * 1024)
                self._reduce_memory_usage(memory_to_free)
                if self._debug_enabled:
                    self.logger.debug(
                        f"메모리 제한 적용: {memory_to_free / (1024 * 1024):.1f}MB 해제, "
                        f"현재: {current_memory / (1024 * 1024):.1f}MB, "
                        f"제한: {max_memory / (1024 * 1024):.1f}MB"
                    )
        except Exception as e:
            self.logger.error(f"캐시 크기 제한 적용 중 오류 발생: {str(e)}")
            
    def _remove_oldest_items(self, count: int) -> None:
        """
        가장 오래된 캐시 항목을 제거합니다.
        
        Args:
            count: 제거할 항목 수
        """
        if not hasattr(self, '_lru_queue') or not self._lru_queue:
            return
            
        # LRU 큐 정리 (유효하지 않은 항목 제거)
        self._clean_lru_queue()
        
        # 제거할 항목 수가 LRU 큐 크기보다 큰 경우 조정
        count = min(count, len(self._lru_queue))
        
        # 가장 오래된 항목부터 제거
        removed_count = 0
        while count > 0 and self._lru_queue:
            oldest_key = self._lru_queue[0]  # 가장 오래된 항목은 큐의 첫번째 항목
            
            # 캐시에서 항목 제거
            self._remove_cache_item(oldest_key)
            removed_count += 1
            count -= 1
            
        if self._debug_enabled and removed_count > 0:
            self.logger.debug(f"캐시에서 {removed_count}개의 오래된 항목 제거")
            
    def _reduce_memory_usage(self, target_bytes: float) -> None:
        """
        메모리 사용량을 지정된 바이트만큼 줄입니다.
        
        Args:
            target_bytes: 해제할 메모리 크기 (바이트)
        """
        if not hasattr(self, '_lru_queue') or not self._lru_queue:
            return
            
        # LRU 큐 정리
        self._clean_lru_queue()
        
        # 초기 메모리 사용량 측정
        start_memory = self._estimate_cache_memory_usage()
        freed_memory = 0
        removed_count = 0
        
        # 목표 메모리만큼 해제될 때까지 가장 오래된 항목부터 제거
        while (freed_memory < target_bytes) and self._lru_queue:
            # 항목 크기를 미리 측정
            oldest_key = self._lru_queue[0]
            if oldest_key in self._cache:
                # 항목 크기 추정
                item_size = sys.getsizeof(self._cache[oldest_key])
                
                # 항목 제거
                self._remove_cache_item(oldest_key)
                removed_count += 1
                freed_memory += item_size
            else:
                # LRU 큐에는 있지만 캐시에는 없는 경우 (일관성 오류)
                if oldest_key in self._lru_queue:
                    self._lru_queue.remove(oldest_key)
            
            # 너무 많은 항목을 한 번에 제거하지 않도록 제한 (최대 100개)
            if removed_count >= 100:
                break
                
        # 실제 해제된 메모리 측정
        end_memory = self._estimate_cache_memory_usage()
        actual_freed = max(0, start_memory - end_memory)
        
        if self._debug_enabled and removed_count > 0:
            self.logger.debug(
                f"메모리 사용량 감소: {removed_count}개 항목 제거, "
                f"{actual_freed / (1024 * 1024):.2f}MB 해제됨 "
                f"(목표: {target_bytes / (1024 * 1024):.2f}MB)"
            )
            
    def _clean_lru_queue(self) -> None:
        """
        LRU 큐를 정리하여 캐시에 없는 항목을 제거합니다.
        """
        if not hasattr(self, '_lru_queue'):
            self._lru_queue = []
            return
            
        # 유효하지 않은 항목 필터링
        valid_keys = [key for key in self._lru_queue if key in self._cache]
        
        # 정리 전후 크기 비교
        before_size = len(self._lru_queue)
        self._lru_queue = valid_keys
        after_size = len(self._lru_queue)
        
        # 디버그 로깅
        if self._debug_enabled and before_size != after_size:
            self.logger.debug(f"LRU 큐 정리: {before_size - after_size}개 항목 제거")
            
    def _optimize_lru_cache_queue(self) -> None:
        """
        LRU 캐시 큐를 최적화합니다.
        
        불필요한 항목을 제거하고 큐를 재구성하여 메모리 사용량을 줄입니다.
        이 메소드는 주기적으로 호출되어야 합니다.
        """
        try:
            # LRU 큐 최대 크기 제한 적용
            max_size = min(MAX_CACHE_ITEMS * 2, 10000)  # 최대 10,000개 항목
            
            # 캐시에 없는 항목 필터링
            self._clean_lru_queue()
            
            # 접근 시간을 기준으로 LRU 큐 정렬
            if hasattr(self, '_cache_last_access_time'):
                # 캐시에 있고 접근 시간이 기록된 항목만 필터링
                valid_keys = [
                    k for k in self._lru_queue 
                    if k in self._cache and k in self._cache_last_access_time
                ]
                
                # 접근 시간순으로 정렬
                valid_keys.sort(key=lambda k: self._cache_last_access_time.get(k, 0))
                
                # LRU 큐 업데이트
                self._lru_queue = valid_keys
                
            # 큐 크기가 최대 크기를 초과하는 경우 자르기
            if len(self._lru_queue) > max_size:
                # 가장 최근에 사용된 항목들만 유지
                self._lru_queue = self._lru_queue[-max_size:]
                if self._debug_enabled:
                    self.logger.debug(f"LRU 큐 크기 제한 적용: {max_size}개 항목만 유지")
                    
            return True
        except Exception as e:
            self.logger.error(f"LRU 캐시 큐 최적화 중 오류 발생: {str(e)}")
            return False
