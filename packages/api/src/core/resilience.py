"""
시스템 탄력성(Resilience) 모듈

재시도 메커니즘과 회로 차단기(Circuit Breaker) 패턴을 제공하여
외부 서비스 장애나 네트워크 오류에 강한 시스템을 구현합니다.
"""

import asyncio
import functools
import inspect
import logging
import random
import time
from enum import Enum
from typing import Any, Callable, Dict, Generic, List, Optional, TypeVar, Union, cast

T = TypeVar("T")
R = TypeVar("R")

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    """회로 차단기 상태"""

    CLOSED = "closed"  # 정상 작동
    OPEN = "open"  # 차단됨
    HALF_OPEN = "half_open"  # 테스트 중


class CircuitBreakerError(Exception):
    """회로 차단기가 열려 있을 때 발생하는 예외"""

    def __init__(
        self, service_name: str, failure_count: int, message: Optional[str] = None
    ):
        self.service_name = service_name
        self.failure_count = failure_count
        msg = (
            message
            or f"{service_name} 서비스 회로 차단기가 열려 있습니다 (실패 횟수: {failure_count})"
        )
        super().__init__(msg)


class RetryConfig:
    """재시도 설정"""

    def __init__(
        self,
        max_retries: int = 3,  # 최대 재시도 횟수
        retry_delay: float = 0.1,  # 기본 재시도 대기 시간(초)
        max_delay: float = 10.0,  # 최대 재시도 대기 시간(초)
        backoff_factor: float = 2.0,  # 지수 백오프 계수
        jitter: bool = True,  # 지터(무작위 지연) 적용 여부
        retry_on_exceptions: List[type] = None,  # 재시도할 예외 유형 목록
    ):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        self.jitter = jitter
        self.retry_on_exceptions = retry_on_exceptions or [Exception]

    def should_retry(self, exception: Exception) -> bool:
        """주어진 예외에 대해 재시도해야 하는지 확인"""
        return any(
            isinstance(exception, exc_type) for exc_type in self.retry_on_exceptions
        )

    def get_next_delay(self, attempt: int) -> float:
        """다음 재시도 대기 시간 계산"""
        delay = min(self.retry_delay * (self.backoff_factor**attempt), self.max_delay)

        # 지터 적용 (무작위성 추가로 부하 분산)
        if self.jitter:
            delay = delay * (0.5 + random.random())

        return delay


