"""
API 데코레이터 모듈
"""

import functools
import logging
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Type, Union

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from packages.api.src.corecache import cache_manager
from packages.api.src.corelogging import get_logger
from packages.api.src.coremetrics_collector import metrics_collector

logger = get_logger("decorators")


def handle_exceptions(func: Callable) -> Callable:
    """
    예외 처리 데코레이터

    Args:
        func: 데코레이트할 함수

    Returns:
        Callable: 데코레이트된 함수
    """

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"예외 발생: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
            )

    return wrapper


def rate_limit(
    limit: int = 100,
    window: int = 60,
    key_func: Optional[Callable[[Request], str]] = None,
) -> Callable:
    """
    요청 속도 제한 데코레이터

    Args:
        limit: 시간 창 내 최대 요청 수
        window: 시간 창 크기 (초)
        key_func: 요청별 키 생성 함수

    Returns:
        Callable: 데코레이트된 함수
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or args[0]
            if not isinstance(request, Request):
                raise ValueError("첫 번째 인자가 Request 객체가 아닙니다")

            # 요청 키 생성
            key = key_func(request) if key_func else str(request.client.host)

            # 속도 제한 검사
            current_count = metrics_collector.get_request_count(key)
            if current_count >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"요청이 너무 많습니다. {window}초 후에 다시 시도하세요.",
                )

            # 요청 카운트 증가
            metrics_collector.increment_request_count(key)

            return await func(*args, **kwargs)

        return wrapper

    return decorator


def validate_input(model: Type[Any]) -> Callable:
    """
    입력 데이터 검증 데코레이터

    Args:
        model: 검증에 사용할 Pydantic 모델

    Returns:
        Callable: 데코레이트된 함수
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # 입력 데이터 검증
                data = kwargs.get("data") or args[-1]
                validated_data = model(**data)

                # 검증된 데이터로 원래 함수 호출
                if "data" in kwargs:
                    kwargs["data"] = validated_data
                else:
                    args = list(args[:-1]) + [validated_data]

                return await func(*args, **kwargs)
            except Exception as e:
                logger.error(f"입력 데이터 검증 실패: {str(e)}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
                )

        return wrapper

    return decorator


def log_execution_time(func: Callable) -> Callable:
    """
    함수 실행 시간 로깅 데코레이터

    Args:
        func: 데코레이트할 함수

    Returns:
        Callable: 데코레이트된 함수
    """

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        import time

        start_time = time.time()

        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time

            # 실행 시간 메트릭 기록
            metrics_collector.record_execution_time(func.__name__, execution_time)

            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"함수 실행 중 오류 발생: {str(e)}",
                extra={"execution_time": execution_time, "function": func.__name__},
                exc_info=True,
            )
            raise

    return wrapper


def cache_response(
    prefix: str = None,
    expire: int = None,
    include_path_params: bool = False,
    include_query_params: bool = False,
    user_specific: bool = False,
    vary_headers: Optional[List[str]] = None,
    cache_level: Optional[str] = None,
) -> Callable:
    """
    API 응답을 캐시하는 데코레이터

    Args:
        prefix: 캐시 키 접두사
        expire: 캐시 유효 시간(초)
        include_path_params: 경로 매개변수를 캐시 키에 포함할지 여부
        include_query_params: 쿼리 매개변수를 캐시 키에 포함할지 여부
        user_specific: 사용자별로 캐시할지 여부
        vary_headers: 캐시 키에 포함할 헤더 목록
        cache_level: 캐시 레벨 (LOW, MEDIUM, HIGH)

    Returns:
        Callable: 데코레이터 함수
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # 요청 객체 찾기
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            # 캐시 키 생성
            cache_key_parts = [prefix or func.__name__]

            # 경로 매개변수 추가
            if include_path_params and request:
                for param, value in request.path_params.items():
                    cache_key_parts.append(f"{param}:{value}")

            # 쿼리 매개변수 추가
            if include_query_params and request:
                for param, value in request.query_params.items():
                    cache_key_parts.append(f"{param}:{value}")

            # 사용자 정보 추가
            if user_specific and request:
                user = getattr(request.state, "user", None)
                if user:
                    cache_key_parts.append(f"user:{user.id}")

            # 헤더 값 추가
            if vary_headers and request:
                for header in vary_headers:
                    value = request.headers.get(header)
                    if value:
                        cache_key_parts.append(f"{header}:{value}")

            cache_key = ":".join(cache_key_parts)

            # 캐시된 결과 확인
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # 함수 실행 및 결과 캐시
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, expire)

            return result

        return wrapper

    return decorator
