#!/bin/bash

echo "====== API 서버 문제 해결 스크립트 ======"

# 실행 위치 확인
if [[ "$PWD" != *"maintenance-monorepo/packages/api"* ]]; then
  echo "오류: 올바른 디렉토리에서 실행해야 합니다."
  echo "maintenance-monorepo/packages/api 디렉토리로 이동해주세요."
  exit 1
fi

echo "1. 필수 패키지 설치 중..."
# msgpack 패키지 설치
pip install msgpack pydantic-settings

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
from core.modelstoken import TokenPayload

__all__ = ["TokenPayload"]
EOL

# routing.py 수정
echo "4. 라우팅 모듈 수정 중..."
cat > src/routing.py << 'EOL'
"""
FastAPI 라우팅 구성 모듈
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

# 로깅 설정 함수 정의
def setup_logging():
    import logging
    logger = logging.getLogger("api")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
        logger.addHandler(handler)
    return logger

# 로깅 설정
logger = setup_logging()

# 기본 라우터 생성
auth = APIRouter()
maintenance_records = APIRouter()
notifications = APIRouter() 
schedules = APIRouter()
shops = APIRouter()
vehicles = APIRouter()
admin = APIRouter()
vehicle_inspection_router = APIRouter()

def configure_routes(app: FastAPI) -> None:
    """
    모든 라우터 설정을 적용
    """
    try:
        # 명시적 라우터 등록
        _register_explicit_routers(app)

        # 헬스 체크 및 기타 기본 엔드포인트 설정
        _setup_health_endpoints(app)

        logger.info("모든 라우터 설정이 완료되었습니다")
    except Exception as e:
        logger.error(f"라우터 설정 중 오류 발생: {e}")


def _register_explicit_routers(app: FastAPI) -> None:
    """명시적으로 정의된 주요 라우터 등록"""
    try:
        app.include_router(auth, prefix="/api/auth", tags=["인증"])
        app.include_router(vehicles, prefix="/api/vehicles", tags=["차량"])
        app.include_router(maintenance_records, prefix="/api/maintenance", tags=["정비"])
        app.include_router(schedules, prefix="/api/schedules", tags=["일정"])
        app.include_router(shops, prefix="/api/shops", tags=["정비소"])
        app.include_router(notifications, prefix="/api/notifications", tags=["알림"])
        app.include_router(admin, prefix="/api/admin", tags=["관리자"])
        
        # 법정검사 라우터 등록
        app.include_router(vehicle_inspection_router, prefix="/api/vehicle-inspections", tags=["법정검사"])
        
        logger.debug("명시적 라우터가 등록되었습니다")
    except Exception as e:
        logger.error(f"라우터 등록 중 오류 발생: {e}")


def _setup_health_endpoints(app: FastAPI) -> None:
    """헬스 체크 및 상태 확인 엔드포인트 설정"""

    @app.get("/", response_model=Dict[str, Any], tags=["상태"])
    @app.get("/health", response_model=Dict[str, Any], tags=["상태"])
    async def health_check() -> Dict[str, Any]:
        """서비스 상태 확인 엔드포인트"""
        return {
            "status": "active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "environment": "development"
        }

    logger.debug("헬스 체크 엔드포인트가 설정되었습니다")
EOL

# Python 환경 설정
echo "5. Python 경로 설정..."
export PYTHONPATH="$PWD:$PYTHONPATH"
export PYTHONPATH="$PWD/../shared-python/src:$PYTHONPATH"

echo "6. request_id_middleware 모듈 생성..."
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

# __init__.py 파일 업데이트
if [ -f "../shared-python/src/maintenance_shared_python/middleware/__init__.py" ]; then
    echo "from .request_id_middleware import get_request_id_middleware" >> ../shared-python/src/maintenance_shared_python/middleware/__init__.py
    echo "request_id_middleware 모듈이 추가되었습니다."
else
    cat > ../shared-python/src/maintenance_shared_python/middleware/__init__.py << 'EOL'
"""
미들웨어 패키지 초기화 파일
"""
from .request_id_middleware import get_request_id_middleware
EOL
    echo "request_id_middleware __init__.py 파일이 생성되었습니다."
fi

echo "====== 설정 완료 ======"
echo "이제 서버를 실행합니다..."
python src/main.py
