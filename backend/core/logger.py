"""
애플리케이션 로깅 시스템 모듈
"""
import logging
import sys
from typing import Dict, Any, Optional

# 상대 경로 임포트로 변경
from .config import get_settings

# 설정 가져오기
settings = get_settings()

# 로그 레벨 매핑 설정
LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}

# 기본 로그 포맷 정의
DEFAULT_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def setup_logger(name: str, log_level: Optional[str] = None) -> logging.Logger:
    """
    로거 인스턴스를 설정하고 반환하는 함수
    
    Args:
        name: 로거 이름
        log_level: 로그 레벨 (None일 경우 설정에서 가져옴)
        
    Returns:
        logging.Logger: 설정된 로거 인스턴스
    """
    # 로거 생성
    logger = logging.getLogger(name)
    
    # 로그 레벨 설정 (파라미터로 전달된 값 또는 설정에서 가져온 값)
    level = LOG_LEVELS.get(log_level or settings.LOG_LEVEL, logging.INFO)
    logger.setLevel(level)
    
    # 핸들러가 없는 경우에만 추가 (중복 방지)
    if not logger.handlers:
        # 콘솔 핸들러 생성
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        
        # 포맷터 생성 및 설정 (settings에 LOG_FORMAT이 없으면 기본값 사용)
        log_format = getattr(settings, "LOG_FORMAT", DEFAULT_LOG_FORMAT)
        formatter = logging.Formatter(log_format)
        console_handler.setFormatter(formatter)
        
        # 로거에 핸들러 추가
        logger.addHandler(console_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    로거 인스턴스를 가져오는 함수
    
    Args:
        name: 로거 이름
        
    Returns:
        logging.Logger: 로거 인스턴스
    """
    return setup_logger(name)


# 기본 애플리케이션 로거 생성
app_logger = get_logger("app")