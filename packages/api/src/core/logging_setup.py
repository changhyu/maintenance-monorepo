"""
로깅 설정 모듈
API 애플리케이션을 위한 고급 로깅 설정을 제공합니다.
"""

import logging
import logging.handlers
import os
from datetime import datetime
from typing import Optional

from packages.api.src.coreconfig import settings


def setup_logging(log_level: Optional[int] = None) -> logging.Logger:
    """
    향상된 로깅 시스템을 설정합니다.

    Args:
        log_level: 로그 레벨 (기본값: DEBUG 모드에서는 INFO, 아닐 경우 WARNING)

    Returns:
        설정된 로거 인스턴스
    """
    # 로그 디렉토리 생성
    os.makedirs("logs", exist_ok=True)

    # 로그 레벨 설정
    if log_level is None:
        log_level = logging.INFO if settings.DEBUG else logging.WARNING

    # 로그 포맷 설정 - 상세 정보 포함
    detailed_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
    )

    # 간단한 포맷 (콘솔용)
    simple_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 콘솔 핸들러 추가
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(simple_formatter)
    console_handler.setLevel(logging.INFO if settings.DEBUG else logging.WARNING)
    root_logger.addHandler(console_handler)

    # 일별 로그 파일 핸들러 추가
    today = datetime.now().strftime("%Y-%m-%d")
    file_handler = logging.FileHandler(f"logs/api-{today}.log")
    file_handler.setFormatter(detailed_formatter)
    file_handler.setLevel(log_level)
    root_logger.addHandler(file_handler)

    # 에러 로그를 위한 별도 파일 핸들러
    error_file_handler = logging.FileHandler(f"logs/error-{today}.log")
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(error_file_handler)

    # 로그 순환 설정 (크기 기반)
    max_log_size = 10 * 1024 * 1024  # 10MB
    rotating_handler = logging.handlers.RotatingFileHandler(
        "logs/api.log", maxBytes=max_log_size, backupCount=5
    )
    rotating_handler.setFormatter(detailed_formatter)
    rotating_handler.setLevel(log_level)
    root_logger.addHandler(rotating_handler)

    # 특정 외부 라이브러리 로그 레벨 조정
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)

    # 디버그 모드에서는 SQL 쿼리 로깅
    if settings.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
    else:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    # 애플리케이션 로거 반환
    logger = logging.getLogger("api")
    logger.info("로깅 시스템 초기화 완료")

    return logger
