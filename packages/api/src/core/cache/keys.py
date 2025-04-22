"""
캐시 키 생성 및 관리 모듈

API 응답 및 함수 결과를 위한 캐시 키를 생성하고 관리하는 함수들을 제공합니다.
"""

import hashlib
import json
import logging
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from fastapi import Request

from packages.api.src.core.cacheutils import (
    extract_path_params,
    extract_query_params,
    get_client_ip,
    hash_dict,
    sanitize_cache_key,
)

logger = logging.getLogger(__name__)


def create_cache_key(
    request: Request,
    prefix: str = "api",
    user_id: Optional[str] = None,
    vary_headers: Optional[List[str]] = None,
) -> str:
    """
    API 요청에 대한 캐시 키를 생성합니다.

    Args:
        request: FastAPI 요청 객체
        prefix: 캐시 키 접두사 (기본값: "api")
        user_id: 사용자 ID (사용자별 캐싱을 위해 사용)
        vary_headers: 캐시 키에 포함할 헤더 목록

    Returns:
        생성된 캐시 키
    """
    # 기본 키 구성 요소
    path = request.url.path
    query_params = extract_query_params(request)
    path_params = extract_path_params(request)

    # 캐시 키 구성 요소를 딕셔너리로 수집
    key_parts = {"path": path, "query_params": query_params, "path_params": path_params}

    # 특정 헤더 포함
    if vary_headers:
        headers = {}
        for header in vary_headers:
            if header.lower() in request.headers:
                headers[header.lower()] = request.headers[header.lower()]
        if headers:
            key_parts["headers"] = headers

    # 해시 생성
    key_hash = hash_dict(key_parts)

    # 캐시 키 조합
    parts = [prefix]
    if user_id:
        parts.append(f"user:{user_id}")
    parts.append(key_hash)

    cache_key = ":".join(parts)
    return sanitize_cache_key(cache_key)


def create_function_cache_key(
    func: Callable,
    args: Tuple[Any, ...],
    kwargs: Dict[str, Any],
    prefix: str = "func",
    user_id: Optional[str] = None,
    key_builder: Optional[Callable] = None,
) -> str:
    """
    함수 호출에 대한 캐시 키를 생성합니다.

    Args:
        func: 캐싱할 함수
        args: 함수 위치 인자
        kwargs: 함수 키워드 인자
        prefix: 캐시 키 접두사 (기본값: "func")
        user_id: 사용자 ID (사용자별 캐싱을 위해 사용)
        key_builder: 사용자 정의 키 생성 함수

    Returns:
        생성된 캐시 키
    """
    # 사용자 정의 키 생성기 사용
    if key_builder:
        try:
            custom_key = key_builder(func, args, kwargs)
            if custom_key:
                return sanitize_cache_key(custom_key)
        except Exception as e:
            logger.error(f"사용자 정의 키 생성 실패: {str(e)}")

    # 기본 키 생성
    func_name = f"{func.__module__}.{func.__name__}"

    # 인자를 직렬화 가능한 형태로 변환
    serializable_args = []
    for arg in args:
        try:
            # 직렬화 테스트
            json.dumps(arg)
            serializable_args.append(arg)
        except (TypeError, ValueError):
            # 직렬화할 수 없는 경우 문자열 표현 사용
            serializable_args.append(str(arg))

    serializable_kwargs = {}
    for k, v in kwargs.items():
        try:
            # 직렬화 테스트
            json.dumps(v)
            serializable_kwargs[k] = v
        except (TypeError, ValueError):
            # 직렬화할 수 없는 경우 문자열 표현 사용
            serializable_kwargs[k] = str(v)

    # 전체 키 데이터 구성
    key_data = {
        "func": func_name,
        "args": serializable_args,
        "kwargs": serializable_kwargs,
    }

    # 해시 생성
    key_hash = hash_dict(key_data)

    # 캐시 키 조합
    parts = [prefix, func_name]
    if user_id:
        parts.append(f"user:{user_id}")
    parts.append(key_hash)

    cache_key = ":".join(parts)
    return sanitize_cache_key(cache_key)


def get_cache_namespace_for_user(user_id: str, prefix: str = "user") -> str:
    """
    사용자별 캐시 네임스페이스를 생성합니다.

    Args:
        user_id: 사용자 ID
        prefix: 네임스페이스 접두사 (기본값: "user")

    Returns:
        사용자 캐시 네임스페이스
    """
    return sanitize_cache_key(f"{prefix}:{user_id}")


def get_model_cache_key(
    model_name: str,
    model_id: Optional[Union[str, int]] = None,
    action: Optional[str] = None,
    prefix: str = "model",
) -> str:
    """
    모델 관련 캐시 키를 생성합니다.

    Args:
        model_name: 모델 이름 (예: user, post)
        model_id: 모델 ID (선택사항)
        action: 관련 작업 (예: list, detail)
        prefix: 캐시 키 접두사 (기본값: "model")

    Returns:
        생성된 캐시 키
    """
    parts = [prefix, model_name]

    if model_id is not None:
        parts.append(str(model_id))

    if action:
        parts.append(action)

    cache_key = ":".join(parts)
    return sanitize_cache_key(cache_key)


def invalidate_model_cache(
    model_name: str,
    model_id: Optional[Union[str, int]] = None,
    action: Optional[str] = None,
) -> List[str]:
    """
    모델 관련 캐시 무효화 패턴을 생성합니다.

    이 함수는 utils.generate_invalidation_patterns를 사용하여
    주어진 모델에 대한 캐시 무효화 패턴을 생성합니다.

    Args:
        model_name: 모델 이름 (예: user, post)
        model_id: 모델 ID (선택사항)
        action: 수행된 작업 (예: create, update, delete)

    Returns:
        무효화할 캐시 키 패턴 목록
    """
    from packages.api.src.core.cacheutils import generate_invalidation_patterns

    return generate_invalidation_patterns(model_name, model_id, action)
