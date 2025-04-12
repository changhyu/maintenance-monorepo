"""
유틸리티 함수 모듈.
"""

import hashlib
import json
import re
from typing import Any, Dict, Optional, List
from fastapi import Response

def get_etag(data: Any) -> str:
    """
    데이터로부터 ETag 생성
    
    Args:
        data: ETag를 생성할 데이터
        
    Returns:
        ETag 문자열
    """
    if not data:
        return ""
    
    # 객체를 JSON으로 직렬화 후 해시 생성
    try:
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(json_str.encode()).hexdigest()
    except Exception:
        # 직렬화 불가능한 데이터는 문자열 표현 사용
        return hashlib.md5(str(data).encode()).hexdigest()

def check_etag(response: Response, etag: str) -> bool:
    """
    클라이언트 if-none-match 헤더와 ETag 비교
    
    Args:
        response: FastAPI Response 객체
        etag: 서버에서 생성한 ETag
        
    Returns:
        ETag가 일치하는지 여부
    """
    if not hasattr(response, "request") or not response.request:
        return False
    
    # 클라이언트의 If-None-Match 헤더 가져오기
    if_none_match = response.request.headers.get("if-none-match")
    if not if_none_match:
        return False
    
    # ETag 목록 파싱 (여러 ETag가 쉼표로 구분된 경우)
    etags = [tag.strip(' "') for tag in if_none_match.split(",")]
    
    # 현재 ETag가 목록에 있는지 확인
    return etag in etags

def snake_to_camel(snake_str: str) -> str:
    """
    스네이크 케이스를 카멜 케이스로 변환
    
    Args:
        snake_str: 스네이크 케이스 문자열 (예: 'snake_case')
        
    Returns:
        카멜 케이스 문자열 (예: 'snakeCase')
    """
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def camel_to_snake(camel_str: str) -> str:
    """
    카멜 케이스를 스네이크 케이스로 변환
    
    Args:
        camel_str: 카멜 케이스 문자열 (예: 'camelCase')
        
    Returns:
        스네이크 케이스 문자열 (예: 'camel_case')
    """
    snake = re.sub(r'(?<!^)(?=[A-Z])', '_', camel_str).lower()
    return snake

def build_query_params(params: Dict[str, Any]) -> str:
    """
    사전에서 쿼리 매개변수 문자열 생성
    
    Args:
        params: 매개변수 사전
        
    Returns:
        URL 쿼리 문자열
    """
    query_parts = []
    for key, value in params.items():
        if value is not None:
            query_parts.append(f"{key}={value}")
    
    return "&".join(query_parts)

def filter_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    None 값을 필터링한 새 사전 반환
    
    Args:
        data: 입력 사전
        
    Returns:
        None 값이 필터링된 사전
    """
    return {k: v for k, v in data.items() if v is not None}

def paginate_list(
    items: List[Any], 
    skip: int = 0, 
    limit: int = 100,
    total_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    목록을 페이지네이션 형식으로 포맷팅
    
    Args:
        items: 항목 목록
        skip: 건너뛸 항목 수
        limit: 최대 항목 수
        total_count: 총 항목 수 (제공되지 않으면 items 길이 사용)
        
    Returns:
        페이지네이션 응답 객체
    """
    if total_count is None:
        total_count = len(items)
    
    return {
        "items": items,
        "pagination": {
            "total": total_count,
            "offset": skip,
            "limit": limit,
            "has_more": (skip + len(items)) < total_count
        }
    } 