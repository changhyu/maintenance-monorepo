"""
디버깅 유틸리티 모듈.
애플리케이션 디버깅에 필요한 유틸리티 함수들을 제공합니다.
"""

import time
import json
import functools
import inspect
from typing import Any, Callable, Dict, List, Optional, TypeVar, cast
import traceback

from .logging import app_logger

T = TypeVar('T')
F = TypeVar('F', bound=Callable[..., Any])


def timing_decorator(func: F) -> F:
    """
    함수 실행 시간을 측정하는 데코레이터.
    
    Args:
        func: 측정할 함수
        
    Returns:
        래핑된 함수
    """
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        app_logger.debug(
            f"함수 {func.__name__} 실행 시간: {(end_time - start_time) * 1000:.2f}ms"
        )
        return result
    
    return cast(F, wrapper)


def trace_calls(func: F) -> F:
    """
    함수 호출 정보를 로깅하는 데코레이터.
    
    Args:
        func: 추적할 함수
        
    Returns:
        래핑된 함수
    """
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        arg_names = inspect.getfullargspec(func).args
        bound_args = dict(zip(arg_names, args))
        bound_args.update(kwargs)
        
        # 중요 정보를 가릴 키워드 목록
        sensitive_keys = ['password', 'token', 'secret', 'key', 'auth']
        filtered_args = {}
        
        for k, v in bound_args.items():
            if any(sensitive in k.lower() for sensitive in sensitive_keys):
                filtered_args[k] = '***FILTERED***'
            else:
                # 너무 큰 값은 요약
                try:
                    if isinstance(v, (str, bytes)) and len(v) > 100:
                        filtered_args[k] = f"{v[:100]}... (truncated)"
                    else:
                        filtered_args[k] = v
                except Exception:
                    filtered_args[k] = "<<복잡한 객체>>"
        
        app_logger.debug(
            f"함수 {func.__name__} 호출: {json.dumps(filtered_args, default=str)}"
        )
        
        try:
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            app_logger.error(
                f"함수 {func.__name__} 실행 중 오류: {str(e)}",
                exc_info=True
            )
            raise
    
    return cast(F, wrapper)


def get_stack_trace(skip_frames: int = 0) -> List[str]:
    """
    현재 스택 트레이스를 반환합니다.
    
    Args:
        skip_frames: 건너뛸 프레임 수
        
    Returns:
        스택 트레이스 목록
    """
    stack = traceback.extract_stack()
    
    # 이 함수 호출 프레임과 지정된 수의 프레임 건너뛰기
    stack = stack[:-1-skip_frames]
    
    return [f"{frame.filename}:{frame.lineno} - {frame.name}" for frame in stack]


def dump_locals(depth: int = 1) -> Dict[str, Any]:
    """
    호출자의 로컬 변수들을 덤프합니다.
    
    Args:
        depth: 스택에서 올라갈 프레임 수
        
    Returns:
        로컬 변수 사전
    """
    frame = inspect.currentframe()
    try:
        for _ in range(depth):
            if frame and frame.f_back:
                frame = frame.f_back
            else:
                break
        
        if frame:
            return dict(frame.f_locals)
        return {}
    finally:
        del frame  # 순환 참조 방지 


\n