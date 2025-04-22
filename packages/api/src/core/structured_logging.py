"""
구조화된 로깅 유틸리티

표준화된 로그 형식을 제공하는 유틸리티 모듈입니다.
"""

import gzip
import json
import logging
import os
import shutil
import sys
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from logging.handlers import RotatingFileHandler
from typing import Any, Dict, Iterator, List, Optional, Set, Union

from core.config import settings
from elasticsearch import AsyncElasticsearch
from fastapi import Request
from prometheus_client import Counter, Gauge, Histogram
from pythonjsonlogger import jsonlogger

# 메트릭스 정의
LOG_ENTRIES = Counter(
    "log_entries_total", "Total number of log entries", ["level", "module"]
)

LOG_ERRORS = Counter("log_errors_total", "Total number of error logs", ["error_type"])

REQUEST_DURATION = Histogram(
    "request_duration_seconds", "Request duration in seconds", ["method", "path"]
)

LOG_LEVEL_GAUGE = Gauge("log_level_current", "Current log level", ["logger"])


class LogRotationConfig:
    """로그 회전 설정"""

    def __init__(
        self,
        max_bytes: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 5,
        compress: bool = True,
    ):
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.compress = compress


class LogLevel(str, Enum):
    """로그 레벨 열거형"""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

    @classmethod
    def to_logging_level(cls, level: "LogLevel") -> int:
        """로그 레벨을 logging 모듈 레벨로 변환"""
        return getattr(logging, level.upper())

    @classmethod
    def from_logging_level(cls, level: int) -> "LogLevel":
        """logging 모듈 레벨을 로그 레벨로 변환"""
        for level_name in cls:
            if getattr(logging, level_name.upper()) == level:
                return level_name
        return cls.INFO


class LogFilter:
    """로그 필터 클래스"""

    def __init__(self):
        self.excluded_paths: Set[str] = set()
        self.min_level = LogLevel.INFO

    def add_excluded_path(self, path: str) -> None:
        """제외할 경로 추가"""
        self.excluded_paths.add(path)

    def set_min_level(self, level: LogLevel) -> None:
        """최소 로그 레벨 설정"""
        self.min_level = level

    def should_log(self, record: logging.LogRecord) -> bool:
        """로그 기록 여부 결정"""
        if record.pathname in self.excluded_paths:
            return False

        return LogLevel.to_logging_level(self.min_level) <= record.levelno


class LogContext:
    """로그 컨텍스트 클래스"""

    def __init__(
        self,
        context_id: Optional[str] = None,
        parent_context_id: Optional[str] = None,
        trace_id: Optional[str] = None,
    ):
        """
        로그 컨텍스트 초기화

        Args:
            context_id: 컨텍스트 ID (없으면 자동 생성)
            parent_context_id: 부모 컨텍스트 ID
            trace_id: 추적 ID
        """
        self.context_id = context_id or str(uuid.uuid4())
        self.parent_context_id = parent_context_id
        self.trace_id = trace_id or str(uuid.uuid4())
        self.metadata: Dict[str, Any] = {}
        self.tags: List[str] = []
        self.start_time = datetime.now(timezone.UTC)

    def add(self, key: str, value: Any) -> "LogContext":
        """메타데이터 추가"""
        self.metadata[key] = value
        return self

    def add_tag(self, tag: str) -> "LogContext":
        """태그 추가"""
        if tag not in self.tags:
            self.tags.append(tag)
        return self

    def get_all(self) -> Dict[str, Any]:
        """모든 컨텍스트 정보 반환"""
        return {
            "context_id": self.context_id,
            "parent_context_id": self.parent_context_id,
            "trace_id": self.trace_id,
            "tags": self.tags,
            "duration_ms": (
                datetime.now(timezone.UTC) - self.start_time
            ).total_seconds()
            * 1000,
            **self.metadata,
        }


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """사용자 정의 JSON 포맷터"""

    def add_fields(
        self, log_record: Dict[str, Any], record: Any, message_dict: Dict[str, Any]
    ) -> None:
        """로그 레코드에 필드 추가"""
        # 기본 필드 추가
        base_fields = {
            "timestamp": datetime.now(timezone.UTC).isoformat(),
            "level": record.levelname,
            "environment": settings.ENVIRONMENT,
            "service": settings.SERVICE_NAME,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "thread": record.thread,
            "thread_name": record.threadName,
        }

        # 예외 정보가 있는 경우 추가
        if record.exc_info:
            exception_type = record.exc_info[0].__name__
            base_fields |= {
                "exception": {
                    "type": exception_type,
                    "message": str(record.exc_info[1]),
                    "traceback": traceback.format_exception(*record.exc_info),
                }
            }
            LOG_ERRORS.labels(error_type=exception_type).inc()

        # 추가 컨텍스트 정보가 있는 경우 추가
        if hasattr(record, "request_id"):
            base_fields |= {"request_id": record.request_id}

        if hasattr(record, "user_id"):
            base_fields |= {"user_id": record.user_id}

        if hasattr(record, "correlation_id"):
            base_fields |= {"correlation_id": record.correlation_id}

        # 메시지 딕셔너리가 있는 경우 병합
        if message_dict:
            base_fields |= message_dict

        # 메트릭스 업데이트
        LOG_ENTRIES.labels(level=record.levelname, module=record.module).inc()

        # 최종 로그 레코드 업데이트
        log_record.update(base_fields)


