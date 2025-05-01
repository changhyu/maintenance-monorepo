"""
공통 유틸리티 모듈
여러 서비스에서 사용할 수 있는 유틸리티 함수들을 제공합니다.
"""

import asyncio
import json
import os
import time
from contextlib import asynccontextmanager, contextmanager
from datetime import date, datetime
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Type, Union

from pydantic import BaseModel


class DateTimeEncoder(json.JSONEncoder):
    """JSON 인코더 확장 - datetime 및 date 객체 직렬화"""

    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def json_dumps(obj: Any, **kwargs) -> str:
    """
    객체를 JSON 문자열로 직렬화합니다.
    datetime과 date 객체도 처리합니다.

    Args:
        obj: 직렬화할 객체
        **kwargs: 추가 JSON 직렬화 옵션

    Returns:
        직렬화된 JSON 문자열
    """
    return json.dumps(obj, cls=DateTimeEncoder, ensure_ascii=False, **kwargs)


def parse_bool(value: Any) -> bool:
    """
    여러 형식의 불리언 값을 파싱합니다.

    Args:
        value: 파싱할 값 (문자열, 숫자 등)

    Returns:
        파싱된 불리언 값
    """
    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        value = value.lower().strip()
        return value in ("true", "t", "yes", "y", "1", "on")

    return bool(value)


def get_env_bool(name: str, default: bool = False) -> bool:
    """
    환경 변수에서 불리언 값을 가져옵니다.

    Args:
        name: 환경 변수 이름
        default: 기본값

    Returns:
        환경 변수의 불리언 값
    """
    value = os.environ.get(name)
    if value is None:
        return default
    return parse_bool(value)


def get_env_int(name: str, default: int = 0) -> int:
    """
    환경 변수에서 정수 값을 가져옵니다.

    Args:
        name: 환경 변수 이름
        default: 기본값

    Returns:
        환경 변수의 정수 값
    """
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def get_env_float(name: str, default: float = 0.0) -> float:
    """
    환경 변수에서 실수 값을 가져옵니다.

    Args:
        name: 환경 변수 이름
        default: 기본값

    Returns:
        환경 변수의 실수 값
    """
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def get_env_list(name: str, default: List = None, separator: str = ",") -> List[str]:
    """
    환경 변수에서 리스트 값을 가져옵니다.

    Args:
        name: 환경 변수 이름
        default: 기본값
        separator: 구분자

    Returns:
        환경 변수의 리스트 값
    """
    if default is None:
        default = []

    value = os.environ.get(name)
    if value is None:
        return default

    return [item.strip() for item in value.split(separator) if item.strip()]


def model_to_dict(model: BaseModel) -> Dict:
    """
    Pydantic 모델을 사전으로 변환합니다.

    Args:
        model: 변환할 Pydantic 모델

    Returns:
        사전으로 변환된 모델
    """
    return model.dict()


def dict_to_model(data: Dict, model_class: Type[BaseModel]) -> BaseModel:
    """
    사전을 Pydantic 모델로 변환합니다.

    Args:
        data: 변환할 사전
        model_class: 변환할 모델 클래스

    Returns:
        사전으로부터 생성된 모델 인스턴스
    """
    return model_class(**data)


@contextmanager
def timer(name: str = None):
    """
    코드 블록의 실행 시간을 측정하는 컨텍스트 매니저입니다.

    Args:
        name: 타이머 이름 (로깅용)
    """
    start_time = time.time()
    yield
    elapsed = time.time() - start_time

    if name:
        print(f"[{name}] 실행 시간: {elapsed:.4f}초")
    else:
        print(f"실행 시간: {elapsed:.4f}초")


@asynccontextmanager
async def async_timer(name: str = None):
    """
    비동기 코드 블록의 실행 시간을 측정하는 비동기 컨텍스트 매니저입니다.

    Args:
        name: 타이머 이름 (로깅용)
    """
    start_time = time.time()
    yield
    elapsed = time.time() - start_time

    if name:
        print(f"[{name}] 비동기 실행 시간: {elapsed:.4f}초")
    else:
        print(f"비동기 실행 시간: {elapsed:.4f}초")


def timed(func):
    """
    함수의 실행 시간을 측정하는 데코레이터입니다.

    Args:
        func: 측정할 함수
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start_time
        print(f"{func.__name__} 실행 시간: {elapsed:.4f}초")
        return result

    return wrapper


def async_timed(func):
    """
    비동기 함수의 실행 시간을 측정하는 데코레이터입니다.

    Args:
        func: 측정할 비동기 함수
    """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        elapsed = time.time() - start_time
        print(f"{func.__name__} 비동기 실행 시간: {elapsed:.4f}초")
        return result

    return wrapper
