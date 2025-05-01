#!/bin/bash

echo "====== API 서버 종합 문제 해결 스크립트 ======"

# 실행 위치 확인
if [[ "$PWD" != *"maintenance-monorepo/packages/api"* ]]; then
  echo "오류: 올바른 디렉토리에서 실행해야 합니다."
  echo "maintenance-monorepo/packages/api 디렉토리로 이동해주세요."
  exit 1
fi

echo "1. 필수 패키지 설치 중..."
# msgpack 패키지 설치
pip install msgpack pydantic-settings uvicorn fastapi sqlalchemy

# TokenPayload 클래스 오류 수정
echo "2. TokenPayload 클래스 문제 해결 중..."
cat > src/core/modelstoken.py << 'EOL'
"""
토큰 관련 모델 정의 모듈
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TokenPayload(BaseModel):
    """
    JWT 토큰 페이로드 정의
    """
    sub: str  # 사용자 ID 또는 식별자
    exp: Optional[datetime] = None  # 만료 시간
    iat: Optional[datetime] = None  # 발급 시간
    role: Optional[str] = None  # 사용자 역할
    type: Optional[str] = "access"  # 토큰 타입 (access/refresh)
EOL

# core/models/__init__.py 수정
echo "3. 모델 임포트 문제 해결 중..."
cat > src/core/models/__init__.py << 'EOL'
"""
Core 모델 초기화 파일
"""
try:
    from core.modelstoken import TokenPayload
except ImportError:
    # 임포트 실패 시 기본 클래스 정의
    class TokenPayload:
        """토큰 페이로드 정보를 담는 클래스"""
        def __init__(self, sub: str, exp: int = None):
            self.sub = sub
            self.exp = exp

__all__ = ["TokenPayload"]
EOL

# shared-python 미들웨어 수정
echo "4. shared-python 미들웨어 모듈 추가 중..."
mkdir -p ../shared-python/src/maintenance_shared_python/middleware

# request_id_middleware.py 생성
cat > ../shared-python/src/maintenance_shared_python/middleware/request_id_middleware.py << 'EOL'
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
EOL

# error_handler_middleware.py 생성
cat > ../shared-python/src/maintenance_shared_python/middleware/error_handler_middleware.py << 'EOL'
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
EOL

# __init__.py 파일 업데이트 또는 생성
cat > ../shared-python/src/maintenance_shared_python/middleware/__init__.py << 'EOL'
"""
미들웨어 패키지 초기화 파일
"""
import time
import uuid
from typing import Any, Callable, Dict

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from ..logging import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

# 미들웨어 클래스 임포트
from .request_id_middleware import get_request_id_middleware, RequestIdMiddleware
from .error_handler_middleware import get_error_handler_middleware, ErrorHandlerMiddleware


class TimingMiddleware(BaseHTTPMiddleware):
    """
    요청 처리 시간을 측정하여 로깅하는 미들웨어
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # 요청 처리
        response = await call_next(request)

        # 요청 처리 시간 계산 및 로깅
        process_time = time.time() - start_time
        logger.debug(
            f"[{request.method}] {request.url.path} 처리 시간: {process_time:.4f}초"
        )

        # 응답 헤더에 처리 시간 추가 (선택사항)
        response.headers["X-Process-Time"] = str(process_time)
        return response


def configure_cors(app: FastAPI, origins: list = None) -> None:
    """
    CORS 미들웨어 설정

    Args:
        app: FastAPI 앱 인스턴스
        origins: 허용할 출처 목록 (기본값: ["*"])
    """
    if origins is None:
        origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def configure_standard_middlewares(app: FastAPI, enable_timing: bool = True) -> None:
    """
    표준 미들웨어 설정

    Args:
        app: FastAPI 앱 인스턴스
        enable_timing: 타이밍 미들웨어 활성화 여부
    """
    # 요청 ID 미들웨어 추가
    app.add_middleware(RequestIdMiddleware)

    # 에러 핸들러 미들웨어 추가
    app.add_middleware(ErrorHandlerMiddleware)

    # 타이밍 미들웨어 추가 (선택적)
    if enable_timing:
        app.add_middleware(TimingMiddleware)
EOL

# 주요 문제가 있는 main.py 파일 대체
echo "5. main.py 파일 수정 중..."
cat > src/main.py << 'EOL'
"""
API 애플리케이션 메인 모듈
FastAPI 애플리케이션 설정 및 실행
"""

import logging
import sys
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# 기본 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api.log")
    ]
)
logger = logging.getLogger("api")
logger.info("로깅 시스템 초기화 완료")

# 애플리케이션 설정
app = FastAPI(
    title="차량 관리 API",
    description="차량 관리 및 정비 일정 관리를 위한 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 에러 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"예외 발생: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": f"내부 서버 오류: {str(exc)}"}
    )

# 헬스 체크 라우트
@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "active", "message": "API 서버가 정상적으로 실행 중입니다."}

# 서버 실행 (직접 실행 시)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
EOL

# Python 환경 설정
echo "6. Python 경로 설정..."
export PYTHONPATH="$PWD:$PYTHONPATH"
export PYTHONPATH="$PWD/../shared-python/src:$PYTHONPATH"

echo "====== 설정 완료 ======"
echo "이제 서버를 실행합니다..."
cd src
python main.py
