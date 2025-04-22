"""
캐싱 시스템 모듈

이 모듈은 API 응답을 캐싱하기 위한 시스템을 제공합니다. Redis 기반 캐싱과
메모리 기반 캐싱을 모두 지원하며, 응답 속도를 향상시키고 서버 부하를 줄이는 데 도움이 됩니다.

기능:
- 다양한 캐싱 백엔드 지원 (Redis, 메모리)
- 데코레이터 기반 간편한 캐싱 구현
- 유연한 TTL 설정
- 키 패턴 기반 캐시 무효화
- 개별 키 또는 패턴 기반 캐시 삭제
"""

import json
import logging
import os
import time
from abc import ABC, abstractmethod
from datetime import timedelta
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar, Union, cast

try:
    import redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from fastapi import Depends, FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

T = TypeVar("T")
CacheKeyGenerator = Callable[[str, List[Any], Dict[str, Any]], str]


class CacheBackendType(str, Enum):
    """캐시 백엔드 유형을 정의하는 열거형."""

    REDIS = "redis"
    MEMORY = "memory"


class CacheSettings:
    """캐시 설정을 위한 클래스."""

    def __init__(
        self,
        default_ttl: Union[int, timedelta] = 60,  # 기본 TTL (초 또는 timedelta)
        backend_type: CacheBackendType = CacheBackendType.MEMORY,
        redis_url: Optional[str] = None,
        redis_password: Optional[str] = None,
        redis_db: int = 0,
        prefix: str = "api_cache:",
        enable_cache: bool = True,
    ):
        # timedelta 객체도 지원하도록 개선
        if isinstance(default_ttl, timedelta):
            self.default_ttl = int(default_ttl.total_seconds())
        else:
            self.default_ttl = default_ttl
        self.backend_type = backend_type
        self.redis_url = redis_url
        self.redis_password = redis_password
        self.redis_db = redis_db
        self.prefix = prefix
        self.enable_cache = enable_cache


class CacheBackend(ABC):
    """캐시 백엔드를 위한 추상 기본 클래스."""

    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """캐시에서 값을 가져옵니다."""
        pass

    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """캐시에 값을 설정합니다."""
        pass

    @abstractmethod
    def delete(self, key: str) -> bool:
        """캐시에서 키를 삭제합니다."""
        pass

    @abstractmethod
    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """키가 캐시에 존재하는지 확인합니다."""
        pass

    @abstractmethod
    def clear(self) -> bool:
        """모든 캐시를 지웁니다."""
        pass

    @abstractmethod
    def get_ttl(self, key: str) -> Optional[int]:
        """키의 남은 TTL을 가져옵니다."""
        pass


