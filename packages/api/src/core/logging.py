"""
로깅 설정을 위한 유틸리티 모듈
"""
import logging
import os
import sys
from datetime import datetime
from typing import Optional

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 로그 디렉토리 설정
LOG_DIR = os.environ.get("LOG_DIR", "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)

# 로그 파일명 포맷
LOG_FILENAME_FORMAT = "{date}_{name}.log"


def setup_logger(name: str, log_level: Optional[str] = None) -> logging.Logger:
    """
    지정된 이름으로 로거를 설정합니다.
    
    Args:
        name: 로거 이름
        log_level: 로그 레벨 (None이면 환경 변수나 기본값 사용)
        
    Returns:
        설정된 로거
    """
    # 로그 레벨 설정
    level = getattr(logging, log_level or LOG_LEVEL)
    
    # 로거 생성 및 레벨 설정
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 모든 핸들러 제거 (중복 방지)
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # 콘솔 핸들러 설정
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))
    logger.addHandler(console_handler)
    
    # 파일 핸들러 설정
    log_filename = LOG_FILENAME_FORMAT.format(
        date=datetime.now().strftime("%Y%m%d"),
        name=name.replace(".", "_")
    )
    log_path = os.path.join(LOG_DIR, log_filename)
    
    file_handler = logging.FileHandler(log_path)
    file_handler.setLevel(level)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))
    logger.addHandler(file_handler)
    
    # 전파 설정 (상위 로거로 이벤트 전파 방지)
    logger.propagate = False
    
    return logger


# 공통 로거 인스턴스
app_logger = setup_logger("app")
todo_logger = setup_logger("todo")
vehicle_logger = setup_logger("vehicle")
maintenance_logger = setup_logger("maintenance")
db_logger = setup_logger("db")
auth_logger = setup_logger("auth")


def get_logger(name: str) -> logging.Logger:
    """
    주어진 이름의 로거를 반환하거나 생성합니다.
    
    Args:
        name: 로거 이름
        
    Returns:
        설정된 로거
    """
    if name in logging.Logger.manager.loggerDict:
        return logging.getLogger(name)
    else:
        return setup_logger(name)