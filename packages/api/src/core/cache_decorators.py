"""
API 응답 및 함수 결과 캐싱 데코레이터 모듈

API 응답 및 함수 결과를 캐싱하기 위한 데코레이터를 제공합니다.
"""

import asyncio
import base64
import functools
import hashlib
import inspect
import json
import logging
import random
import time
import uuid
import zlib
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Type, Union

# orjson 사용 시도 (설치되어 있는 경우)
try:
    import orjson

    USE_ORJSON = True
except ImportError:
    USE_ORJSON = False

import fastapi
from fastapi import Request, Response
from starlette.datastructures import URL
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.responses import Response as StarletteResponse
from starlette.types import ASGIApp

from packages.api.src.corecache.config import get_cache_config
from packages.api.src.corecache.manager import get_cache_manager
from packages.api.src.corecache_keys import (
    create_cache_key,
    create_cache_namespace,
    create_function_cache_key,
    get_cache_namespace_for_user,
)
from packages.api.src.coremetrics_collector import metrics_collector

logger = logging.getLogger(__name__)
config = get_cache_config()
cache = get_cache_manager()

# 압축 옵션 상수
COMPRESSION_THRESHOLD = 1024 * 10  # 10KB 이상일 때 압축
COMPRESSION_LEVEL = 6  # 1-9 사이 (높을수록 압축률 높고 속도 느림)


# 캐시 레벨 정의
class CacheLevel:
    """캐시 세분화 레벨"""

    LOW = "low"  # 짧은 유지 시간, 느슨한 키 (예: 자주 변경되는 데이터)
    MEDIUM = "medium"  # 중간 유지 시간, 일반 키 (대부분의 API에 적합)
    HIGH = "high"  # 긴 유지 시간, 세부 키 (거의 변경되지 않는 데이터)


# 메모리 사용량 추적 함수
def track_memory_usage():
    """현재 프로세스의 메모리 사용량 추적"""
    try:
        import os

        import psutil

        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        memory_usage_mb = memory_info.rss / 1024 / 1024

        # 메트릭에 기록
        metrics_collector.cache_memory_usage.set(memory_usage_mb)

        # 높은 메모리 사용량 경고
        if memory_usage_mb > 500:  # 500MB 이상인 경우
            logger.warning(f"높은 메모리 사용량: {memory_usage_mb:.2f}MB")

        return memory_usage_mb
    except Exception as e:
        logger.error(f"메모리 사용량 추적 실패: {str(e)}")
        return None


def json_dumps(data: Any) -> bytes:
    """향상된 JSON 직렬화 함수"""
    try:
        if USE_ORJSON:
            # orjson은 기본적으로 bytes 반환
            return orjson.dumps(
                data,
                option=orjson.OPT_SERIALIZE_NUMPY
                | orjson.OPT_SERIALIZE_DATACLASS
                | orjson.OPT_SORT_KEYS,
            )
        else:
            # 기본 json은 문자열 반환, bytes로 변환
            return json.dumps(data, sort_keys=True).encode("utf-8")
    except Exception as e:
        logger.error(f"JSON 직렬화 실패: {str(e)}")
        # 기본 json으로 폴백
        return json.dumps(data).encode("utf-8")


def json_loads(data: Union[str, bytes]) -> Any:
    """향상된 JSON 역직렬화 함수"""
    try:
        if USE_ORJSON and isinstance(data, bytes):
            return orjson.loads(data)
        else:
            # 문자열이면 그대로 사용, bytes면 디코딩
            if isinstance(data, bytes):
                data = data.decode("utf-8")
            return json.loads(data)
    except Exception as e:
        logger.error(f"JSON 역직렬화 실패: {str(e)}")
        # 원본 반환
        return data


