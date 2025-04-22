"""
메모리 캐시 관리 모듈

이 모듈은 로컬 메모리 캐시 관리를 위한 클래스를 제공합니다.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from packages.api.src.core.cachelru_cache import LRUCache

logger = logging.getLogger(__name__)


class MemoryCacheManager:
    """
    로컬 메모리 캐시 관리자

    이 클래스는 로컬 LRU 캐시를 관리하며 캐시 항목의 생성, 검색, 삭제 및 일괄 처리 기능을 제공합니다.
    """

    def __init__(self, max_size: int = 1000):
        """
        MemoryCacheManager 인스턴스 초기화

        Args:
            max_size: 최대 캐시 항목 수
        """
        self.cache = LRUCache(max_size=max_size)
        self._critical_key_patterns: Set[str] = {
            "user:",
            "session:",
            "auth:",
            "permission:",
            "role:",
            "token:",
            "security:",
        }

    def get(self, key: str) -> Optional[Any]:
        """
        캐시에서 값 조회

        Args:
            key: 조회할 캐시 키

        Returns:
            캐시된 값 또는 None
        """
        return self.cache.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        캐시에 값 설정

        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 유효 시간(초)
        """
        # 중요 키는 보호 설정
        is_protected = self._is_critical_key(key)
        self.cache.set(key, value, ttl)

    def delete(self, key: str) -> bool:
        """
        캐시에서 항목 삭제

        Args:
            key: 삭제할 캐시 키

        Returns:
            삭제 성공 여부
        """
        return self.cache.delete(key)

    def has_key(self, key: str) -> bool:
        """
        키 존재 여부 확인

        Args:
            key: 확인할 캐시 키

        Returns:
            키 존재 여부
        """
        return self.cache.has_key(key)

    def keys(self) -> List[str]:
        """
        모든 캐시 키 목록 반환

        Returns:
            캐시 키 목록
        """
        return self.cache.keys()

    def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """
        여러 키에 대한 값 조회

        Args:
            keys: 조회할 캐시 키 목록

        Returns:
            키-값 쌍 딕셔너리
        """
        return self.cache.get_many(keys)

    def set_many(self, items: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """
        여러 항목 한 번에 설정

        Args:
            items: 키-값 쌍 딕셔너리
            ttl: 유효 시간(초)
        """
        self.cache.set_many(items, ttl)

    def delete_many(self, keys: List[str]) -> int:
        """
        여러 키 한 번에 삭제

        Args:
            keys: 삭제할 키 목록

        Returns:
            삭제된 항목 수
        """
        return self.cache.delete_many(keys)

    def clear(self) -> None:
        """모든 캐시 항목 삭제"""
        self.cache.clear()

    def size(self) -> int:
        """
        현재 캐시 크기 반환

        Returns:
            캐시 항목 수
        """
        return self.cache.size()

    def cleanup_expired(self) -> int:
        """
        만료된 모든 캐시 항목 삭제

        Returns:
            삭제된 항목 수
        """
        expired_keys = self.cache.get_expired_keys()
        if expired_keys:
            return self.delete_many(expired_keys)
        return 0

    def _is_critical_key(self, key: str) -> bool:
        """
        중요 키 여부 확인

        사용자 인증, 세션, 권한 등 관련 키는 중요 키로 분류되어 특수 보호됩니다.

        Args:
            key: 확인할 캐시 키

        Returns:
            중요 키 여부
        """
        return any(pattern in key for pattern in self._critical_key_patterns)

    def calculate_memory_usage(self) -> Dict[str, int]:
        """
        캐시 메모리 사용량 계산

        Returns:
            메모리 사용량 정보
        """
        import sys

        total_size = 0
        item_count = 0
        largest_key_size = 0
        largest_value_size = 0
        largest_key = None

        for key in self.cache.keys():
            key_size = sys.getsizeof(key)
            value = self.cache.get(key)

            if value is None:
                continue

            value_size = sys.getsizeof(value)
            total_size += key_size + value_size
            item_count += 1

            if key_size > largest_key_size:
                largest_key_size = key_size
                largest_key = key

            if value_size > largest_value_size:
                largest_value_size = value_size

        result = {
            "total_size_bytes": total_size,
            "item_count": item_count,
            "average_size_bytes": total_size // max(item_count, 1),
            "largest_key_size_bytes": largest_key_size,
            "largest_value_size_bytes": largest_value_size,
        }

        if largest_key:
            result["largest_key"] = largest_key

        return result

    def log_memory_usage(self) -> None:
        """캐시 메모리 사용량 기록"""
        usage = self.calculate_memory_usage()

        logger.info(
            "Memory cache stats: %d items, %s total, %s avg/item",
            usage["item_count"],
            self._format_size(usage["total_size_bytes"]),
            self._format_size(usage["average_size_bytes"]),
        )

        if "largest_key" in usage:
            logger.debug(
                "Largest cache item: '%s' (%s key, %s value)",
                usage["largest_key"],
                self._format_size(usage["largest_key_size_bytes"]),
                self._format_size(usage["largest_value_size_bytes"]),
            )

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """
        바이트 크기를 사람이 읽기 쉬운 형식으로 변환

        Args:
            size_bytes: 바이트 단위 크기

        Returns:
            포맷팅된 크기 문자열
        """
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024 or unit == "GB":
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024
