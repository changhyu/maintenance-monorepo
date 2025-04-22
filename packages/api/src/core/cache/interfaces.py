"""
캐시 인터페이스 정의

캐시 시스템의 핵심 인터페이스와 타입을 정의합니다.
"""

from abc import ABC, abstractmethod
from datetime import timedelta
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Protocol,
    Set,
    TypeVar,
    Union,
    runtime_checkable,
)

# 타입 변수 정의
KT = TypeVar("KT", str, bytes)  # 키 타입
VT = TypeVar("VT")  # 값 타입

# 메트릭 타입
MetricsData = Dict[str, Union[int, float, str]]
StatsData = Dict[str, Union[int, float, str, Dict[str, Any]]]


@runtime_checkable
class Serializable(Protocol):
    """직렬화 가능한 객체를 위한 프로토콜"""

    def to_dict(self) -> Dict[str, Any]: ...
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Serializable": ...


class CacheKeyBuilderInterface(ABC):
    """캐시 키 생성 인터페이스"""

    @abstractmethod
    def build_key(self, *args, **kwargs) -> str:
        """
        캐시 키 생성

        Args:
            *args: 키 생성에 사용할 위치 인자
            **kwargs: 키 생성에 사용할 키워드 인자

        Returns:
            생성된 캐시 키
        """
        pass

    @abstractmethod
    def build_pattern(self, *args, **kwargs) -> str:
        """
        캐시 키 패턴 생성

        Args:
            *args: 패턴 생성에 사용할 위치 인자
            **kwargs: 패턴 생성에 사용할 키워드 인자

        Returns:
            생성된 캐시 키 패턴
        """
        pass


class CacheBackend(ABC):
    """캐시 백엔드 기본 인터페이스"""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """
        키에 해당하는 값 조회

        Args:
            key: 캐시 키

        Returns:
            캐시된 값 또는 None
        """
        pass

    @abstractmethod
    async def set(
        self,
        key: str,
        value: Any,
        expiry: Optional[Union[int, timedelta]] = None,
        **kwargs
    ) -> bool:
        """
        키-값 쌍 저장

        Args:
            key: 캐시 키
            value: 저장할 값
            expiry: 만료 시간
            **kwargs: 추가 옵션

        Returns:
            성공 여부
        """
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """
        키 삭제

        Args:
            key: 삭제할 키

        Returns:
            성공 여부
        """
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """
        키 존재 여부 확인

        Args:
            key: 확인할 키

        Returns:
            존재 여부
        """
        pass


class CacheMetrics(ABC):
    """캐시 메트릭 수집 인터페이스"""

    @abstractmethod
    async def get_metrics(self) -> MetricsData:
        """
        메트릭 데이터 조회

        Returns:
            메트릭 데이터
        """
        pass

    @abstractmethod
    async def get_stats(self) -> StatsData:
        """
        통계 데이터 조회

        Returns:
            통계 데이터
        """
        pass

    @abstractmethod
    async def reset_stats(self) -> None:
        """통계 초기화"""
        pass


class CacheMonitor(ABC):
    """캐시 모니터링 인터페이스"""

    @abstractmethod
    async def check_health(self) -> bool:
        """
        헬스 체크 수행

        Returns:
            정상 여부
        """
        pass

    @abstractmethod
    async def get_memory_usage(self) -> Dict[str, int]:
        """
        메모리 사용량 조회

        Returns:
            메모리 사용량 정보
        """
        pass


class BatchOperations(ABC):
    """배치 작업 인터페이스"""

    @abstractmethod
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """
        여러 키의 값을 한 번에 조회

        Args:
            keys: 조회할 키 목록

        Returns:
            키-값 쌍 딕셔너리
        """
        pass

    @abstractmethod
    async def set_many(
        self, items: Dict[str, Any], expiry: Optional[Union[int, timedelta]] = None
    ) -> Dict[str, bool]:
        """
        여러 키-값 쌍을 한 번에 저장

        Args:
            items: 키-값 쌍 딕셔너리
            expiry: 만료 시간

        Returns:
            키별 성공 여부
        """
        pass

    @abstractmethod
    async def delete_many(self, keys: List[str]) -> int:
        """
        여러 키를 한 번에 삭제

        Args:
            keys: 삭제할 키 목록

        Returns:
            삭제된 키 수
        """
        pass


class CacheMaintenance(ABC):
    """캐시 유지보수 인터페이스"""

    @abstractmethod
    async def clear(self) -> bool:
        """
        캐시 전체 삭제

        Returns:
            성공 여부
        """
        pass

    @abstractmethod
    async def cleanup_expired(self) -> int:
        """
        만료된 항목 정리

        Returns:
            정리된 항목 수
        """
        pass

    @abstractmethod
    async def optimize(self) -> bool:
        """
        캐시 최적화

        Returns:
            성공 여부
        """
        pass


class CacheInterface(
    CacheBackend, CacheMetrics, CacheMonitor, BatchOperations, CacheMaintenance
):
    """통합 캐시 인터페이스"""

    pass


class RedisInterface(CacheInterface):
    """Redis 전용 확장 인터페이스"""

    @abstractmethod
    async def scan(
        self, pattern: str, count: int = 100, _type: Optional[str] = None
    ) -> List[str]:
        """
        패턴으로 키 검색

        Args:
            pattern: 검색 패턴
            count: 한 번에 검색할 수
            _type: 키 타입 필터

        Returns:
            검색된 키 목록
        """
        pass

    @abstractmethod
    async def ttl(self, key: str) -> int:
        """
        키의 남은 만료 시간 조회

        Args:
            key: 캐시 키

        Returns:
            남은 시간(초)
        """
        pass

    @abstractmethod
    async def expire(self, key: str, seconds: Union[int, timedelta]) -> bool:
        """
        키 만료 시간 설정

        Args:
            key: 캐시 키
            seconds: 만료 시간

        Returns:
            성공 여부
        """
        pass