def compress_data(data: Any) -> Tuple[Any, bool]:
    """
    데이터 압축 함수

    Args:
        data: 압축할 데이터

    Returns:
        (압축된 데이터, 압축 여부) 튜플
    """
    try:
        # 문자열 형태로 직렬화
        if isinstance(data, dict) or isinstance(data, list):
            serialized = json_dumps(data)
        elif isinstance(data, str):
            serialized = data.encode("utf-8")
        elif isinstance(data, bytes):
            serialized = data
        else:
            # 압축 불가능한 형식은 원본 반환
            return data, False

        # 임계값보다 크면 압축
        if len(serialized) > COMPRESSION_THRESHOLD:
            compressed = zlib.compress(serialized, COMPRESSION_LEVEL)
            encoded = base64.b64encode(compressed).decode("utf-8")

            # 압축률 계산 및 로깅
            compression_ratio = (
                (len(serialized) - len(compressed)) / len(serialized) * 100
            )
            if config.debug:
                logger.debug(
                    f"데이터 압축: {len(serialized)} -> {len(compressed)} 바이트 ({compression_ratio:.1f}% 감소)"
                )

            return {
                "_compressed": True,
                "data": encoded,
                "original_type": type(data).__name__,
                "original_size": len(serialized),
                "compressed_size": len(compressed),
            }, True

        return data, False
    except Exception as e:
        logger.error(f"데이터 압축 실패: {str(e)}")
        return data, False


def decompress_data(data: Any) -> Any:
    """
    압축된 데이터 복원 함수

    Args:
        data: 압축된 데이터

    Returns:
        복원된 데이터
    """
    try:
        # 압축된 데이터 형식인지 확인
        if isinstance(data, dict) and data.get("_compressed") is True:
            compressed = base64.b64decode(data["data"])
            decompressed = zlib.decompress(compressed)

            # 원본 타입에 따라 복원
            original_type = data.get("original_type", "dict")
            if original_type == "str":
                return decompressed.decode("utf-8")
            elif original_type == "bytes":
                return decompressed
            else:
                # JSON으로 파싱
                return json_loads(decompressed)

        return data
    except Exception as e:
        logger.error(f"데이터 압축 해제 실패: {str(e)}")
        return data


def create_granular_cache_key(
    request: Request,
    prefix: str,
    namespace: Optional[str] = None,
    cache_level: str = CacheLevel.MEDIUM,
    exclude_query_params: List[str] = None,
    exclude_headers: List[str] = None,
    include_path_params: bool = False,
    include_query_params: bool = False,
) -> str:
    """
    세분화된 캐시 키 생성

    Args:
        request: HTTP 요청 객체
        prefix: 캐시 키 접두사
        namespace: 캐시 네임스페이스
        cache_level: 캐시 세분화 레벨
        exclude_query_params: 제외할 쿼리 파라미터
        exclude_headers: 제외할 헤더
        include_path_params: 경로 매개변수를 캐시 키에 포함할지 여부
        include_query_params: 모든 쿼리 매개변수를 캐시 키에 포함할지 여부

    Returns:
        캐시 키 문자열
    """
    if exclude_query_params is None:
        exclude_query_params = []

    if exclude_headers is None:
        exclude_headers = []

    # 기본 키 컴포넌트 (모든 레벨에 공통)
    key_parts = [prefix, request.method, request.url.path]

    # 네임스페이스 추가 (있는 경우)
    if namespace:
        key_parts.append(namespace)

    # 레벨별 상세도 조정
    if cache_level == CacheLevel.HIGH:
        # 높은 상세도: 모든 쿼리 매개변수, 일부 헤더 포함
        query_params = dict(request.query_params)
        for param in exclude_query_params:
            query_params.pop(param, None)

        if query_params:
            # 정렬된 매개변수로 일관된 키 생성
            params_str = "&".join(f"{k}={v}" for k, v in sorted(query_params.items()))
            key_parts.append(params_str)

        # 중요 헤더 추가 (Accept, Content-Type 등)
        relevant_headers = {}
        for header in ["accept", "content-type", "accept-language"]:
            if header in request.headers and header not in exclude_headers:
                relevant_headers[header] = request.headers[header]

        if relevant_headers:
            headers_str = ",".join(
                f"{k}={v}" for k, v in sorted(relevant_headers.items())
            )
            key_parts.append(headers_str)

    elif cache_level == CacheLevel.MEDIUM:
        # 중간 상세도: 필수 쿼리 매개변수만 포함
        query_params = dict(request.query_params)
        for param in exclude_query_params:
            query_params.pop(param, None)

        if query_params:
            params_str = "&".join(f"{k}={v}" for k, v in sorted(query_params.items()))
            key_parts.append(params_str)

    # 낮은 상세도(LOW)는 경로와 메서드만 포함 (기본값)

    # 최종 키 생성
    key_str = ":".join(str(part) for part in key_parts)

    # 키가 너무 길면 해시 처리
    if len(key_str) > 250:  # Redis 키 길이 제한 고려
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        key_str = f"{prefix}:{key_hash}"

        if config.debug:
            logger.debug(f"긴 캐시 키를 해시로 변환: {key_str[:30]}... -> {key_hash}")

    return key_str


