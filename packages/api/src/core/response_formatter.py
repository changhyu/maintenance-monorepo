"""
API 응답 포맷 유틸리티

표준화된 API 응답 형식을 제공하는 유틸리티 모듈입니다.
"""

import asyncio
import functools
import hashlib
import json
import time
from collections import OrderedDict
from datetime import datetime, timedelta
from threading import Lock
from typing import Any, Callable, Dict, Generic, List, Optional, Set, Tuple, TypeVar, Union, cast

from ..models.schemas import ApiResponse, Pagination, PaginatedResponse
from .config import settings
from fastapi import status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import traceback

from .logging import get_logger

logger = get_logger("response")

T = TypeVar('T')
U = TypeVar('U')

# 스레드 안전한 캐시 구현
class ThreadSafeCache:
    """스레드 안전한 응답 캐시 클래스"""
    
    def __init__(self, max_size: int = None, default_ttl: timedelta = None):
        """
        캐시 초기화
        
        Args:
            max_size: 최대 캐시 항목 수 (기본값: 설정에서 로드)
            default_ttl: 기본 캐시 유효 기간 (기본값: 설정에서 로드)
        """
        self._cache: OrderedDict[str, Tuple[Any, datetime]] = OrderedDict()
        self._lock = Lock()
        self._max_size = max_size or getattr(settings, 'RESPONSE_CACHE_SIZE', 100)
        self._default_ttl = default_ttl or timedelta(
            seconds=getattr(settings, 'RESPONSE_CACHE_TTL_SECONDS', 300)
        )
    
    def get(self, key: str) -> Optional[Any]:
        """
        캐시에서 값 조회
        
        Args:
            key: 캐시 키
            
        Returns:
            캐시된 값 또는 None
        """
        with self._lock:
            if key not in self._cache:
                return None
            
            value, expiry = self._cache[key]
            
            # 만료된 항목 제거
            if expiry < datetime.utcnow():
                del self._cache[key]
                return None
            
            # LRU 업데이트: 해당 항목을 맨 뒤로 이동
            self._cache.move_to_end(key)
            
            return value
    
    def set(self, key: str, value: Any, ttl: Optional[timedelta] = None) -> None:
        """
        캐시에 값 저장
        
        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 유효 기간 (기본값: 기본 TTL 사용)
        """
        expiry = datetime.utcnow() + (ttl or self._default_ttl)
        
        with self._lock:
            # 이미 있는 키면 업데이트
            if key in self._cache:
                self._cache[key] = (value, expiry)
                self._cache.move_to_end(key)
                return
            
            # 최대 크기 초과 시 가장 오래된 항목 제거
            if len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)
            
            # 새 항목 추가
            self._cache[key] = (value, expiry)
    
    def delete(self, key: str) -> bool:
        """
        캐시에서 항목 삭제
        
        Args:
            key: 캐시 키
            
        Returns:
            삭제 성공 여부
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> int:
        """
        캐시 전체 비우기
        
        Returns:
            삭제된 항목 수
        """
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            return count
    
    def get_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보 반환
        
        Returns:
            통계 정보 딕셔너리
        """
        with self._lock:
            now = datetime.utcnow()
            expired = sum(1 for _, expiry in self._cache.values() if expiry < now)
            
            return {
                "total_items": len(self._cache),
                "expired_items": expired,
                "active_items": len(self._cache) - expired,
                "max_size": self._max_size,
                "default_ttl_seconds": self._default_ttl.total_seconds(),
            }

# 전역 캐시 인스턴스 생성
response_cache = ThreadSafeCache()

class ApiResponseMetadata(BaseModel):
    """API 응답 메타데이터 모델"""
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    pagination: Optional[Dict[str, Any]] = None
    execution_time: Optional[float] = None
    debug_info: Optional[Dict[str, Any]] = None

