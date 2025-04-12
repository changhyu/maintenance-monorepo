"""
구조화된 로깅 유틸리티

표준화된 로그 형식을 제공하는 유틸리티 모듈입니다.
"""

import logging
import json
import traceback
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Union, List


class LogContext:
    """로그 컨텍스트 클래스"""
    
    def __init__(self, context_id: Optional[str] = None):
        """
        로그 컨텍스트 초기화
        
        Args:
            context_id: 컨텍스트 ID (없으면 자동 생성)
        """
        self.context_id = context_id or str(uuid.uuid4())
        self.metadata = {}
        
    def add(self, key: str, value: Any) -> 'LogContext':
        """
        컨텍스트에 메타데이터 추가
        
        Args:
            key: 메타데이터 키
            value: 메타데이터 값
            
        Returns:
            체이닝을 위한 self
        """
        self.metadata[key] = value
        return self
        
    def get_all(self) -> Dict[str, Any]:
        """
        모든 컨텍스트 메타데이터 반환
        
        Returns:
            컨텍스트 ID와 메타데이터가 포함된 딕셔너리
        """
        return {
            "context_id": self.context_id,
            **self.metadata
        }
        

class StructuredLogger:
    """구조화된 로거 클래스"""
    
    def __init__(self, name: str):
        """
        구조화된 로거 초기화
        
        Args:
            name: 로거 이름
        """
        self.logger = logging.getLogger(name)
        self.context = LogContext()
        
    def set_context(self, context: LogContext) -> None:
        """
        로깅 컨텍스트 설정
        
        Args:
            context: 로그 컨텍스트
        """
        self.context = context
        
    def _format_log(
        self,
        message: str,
        level: str,
        exception: Optional[Exception] = None,
        **kwargs
    ) -> str:
        """
        로그 메시지를 JSON 형식으로 포맷팅
        
        Args:
            message: 로그 메시지
            level: 로그 레벨
            exception: 예외 객체 (있는 경우)
            **kwargs: 추가 로그 메타데이터
            
        Returns:
            JSON 형식의 로그 문자열
        """
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            **self.context.get_all(),
            **kwargs
        }
        
        if exception:
            log_data["exception"] = {
                "type": type(exception).__name__,
                "message": str(exception),
                "traceback": traceback.format_exc()
            }
            
        return json.dumps(log_data)
        
    def debug(self, message: str, **kwargs) -> None:
        """
        디버그 로그 기록
        
        Args:
            message: 로그 메시지
            **kwargs: 추가 메타데이터
        """
        if self.logger.isEnabledFor(logging.DEBUG):
            log_json = self._format_log(message, "DEBUG", **kwargs)
            self.logger.debug(log_json)
            
    def info(self, message: str, **kwargs) -> None:
        """
        정보 로그 기록
        
        Args:
            message: 로그 메시지
            **kwargs: 추가 메타데이터
        """
        if self.logger.isEnabledFor(logging.INFO):
            log_json = self._format_log(message, "INFO", **kwargs)
            self.logger.info(log_json)
            
    def warning(self, message: str, **kwargs) -> None:
        """
        경고 로그 기록
        
        Args:
            message: 로그 메시지
            **kwargs: 추가 메타데이터
        """
        if self.logger.isEnabledFor(logging.WARNING):
            log_json = self._format_log(message, "WARNING", **kwargs)
            self.logger.warning(log_json)
            
    def error(self, message: str, exception: Optional[Exception] = None, **kwargs) -> None:
        """
        오류 로그 기록
        
        Args:
            message: 로그 메시지
            exception: 예외 객체 (있는 경우)
            **kwargs: 추가 메타데이터
        """
        if self.logger.isEnabledFor(logging.ERROR):
            log_json = self._format_log(message, "ERROR", exception, **kwargs)
            self.logger.error(log_json)
            
    def critical(self, message: str, exception: Optional[Exception] = None, **kwargs) -> None:
        """
        치명적 오류 로그 기록
        
        Args:
            message: 로그 메시지
            exception: 예외 객체 (있는 경우)
            **kwargs: 추가 메타데이터
        """
        if self.logger.isEnabledFor(logging.CRITICAL):
            log_json = self._format_log(message, "CRITICAL", exception, **kwargs)
            self.logger.critical(log_json)
    
    
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