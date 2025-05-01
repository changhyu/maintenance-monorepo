import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
import json
from datetime import datetime
from typing import Any, Dict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from backend.core.config import settings

# 로그 저장 디렉토리 설정
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 로그 포맷 설정
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 로깅 레벨 설정 (환경변수에서 가져오기)
LOG_LEVEL = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        
        return json.dumps(log_data, ensure_ascii=False)

def setup_logging() -> logging.Logger:
    """애플리케이션 전체 로깅 설정"""
    # 로그 디렉토리 생성
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # 파일 핸들러 설정
    file_handler = RotatingFileHandler(
        filename=log_dir / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(file_handler)
    
    # 콘솔 핸들러 설정
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)
    
    # SQLAlchemy 로거 설정
    sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
    sqlalchemy_logger.setLevel(logging.WARNING)
    
    return root_logger

# 요청/응답 로깅 미들웨어
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 요청 시작 시간
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info("요청 시작", extra={
            "method": request.method,
            "url": str(request.url),
            "client": request.client.host if request.client else None,
            "headers": dict(request.headers)
        })
        
        try:
            # 다음 미들웨어 또는 엔드포인트 호출
            response = await call_next(request)
            
            # 응답 로깅
            process_time = (datetime.now() - start_time).total_seconds()
            logger.info("요청 완료", extra={
                "method": request.method,
                "url": str(request.url),
                "status_code": response.status_code,
                "process_time": process_time
            })
            
            # 처리 시간을 응답 헤더에 추가
            response.headers["X-Process-Time"] = str(process_time)
            response.headers["X-Request-ID"] = request.headers.get("X-Request-ID", str(start_time.timestamp()))
            
            return response
        except Exception as e:
            # 예외 처리 및 로깅
            process_time = (datetime.now() - start_time).total_seconds()
            
            # 에러 로깅
            logger.error("요청 처리 중 오류 발생", extra={
                "method": request.method,
                "url": str(request.url),
                "error": str(e),
                "process_time": process_time
            }, exc_info=True)
            
            raise  # 예외 전파

# 쿼리 로깅 설정
def setup_query_logging():
    """SQLAlchemy 쿼리 로깅 설정"""
    if LOG_LEVEL <= logging.DEBUG:
        # 디버그 모드에서만 SQL 쿼리 로깅
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
        logging.getLogger("sqlalchemy.pool").setLevel(logging.DEBUG)