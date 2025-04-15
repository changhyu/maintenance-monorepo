"""
캐시 키 생성 및 관리 유틸리티

API 요청 및 응답 캐싱을 위한 키 생성 함수 제공
"""
import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import Request
from pydantic import BaseModel


def create_cache_key(
    prefix: str,
    request: Request,
    vary_headers: Optional[List[str]] = None,
    include_query_params: bool = True,
    include_path_params: bool = True,
    namespace: Optional[str] = None,
) -> str:
    """
    API 요청에 대한 캐시 키 생성

    Args:
        prefix: 캐시 키 접두사
        request: FastAPI 요청 객체
        vary_headers: 캐시 키에 포함할 헤더 목록
        include_query_params: 쿼리 파라미터 포함 여부
        include_path_params: 경로 파라미터 포함 여부
        namespace: 캐시 키 네임스페이스(구분자)

    Returns:
        str: 생성된 캐시 키
    """
    # 기본 키 요소 설정
    key_parts = [prefix, request.method, request.url.path]

    # 네임스페이스 추가
    if namespace:
        key_parts.append(namespace)

    # 쿼리 파라미터 추가
    if include_query_params and request.query_params:
        # 쿼리 파라미터를 정렬하여 일관성 있는 키 생성
        sorted_params = sorted(request.query_params.items())
        query_string = "&".join(f"{k}={v}" for k, v in sorted_params)
        key_parts.append(query_string)

    # 경로 파라미터 추가
    if include_path_params and request.path_params:
        # 경로 파라미터를 정렬하여 일관성 있는 키 생성
        sorted_path_params = sorted(request.path_params.items())
        path_params_string = "&".join(f"{k}={v}" for k, v in sorted_path_params)
        key_parts.append(path_params_string)

    # 지정된 헤더 추가
    if vary_headers:
        for header in vary_headers:
            header_value = request.headers.get(header)
            if header_value:
                key_parts.append(f"{header}={header_value}")

    # 키 요소 결합 및 해시 생성
    key_string = ":".join(str(part) for part in key_parts)
    hashed_key = hashlib.md5(key_string.encode()).hexdigest()

    return f"api_cache:{hashed_key}"


def create_function_cache_key(
    func_name: str,
    args: Tuple,
    kwargs: Dict[str, Any],
    namespace: Optional[str] = None,
) -> str:
    """
    함수 호출에 대한 캐시 키 생성

    Args:
        func_name: 함수 이름
        args: 함수 인자
        kwargs: 함수 키워드 인자
        namespace: 캐시 키 네임스페이스(구분자)

    Returns:
        str: 생성된 캐시 키
    """
    # 기본 키 요소 설정
    key_parts = [func_name]

    # 네임스페이스 추가
    if namespace:
        key_parts.append(namespace)

    # 인자 변환 및 추가
    if args:
        args_str = json.dumps(args, sort_keys=True, default=_serialize_object)
        key_parts.append(args_str)

    # 키워드 인자 변환 및 추가
    if kwargs:
        # 키워드 인자를 정렬하여 일관성 있는 키 생성
        kwargs_str = json.dumps(kwargs, sort_keys=True, default=_serialize_object)
        key_parts.append(kwargs_str)

    # 키 요소 결합 및 해시 생성
    key_string = ":".join(str(part) for part in key_parts)
    hashed_key = hashlib.md5(key_string.encode()).hexdigest()

    return f"func_cache:{hashed_key}"


def create_model_cache_key(
    model_name: str,
    model_id: Union[str, int],
    version: Optional[str] = None,
    operation: Optional[str] = None,
    namespace: Optional[str] = None,
) -> str:
    """
    데이터 모델에 대한 캐시 키 생성

    Args:
        model_name: 모델 이름
        model_id: 모델 ID
        version: 모델 버전
        operation: 수행 작업(get, list 등)
        namespace: 캐시 키 네임스페이스(구분자)

    Returns:
        str: 생성된 캐시 키
    """
    # 기본 키 요소 설정
    key_parts = [model_name, str(model_id)]

    # 버전 추가
    if version:
        key_parts.append(f"v{version}")

    # 작업 추가
    if operation:
        key_parts.append(operation)

    # 네임스페이스 추가
    if namespace:
        key_parts.append(namespace)

    # 키 요소 결합
    return f"model_cache:{':'.join(key_parts)}"


def get_cache_namespace_for_user(user_id: Optional[Union[str, int]] = None) -> Optional[str]:
    """
    사용자별 캐시 네임스페이스 생성

    Args:
        user_id: 사용자 ID

    Returns:
        str: 사용자 캐시 네임스페이스 또는 None
    """
    if user_id is None:
        return None
    return f"user:{user_id}"


def get_invalidation_pattern(
    prefix: str,
    model_name: Optional[str] = None,
    model_id: Optional[Union[str, int]] = None,
) -> str:
    """
    캐시 무효화 패턴 생성

    Args:
        prefix: 캐시 접두사
        model_name: 모델 이름
        model_id: 모델 ID

    Returns:
        str: 무효화 패턴
    """
    if model_name and model_id:
        return f"{prefix}:{model_name}:{model_id}*"
    elif model_name:
        return f"{prefix}:{model_name}*"
    else:
        return f"{prefix}*"


def _serialize_object(obj: Any) -> Any:
    """
    객체를 JSON 직렬화 가능한 형태로 변환

    Args:
        obj: 변환할 객체

    Returns:
        변환된 값
    """
    if isinstance(obj, BaseModel):
        return obj.dict()
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    # UUID, datetime 등 기타 특수 객체 처리
    return str(obj) 