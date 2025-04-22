"""
캐시 유틸리티 모듈

캐시 작업에 사용되는 유틸리티 함수를 제공합니다.
"""

import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import Request

logger = logging.getLogger(__name__)


def sanitize_cache_key(key: str) -> str:
    """
    캐시 키를 안전한 형식으로 변환합니다.

    특수 문자와 공백을 제거하고 최대 길이를 제한합니다.

    Args:
        key: 변환할 캐시 키

    Returns:
        안전한 형식의 캐시 키
    """
    # 허용되지 않는 문자 제거
    sanitized_key = re.sub(r"[^a-zA-Z0-9_\-\.:]+", "_", key)

    # 최대 길이 제한 (Redis 등에서 권장하는 길이)
    max_length = 200
    if len(sanitized_key) > max_length:
        # 해시를 사용하여 길이를 줄임
        hash_part = hashlib.md5(key.encode()).hexdigest()[:8]
        prefix_length = max_length - 9  # 해시 길이 + 구분자
        sanitized_key = f"{sanitized_key[:prefix_length]}_{hash_part}"

    return sanitized_key


def serialize_for_cache(data: Any) -> bytes:
    """
    데이터를 캐시에 저장하기 위해 직렬화합니다.

    Args:
        data: 직렬화할 데이터

    Returns:
        직렬화된 데이터
    """
    try:
        serialized = json.dumps(data)
        return serialized.encode("utf-8")
    except (TypeError, ValueError) as e:
        logger.error(f"캐시 데이터 직렬화 실패: {str(e)}")
        # 직렬화할 수 없는 객체의 경우 문자열로 변환 시도
        try:
            serialized = json.dumps(str(data))
            return serialized.encode("utf-8")
        except Exception:
            logger.exception("캐시 데이터 문자열 변환 후 직렬화도 실패")
            return b"{}"


def deserialize_from_cache(data: bytes) -> Any:
    """
    캐시에서 가져온 데이터를 역직렬화합니다.

    Args:
        data: 역직렬화할 데이터

    Returns:
        역직렬화된 데이터
    """
    if data is None:
        return None

    try:
        return json.loads(data.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        logger.error(f"캐시 데이터 역직렬화 실패: {str(e)}")
        return None


def get_client_ip(request: Request) -> str:
    """
    요청의 클라이언트 IP 주소를 가져옵니다.

    Args:
        request: FastAPI 요청 객체

    Returns:
        클라이언트 IP 주소
    """
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0].strip()
    elif hasattr(request, "client") and request.client:
        return request.client.host
    return "unknown"


def extract_path_params(request: Request) -> Dict[str, str]:
    """
    요청에서 경로 매개변수를 추출합니다.

    Args:
        request: FastAPI 요청 객체

    Returns:
        경로 매개변수 딕셔너리
    """
    return dict(request.path_params) if request.path_params else {}


def extract_query_params(request: Request) -> Dict[str, str]:
    """
    요청에서 쿼리 매개변수를 추출합니다.

    Args:
        request: FastAPI 요청 객체

    Returns:
        쿼리 매개변수 딕셔너리
    """
    result = {}
    for key, value in request.query_params.items():
        result[key] = value
    return result


def hash_dict(data: Dict[str, Any]) -> str:
    """
    딕셔너리를 일관된 방식으로 해시합니다.

    정렬된 키와 값을 사용하여 일관된 해시를 생성합니다.

    Args:
        data: 해시할 딕셔너리

    Returns:
        해시된 문자열
    """
    # 키를 정렬하고 각 키-값 쌍을 문자열로 변환
    sorted_items = []
    for key in sorted(data.keys()):
        value = data[key]
        # 중첩된 딕셔너리도 정렬
        if isinstance(value, dict):
            value = hash_dict(value)
        # 리스트도 정렬
        elif isinstance(value, list):
            value = json.dumps(sorted(str(v) for v in value))
        sorted_items.append(f"{key}:{value}")

    # 결합하여 해시
    concat = ":".join(sorted_items)
    return hashlib.sha256(concat.encode("utf-8")).hexdigest()


def generate_invalidation_patterns(
    model_name: str,
    model_id: Optional[Union[str, int]] = None,
    action: Optional[str] = None,
) -> List[str]:
    """
    모델 관련 캐시 무효화 패턴을 생성합니다.

    Args:
        model_name: 모델 이름 (예: user, post)
        model_id: 모델 ID (선택사항)
        action: 수행된 작업 (예: create, update, delete)

    Returns:
        무효화 패턴 목록
    """
    patterns = []

    # 기본 패턴
    base_pattern = f"*{model_name}*"
    patterns.append(base_pattern)

    # ID 지정된 경우 ID 기반 패턴 추가
    if model_id is not None:
        id_pattern = f"*{model_name}*{model_id}*"
        patterns.append(id_pattern)

    # 작업 지정된 경우 작업별 패턴 추가
    if action:
        action_pattern = f"*{model_name}*{action}*"
        patterns.append(action_pattern)

        # ID와 작업 모두 지정된 경우 조합 패턴 추가
        if model_id is not None:
            combined_pattern = f"*{model_name}*{model_id}*{action}*"
            patterns.append(combined_pattern)

    return patterns
