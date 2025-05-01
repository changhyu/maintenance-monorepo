from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time

class SecurityMiddleware(BaseHTTPMiddleware):
    """보안 관련 미들웨어"""
    
    async def dispatch(self, request: Request, call_next):
        # 요청 처리 전 보안 헤더 추가
        response = await call_next(request)
        
        # 보안 헤더 설정
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """요청 제한 미들웨어"""
    
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.requests = {}
    
    async def dispatch(self, request: Request, call_next):
        # 클라이언트 IP 가져오기
        client_ip = request.client.host if request.client else "unknown"
        
        # 현재 시간
        current_time = time.time()
        
        # 클라이언트의 요청 기록 가져오기
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        # 오래된 요청 기록 제거
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if current_time - t < self.window
        ]
        
        # 요청 제한 확인
        if len(self.requests[client_ip]) >= self.limit:
            return Response(
                content="Too Many Requests",
                status_code=429,
                headers={"Retry-After": str(self.window)}
            )
        
        # 요청 기록 추가
        self.requests[client_ip].append(current_time)
        
        # 요청 처리
        return await call_next(request) 