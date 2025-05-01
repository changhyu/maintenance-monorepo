#!/bin/bash

# 필요한 패키지 설치 스크립트
echo "====== 필요한 패키지 설치 ======"
pip install msgpack
echo "msgpack 패키지 설치 완료"

# shared-python에 request_id_middleware 생성
echo "====== shared-python 패키지 확인 및 추가 ======"
MIDDLEWARE_DIR="/Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/shared-python/src/maintenance_shared_python/middleware"

if [ -d "$MIDDLEWARE_DIR" ]; then
    # request_id_middleware.py 파일 생성
    cat > "$MIDDLEWARE_DIR/request_id_middleware.py" << 'EOL'
"""
요청 ID 미들웨어
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
    echo "
from .request_id_middleware import get_request_id_middleware, RequestIdMiddleware" >> "$MIDDLEWARE_DIR/__init__.py"
    echo "middleware 패키지에 request_id_middleware 추가됨"
else
    echo "middleware 디렉토리를 찾을 수 없습니다. 경로를 확인해주세요."
fi

# 프로젝트 실행을 위한 추가 패키지
pip install pydantic-settings

echo "====== 설치 완료 ======"
echo "이제 다음 명령으로 서버를 실행하세요:"
echo "cd /Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/api"
echo "python -m src.main"