class ApiResponse(BaseModel, Generic[T]):
    """표준 API 응답 형식"""
    
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    errors: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[ApiResponseMetadata] = None
    code: Optional[str] = None

    @classmethod
    def success(
        cls, 
        data: Optional[T] = None, 
        message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_200_OK
    ) -> JSONResponse:
        """
        성공 응답 생성
        
        Args:
            data: 응답 데이터
            message: 성공 메시지
            metadata: 메타데이터
            status_code: HTTP 상태 코드
            
        Returns:
            JSONResponse: 표준화된 JSONResponse
        """
        response_metadata = ApiResponseMetadata()
        if metadata:
            if "pagination" in metadata:
                response_metadata.pagination = metadata.pop("pagination")
            if "request_id" in metadata:
                response_metadata.request_id = metadata.pop("request_id")
            if "execution_time" in metadata:
                response_metadata.execution_time = metadata.pop("execution_time")
        
        response = cls(
            success=True,
            data=data,
            message=message,
            metadata=response_metadata
        )
        
        return JSONResponse(
            status_code=status_code,
            content=response.dict(exclude_none=True)
        )
    
    @classmethod
    def error(
        cls,
        message: str,
        errors: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: Optional[str] = None,
        exception: Optional[Exception] = None,
        log_traceback: bool = True
    ) -> JSONResponse:
        """
        오류 응답 생성
        
        Args:
            message: 오류 메시지
            errors: 상세 오류 목록
            metadata: 메타데이터
            status_code: HTTP 상태 코드
            error_code: 오류 코드
            exception: 예외 객체
            log_traceback: 스택트레이스 로깅 여부
            
        Returns:
            JSONResponse: 표준화된 오류 JSONResponse
        """
        response_metadata = ApiResponseMetadata()
        if metadata:
            if "request_id" in metadata:
                response_metadata.request_id = metadata.pop("request_id")
        
        # 예외 처리
        if exception and log_traceback:
            logger.error(f"API 오류 응답: {message}", exc_info=exception)
            
            # 디버그 정보 추가 (프로덕션에서는 출력되지 않음)
            if settings.DEBUG:
                response_metadata.debug_info = {
                    "exception_type": type(exception).__name__,
                    "exception_msg": str(exception),
                    "traceback": traceback.format_exc()
                }
        
        response = cls(
            success=False,
            message=message,
            errors=errors,
            metadata=response_metadata,
            code=error_code
        )
        
        return JSONResponse(
            status_code=status_code,
            content=response.dict(exclude_none=True)
        )
    
    @classmethod
    def from_exception(
        cls,
        exception: Exception,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> JSONResponse:
        """
        예외로부터 오류 응답 생성
        
        Args:
            exception: 예외 객체
            status_code: HTTP 상태 코드
            error_code: 오류 코드
            metadata: 메타데이터
            
        Returns:
            JSONResponse: 표준화된 오류 JSONResponse
        """
        message = str(exception)
        
        # 상세 오류 정보 추출
        errors = None
        if hasattr(exception, 'errors') and callable(getattr(exception, 'errors', None)):
            try:
                errors = exception.errors()
            except:
                pass
        
        return cls.error(
            message=message,
            errors=errors,
            metadata=metadata,
            status_code=status_code,
            error_code=error_code,
            exception=exception
        )
    
    @classmethod
    def pagination(
        cls,
        items: List[T],
        total: int,
        page: int = 1,
        page_size: int = 10,
        message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> JSONResponse:
        """
        페이지네이션 응답 생성
        
        Args:
            items: 페이지 항목 목록
            total: 전체 항목 수
            page: 현재 페이지 번호
            page_size: 페이지당 항목 수
            message: 응답 메시지
            metadata: 추가 메타데이터
            
        Returns:
            JSONResponse: 표준화된 페이지네이션 JSONResponse
        """
        # 페이지네이션 메타데이터 계산
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        
        pagination_metadata = {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
        
        # 기존 메타데이터가 없으면 생성
        response_metadata = metadata or {}
        
        # 페이지네이션 정보 추가
        response_metadata["pagination"] = pagination_metadata
        
        return cls.success(
            data=items,
            message=message,
            metadata=response_metadata
        )
    
    @classmethod
    def no_content(cls) -> JSONResponse:
        """
        204 No Content 응답 생성
        
        Returns:
            JSONResponse: 204 상태 코드와 빈 본문의 응답
        """
        return JSONResponse(
            status_code=status.HTTP_204_NO_CONTENT,
            content=None
        )
    
    @classmethod
    def unauthorized(
        cls,
        message: str = "인증이 필요합니다.",
        error_code: str = "unauthorized",
    ) -> JSONResponse:
        """
        401 Unauthorized 응답 생성
        
        Args:
            message: 오류 메시지
            error_code: 오류 코드
            
        Returns:
            JSONResponse: 401 오류 응답
        """
        return cls.error(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code
        )
    
    @classmethod
    def forbidden(
        cls,
        message: str = "접근 권한이 없습니다.",
        error_code: str = "forbidden",
    ) -> JSONResponse:
        """
        403 Forbidden 응답 생성
        
        Args:
            message: 오류 메시지
            error_code: 오류 코드
            
        Returns:
            JSONResponse: 403 오류 응답
        """
        return cls.error(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code
        )
    
    @classmethod
    def not_found(
        cls,
        message: str = "요청한 리소스를 찾을 수 없습니다.",
        error_code: str = "not_found",
    ) -> JSONResponse:
        """
        404 Not Found 응답 생성
        
        Args:
            message: 오류 메시지
            error_code: 오류 코드
            
        Returns:
            JSONResponse: 404 오류 응답
        """
        return cls.error(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code
        )
    
    @classmethod
    def validation_error(
        cls,
        errors: List[Dict[str, Any]],
        message: str = "요청 데이터 검증 실패",
        error_code: str = "validation_error",
    ) -> JSONResponse:
        """
        422 Validation Error 응답 생성
        
        Args:
            errors: 검증 오류 목록
            message: 오류 메시지
            error_code: 오류 코드
            
        Returns:
            JSONResponse: 422 오류 응답
        """
        return cls.error(
            message=message,
            errors=errors,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=error_code
        )
    
    @classmethod
    def server_error(
        cls,
        message: str = "서버 내부 오류가 발생했습니다.",
        exception: Optional[Exception] = None,
        error_code: str = "server_error",
    ) -> JSONResponse:
        """
        500 Server Error 응답 생성
        
        Args:
            message: 오류 메시지
            exception: 예외 객체
            error_code: 오류 코드
            
        Returns:
            JSONResponse: 500 오류 응답
        """
        return cls.error(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=error_code,
            exception=exception,
            log_traceback=True
        )

# 전역 응답 포매터
response_formatter = ApiResponse

async def api_response(
    data: Optional[T] = None, 
    meta: Optional[Dict[str, Any]] = None, 
    status_code: int = 200,
    error: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    cookies: Optional[Dict[str, str]] = None
) -> ApiResponse[T]:
    """
    API 응답을 표준화된 형식으로 변환합니다.
    
    Args:
        data: 응답 데이터
        meta: 메타데이터 (페이지네이션 등)
        status_code: HTTP 상태 코드
        error: 오류 메시지
        headers: 응답 헤더 (메타데이터로 추가됨)
        cookies: 응답 쿠키 (메타데이터로 추가됨)
    
    Returns:
        표준화된 API 응답
    """
    success = 200 <= status_code < 300 and error is None
    
    # 메타데이터 통합
    metadata = meta or {}
    
    # 응답 헤더와 쿠키를 메타데이터에 포함
    if headers:
        metadata["headers"] = headers
    
    if cookies:
        metadata["cookies"] = cookies
    
    # 성능 측정 데이터가 있으면 포함
    if hasattr(ApiResponse, "_performance_data"):
        metadata["performance"] = getattr(ApiResponse, "_performance_data")
    
    # 디버그 모드가 아닌 경우 민감한 정보 필터링
    if not settings.DEBUG and 'error' in metadata and isinstance(metadata['error'], dict):
        _filter_sensitive_data(metadata['error'])
    
    # ApiResponse 클래스 사용
    return ApiResponse[T](
        success=success,
        data=data,
        error=error,
        metadata=metadata,
        timestamp=datetime.utcnow()
    )

def _filter_sensitive_data(data: Dict[str, Any]) -> None:
    """민감한 정보를 필터링하는 재귀적 함수"""
    sensitive_keys = ['password', 'token', 'secret', 'key', 'auth', 'credential']
    
    if not isinstance(data, dict):
        return
    
    for key in list(data.keys()):
        if isinstance(data[key], dict):
            _filter_sensitive_data(data[key])
        elif isinstance(data[key], list):
            for item in data[key]:
                if isinstance(item, dict):
                    _filter_sensitive_data(item)
        else:
            # 민감한 키 필터링
            lower_key = key.lower()
            if any(sensitive in lower_key for sensitive in sensitive_keys):
                data[key] = '[REDACTED]'

async def paginated_response(
    items: List[T],
    total: int,
    page: int = 1,
    limit: int = 100,
    additional_meta: Optional[Dict[str, Any]] = None,
    calculate_stats: bool = False,
    stats_function: Optional[Callable[[List[T]], Dict[str, Any]]] = None
) -> ApiResponse[List[T]]:
    """
    페이지네이션된 응답을 생성합니다.
    
    Args:
        items: 페이지네이션된 항목 목록
        total: 전체 항목 수
        page: 현재 페이지 번호
        limit: 페이지당 항목 수
        additional_meta: 추가 메타데이터
        calculate_stats: 응답에 통계 정보 포함 여부
        stats_function: 통계 계산을 위한 함수
        
    Returns:
        페이지네이션 정보가 포함된 API 응답
    """
    # 방어적 프로그래밍: 입력값 검증
    page = max(1, page)  # 1 이상
    limit = max(1, min(limit, getattr(settings, 'MAX_PAGE_SIZE', 1000)))  # 1~MAX_PAGE_SIZE 사이
    total = max(0, total)  # 0 이상
    
    offset = (page - 1) * limit
    total_pages = max(1, (total + limit - 1) // limit) if limit > 0 else 1
    
    # 페이지네이션 정보 생성
    pagination = Pagination(
        total=total,
        offset=offset,
        limit=limit,
        has_more=page < total_pages
    )
    
    # 메타데이터 구성
    meta = additional_meta or {}
    meta["pagination"] = {
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "total": total,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
    
    # 통계 정보 계산 (요청 시)
    if calculate_stats and stats_function:
        try:
            meta["stats"] = stats_function(items)
        except Exception as e:
            meta["stats_error"] = str(e)
    
    # 직접 ApiResponse 생성
    return await api_response(
        data=items,
        meta=meta
    )

async def success_response(
    message: str,
    data: Optional[T] = None,
    meta: Optional[Dict[str, Any]] = None
) -> ApiResponse[T]:
    """
    성공 메시지가 포함된 응답을 생성합니다.
    
    Args:
        message: 성공 메시지
        data: 응답 데이터
        meta: 메타데이터
        
    Returns:
        성공 응답
    """
    meta_with_message = meta or {}
    meta_with_message["message"] = message
    
    return await api_response(
        data=data,
        meta=meta_with_message,
        status_code=200
    )

async def created_response(
    data: T,
    resource_id: str,
    resource_type: str,
    location: Optional[str] = None
) -> ApiResponse[T]:
    """
    리소스 생성 응답을 생성합니다.
    
    Args:
        data: 생성된 리소스 데이터
        resource_id: 생성된 리소스 ID
        resource_type: 리소스 유형
        location: 리소스 위치(URL)
        
    Returns:
        생성 성공 응답
    """
    meta = {
        "resource": {
            "id": resource_id,
            "type": resource_type
        }
    }
    
    if location:
        meta["resource"]["location"] = location
        meta["headers"] = {"Location": location}
    
    return await api_response(
        data=data,
        meta=meta,
        status_code=201
    )

async def no_content_response() -> ApiResponse[None]:
    """
    콘텐츠 없음(204) 응답을 생성합니다.
    
    Returns:
        콘텐츠 없음 응답
    """
    return await api_response(
        data=None,
        status_code=204
    )

def generate_etag(data: Any) -> str:
    """
    데이터에 대한 ETag를 생성합니다.
    
    Args:
        data: ETag를 생성할 데이터
        
    Returns:
        ETag 문자열
    """
    if not data:
        return ""
    
    try:
        # 직렬화하여 해시 생성
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(json_str.encode()).hexdigest()
    except Exception:
        # 직렬화할 수 없는 데이터의 경우 문자열로 변환
        return hashlib.md5(str(data).encode()).hexdigest()

def cached_response(ttl: Optional[timedelta] = None):
    """
    응답 결과를 캐싱하는 데코레이터
    
    Args:
        ttl: 캐시 유효 시간(None인 경우 기본값 사용)
        
    Returns:
        캐싱 데코레이터
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = _generate_cache_key(func, args, kwargs)
            
            # 캐시에서 찾기
            cached_result = response_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
                
            # 함수 실행 및 결과 캐싱
            result = await func(*args, **kwargs)
            
            # 캐시 저장
            response_cache.set(cache_key, result, ttl)
            
            return result
            
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = _generate_cache_key(func, args, kwargs)
            
            # 캐시에서 찾기
            cached_result = response_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
                
            # 함수 실행 및 결과 캐싱
            result = func(*args, **kwargs)
            
            # 캐시 저장
            response_cache.set(cache_key, result, ttl)
            
            return result
            
        # 함수가 비동기인지 동기인지 확인하여 적절한 래퍼 반환
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
        
    return decorator

def _generate_cache_key(func: Callable, args: tuple, kwargs: dict) -> str:
    """
    캐시 키 생성 함수
    
    Args:
        func: 대상 함수
        args: 위치 인자
        kwargs: 키워드 인자
        
    Returns:
        캐시 키
    """
    key_parts = [func.__module__, func.__name__]
    
    # 위치 인자 처리 (기본 타입만)
    for arg in args:
        if isinstance(arg, (str, int, float, bool, type(None))):
            key_parts.append(str(arg))
        elif hasattr(arg, 'id'):  # ID 속성 있는 객체
            key_parts.append(f"id:{arg.id}")
        else:
            key_parts.append(f"type:{type(arg).__name__}")
    
    # 키워드 인자 처리 (정렬하여 순서 일관성 유지)
    sorted_kwargs = sorted(kwargs.items())
    for key, value in sorted_kwargs:
        if isinstance(value, (str, int, float, bool, type(None))):
            key_parts.append(f"{key}:{value}")
        elif hasattr(value, 'id'):  # ID 속성 있는 객체 
            key_parts.append(f"{key}:id:{value.id}")
        else:
            key_parts.append(f"{key}:type:{type(value).__name__}")
    
    # 문자열 조합 후 해시 생성
    combined = ":".join(key_parts)
    return hashlib.md5(combined.encode()).hexdigest()

def with_performance_tracking():
    """
    성능 측정 데코레이터
    
    함수 실행 시간을 측정하여 응답 메타데이터에 포함합니다.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # 성능 데이터 설정
            perf_data = {
                "execution_time_ms": round(execution_time * 1000, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # 응답 클래스에 성능 데이터 첨부
            setattr(ApiResponse, "_performance_data", perf_data)
            
            return result
            
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # 성능 데이터 설정
            perf_data = {
                "execution_time_ms": round(execution_time * 1000, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # 응답 클래스에 성능 데이터 첨부
            setattr(ApiResponse, "_performance_data", perf_data)
            
            return result
            
        # 함수가 비동기인지 동기인지 확인하여 적절한 래퍼 반환
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
        
    return decorator

def clear_response_cache() -> int:
    """
    응답 캐시를 모두 지웁니다.
    
    Returns:
        지워진 캐시 항목 수
    """
    return response_cache.clear()

def get_cache_stats() -> Dict[str, Any]:
    """
    캐시 통계 정보를 반환합니다.
    
    Returns:
        캐시 통계 정보
    """
    return response_cache.get_stats() 