class CircuitBreakerConfig:
    """회로 차단기 설정"""

    def __init__(
        self,
        failure_threshold: int = 5,  # 회로를 열기 위한 실패 임계값
        recovery_timeout: float = 30.0,  # 회로를 반열림 상태로 전환하기까지의 시간(초)
        success_threshold: int = 1,  # 회로를 다시 닫기 위한 성공 임계값
        exclude_exceptions: List[type] = None,  # 실패 횟수에 포함하지 않을 예외 유형
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.exclude_exceptions = exclude_exceptions or []

    def is_counted_exception(self, exception: Exception) -> bool:
        """주어진 예외가 실패 횟수에 포함되어야 하는지 확인"""
        return not any(
            isinstance(exception, exc_type) for exc_type in self.exclude_exceptions
        )


class CircuitBreaker:
    """회로 차단기 구현"""

    _instances: Dict[str, "CircuitBreaker"] = {}

    @classmethod
    def get_or_create(
        cls, name: str, config: CircuitBreakerConfig = None
    ) -> "CircuitBreaker":
        """이름으로 회로 차단기 인스턴스를 가져오거나 생성"""
        if name not in cls._instances:
            cls._instances[name] = CircuitBreaker(name, config)
        return cls._instances[name]

    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0.0
        self.last_attempt_time = 0.0
        self._lock = asyncio.Lock()

    async def execute(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        """함수를 회로 차단기 보호 하에 실행"""
        async with self._lock:
            self.last_attempt_time = time.time()

            # 회로가 열려 있는 경우
            if self.state == CircuitState.OPEN:
                # 회복 시간이 지났는지 확인
                if time.time() - self.last_failure_time >= self.config.recovery_timeout:
                    logger.info(
                        f"회로 차단기 '{self.name}'이(가) HALF_OPEN 상태로 전환됩니다."
                    )
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                else:
                    # 아직 회복 시간이 지나지 않았음
                    raise CircuitBreakerError(self.name, self.failure_count)

        try:
            # 함수가 비동기인지 확인
            if inspect.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            # 성공 처리
            async with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.success_count += 1

                    # 성공 임계값에 도달했는지 확인
                    if self.success_count >= self.config.success_threshold:
                        logger.info(
                            f"회로 차단기 '{self.name}'이(가) CLOSED 상태로 복구되었습니다."
                        )
                        self.state = CircuitState.CLOSED
                        self.failure_count = 0
                        self.success_count = 0

                # 닫힌 상태에서는 실패 횟수 초기화
                elif self.state == CircuitState.CLOSED:
                    self.failure_count = 0

            return result

        except Exception as e:
            # 실패 처리
            async with self._lock:
                # 예외가 카운트되어야 하는지 확인
                if self.config.is_counted_exception(e):
                    # 실패 집계
                    self.failure_count += 1
                    self.last_failure_time = time.time()

                    # 반열림 상태에서는 즉시 회로를 다시 열음
                    if self.state == CircuitState.HALF_OPEN:
                        logger.warning(
                            f"회로 차단기 '{self.name}'이(가) 반열림 상태에서 실패하여 OPEN 상태로 돌아갑니다."
                        )
                        self.state = CircuitState.OPEN

                    # 닫힌 상태에서는 실패 임계값을 확인
                    elif (
                        self.state == CircuitState.CLOSED
                        and self.failure_count >= self.config.failure_threshold
                    ):
                        logger.warning(
                            f"회로 차단기 '{self.name}'이(가) 실패 임계값에 도달하여 OPEN 상태로 전환됩니다."
                        )
                        self.state = CircuitState.OPEN

            # 예외 다시 발생
            raise


class RetryHandler:
    """재시도 핸들러 구현"""

    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()

    async def execute(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        """함수를 재시도 로직으로 감싸서 실행"""
        last_exception = None

        for attempt in range(self.config.max_retries + 1):  # 원래 시도 + 재시도
            try:
                # 비동기 함수인지 확인
                if inspect.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)

            except Exception as e:
                last_exception = e

                # 재시도 여부 확인
                if (
                    not self.config.should_retry(e)
                    or attempt >= self.config.max_retries
                ):
                    # 더 이상 재시도 안 함
                    break

                # 다음 재시도 간격 계산
                delay = self.config.get_next_delay(attempt)

                logger.warning(
                    f"함수 실행 실패 (시도 {attempt+1}/{self.config.max_retries+1}), "
                    f"{delay:.2f}초 후 재시도: {str(e)}"
                )

                # 비동기 대기
                await asyncio.sleep(delay)

        # 모든 재시도가 실패한 경우
        if last_exception:
            logger.error(
                f"모든 재시도 실패 ({self.config.max_retries+1}번 시도): {str(last_exception)}"
            )
            raise last_exception

        # 여기에 도달하면 안 되지만 Type 에러 방지를 위해 None 반환
        return None


# 데코레이터 함수들


def retry(**kwargs):
    """
    함수에 재시도 로직을 적용하는 데코레이터

    Args:
        **kwargs: RetryConfig 생성자에 전달할 설정값들
    """
    retry_config = RetryConfig(**kwargs)
    retry_handler = RetryHandler(retry_config)

    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await retry_handler.execute(func, *args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 비동기 실행을 동기적으로 래핑
            event_loop = asyncio.get_event_loop()
            return event_loop.run_until_complete(
                retry_handler.execute(func, *args, **kwargs)
            )

        # 비동기 함수인지 확인
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def circuit_breaker(name: str, **kwargs):
    """
    함수에 회로 차단기 패턴을 적용하는 데코레이터

    Args:
        name: 회로 차단기 이름 (공유 인스턴스의 식별자)
        **kwargs: CircuitBreakerConfig 생성자에 전달할 설정값들
    """
    config = CircuitBreakerConfig(**kwargs)
    breaker = CircuitBreaker.get_or_create(name, config)

    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await breaker.execute(func, *args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 비동기 실행을 동기적으로 래핑
            event_loop = asyncio.get_event_loop()
            return event_loop.run_until_complete(breaker.execute(func, *args, **kwargs))

        # 비동기 함수인지 확인
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def resilient(
    name: str = None,
    retry_config: Dict[str, Any] = None,
    circuit_breaker_config: Dict[str, Any] = None,
):
    """
    재시도와 회로 차단기를 함께 적용하는 복합 데코레이터

    Args:
        name: 회로 차단기 이름
        retry_config: 재시도 설정
        circuit_breaker_config: 회로 차단기 설정
    """
    retry_conf = retry_config or {}
    cb_conf = circuit_breaker_config or {}

    def decorator(func):
        # 함수 이름 기반 기본 회로 차단기 이름
        cb_name = name or f"{func.__module__}.{func.__name__}"

        # 재시도와 회로 차단기 데코레이터를 차례로 적용
        retry_decorator = retry(**retry_conf)
        circuit_breaker_decorator = circuit_breaker(cb_name, **cb_conf)

        # 재시도를 먼저, 그 다음 회로 차단기 적용
        return circuit_breaker_decorator(retry_decorator(func))

    return decorator