def cache_response(
    expire: int = None,
    prefix: str = None,
    user_specific: bool = False,
    exclude_query_params: List[str] = None,
    exclude_headers: List[str] = None,
    cache_condition: Callable[[Request], bool] = None,
    key_builder: Callable[[Request], str] = None,
    compress: bool = True,
    cache_level: str = CacheLevel.MEDIUM,
    include_path_params: bool = False,
    include_query_params: bool = False,
):
    """
    API 응답을 캐싱하는 FastAPI 라우터 데코레이터

    Args:
        expire: 캐시 만료 시간(초), 기본값은 config.api_cache_ttl
        prefix: 캐시 키 접두사, 기본값은 config.api_cache_prefix
        user_specific: 사용자별 캐싱 여부, True인 경우 user_id나 사용자 식별자를 키에 포함
        exclude_query_params: 캐시 키에서 제외할 쿼리 매개변수 목록
        exclude_headers: 캐시 키에서 제외할 헤더 목록
        cache_condition: 캐싱 여부를 결정하는 함수, Request 객체를 받아 bool 반환
        key_builder: 캐시 키 생성 함수, Request 객체를 받아 문자열 반환
        compress: 응답 데이터 압축 여부
        cache_level: 캐시 세분화 레벨
        include_path_params: 경로 매개변수를 캐시 키에 포함할지 여부
        include_query_params: 쿼리 매개변수를 캐시 키에 포함할지 여부

    Returns:
        FastAPI 라우터 데코레이터
    """
    if expire is None:
        expire = config.api_cache_ttl

    if prefix is None:
        prefix = config.api_cache_prefix

    if exclude_query_params is None:
        exclude_query_params = []

    if exclude_headers is None:
        exclude_headers = []

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 주기적으로 메모리 사용량 모니터링
            if random.random() < 0.01:  # 1% 확률로 체크
                track_memory_usage()

            # FastAPI 라우터 함수에서 Request 객체 찾기
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request is None:
                for _, value in kwargs.items():
                    if isinstance(value, Request):
                        request = value
                        break

            if request is None or not config.enabled or not config.api_cache_enabled:
                # Request 객체 없거나 캐시 비활성화 상태면 원래 함수 실행
                start_time = time.time()
                response = await func(*args, **kwargs)
                execution_time = time.time() - start_time

                # 실행 시간 메트릭 기록
                if request is not None:
                    metrics_collector.track_request(
                        method=request.method,
                        endpoint=request.url.path,
                        status_code=getattr(response, "status_code", 200),
                    )
                    metrics_collector.http_request_duration_seconds.labels(
                        method=request.method, endpoint=request.url.path
                    ).observe(execution_time)

                return response

            # 캐싱 조건 확인
            if cache_condition is not None and not cache_condition(request):
                start_time = time.time()
                response = await func(*args, **kwargs)
                execution_time = time.time() - start_time

                # 실행 시간 메트릭 기록
                metrics_collector.track_request(
                    method=request.method,
                    endpoint=request.url.path,
                    status_code=getattr(response, "status_code", 200),
                )
                metrics_collector.http_request_duration_seconds.labels(
                    method=request.method, endpoint=request.url.path
                ).observe(execution_time)

                return response

            # 캐시 키 생성
            if key_builder is not None:
                cache_key = key_builder(request)
            else:
                namespace = None
                if user_specific:
                    namespace = get_cache_namespace_for_user(request)

                # 세분화된 캐시 키 사용
                cache_key = create_granular_cache_key(
                    request=request,
                    prefix=prefix,
                    namespace=namespace,
                    cache_level=cache_level,
                    exclude_query_params=exclude_query_params,
                    exclude_headers=exclude_headers,
                    include_path_params=include_path_params,
                    include_query_params=include_query_params,
                )

            # 요청 ID를 헤더에 추가
            request_id = request.headers.get("X-Request-ID")
            if not request_id:
                request_id = str(uuid.uuid4())
                # starlette.Request 객체는 헤더 수정이 불가능하므로 로그만 기록
                logger.debug(f"요청 ID 생성: {request_id}")

            # 캐시에서 응답 가져오기
            cached_response = await cache.get(cache_key)

            if cached_response is not None:
                if config.debug:
                    logger.debug(f"캐시 적중: {cache_key}, ID: {request_id}")

                # 캐시 적중 메트릭 기록
                metrics_collector.track_cache_operation(hit=True)

                # 압축된 데이터 복원
                if compress:
                    content = decompress_data(cached_response.get("content"))
                else:
                    content = cached_response.get("content")

                status_code = cached_response.get("status_code", 200)
                headers = cached_response.get("headers", {})

                # 캐시에서 가져온 응답에 캐시 관련 헤더 추가
                headers["X-Cache"] = "HIT"
                headers["X-Cache-Key"] = cache_key[:50]  # 보안을 위해 잘라서 표시
                headers["X-Request-ID"] = request_id

                # JSON 응답 또는 일반 응답 생성
                if headers.get("content-type") == "application/json":
                    return JSONResponse(
                        content=content, status_code=status_code, headers=headers
                    )
                else:
                    return StarletteResponse(
                        content=content, status_code=status_code, headers=headers
                    )

            # 캐시 미스
            if config.debug:
                logger.debug(f"캐시 미스: {cache_key}, ID: {request_id}")

            # 캐시 미스 메트릭 기록
            metrics_collector.track_cache_operation(hit=False)

            # 원래 함수 실행 (시간 측정)
            start_time = time.time()
            response = await func(*args, **kwargs)
            execution_time = time.time() - start_time

            # 실행 시간 메트릭 기록
            metrics_collector.track_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=getattr(response, "status_code", 200),
            )
            metrics_collector.http_request_duration_seconds.labels(
                method=request.method, endpoint=request.url.path
            ).observe(execution_time)

            # 응답 캐싱
            if isinstance(response, StarletteResponse):
                try:
                    headers_dict = dict(response.headers)

                    # 캐시 관련 헤더 추가
                    headers_dict["X-Cache"] = "MISS"
                    headers_dict["X-Cache-Key"] = cache_key[
                        :50
                    ]  # 보안을 위해 잘라서 표시
                    headers_dict["X-Request-ID"] = request_id
                    headers_dict["X-Execution-Time"] = f"{execution_time:.6f}"

                    # 응답에 헤더 적용
                    for key, value in headers_dict.items():
                        if key not in response.headers:
                            response.headers[key] = value

                    # 응답 내용이 JSON인지 확인
                    if headers_dict.get("content-type") == "application/json":
                        content = json_loads(response.body)
                    else:
                        content = (
                            response.body.decode()
                            if hasattr(response.body, "decode")
                            else response.body
                        )

                    # 필요 시 데이터 압축
                    if compress:
                        content, is_compressed = compress_data(content)
                        if is_compressed and config.debug:
                            logger.debug(
                                f"응답 데이터 압축됨: {cache_key}, ID: {request_id}"
                            )

                    cached_data = {
                        "content": content,
                        "status_code": response.status_code,
                        "headers": headers_dict,
                    }

                    # 캐시 만료 시간 동적 조정
                    if cache_level == CacheLevel.HIGH:
                        # 긴 캐시 시간
                        effective_expire = expire * 2
                    elif cache_level == CacheLevel.LOW:
                        # 짧은 캐시 시간
                        effective_expire = expire // 2
                    else:
                        # 기본 캐시 시간
                        effective_expire = expire

                    await cache.set(cache_key, cached_data, expire=effective_expire)

                    if config.debug:
                        logger.debug(
                            f"응답 캐싱 완료: {cache_key}, 만료: {effective_expire}초, ID: {request_id}"
                        )

                except Exception as e:
                    logger.error(f"응답 캐싱 실패: {str(e)}, ID: {request_id}")

            return response

        return wrapper

    return decorator


