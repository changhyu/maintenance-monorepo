"""
캐시 데코레이터 모듈

API 응답 및 함수 결과를 캐싱하기 위한 데코레이터를 제공합니다.
"""
import functools
import inspect
import logging
from typing import Any, Callable, Dict, List, Optional, Type, Union

from fastapi import Depends, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .manager import CacheManager
from .interfaces import CacheInterface
from .key_builder import KeyBuilder

logger = logging.getLogger(__name__)


def cache_response(
    expire: int = 60,
    prefix: str = "api",
    vary_headers: Optional[List[str]] = None,
    include_query_params: bool = True,
    include_path_params: bool = True,
    user_specific: bool = False,
    skip_cache_func: Optional[Callable[[Request], bool]] = None,
):
    """
    API 응답을 캐싱하는 엔드포인트 데코레이터
    
    Args:
        expire: 캐시 만료 시간(초)
        prefix: 캐시 키 접두사
        vary_headers: 캐시 키에 포함할 헤더 목록
        include_query_params: 쿼리 파라미터 포함 여부
        include_path_params: 경로 파라미터 포함 여부
        user_specific: 사용자별 캐싱 여부
        skip_cache_func: 캐시 건너뛰기 판단 함수
        
    Returns:
        데코레이터 함수
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # FastAPI 엔드포인트 함수의 매개변수에서 Request 객체 찾기
            request = None
            user_id = None

            # 인자와 키워드 인자에서 Request 객체 찾기
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request is None:
                for key, value in kwargs.items():
                    if isinstance(value, Request):
                        request = value
                        break

            # Request 객체가 없으면 캐싱 없이 원래 함수 실행
            if request is None:
                logger.warning("Request 객체를 찾을 수 없어 캐싱을 건너뜁니다")
                return await func(*args, **kwargs)

            # 캐시 매니저 인스턴스 가져오기
            cache_manager = CacheManager()

            # 캐시 건너뛰기 조건 확인
            if skip_cache_func and skip_cache_func(request):
                logger.debug("skip_cache_func에 의해 캐싱을 건너뜁니다")
                return await func(*args, **kwargs)

            # 사용자별 캐싱 처리
            namespace = None
            if user_specific:
                # 요청에서 사용자 ID 추출 (인증 시스템에 맞게 수정 필요)
                user_id = getattr(request.state, "user_id", None)
                if user_id:
                    namespace = f"user:{user_id}"

            # 캐시 키 생성
            key_builder = KeyBuilder(prefix)
            
            # 기본 요청 요소 추가
            key_builder.add("method", request.method)
            key_builder.add("path", request.url.path)
            
            # 네임스페이스 추가
            if namespace:
                key_builder.add("namespace", namespace)
                
            # 쿼리 파라미터 추가
            if include_query_params and request.query_params:
                for k, v in sorted(request.query_params.items()):
                    key_builder.add(f"query_{k}", v)
                    
            # 경로 파라미터 추가
            if include_path_params and request.path_params:
                for k, v in sorted(request.path_params.items()):
                    key_builder.add(f"path_{k}", v)
                    
            # 헤더 추가
            if vary_headers:
                for header in vary_headers:
                    header_value = request.headers.get(header)
                    if header_value:
                        key_builder.add(f"header_{header}", header_value)
                        
            cache_key = key_builder.build()

            # 캐시에서 응답 확인
            cached_response = await cache_manager.get(cache_key)
            if cached_response:
                logger.debug(f"캐시된 응답을 반환합니다: {cache_key}")
                response = Response(
                    content=cached_response.get("content"),
                    status_code=cached_response.get("status_code", 200),
                    headers=cached_response.get("headers", {}),
                    media_type=cached_response.get("media_type"),
                )
                return response

            # 캐시된 응답이 없으면 원래 함수 실행
            response = await func(*args, **kwargs)

            # 응답 캐싱
            if hasattr(response, "body"):
                cache_data = {
                    "content": response.body,
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "media_type": response.media_type,
                }
                await cache_manager.set(cache_key, cache_data, expire)
                logger.debug(f"응답을 캐시에 저장했습니다: {cache_key}")

            return response

        return wrapper

    return decorator


def cache_function(
    expire: int = 60,
    prefix: str = "func",
    user_specific: bool = False,
    key_builder: Optional[Callable] = None,
):
    """
    함수 결과를 캐싱하는 데코레이터
    
    Args:
        expire: 캐시 만료 시간(초)
        prefix: 캐시 키 접두사
        user_specific: 사용자별 캐싱 여부
        key_builder: 사용자 정의 캐시 키 생성 함수
        
    Returns:
        데코레이터 함수
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # 캐시 매니저 인스턴스 가져오기
            cache_manager = CacheManager()

            # 사용자별 캐싱 네임스페이스 처리
            namespace = None
            if user_specific:
                # 요청 컨텍스트에서 사용자 ID 추출 (실제 구현에 맞게 수정 필요)
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

                if request is None:
                    for key, value in kwargs.items():
                        if isinstance(value, Request):
                            request = value
                            break

                user_id = getattr(request, "user_id", None) if request else None
                if user_id:
                    namespace = f"user:{user_id}"

            # 캐시 키 생성
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # 기본 키 생성
                builder = KeyBuilder(prefix)
                func_name = f"{func.__module__}.{func.__qualname__}"
                builder.add("func", func_name)
                
                if namespace:
                    builder.add("namespace", namespace)
                    
                # 인자 추가
                for i, arg in enumerate(args):
                    builder.add(f"arg_{i}", arg)
                    
                # 키워드 인자 추가
                for k, v in sorted(kwargs.items()):
                    builder.add(f"kwarg_{k}", v)
                    
                cache_key = builder.build()

            # 캐시에서 결과 확인
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"캐시된 함수 결과를 반환합니다: {cache_key}")
                return cached_result

            # 캐시된 결과가 없으면 원래 함수 실행
            result = await func(*args, **kwargs)

            # 결과 캐싱
            await cache_manager.set(cache_key, result, expire)
            logger.debug(f"함수 결과를 캐시에 저장했습니다: {cache_key}")

            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 캐시 매니저 인스턴스 가져오기
            cache_manager = CacheManager()

            # 사용자별 캐싱 네임스페이스 처리
            namespace = None
            if user_specific:
                # 요청 컨텍스트에서 사용자 ID 추출 (실제 구현에 맞게 수정 필요)
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

                if request is None:
                    for key, value in kwargs.items():
                        if isinstance(value, Request):
                            request = value
                            break

                user_id = getattr(request, "user_id", None) if request else None
                if user_id:
                    namespace = f"user:{user_id}"

            # 캐시 키 생성
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # 기본 키 생성
                builder = KeyBuilder(prefix)
                func_name = f"{func.__module__}.{func.__qualname__}"
                builder.add("func", func_name)
                
                if namespace:
                    builder.add("namespace", namespace)
                    
                # 인자 추가
                for i, arg in enumerate(args):
                    builder.add(f"arg_{i}", arg)
                    
                # 키워드 인자 추가
                for k, v in sorted(kwargs.items()):
                    builder.add(f"kwarg_{k}", v)
                    
                cache_key = builder.build()

            # 캐시에서 결과 확인
            cached_result = cache_manager.get_sync(cache_key)
            if cached_result is not None:
                logger.debug(f"캐시된 함수 결과를 반환합니다: {cache_key}")
                return cached_result

            # 캐시된 결과가 없으면 원래 함수 실행
            result = func(*args, **kwargs)

            # 결과 캐싱
            cache_manager.set_sync(cache_key, result, expire)
            logger.debug(f"함수 결과를 캐시에 저장했습니다: {cache_key}")

            return result

        # 비동기 함수인지 확인하여 적절한 래퍼 반환
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


