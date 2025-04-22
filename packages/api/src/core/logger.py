"""
API 로깅 모듈
"""

import json
import logging
import logging.handlers
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict, Optional

from packages.api.src.coreconfig import config
from packages.api.src.coreexceptions import ConfigurationException

# 상수 정의
DEFAULT_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DEFAULT_LOG_LEVEL = logging.INFO
DEFAULT_LOG_FILE = "app.log"
MAX_BYTES = 10 * 1024 * 1024  # 10MB
BACKUP_COUNT = 5


class JSONFormatter(logging.Formatter):
    """JSON 형식의 로그 포맷터"""

    def format(self, record: logging.LogRecord) -> str:
        """로그 레코드를 JSON 형식으로 변환"""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra"):
            log_data.update(record.extra)

        return json.dumps(log_data)


class LogManager:
    """로그 관리 클래스"""

    def __init__(self, name: str):
        """
        Args:
            name: 로거 이름
        """
        self._log_handler = logging.getLogger(name)
        self._configure_default_logging()

    def _configure_default_logging(self) -> None:
        """기본 로깅 설정"""
        self._log_handler.setLevel(DEFAULT_LOG_LEVEL)

        # 콘솔 핸들러 설정
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(DEFAULT_LOG_FORMAT))
        self._log_handler.addHandler(console_handler)

    def add_file_handler(self, log_file: Optional[str] = None) -> None:
        """파일 핸들러 추가

        Args:
            log_file: 로그 파일 경로
        """
        file_path = log_file or DEFAULT_LOG_FILE
        handler = logging.handlers.RotatingFileHandler(
            file_path, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT
        )
        handler.setFormatter(logging.Formatter(DEFAULT_LOG_FORMAT))
        self._log_handler.addHandler(handler)

    @property
    def logger(self) -> logging.Logger:
        """로거 인스턴스 반환"""
        return self._log_handler


# 전역 로거 인스턴스
logger = LogManager("api")
