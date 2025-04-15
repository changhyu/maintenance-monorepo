import logging
import sys
from typing import Any, Dict, List, Optional

from loguru import logger as loguru_logger

from packages.api.src.core.config import settings


class InterceptHandler(logging.Handler):
    """
    기본 Python 로깅을 Loguru로 리디렉션하는 핸들러
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = loguru_logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = sys._getframe(6), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        loguru_logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging() -> None:
    """
    로깅 설정 초기화
    """
    # 기본 로깅 핸들러 제거
    logging.root.handlers = [InterceptHandler()]
    
    # 표준 라이브러리 로거들 설정
    for name in logging.root.manager.loggerDict.keys():
        logger_obj = logging.getLogger(name)
        logger_obj.handlers = [InterceptHandler()]
        logger_obj.propagate = False
    
    # 로구루 로거 설정
    loguru_logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "level": settings.LOGGING_LEVEL,
                "format": "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            }
        ],
    )


# 로깅 설정 초기화
setup_logging()

# 외부 사용을 위한 로거 인스턴스
logger = loguru_logger 