class RedisCache(CacheBackend):
    """Redis 기반 캐시 구현."""

    def __init__(self, settings: CacheSettings):
        """Redis 캐시 초기화."""
        if not REDIS_AVAILABLE:
            raise ImportError(
                "Redis 패키지가 설치되어 있지 않습니다. `pip install redis`를 실행하세요."
            )

        if not settings.redis_url:
            raise ValueError("Redis URL이 제공되지 않았습니다.")

        self.settings = settings
        self.prefix = settings.prefix
        self.client = redis.Redis.from_url(
            settings.redis_url,
            password=settings.redis_password,
            db=settings.redis_db,
            decode_responses=True,
        )
        try:
            self.client.ping()
            logger.info("Redis 서버에 성공적으로 연결되었습니다.")
        except redis.ConnectionError:
            logger.error("Redis 서버에 연결할 수 없습니다. 설정을 확인하세요.")
            raise

    def _get_prefixed_key(self, key: str) -> str:
        """키에 프리픽스를 추가합니다."""
        return f"{self.prefix}{key}"

    def get(self, key: str) -> Optional[Any]:
        """Redis에서 값을 가져옵니다."""
        prefixed_key = self._get_prefixed_key(key)
        value = self.client.get(prefixed_key)
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Redis에 값을 설정합니다."""
        prefixed_key = self._get_prefixed_key(key)
        serialized_value = json.dumps(value)
        ttl = ttl or self.settings.default_ttl
        return self.client.setex(prefixed_key, ttl, serialized_value)

    def delete(self, key: str) -> bool:
        """Redis에서 키를 삭제합니다."""
        prefixed_key = self._get_prefixed_key(key)
        return bool(self.client.delete(prefixed_key))

    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        prefixed_pattern = self._get_prefixed_key(pattern)
        keys = self.client.keys(prefixed_pattern)
        return self.client.delete(*keys) if keys else 0

    def exists(self, key: str) -> bool:
        """키가 Redis에 존재하는지 확인합니다."""
        prefixed_key = self._get_prefixed_key(key)
        return bool(self.client.exists(prefixed_key))

    def clear(self) -> bool:
        """Redis에서 모든 키를 삭제합니다."""
        prefixed_pattern = self._get_prefixed_key("*")
        keys = self.client.keys(prefixed_pattern)
        return bool(self.client.delete(*keys)) if keys else True

    def get_ttl(self, key: str) -> Optional[int]:
        """Redis에서 키의 남은 TTL을 가져옵니다."""
        prefixed_key = self._get_prefixed_key(key)
        ttl = self.client.ttl(prefixed_key)
        if ttl == -2:  # 키가 존재하지 않음
            return None
        return -1 if ttl == -1 else ttl  # -1은 키가 만료되지 않음을 의미


class MemoryCache(CacheBackend):
    """메모리 기반 캐시 구현."""

    def __init__(self, settings: CacheSettings):
        """메모리 캐시 초기화."""
        self.settings = settings
        self.prefix = settings.prefix
        # 캐시 구조: Dict[key, (value, expiry_timestamp)]
        self._cache: Dict[str, tuple[Any, Optional[float]]] = {}

    def _get_prefixed_key(self, key: str) -> str:
        """키에 프리픽스를 추가합니다."""
        return f"{self.prefix}{key}"

    def _is_expired(self, key: str) -> bool:
        """키가 만료되었는지 확인합니다."""
        prefixed_key = self._get_prefixed_key(key)
        if prefixed_key not in self._cache:
            return True

        _, expiry = self._cache[prefixed_key]
        return False if expiry is None else time.time() > expiry

    def _clean_expired(self) -> None:
        """만료된 모든 항목을 제거합니다."""
        current_time = time.time()
        keys_to_delete = [
            key
            for key, (_, expiry) in self._cache.items()
            if expiry is not None and current_time > expiry
        ]
        for key in keys_to_delete:
            del self._cache[key]

    def get(self, key: str) -> Optional[Any]:
        """메모리 캐시에서 값을 가져옵니다."""
        self._clean_expired()
        prefixed_key = self._get_prefixed_key(key)

        if prefixed_key not in self._cache or self._is_expired(key):
            return None

        value, _ = self._cache[prefixed_key]
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """메모리 캐시에 값을 설정합니다."""
        prefixed_key = self._get_prefixed_key(key)

        if ttl is None:
            ttl = self.settings.default_ttl

        expiry = None if ttl is None else time.time() + ttl
        self._cache[prefixed_key] = (value, expiry)
        return True

    def delete(self, key: str) -> bool:
        """메모리 캐시에서 키를 삭제합니다."""
        prefixed_key = self._get_prefixed_key(key)
        if prefixed_key in self._cache:
            del self._cache[prefixed_key]
            return True
        return False

    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        prefixed_pattern = self._get_prefixed_key(pattern)
        import re

        pattern_regex = re.compile(prefixed_pattern.replace("*", ".*"))

        keys_to_delete = [key for key in self._cache.keys() if pattern_regex.match(key)]

        for key in keys_to_delete:
            del self._cache[key]

        return len(keys_to_delete)

    def exists(self, key: str) -> bool:
        """키가 메모리 캐시에 존재하는지 확인합니다."""
        self._clean_expired()
        prefixed_key = self._get_prefixed_key(key)
        return prefixed_key in self._cache and not self._is_expired(key)

    def clear(self) -> bool:
        """모든 메모리 캐시를 지웁니다."""
        self._cache.clear()
        return True

    def get_ttl(self, key: str) -> Optional[int]:
        """메모리 캐시에서 키의 남은 TTL을 가져옵니다."""
        self._clean_expired()
        prefixed_key = self._get_prefixed_key(key)

        if prefixed_key not in self._cache or self._is_expired(key):
            return None

        _, expiry = self._cache[prefixed_key]
        if expiry is None:
            return -1

        remaining = expiry - time.time()
        return int(remaining) if remaining > 0 else 0


class CacheManager:
    """캐시 매니저 클래스."""

    def __init__(self, settings: CacheSettings):
        """캐시 매니저 초기화."""
        self.settings = settings
        self._backend = self._create_backend()

    def _create_backend(self) -> CacheBackend:
        """설정에 따라 적절한 캐시 백엔드를 생성합니다."""
        if self.settings.backend_type == CacheBackendType.REDIS:
            return RedisCache(self.settings)
        return MemoryCache(self.settings)

    def get(self, key: str) -> Optional[Any]:
        """캐시에서 값을 가져옵니다."""
        if not self.settings.enable_cache:
            return None
        return self._backend.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """캐시에 값을 설정합니다."""
        if not self.settings.enable_cache:
            return False
        return self._backend.set(key, value, ttl)

    def delete(self, key: str) -> bool:
        """캐시에서 키를 삭제합니다."""
        if not self.settings.enable_cache:
            return False
        return self._backend.delete(key)

    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        if not self.settings.enable_cache:
            return 0
        return self._backend.delete_pattern(pattern)

    def exists(self, key: str) -> bool:
        """키가 캐시에 존재하는지 확인합니다."""
        if not self.settings.enable_cache:
            return False
        return self._backend.exists(key)

    def clear(self) -> bool:
        """모든 캐시를 지웁니다."""
        if not self.settings.enable_cache:
            return False
        return self._backend.clear()

    def get_ttl(self, key: str) -> Optional[int]:
        """키의 남은 TTL을 가져옵니다."""
        if not self.settings.enable_cache:
            return None
        return self._backend.get_ttl(key)


def default_key_builder(func_name: str, args: List[Any], kwargs: Dict[str, Any]) -> str:
    """
    기본 캐시 키 생성 함수입니다.

    함수 이름과 인수를 기반으로 캐시 키를 생성합니다.
    """
    kwargs_without_request = {
        k: v for k, v in kwargs.items() if k != "request" and not isinstance(v, Request)
    }

    try:
        key_parts = [func_name, str(args), str(kwargs_without_request)]
        return ":".join(key_parts)
    except TypeError:
        return func_name


def cached(
    ttl: Optional[Union[int, timedelta]] = None,
    key_builder: Optional[CacheKeyGenerator] = None,
    manager: Optional[CacheManager] = None,
    invalidate_pattern: Optional[str] = None,
    cache_type_hints: bool = False,
):
    """
    함수 결과를 캐싱하기 위한 데코레이터입니다.

    Args:
        ttl: 캐시 유효 시간(초 또는 timedelta)
        key_builder: 캐시 키 생성 함수
        manager: 사용할 캐시 관리자
        invalidate_pattern: 이 함수가 호출될 때 무효화할 캐시 패턴
        cache_type_hints: 함수 반환 타입 힌트를 캐시 키에 포함할지 여부

    Returns:
        캐싱 데코레이터
    """
    if isinstance(ttl, timedelta):
        ttl_seconds = int(ttl.total_seconds())
    else:
        ttl_seconds = ttl

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        return_type: Optional[Type[T]] = None

        if cache_type_hints:
            return_type = _get_return_type_hint(func)

        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            return await _handle_cached_call(
                func,
                args,
                kwargs,
                ttl_seconds,
                key_builder,
                manager,
                invalidate_pattern,
                cache_type_hints,
                return_type,
            )

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            return func(*args, **kwargs)

        if asyncio_is_installed() and is_coroutine_function(func):
            return cast(Callable[..., T], async_wrapper)
        return cast(Callable[..., T], sync_wrapper)

    return decorator


def invalidate_cache(
    pattern: str, manager: Optional[CacheManager] = None
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    특정 패턴의 캐시를 무효화하는 데코레이터입니다.

    Args:
        pattern: 무효화할 캐시 패턴
        manager: 사용할 캐시 관리자

    Returns:
        캐시 무효화 데코레이터
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            nonlocal manager
            if manager is None:
                manager = get_cache_manager()

            result = await func(*args, **kwargs)
            manager.delete_pattern(pattern)
            return result

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            nonlocal manager
            if manager is None:
                manager = get_cache_manager()

            result = func(*args, **kwargs)
            manager.delete_pattern(pattern)
            return result

        if asyncio_is_installed() and is_coroutine_function(func):
            return cast(Callable[..., T], async_wrapper)
        return cast(Callable[..., T], sync_wrapper)

    return decorator


class CachingMiddleware(BaseHTTPMiddleware):
    """
    응답 캐싱을 위한 미들웨어입니다.
    """

    def __init__(
        self,
        app: FastAPI,
        manager: Optional[CacheManager] = None,
        ttl: Optional[int] = None,
        cache_headers: bool = True,
        cache_paths: List[str] = None,
        exclude_paths: List[str] = None,
        cache_methods: List[str] = None,
    ):
        """
        캐싱 미들웨어 초기화.

        Args:
            app: FastAPI 애플리케이션
            manager: 캐시 관리자
            ttl: 캐시 TTL (초)
            cache_headers: 응답 헤더에 캐시 정보 포함 여부
            cache_paths: 캐싱할 경로 목록 (None이면 모든 경로)
            exclude_paths: 캐싱에서 제외할 경로 목록
            cache_methods: 캐싱할 HTTP 메서드 목록 (기본: GET)
        """
        super().__init__(app)
        self.manager = manager or get_cache_manager()
        self.ttl = ttl
        self.cache_headers = cache_headers
        self.cache_paths = cache_paths or []
        self.exclude_paths = exclude_paths or []
        self.cache_methods = cache_methods or ["GET"]

    def _should_cache(self, request: Request) -> bool:
        """
        요청을 캐싱해야 하는지 확인합니다.

        다음 조건을 모두 만족하면 캐싱합니다:
        1. 캐싱이 활성화 되어 있음
        2. HTTP 메서드가 캐싱 대상임
        3. 제외 경로에 포함되지 않음
        4. 포함 경로가 지정된 경우, 해당 경로에 포함됨
        """
        # 캐싱이 비활성화된 경우 캐싱하지 않음
        if not self.manager.settings.enable_cache:
            return False

        # HTTP 메서드가 캐싱 대상이 아닌 경우 캐싱하지 않음
        if request.method not in self.cache_methods:
            return False

        path = request.url.path

        # 제외 경로에 포함된 경우 캐싱하지 않음
        if any(path.startswith(exclude) for exclude in self.exclude_paths):
            return False

        # 포함 경로가 지정된 경우, 해당 경로에 포함된 경우만 캐싱
        if self.cache_paths:
            return any(path.startswith(include) for include in self.cache_paths)

        # 이외의 모든 경우 캐싱
        return True

    def _build_cache_key(self, request: Request) -> str:
        """요청에 대한 캐시 키를 생성합니다."""
        method = request.method
        path = request.url.path
        query = str(request.url.query)
        # 보안을 위해 Authorization 헤더 전체 대신 "authorized" 또는 "anonymous" 값만 사용
        auth_status = (
            "authorized" if request.headers.get("Authorization") else "anonymous"
        )

        return f"{method}:{path}:{query}:{auth_status}"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """요청을 처리하고 응답을 캐싱합니다."""
        # 캐싱 대상이 아닌 경우 일반적으로 처리
        if not self._should_cache(request):
            return await call_next(request)

        # 캐시 키 생성
        cache_key = self._build_cache_key(request)

        # 캐시에서 응답 검색
        cached_response = self._get_cached_response(cache_key)
        if cached_response:
            return cached_response

        # 캐시에 없으면 요청 처리 및 응답 캐싱
        return await self._process_and_cache_response(request, call_next, cache_key)

    def _get_cached_response(self, cache_key: str) -> Optional[Response]:
        """캐시에서 응답을 가져와 반환합니다."""
        cached_response = self.manager.get(cache_key)
        return (
            self._build_response_from_cache(cached_response, cache_key)
            if cached_response
            else None
        )

    def _build_response_from_cache(
        self, cached_data: tuple, cache_key: str
    ) -> Response:
        """캐시된 데이터로부터 응답 객체를 생성합니다."""
        response_data, status_code, headers = cached_data
        response = Response(
            content=response_data, status_code=status_code, headers=headers
        )

        if self.cache_headers:
            response.headers["X-Cache"] = "HIT"
            ttl = self.manager.get_ttl(cache_key)
            if ttl is not None and ttl != -1:
                response.headers["X-Cache-TTL"] = str(ttl)

        return response

    async def _process_and_cache_response(
        self, request: Request, call_next: Callable, cache_key: str
    ) -> Response:
        """응답을 처리하고 캐싱합니다."""
        response = await call_next(request)

        if not (200 <= response.status_code < 300):
            return response

        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        headers_dict = dict(response.headers.items())

        cache_data = (response_body, response.status_code, headers_dict)
        self.manager.set(cache_key, cache_data, self.ttl)

        new_response = Response(
            content=response_body,
            status_code=response.status_code,
            headers=headers_dict,
        )

        if self.cache_headers:
            new_response.headers["X-Cache"] = "MISS"

        return new_response


def _check_patterns(key: str, patterns: List[str]) -> bool:
    """키가 패턴 목록과 일치하는지 확인합니다."""
    import re

    return any(re.match(pattern.replace("*", ".*"), key) for pattern in patterns)


def asyncio_is_installed() -> bool:
    """asyncio 패키지가 설치되어 있는지 확인합니다."""
    try:
        import asyncio
        import inspect

        return hasattr(asyncio, "run") and hasattr(inspect, "iscoroutinefunction")
    except ImportError:
        return False


def is_coroutine_function(func: Callable) -> bool:
    """함수가 코루틴 함수인지 확인합니다."""
    if not asyncio_is_installed():
        return False

    import inspect

    return inspect.iscoroutinefunction(func)


def setup_cache(app: FastAPI, settings: Optional[CacheSettings] = None) -> CacheManager:
    """
    애플리케이션에 캐시 시스템을 설정합니다.

    Args:
        app: FastAPI 애플리케이션 인스턴스
        settings: 캐시 설정 (None인 경우 기본 설정 사용)

    Returns:
        CacheManager: 설정된 캐시 매니저 인스턴스
    """
    settings = settings or CacheSettings()
    manager = CacheManager(settings)

    # 싱글톤 인스턴스 설정
    get_cache_manager._instance = manager

    if os.environ.get("TESTING") == "true":
        logger.info("테스트 환경에서 캐시 초기화")

    @app.on_event("startup")
    async def cache_startup():
        """애플리케이션 시작 시 캐시 초기화"""
        logger.info(f"캐시 시스템 초기화 - 백엔드: {settings.backend_type.value}")

    @app.on_event("shutdown")
    async def cache_shutdown():
        """애플리케이션 종료 시 리소스 정리"""
        logger.info("캐시 시스템 종료")
        # 필요한 정리 작업 수행

    return manager


def get_cache_manager() -> CacheManager:
    """
    현재 애플리케이션에서 사용 중인 캐시 매니저를 반환합니다.

    Returns:
        CacheManager: 현재 애플리케이션의 캐시 매니저

    Raises:
        RuntimeError: 캐시가 설정되지 않은 경우
    """
    if (
        not hasattr(get_cache_manager, "_instance")
        or get_cache_manager._instance is None
    ):
        raise RuntimeError(
            "캐시가 설정되지 않았습니다. setup_cache()를 먼저 호출하세요."
        )
    return get_cache_manager._instance


def get_cache():
    """
    현재 애플리케이션에서 사용 중인 캐시 백엔드를 반환합니다.
    캐시 매니저를 통해 캐시 백엔드에 접근합니다.

    Returns:
        CacheBackend: 현재 애플리케이션의 캐시 백엔드

    Raises:
        RuntimeError: 캐시가 설정되지 않은 경우
    """
    try:
        manager = get_cache_manager()
        return manager.backend
    except RuntimeError:
        # 테스트 환경을 위한 기본 메모리 캐시 생성
        if os.environ.get("TESTING") == "true":
            logger.warning("테스트 환경에서 임시 메모리 캐시를 사용합니다.")
            settings = CacheSettings(
                backend_type=CacheBackendType.MEMORY,
                default_ttl=60,
                prefix="test_cache:",
            )
            return MemoryCache(settings)
        raise RuntimeError(
            "캐시가 설정되지 않았습니다. setup_cache()를 먼저 호출하세요."
        )


def get_cache_dependency():
    """
    FastAPI 의존성 주입을 위한 캐시 백엔드 getter 함수.

    Returns:
        CacheBackend: 현재 애플리케이션의 캐시 백엔드
    """
    return get_cache()


def _get_return_type_hint(func: Callable) -> Optional[Type]:
    """함수의 반환 타입 힌트를 가져옵니다."""
    import inspect

    sig = inspect.signature(func)
    if sig.return_annotation is not inspect.Signature.empty:
        return sig.return_annotation
    return None


async def _handle_cached_call(
    func: Callable,
    args: Any,
    kwargs: Any,
    ttl_seconds: Optional[int],
    key_builder: Optional[CacheKeyGenerator],
    manager: Optional[CacheManager],
    invalidate_pattern: Optional[str],
    cache_type_hints: bool,
    return_type: Optional[Type],
) -> Any:
    """캐시된 함수 호출을 처리합니다."""
    if manager is None:
        manager = get_cache_manager()

    if not manager.settings.enable_cache:
        result = await func(*args, **kwargs)
        return result if result is not None else None

    # 캐시 키 생성
    kb = key_builder or default_key_builder
    cache_key = kb(func.__qualname__, list(args), kwargs)
    if cache_type_hints and return_type:
        cache_key = f"{cache_key}:{return_type.__name__}"

    # 캐시에서 값 조회
    cached_result = manager.get(cache_key)
    if cached_result is not None:
        logger.debug(f"캐시 적중: {cache_key}")
        return cached_result

    # 실제 함수 실행 및 결과 캐싱
    try:
        result = await func(*args, **kwargs)
    except Exception as e:
        logger.error(f"함수 실행 중 오류 발생: {str(e)}")
        return None

    if result is not None:
        function_ttl = (
            ttl_seconds if ttl_seconds is not None else manager.settings.default_ttl
        )
        manager.set(cache_key, result, function_ttl)

    # 필요한 경우 패턴 무효화
    if invalidate_pattern:
        manager.delete_pattern(invalidate_pattern)

    return result if result is not None else None


def ttl_cache(ttl: Optional[Union[int, timedelta]] = None):
    """
    TTL 기반 캐싱을 위한 데코레이터

    Args:
        ttl: 캐시 유효 시간 (초 또는 timedelta)
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            manager = get_cache_manager()
            key = default_key_builder(func.__name__, args, kwargs)

            # 캐시에서 값 가져오기
            cached_value = manager.get(key)
            if cached_value is not None:
                return cached_value

            # 캐시에 없으면 함수 실행
            result = await func(*args, **kwargs)

            # 결과 캐싱
            ttl_seconds = ttl.total_seconds() if isinstance(ttl, timedelta) else ttl
            manager.set(key, result, ttl_seconds)

            return result

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            manager = get_cache_manager()
            key = default_key_builder(func.__name__, args, kwargs)

            # 캐시에서 값 가져오기
            cached_value = manager.get(key)
            if cached_value is not None:
                return cached_value

            # 캐시에 없으면 함수 실행
            result = func(*args, **kwargs)

            # 결과 캐싱
            ttl_seconds = ttl.total_seconds() if isinstance(ttl, timedelta) else ttl
            manager.set(key, result, ttl_seconds)

            return result

        return async_wrapper if is_coroutine_function(func) else sync_wrapper

    return decorator
