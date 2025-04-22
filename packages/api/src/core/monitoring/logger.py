import json
import logging
import sys
import traceback
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict, Optional

from packages.api.srcconfig import settings


class CustomJsonFormatter(logging.Formatter):
    """JSON 형식의 로그 포매터"""

    def format(self, record: logging.LogRecord) -> str:
        """로그 레코드를 JSON 형식으로 포맷팅"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 예외 정보 추가
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # 추가 컨텍스트 정보
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data

        return json.dumps(log_data)


class Logger:
    """커스텀 로거 클래스"""

    def __init__(self):
        self.logger = logging.getLogger("maintenance-api")
        self.logger.setLevel(logging.INFO if settings.DEBUG else logging.WARNING)

        # 로그 디렉토리 생성
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        # 파일 핸들러 설정
        file_handler = RotatingFileHandler(
            filename=log_dir / "api.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setFormatter(CustomJsonFormatter())

        # 콘솔 핸들러 설정
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(CustomJsonFormatter())

        # 핸들러 추가
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def _log(
        self, level: int, message: str, extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """로그 메시지 기록"""
        if extra:
            self.logger.log(level, message, extra={"extra_data": extra})
        else:
            self.logger.log(level, message)

    def info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """INFO 레벨 로그"""
        self._log(logging.INFO, message, extra)

    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """WARNING 레벨 로그"""
        self._log(logging.WARNING, message, extra)

    def error(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """ERROR 레벨 로그"""
        self._log(logging.ERROR, message, extra)

    def critical(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """CRITICAL 레벨 로그"""
        self._log(logging.CRITICAL, message, extra)

    def exception(
        self,
        message: str,
        exc_info: Optional[Exception] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """예외 로깅"""
        if exc_info:
            self.logger.exception(
                message, exc_info=exc_info, extra={"extra_data": extra}
            )
        else:
            self.logger.exception(message, extra={"extra_data": extra})


# 전역 로거 인스턴스
logger = Logger()
