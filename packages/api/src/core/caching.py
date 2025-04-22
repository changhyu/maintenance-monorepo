"""
캐싱 시스템 모듈
API 응답을 캐싱하기 위한 데코레이터와 유틸리티 함수 제공
"""

import functools
import hashlib
import inspect
import json
import time
from typing import Any, Callable, Dict, Optional, Tuple, TypeVar, cast

from fastapi import Depends, Request, Response
from pydantic import BaseModel

from packages.api.src.coreconfig import settings

# 캐시 키 생성 기능을 위한 타입 변수
T = TypeVar("T")


def create_cache_key(func: Callable, *args, **kwargs) -> str:
    """
    함수와 인자를 기반으로 캐시 키를 생성합니다.

    Args:
        func: 캐싱할 함수
        args: 함수의 위치 인자
        kwargs: 함수의 키워드 인자

    Returns:
        생성된 캐시 키
    """
    # 함수의 전체 경로 (모듈명 포함)
    func_path = f"{func.__module__}.{func.__qualname__}"

    # 인자를 정렬하여 직렬화
    sorted_kwargs = sorted(kwargs.items())

    # 모든 인자를 문자열로 변환
    args_str = json.dumps(args, sort_keys=True, default=str)
    kwargs_str = json.dumps(sorted_kwargs, sort_keys=True, default=str)

    # 함수 경로와 인자들을 결합하여 해시
    key_data = f"{func_path}:{args_str}:{kwargs_str}"
    return hashlib.md5(key_data.encode()).hexdigest()


def cache_response(
    expires: int = 300,
    vary_on_headers: Optional[list] = None,
    cache_errors: bool = False,
):
    """
    API 응답을 캐싱하는 데코레이터

    Args:
        expires: 캐시 만료 시간(초)
        vary_on_headers: 캐시 키 계산 시 고려할 헤더 목록
        cache_errors: 에러 응답도 캐싱할지 여부

    Returns:
        캐싱이 적용된 함수
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Request, Response 객체 추출
            request = None
            response = None

            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, Response):
                    response = arg

            for key, arg in kwargs.items():
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, Response):
                    response = arg

            # 캐시 키 생성
            base_key = create_cache_key(func, *args, **kwargs)

            # 헤더 기반 키 변형
            header_part = ""
            if request and vary_on_headers:
                header_values = []
                for header in vary_on_headers:
                    value = request.headers.get(header, "")
                    header_values.append(f"{header}={value}")

                if header_values:
                    header_part = (
                        "-" + hashlib.md5(":".join(header_values).encode()).hexdigest()
                    )

            cache_key = f"api_cache:{base_key}{header_part}"

            # 캐시 매니저 가져오기
            from src.main import app

            if hasattr(app.state, "cache_manager") and app.state.cache_manager:
                cache_manager = app.state.cache_manager

                # 캐시에서 데이터 조회
                cached_data = await cache_manager.get(cache_key)
                if cached_data:
                    if response:
                        response.headers["X-Cache"] = "HIT"

                    return cached_data

            # 원본 함수 호출
            try:
                result = await func(*args, **kwargs)

                # 캐시 저장
                if hasattr(app.state, "cache_manager") and app.state.cache_manager:
                    await cache_manager.set(cache_key, result, expires)

                # 캐시 미스 헤더 추가
                if response:
                    response.headers["X-Cache"] = "MISS"

                return result
            except Exception as e:
                # 에러 캐싱 여부 확인
                if (
                    cache_errors
                    and hasattr(app.state, "cache_manager")
                    and app.state.cache_manager
                ):
                    # 에러 정보를 저장할 수 있는 형태로 변환
                    error_data = {"error": str(e), "type": e.__class__.__name__}
                    error_key = f"{cache_key}:error"
                    await cache_manager.set(error_key, error_data, expires)

                    if response:
                        response.headers["X-Cache-Error"] = "STORED"

                # 예외 다시 발생
                raise

        return cast(Callable[..., T], wrapper)

    return decorator


def invalidate_cache_for(prefix: str):
    """
    특정 프리픽스의 모든 캐시를 무효화하는 함수

    Args:
        prefix: 무효화할 캐시 키 프리픽스
    """

    async def _invalidate_cache():
        from src.main import app

        if hasattr(app.state, "cache_manager") and app.state.cache_manager:
            cache_manager = app.state.cache_manager
            await cache_manager.delete_pattern(f"api_cache:{prefix}*")

    return _invalidate_cache


def clear_all_cache():
    """
    모든 API 캐시를 삭제합니다.
    """

    async def _clear_all_cache():
        from src.main import app

        if hasattr(app.state, "cache_manager") and app.state.cache_manager:
            cache_manager = app.state.cache_manager
            await cache_manager.delete_pattern("api_cache:*")

    return _clear_all_cache
