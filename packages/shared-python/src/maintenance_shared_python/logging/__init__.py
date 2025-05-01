"""
공통 로깅 설정 모듈
모든 마이크로서비스에서 일관된 로깅 형식 제공
"""

import logging
import os
import sys
from typing import Optional


def setup_logging(
    service_name: str,
    log_level: int = logging.INFO,
    log_file_path: Optional[str] = None,
    format_string: Optional[str] = None,
) -> logging.Logger:
    """
    일관된 로깅 설정을 위한 함수

    Args:
        service_name: 서비스 이름 (로거 이름으로 사용)
        log_level: 로깅 레벨 (기본값: logging.INFO)
        log_file_path: 로그 파일 경로 (기본값: None - 서비스별 기본 경로 사용)
        format_string: 로그 포맷 문자열 (기본값: None - 기본 포맷 사용)

    Returns:
        설정된 Logger 객체
    """
    # 기본 포맷 설정
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # 로거 가져오기
    logger = logging.getLogger(service_name)
    logger.setLevel(log_level)

    # 이미 핸들러가 설정되어 있으면 초기화하지 않음
    if logger.handlers:
        return logger

    # 콘솔 핸들러 생성 및 설정
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(format_string))
    logger.addHandler(console_handler)

    # 로그 파일 경로가 제공되지 않은 경우 기본 경로 생성
    if log_file_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        log_dir = os.path.join(base_dir, "logs")

        # 로그 디렉토리가 없으면 생성
        os.makedirs(log_dir, exist_ok=True)

        # 서비스별 로그 파일 경로 생성
        log_file_path = os.path.join(log_dir, f"{service_name.lower()}.log")

    # 파일 핸들러 생성 및 설정
    try:
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(logging.Formatter(format_string))
        logger.addHandler(file_handler)
    except (IOError, PermissionError) as e:
        # 파일 생성 실패시 경고만 출력하고 계속 진행
        logger.warning(
            f"로그 파일 '{log_file_path}'을(를) 생성할 수 없습니다: {str(e)}"
        )

    return logger


def set_log_level(logger_name: str, level: int) -> None:
    """
    로거의 로그 레벨을 설정하는 함수

    Args:
        logger_name: 로거 이름
        level: 설정할 로그 레벨 (logging.INFO, logging.DEBUG 등)
    """
    logger = logging.getLogger(logger_name)
    logger.setLevel(level)
    
    # 로그 레벨 변경 로깅
    logger.info(f"로거 '{logger_name}'의 로그 레벨이 {logging.getLevelName(level)}로 변경되었습니다")


def get_logger(name: str, log_level: int = logging.INFO) -> logging.Logger:
    """
    이름으로 로거를 가져오고 기본 설정을 적용하는 함수

    Args:
        name: 로거 이름
        log_level: 로그 레벨 (기본값: logging.INFO)

    Returns:
        설정된 Logger 객체
    """
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # 이미 핸들러가 있으면 그대로 반환
    if logger.handlers:
        return logger
    
    # 기본 포맷 설정
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # 콘솔 핸들러 추가
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger
