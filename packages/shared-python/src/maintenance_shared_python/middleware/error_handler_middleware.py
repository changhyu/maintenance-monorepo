"""
에러 핸들러 미들웨어 모듈
"""
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api")

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    전역 에러 처리 미들웨어
    
    애플리케이션에서 발생하는 모든 예외를 일관된 방식으로 처리합니다.
    """
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            # 에러 로깅
            error_msg = f"Unhandled exception: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            
            # 클라이언트에게 반환할 오류 응답
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": str(e),
                    "path": request.url.path
                }
            )

def get_error_handler_middleware():
    """
    ErrorHandlerMiddleware 인스턴스를 반환
    """
    return ErrorHandlerMiddleware()
