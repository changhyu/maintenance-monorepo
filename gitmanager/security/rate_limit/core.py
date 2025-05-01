"""
속도 제한(Rate Limiting) 코어 모듈

이 모듈은 토큰 버킷 알고리즘을 사용한 API 속도 제한 기능의 핵심 로직을 제공합니다.
"""

import time
import logging
from typing import Dict, Tuple, Any, Optional, Union, List
from datetime import datetime, timedelta
import threading

from .storage import RateLimitStorage, InMemoryStorage

# 로거 설정
logger = logging.getLogger(__name__)

class RateLimiter:
    """
    API 요청에 대한 속도 제한을 관리하는 클래스
    
    토큰 버킷 알고리즘을 사용하여 요청 속도를 제한합니다.
    기본적으로 인메모리 스토리지를 사용하지만, Redis 등의 외부 스토리지도 사용 가능합니다.
    """
    
    def __init__(
        self,
        storage: Optional[RateLimitStorage] = None,
        default_limit: int = 60,
        default_window: int = 60,
        admin_limit_multiplier: float = 5.0
    ):
        """
        RateLimiter 초기화
        
        Args:
            storage: 속도 제한 정보를 저장할 스토리지. 없으면 인메모리 스토리지 사용
            default_limit: 기본 분당 요청 제한 수
            default_window: 기본 시간 윈도우(초)
            admin_limit_multiplier: 관리자 사용자의 제한 승수
        """
        self.storage = storage or InMemoryStorage()
        self.default_limit = default_limit
        self.default_window = default_window
        self.admin_limit_multiplier = admin_limit_multiplier
        self._lock = threading.RLock()
        
        # API 엔드포인트별 기본 제한 설정
        self.endpoint_limits = {
            # Git 작업 관련 API
            "git_status": 60,       # 상태 확인: 분당 60회
            "git_commit": 10,       # 커밋: 분당 10회
            "git_push": 5,          # 푸시: 분당 5회
            "git_pull": 5,          # 풀: 분당 5회
            "git_merge": 5,         # 머지: 분당 5회
            "git_branch": 20,       # 브랜치 작업: 분당 20회
            
            # 기본값
            "default": default_limit
        }
        
    def get_limit_for_endpoint(self, endpoint: str, is_admin: bool = False) -> int:
        """
        특정 엔드포인트의 요청 제한 수를 반환합니다.
        
        Args:
            endpoint: API 엔드포인트 이름
            is_admin: 관리자 사용자 여부
            
        Returns:
            int: 요청 제한 수
        """
        base_limit = self.endpoint_limits.get(endpoint, self.default_limit)
        
        # 관리자는 더 높은 제한을 가짐
        if is_admin:
            return int(base_limit * self.admin_limit_multiplier)
        
        return base_limit
        
    def check_rate_limit(
        self,
        key: str,
        endpoint: str = "default",
        is_admin: bool = False,
        window: Optional[int] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        특정 키(사용자 또는 IP)에 대한 속도 제한을 확인합니다.
        
        Args:
            key: 속도 제한을 적용할 키(사용자 ID, IP 등)
            endpoint: API 엔드포인트 이름
            is_admin: 관리자 사용자 여부
            window: 시간 윈도우(초). 기본값은 self.default_window
            
        Returns:
            Tuple[bool, Dict]: (허용 여부, 제한 정보)
        """
        if window is None:
            window = self.default_window
            
        limit = self.get_limit_for_endpoint(endpoint, is_admin)
        
        # 스토리지에서 현재 요청 수 가져오기
        with self._lock:
            current_requests = self.storage.get(key, endpoint)
            
            if current_requests is None:
                # 첫 요청인 경우
                current_requests = 0
                
            # 허용 여부 결정
            allowed = current_requests < limit
            
            # 카운터 증가
            if allowed:
                self.storage.increment(key, endpoint, window)
                current_requests += 1
                
            # 제한 정보 구성
            reset_time = int(time.time() + window)
            remaining = max(0, limit - current_requests)
            
            limit_info = {
                "limit": limit,
                "remaining": remaining,
                "reset": reset_time,
                "window": window
            }
            
            return allowed, limit_info
            
    def reset_counter(self, key: str, endpoint: str = "default") -> None:
        """
        특정 키의 요청 카운터를 초기화합니다.
        
        Args:
            key: 초기화할 키
            endpoint: API 엔드포인트 이름
        """
        with self._lock:
            self.storage.delete(key, endpoint)
            
    def get_limit_info(self, key: str, endpoint: str = "default", is_admin: bool = False) -> Dict[str, Any]:
        """
        특정 키의 현재 제한 정보를 조회합니다.
        
        Args:
            key: 조회할 키
            endpoint: API 엔드포인트 이름
            is_admin: 관리자 사용자 여부
            
        Returns:
            Dict: 제한 정보
        """
        limit = self.get_limit_for_endpoint(endpoint, is_admin)
        
        with self._lock:
            current_requests = self.storage.get(key, endpoint) or 0
            window_expiry = self.storage.get_expiry(key, endpoint)
            
            # 만료 시간 계산
            if window_expiry:
                reset_time = window_expiry
            else:
                reset_time = int(time.time() + self.default_window)
                
            return {
                "limit": limit,
                "remaining": max(0, limit - current_requests),
                "reset": reset_time,
                "window": self.default_window
            } 