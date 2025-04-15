from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer
from typing import Optional, Dict
import jwt
from datetime import datetime, timedelta
import re
from ..config import settings

security = HTTPBearer()

class SecurityMiddleware:
    """보안 관련 미들웨어"""

    def __init__(self):
        self.allowed_origins = settings.ALLOWED_ORIGINS
        self.rate_limit_window = 60  # 1분
        self.rate_limit_max_requests = 100  # 최대 요청 수
        self._request_history: Dict[str, list] = {}

    async def check_cors(self, request: Request) -> None:
        """CORS 검증"""
        origin = request.headers.get('origin')
        if origin and origin not in self.allowed_origins:
            raise HTTPException(status_code=403, detail="CORS policy violation")

    async def check_rate_limit(self, request: Request) -> None:
        """요청 속도 제한"""
        client_ip = request.client.host
        now = datetime.now()
        
        # 현재 IP의 요청 기록 가져오기
        requests = self._request_history.get(client_ip, [])
        
        # 시간 창 밖의 요청 제거
        requests = [req_time for req_time in requests 
                   if now - req_time < timedelta(seconds=self.rate_limit_window)]
        
        # 새 요청 추가
        requests.append(now)
        self._request_history[client_ip] = requests
        
        # 요청 수 확인
        if len(requests) > self.rate_limit_max_requests:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )

    async def validate_content_type(self, request: Request) -> None:
        """Content-Type 검증"""
        if request.method in ['POST', 'PUT', 'PATCH']:
            content_type = request.headers.get('content-type', '')
            if not content_type.startswith('application/json'):
                raise HTTPException(
                    status_code=415,
                    detail="Content-Type must be application/json"
                )

    async def check_xss(self, request: Request) -> None:
        """XSS 공격 방지"""
        # 요청 헤더 검사
        headers = dict(request.headers)
        for header in headers.values():
            if self._contains_xss(header):
                raise HTTPException(
                    status_code=400,
                    detail="Potential XSS attack detected"
                )
        
        # 쿼리 파라미터 검사
        for param in request.query_params.values():
            if self._contains_xss(param):
                raise HTTPException(
                    status_code=400,
                    detail="Potential XSS attack detected"
                )

    def _contains_xss(self, value: str) -> bool:
        """XSS 패턴 검사"""
        xss_patterns = [
            r"<script.*?>",
            r"javascript:",
            r"onerror=",
            r"onload=",
            r"eval\(",
            r"document\.",
        ]
        return any(re.search(pattern, value, re.IGNORECASE) 
                  for pattern in xss_patterns)

    async def validate_jwt(self, request: Request) -> Optional[dict]:
        """JWT 토큰 검증"""
        if "authorization" not in request.headers:
            return None

        try:
            scheme, token = request.headers["authorization"].split()
            if scheme.lower() != "bearer":
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication scheme"
                )

            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # 토큰 만료 검사
            if datetime.fromtimestamp(payload["exp"]) < datetime.now():
                raise HTTPException(
                    status_code=401,
                    detail="Token has expired"
                )
                
            return payload
            
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=str(e)
            )

    async def __call__(self, request: Request, call_next):
        """미들웨어 실행"""
        # CORS 검사
        await self.check_cors(request)
        
        # 속도 제한 검사
        await self.check_rate_limit(request)
        
        # Content-Type 검증
        await self.validate_content_type(request)
        
        # XSS 검사
        await self.check_xss(request)
        
        # JWT 검증 (필요한 경우)
        if request.url.path not in settings.PUBLIC_PATHS:
            await self.validate_jwt(request)
        
        # 다음 미들웨어 또는 엔드포인트로 진행
        response = await call_next(request)
        
        # 보안 헤더 추가
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response 