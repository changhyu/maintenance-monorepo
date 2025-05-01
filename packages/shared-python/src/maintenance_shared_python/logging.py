"""
공통 로깅 모듈
일관된 로깅 설정과 로깅 함수를 제공합니다.
"""

import logging
import os
import sys
from typing import Any, Dict, Optional

# 기본 로깅 형식
DEFAULT_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 로거 인스턴스 저장소
_loggers = {}


def setup_logging(
    name: str,
    log_level: str = None,
    log_format: str = DEFAULT_FORMAT,
    date_format: str = DEFAULT_DATE_FORMAT,
    log_file: str = None,
) -> logging.Logger:
    """
    로깅 설정을 초기화하고 로거를 반환합니다.

    Args:
        name: 로거 이름
        log_level: 로깅 레벨 (환경 변수 LOG_LEVEL 또는 기본값 INFO)
        log_format: 로깅 형식
        date_format: 날짜 형식
        log_file: 로그 파일 경로 (지정되지 않으면 표준 출력만 사용)

    Returns:
        설정된 로거 객체
    """
    if name in _loggers:
        return _loggers[name]

    # 환경 변수에서 로그 레벨 가져오기, 기본값은 INFO
    if log_level is None:
        log_level = os.environ.get("LOG_LEVEL", "INFO").upper()

    # 로그 레벨 설정
    level = getattr(logging, log_level, logging.INFO)

    # 로거 생성
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    # 핸들러가 이미 설정되어 있으면 기존 핸들러 제거
    if logger.hasHandlers():
        logger.handlers.clear()

    # 포맷터 생성
    formatter = logging.Formatter(log_format, date_format)

    # 콘솔 핸들러 추가
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 파일 핸들러 추가 (지정된 경우)
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.error(f"로그 파일 '{log_file}' 설정 중 오류 발생: {e}")

    # 로거 저장
    _loggers[name] = logger

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    이름으로 로거를 가져옵니다. 로거가 없으면 새로 생성합니다.

    Args:
        name: 로거 이름

    Returns:
        로거 객체
    """
    if name not in _loggers:
        return setup_logging(name)
    return _loggers[name]


def set_log_level(name: str, level: str) -> None:
    """
    로거의 로그 레벨을 설정합니다.

    Args:
        name: 로거 이름
        level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    logger = get_logger(name)
    level_value = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(level_value)

    # 모든 핸들러에 동일한 레벨 설정
    for handler in logger.handlers:
        handler.setLevel(level_value)