class CacheMiddleware(BaseHTTPMiddleware):
    """
    API 응답 캐싱을 위한 미들웨어
    
    전체 API 응답을 자동으로 캐싱하는 미들웨어
    개별 엔드포인트에 데코레이터를 적용하는 대신 사용 가능
    """
    
    def __init__(
        self,
        app: ASGIApp,
        expire: int = 60,
        prefix: str = "api",
        vary_headers: Optional[List[str]] = None,
        include_query_params: bool = True,
        include_path_params: bool = True,
        cacheable_status_codes: List[int] = None,
        exclude_paths: List[str] = None,
        cache_manager: Optional[CacheInterface] = None,
    ):
        """
        미들웨어 초기화
        
        Args:
            app: ASGI 앱
            expire: 캐시 만료 시간(초)
            prefix: 캐시 키 접두사
            vary_headers: 캐시 키에 포함할 헤더 목록
            include_query_params: 쿼리 파라미터 포함 여부
            include_path_params: 경로 파라미터 포함 여부
            cacheable_status_codes: 캐싱할 상태 코드 목록
            exclude_paths: 캐싱에서 제외할 경로 목록
            cache_manager: 사용할 캐시 매니저 인스턴스
        """
        super().__init__(app)
        self.expire = expire
        self.prefix = prefix
        self.vary_headers = vary_headers or []
        self.include_query_params = include_query_params
        self.include_path_params = include_path_params
        self.cacheable_status_codes = cacheable_status_codes or [200, 201, 204]
        self.exclude_paths = exclude_paths or []
        self.cache_manager = cache_manager or CacheManager()
        
    async def dispatch(self, request: Request, call_next):
        """
        요청 처리 및 응답 캐싱
        
        Args:
            request: 요청 객체
            call_next: 다음 미들웨어 호출 함수
            
        Returns:
            응답
        """
        # GET 요청만 캐싱
        if request.method != "GET":
            return await call_next(request)
            
        # 제외 경로 확인
        for path in self.exclude_paths:
            if request.url.path.startswith(path):
                return await call_next(request)
                
        # 캐시 키 생성
        key_builder = KeyBuilder(self.prefix)
        
        # 기본 요청 요소 추가
        key_builder.add("method", request.method)
        key_builder.add("path", request.url.path)
        
        # 쿼리 파라미터 추가
        if self.include_query_params and request.query_params:
            for k, v in sorted(request.query_params.items()):
                key_builder.add(f"query_{k}", v)
                
        # 경로 파라미터 추가
        if self.include_path_params and request.path_params:
            for k, v in sorted(request.path_params.items()):
                key_builder.add(f"path_{k}", v)
                
        # 헤더 추가
        if self.vary_headers:
            for header in self.vary_headers:
                header_value = request.headers.get(header)
                if header_value:
                    key_builder.add(f"header_{header}", header_value)
                    
        cache_key = key_builder.build()
        
        # 캐시에서 응답 확인
        cached_response = await self.cache_manager.get(cache_key)
        if cached_response:
            logger.debug(f"미들웨어: 캐시된 응답을 반환합니다: {cache_key}")
            return Response(
                content=cached_response.get("content"),
                status_code=cached_response.get("status_code", 200),
                headers=cached_response.get("headers", {}),
                media_type=cached_response.get("media_type"),
            )
            
        # 캐시된 응답이 없으면 요청 계속 처리
        response = await call_next(request)
        
        # 응답 캐싱 (상태 코드가 캐싱 가능한 경우)
        if response.status_code in self.cacheable_status_codes:
            # 응답 내용 복사
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk
                
            # 응답 재구성
            cache_data = {
                "content": response_body,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "media_type": response.media_type,
            }
            await self.cache_manager.set(cache_key, cache_data, self.expire)
            logger.debug(f"미들웨어: 응답을 캐시에 저장했습니다: {cache_key}")
            
            # 원본 응답 대신 새 응답 반환
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )
            
        return response