def cache_function(
    expire: int = None,
    key_prefix: str = None,
    user_specific: bool = False,
    key_builder: Callable[..., str] = None,
):
    """
    함수 결과를 캐싱하는 데코레이터

    Args:
        expire: 캐시 만료 시간(초), 기본값은 config.function_cache_ttl
        key_prefix: 캐시 키 접두사, 기본값은 config.function_cache_prefix
        user_specific: 사용자별 캐싱 여부, True인 경우 함수에 request 매개변수 또는 user_id가 필요함
        key_builder: 캐시 키 생성 함수, 원래 함수의 매개변수를 받아 문자열 반환

    Returns:
        함수 데코레이터
    """
    if expire is None:
        expire = config.function_cache_ttl

    if key_prefix is None:
        key_prefix = config.function_cache_prefix

    def decorator(func: Callable) -> Callable:
        is_async = asyncio.iscoroutinefunction(func)

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not config.enabled or not config.function_cache_enabled:
                return await func(*args, **kwargs)

            # 캐시 키 생성
            if key_builder is not None:
                cache_key = key_builder(*args, **kwargs)
            else:
                namespace = None
                if user_specific:
                    # 함수 매개변수에서 request 또는 user_id 찾기
                    func_args = inspect.getcallargs(func, *args, **kwargs)
                    request = func_args.get("request")
                    user_id = func_args.get("user_id")

                    if request and isinstance(request, Request):
                        namespace = get_cache_namespace_for_user(request)
                    elif user_id:
                        namespace = create_cache_namespace(f"user:{user_id}")

                cache_key = create_function_cache_key(
                    func=func,
                    args=args,
                    kwargs=kwargs,
                    prefix=key_prefix,
                    namespace=namespace,
                )

            # 캐시에서 결과 가져오기
            cached_result = await cache.get(cache_key)

            if cached_result is not None:
                if config.debug:
                    logger.debug(f"함수 캐시 적중: {cache_key}")
                return cached_result

            # 캐시 미스 - 원래 함수 실행
            if config.debug:
                logger.debug(f"함수 캐시 미스: {cache_key}")

            result = await func(*args, **kwargs)

            # 결과 캐싱
            try:
                await cache.set(cache_key, result, expire=expire)
                if config.debug:
                    logger.debug(f"함수 결과 캐싱 완료: {cache_key}, 만료: {expire}초")
            except Exception as e:
                logger.error(f"함수 결과 캐싱 실패: {str(e)}")

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not config.enabled or not config.function_cache_enabled:
                return func(*args, **kwargs)

            # 캐시 키 생성
            if key_builder is not None:
                cache_key = key_builder(*args, **kwargs)
            else:
                namespace = None
                if user_specific:
                    # 함수 매개변수에서 request 또는 user_id 찾기
                    func_args = inspect.getcallargs(func, *args, **kwargs)
                    request = func_args.get("request")
                    user_id = func_args.get("user_id")

                    if request and isinstance(request, Request):
                        namespace = get_cache_namespace_for_user(request)
                    elif user_id:
                        namespace = create_cache_namespace(f"user:{user_id}")

                cache_key = create_function_cache_key(
                    func=func,
                    args=args,
                    kwargs=kwargs,
                    prefix=key_prefix,
                    namespace=namespace,
                )

            # 캐시에서 결과 가져오기
            cached_result = cache.get_sync(cache_key)

            if cached_result is not None:
                if config.debug:
                    logger.debug(f"함수 캐시 적중: {cache_key}")
                return cached_result

            # 캐시 미스 - 원래 함수 실행
            if config.debug:
                logger.debug(f"함수 캐시 미스: {cache_key}")

            result = func(*args, **kwargs)

            # 결과 캐싱
            try:
                cache.set_sync(cache_key, result, expire=expire)
                if config.debug:
                    logger.debug(f"함수 결과 캐싱 완료: {cache_key}, 만료: {expire}초")
            except Exception as e:
                logger.error(f"함수 결과 캐싱 실패: {str(e)}")

            return result

        return async_wrapper if is_async else sync_wrapper

    return decorator


