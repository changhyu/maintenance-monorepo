"""
요청 ID 미들웨어 모듈
"""
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    요청마다 고유한 ID를 부여하는 미들웨어
    """
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response

def get_request_id_middleware():
    """
    RequestIdMiddleware 인스턴스를 반환
    """
    return RequestIdMiddleware()
