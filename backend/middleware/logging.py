import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from datetime import datetime

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """API 요청 및 응답 로깅 미들웨어"""
    
    async def dispatch(self, request: Request, call_next):
        # 요청 시작 시간 기록
        start_time = time.time()
        
        # 요청 정보 로깅
        logger.info(
            f"요청 시작: {request.method} {request.url.path} "
            f"클라이언트: {request.client.host if request.client else 'Unknown'}"
        )
        
        try:
            # 요청 처리
            response = await call_next(request)
            
            # 응답 시간 계산
            process_time = time.time() - start_time
            
            # 응답 정보 로깅
            logger.info(
                f"요청 완료: {request.method} {request.url.path} "
                f"상태 코드: {response.status_code} "
                f"처리 시간: {process_time:.2f}초"
            )
            
            return response
            
        except Exception as e:
            # 예외 발생 시 로깅
            logger.error(
                f"요청 실패: {request.method} {request.url.path} "
                f"에러: {str(e)}",
                exc_info=True
            )
            raise 