class APICacheMiddleware(BaseHTTPMiddleware):
    """
    API 응답을 자동으로 캐싱하는 미들웨어

    개별 엔드포인트에 데코레이터를 적용하지 않고도 캐싱 가능
    """

    def __init__(
        self,
        app: ASGIApp,
        expire: int = None,
        prefix: str = None,
        user_specific: bool = False,
        exclude_query_params: List[str] = None,
        exclude_headers: List[str] = None,
        exclude_paths: List[str] = None,
        include_paths: List[str] = None,
    ):
        """
        API 캐시 미들웨어 초기화

        Args:
            app: ASGI 앱
            expire: 캐시 만료 시간(초)
            prefix: 캐시 키 접두사
            user_specific: 사용자별 캐싱 여부
            exclude_query_params: 캐시 키에서 제외할 쿼리 매개변수 목록
            exclude_headers: 캐시 키에서 제외할 헤더 목록
            exclude_paths: 캐싱에서 제외할 경로 패턴 목록
            include_paths: 캐싱에 포함할 경로 패턴 목록 (지정하면 이 목록에 포함된 경로만 캐싱)
        """
        super().__init__(app)
        self.expire = expire or config.api_cache_ttl
        self.prefix = prefix or config.api_cache_prefix
        self.user_specific = user_specific
        self.exclude_query_params = exclude_query_params or []
        self.exclude_headers = exclude_headers or []
        self.exclude_paths = exclude_paths or []
        self.include_paths = include_paths or []

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Any]
    ) -> StarletteResponse:
        """
        미들웨어 디스패치 메서드

        Args:
            request: HTTP 요청
            call_next: 다음 미들웨어 호출 함수

        Returns:
            HTTP 응답
        """
        if not config.enabled or not config.api_cache_enabled:
            return await call_next(request)

        # GET 요청만 캐싱
        if request.method != "GET":
            return await call_next(request)

        # 경로 필터링
        path = request.url.path

        # 제외 경로 확인
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)

        # 포함 경로 확인 (지정된 경우)
        if self.include_paths and not any(
            path.startswith(included) for included in self.include_paths
        ):
            return await call_next(request)

        # 캐시 키 생성
        namespace = None
        if self.user_specific:
            namespace = get_cache_namespace_for_user(request)

        cache_key = create_cache_key(
            request=request,
            prefix=self.prefix,
            namespace=namespace,
            exclude_query_params=self.exclude_query_params,
            exclude_headers=self.exclude_headers,
        )

        # 캐시에서 응답 가져오기
        cached_response = await cache.get(cache_key)

        if cached_response is not None:
            if config.debug:
                logger.debug(f"미들웨어 캐시 적중: {cache_key}")

            # 캐시된 응답 재구성
            content = cached_response.get("content")
            status_code = cached_response.get("status_code", 200)
            headers = cached_response.get("headers", {})

            # JSON 응답 또는 일반 응답 생성
            if headers.get("content-type") == "application/json":
                return JSONResponse(
                    content=content, status_code=status_code, headers=headers
                )
            else:
                return StarletteResponse(
                    content=content, status_code=status_code, headers=headers
                )

        # 캐시 미스
        if config.debug:
            logger.debug(f"미들웨어 캐시 미스: {cache_key}")

        # 원래 요청 처리
        response = await call_next(request)

        # 성공적인 응답만 캐싱 (200, 201, 203, 204)
        if response.status_code in (200, 201, 203, 204):
            try:
                # 응답 복사 (소비된 응답 스트림 재사용 불가)
                response_body = b""

                # 응답이 StreamingResponse인 경우 처리
                if hasattr(response, "body_iterator"):
                    chunks = []
                    async for chunk in response.body_iterator:
                        chunks.append(chunk)
                    response_body = b"".join(chunks)

                    # 새 응답 생성
                    headers_dict = dict(response.headers)
                    new_response = StarletteResponse(
                        content=response_body,
                        status_code=response.status_code,
                        headers=headers_dict,
                    )
                    response = new_response
                else:
                    response_body = response.body

                headers_dict = dict(response.headers)

                # 응답 내용이 JSON인지 확인
                if headers_dict.get("content-type") == "application/json":
                    content = json.loads(response_body)
                else:
                    content = (
                        response_body.decode()
                        if hasattr(response_body, "decode")
                        else response_body
                    )

                cached_data = {
                    "content": content,
                    "status_code": response.status_code,
                    "headers": headers_dict,
                }

                await cache.set(cache_key, cached_data, expire=self.expire)

                if config.debug:
                    logger.debug(
                        f"미들웨어 응답 캐싱 완료: {cache_key}, 만료: {self.expire}초"
                    )

            except Exception as e:
                logger.error(f"미들웨어 응답 캐싱 실패: {str(e)}")

        return response