class RequestContextFilter(logging.Filter):
    def __init__(self, request: Optional[Request] = None):
        super().__init__()
        self.request = request

    def filter(self, record: logging.LogRecord) -> bool:
        if self.request:
            record.request_id = getattr(self.request.state, "request_id", "unknown")
            record.path = str(self.request.url.path)
            record.method = self.request.method
            record.client_ip = self.request.client.host
            record.user_agent = self.request.headers.get("user-agent", "unknown")
        return True


class LogArchiver:
    """로그 아카이브 클래스"""

    def __init__(
        self, archive_dir: str, retention_days: int = 30, compress: bool = True
    ):
        """
        로그 아카이브 초기화

        Args:
            archive_dir: 아카이브 디렉토리
            retention_days: 보관 기간 (일)
            compress: 압축 여부
        """
        self.archive_dir = archive_dir
        self.retention_days = retention_days
        self.compress = compress

        if not os.path.exists(archive_dir):
            os.makedirs(archive_dir)

    def archive_log_file(self, log_file: str) -> str:
        """로그 파일 아카이브"""
        if not os.path.exists(log_file):
            raise FileNotFoundError(f"로그 파일을 찾을 수 없음: {log_file}")

        # 아카이브 파일명 생성
        timestamp = datetime.now(timezone.UTC).strftime("%Y%m%d_%H%M%S")
        archive_name = f"{os.path.basename(log_file)}_{timestamp}"

        if self.compress:
            archive_path = os.path.join(self.archive_dir, f"{archive_name}.gz")
            with open(log_file, "rb") as f_in:
                with gzip.open(archive_path, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            archive_path = os.path.join(self.archive_dir, archive_name)
            shutil.copy2(log_file, archive_path)

        return archive_path

    def cleanup_old_archives(self) -> int:
        """오래된 아카이브 정리"""
        cutoff_date = datetime.now(timezone.UTC) - timedelta(days=self.retention_days)
        removed_count = 0

        for filename in os.listdir(self.archive_dir):
            file_path = os.path.join(self.archive_dir, filename)
            if os.path.getctime(file_path) < cutoff_date.timestamp():
                os.remove(file_path)
                removed_count += 1

        return removed_count


class LogSearcher:
    """로그 검색 클래스"""

    def __init__(self, es_client: AsyncElasticsearch):
        """
        로그 검색 초기화

        Args:
            es_client: Elasticsearch 클라이언트
        """
        self.es_client = es_client
        self.index_prefix = "logs-"

    async def search_logs(
        self,
        query: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        levels: Optional[List[LogLevel]] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        로그 검색

        Args:
            query: 검색어
            start_time: 시작 시간
            end_time: 종료 시간
            levels: 로그 레벨 필터
            limit: 최대 결과 수

        Returns:
            검색 결과 목록
        """
        must_conditions = [{"query_string": {"query": query}}]

        if start_time or end_time:
            range_filter = {"range": {"timestamp": {}}}
            if start_time:
                range_filter["range"]["timestamp"]["gte"] = start_time.isoformat()
            if end_time:
                range_filter["range"]["timestamp"]["lte"] = end_time.isoformat()
            must_conditions.append(range_filter)

        if levels:
            must_conditions.append(
                {"terms": {"level": [level.value for level in levels]}}
            )

        body = {
            "query": {"bool": {"must": must_conditions}},
            "sort": [{"timestamp": "desc"}],
            "size": limit,
        }

        result = await self.es_client.search(index=f"{self.index_prefix}*", body=body)

        return [hit["_source"] for hit in result["hits"]["hits"]]


class CompressedRotatingFileHandler(RotatingFileHandler):
    """압축 지원 로그 회전 핸들러"""

    def __init__(
        self,
        filename: str,
        max_bytes: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 5,
        encoding: Optional[str] = None,
        delay: bool = False,
        compress: bool = True,
    ):
        """
        로그 파일 핸들러 초기화

        Args:
            filename: 로그 파일 경로
            max_bytes: 최대 파일 크기 (바이트)
            backup_count: 백업 파일 수
            encoding: 파일 인코딩
            delay: 지연된 파일 생성 여부
            compress: 압축 여부
        """
        super().__init__(
            filename, max_bytes, backup_count, encoding=encoding, delay=delay
        )
        self.compress = compress

    def rotate(self, source: str, dest: str) -> None:
        """로그 파일 회전"""
        if os.path.exists(source):
            if self.compress:
                with open(source, "rb") as f_in:
                    with gzip.open(f"{dest}.gz", "wb") as f_out:
                        shutil.copyfileobj(f_in, f_out)
            else:
                shutil.copy2(source, dest)
            os.remove(source)


class StructuredLogger:
    """구조화된 로거 클래스"""

    def __init__(
        self,
        name: str,
        rotation_config: Optional[LogRotationConfig] = None,
        log_filter: Optional[LogFilter] = None,
        archive_config: Optional[Dict[str, Any]] = None,
        es_client: Optional[AsyncElasticsearch] = None,
    ):
        """
        구조화된 로거 초기화

        Args:
            name: 로거 이름
            rotation_config: 로그 회전 설정
            log_filter: 로그 필터
            archive_config: 아카이브 설정
            es_client: Elasticsearch 클라이언트
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        self.name = name

        # JSON 포맷터 설정
        formatter = CustomJsonFormatter("%(timestamp)s %(level)s %(name)s %(message)s")

        # 콘솔 핸들러
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)

        # 파일 핸들러 (회전 및 압축 지원)
        if settings.LOG_FILE_PATH:
            rotation_config = rotation_config or LogRotationConfig()
            file_handler = CompressedRotatingFileHandler(
                settings.LOG_FILE_PATH,
                max_bytes=rotation_config.max_bytes,
                backup_count=rotation_config.backup_count,
                compress=rotation_config.compress,
            )
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

        # 로그 필터 설정
        if log_filter:
            self.logger.addFilter(log_filter)

        # 아카이브 설정
        if archive_config and settings.LOG_ARCHIVE_DIR:
            self.archiver = LogArchiver(settings.LOG_ARCHIVE_DIR, **archive_config)
        else:
            self.archiver = None

        # 검색 설정
        self.searcher = LogSearcher(es_client) if es_client else None

        self.context = LogContext()
        self._update_metrics()

    def _update_metrics(self) -> None:
        """메트릭스 업데이트"""
        LOG_LEVEL_GAUGE.labels(logger=self.name).set(self.logger.getEffectiveLevel())

    def set_level(self, level: LogLevel) -> None:
        """로그 레벨 설정"""
        self.logger.setLevel(LogLevel.to_logging_level(level))
        self._update_metrics()

    def _log(
        self,
        level: int,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: Optional[Exception] = None,
    ) -> None:
        """로그 메시지 기록"""
        extra = extra or {}
        context_data = self.context.get_all()
        extra.update(context_data)

        self.logger.log(level, message, extra=extra, exc_info=exc_info)

    def info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """정보 레벨 로그"""
        self._log(logging.INFO, message, extra)

    def warning(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: Optional[Exception] = None,
    ) -> None:
        """경고 레벨 로그"""
        self._log(logging.WARNING, message, extra, exc_info)

    def error(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: Optional[Exception] = None,
    ) -> None:
        """에러 레벨 로그"""
        self._log(logging.ERROR, message, extra, exc_info)

    def critical(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: Optional[Exception] = None,
    ) -> None:
        """치명적 에러 레벨 로그"""
        self._log(logging.CRITICAL, message, extra, exc_info)

    def debug(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: Optional[Exception] = None,
    ) -> None:
        """디버그 레벨 로그"""
        if settings.DEBUG:
            self._log(logging.DEBUG, message, extra, exc_info)

    def log_request(self, request: Request, response_time: float):
        """HTTP 요청 로깅"""
        REQUEST_DURATION.labels(
            method=request.method, path=str(request.url.path)
        ).observe(response_time)

        extra = {
            "request_id": getattr(request.state, "request_id", "unknown"),
            "method": request.method,
            "path": str(request.url.path),
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent", "unknown"),
            "response_time": response_time,
        }
        self.info(f"HTTP {request.method} {request.url.path}", extra=extra)

    def log_error(self, error: Exception, request: Optional[Request] = None):
        """에러 로깅"""
        extra = {"error_type": error.__class__.__name__, "error_message": str(error)}

        if request:
            extra.update(
                {
                    "request_id": getattr(request.state, "request_id", "unknown"),
                    "method": request.method,
                    "path": str(request.url.path),
                }
            )

        self.error(f"에러 발생: {str(error)}", extra=extra)


# 로깅 컨텍스트 관리 함수
_current_context = LogContext()


def get_logger(name: str) -> StructuredLogger:
    """
    구조화된 로거 인스턴스 반환

    Args:
        name: 로거 이름

    Returns:
        구조화된 로거 인스턴스
    """
    logger = StructuredLogger(name)
    logger.set_context(_current_context)
    return logger


def set_log_context(context: LogContext) -> None:
    """
    글로벌 로그 컨텍스트 설정

    Args:
        context: 로그 컨텍스트
    """
    global _current_context
    _current_context = context
