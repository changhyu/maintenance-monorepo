#!/bin/bash

# 실행 권한 설정
chmod +x "$0"

# 설정 스크립트
echo "====== API 서버 실행 스크립트 ======"

# 현재 경로를 확인
CURRENT_DIR=$(pwd)
echo "현재 위치: $CURRENT_DIR"

# 실행 위치가 맞는지 확인
if [[ "$CURRENT_DIR" != *"maintenance-monorepo/packages/api"* ]]; then
  echo "경고: 올바른 디렉토리에서 실행하고 있지 않을 수 있습니다."
  echo "maintenance-monorepo/packages/api 디렉토리에서 실행해주세요."
  exit 1
fi

# Python 경로 설정
export PYTHONPATH="$PYTHONPATH:$(pwd)"
export PYTHONPATH="$PYTHONPATH:$(pwd)/../shared-python/src"
echo "Python 경로 설정됨: $PYTHONPATH"

# 필수 패키지 설치
echo "====== 필수 패키지 설치 ======"
pip install msgpack pydantic-settings
echo "패키지 설치 완료"

# shared-python 미들웨어 확인
MIDDLEWARE_DIR="../shared-python/src/maintenance_shared_python/middleware"
if [ -f "$MIDDLEWARE_DIR/request_id_middleware.py" ]; then
  echo "request_id_middleware.py 파일이 존재합니다."
else
  echo "request_id_middleware.py 파일이 존재하지 않습니다. 생성합니다."
  # 디렉토리 확인 및 생성
  mkdir -p "$MIDDLEWARE_DIR"
  
  # request_id_middleware.py 파일 생성
  cat > "$MIDDLEWARE_DIR/request_id_middleware.py" << 'EOL'
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
        # 요청 상태에 ID 저장
        request.state.request_id = request_id
        
        # 요청 처리
        response = await call_next(request)
        
        # 응답 헤더에 ID 추가
        response.headers["X-Request-ID"] = request_id
        
        return response

def get_request_id_middleware():
    """
    RequestIdMiddleware 인스턴스를 반환
    """
    return RequestIdMiddleware()
EOL

  # __init__.py 파일 업데이트
  if [ -f "$MIDDLEWARE_DIR/__init__.py" ]; then
    echo -e "\nfrom .request_id_middleware import get_request_id_middleware" >> "$MIDDLEWARE_DIR/__init__.py"
    echo "__init__.py 파일이 업데이트되었습니다."
  else
    echo "경고: __init__.py 파일이 존재하지 않습니다. 수동으로 확인해주세요."
  fi
fi

# 서버 실행
echo "====== API 서버 실행 ======"
python src/main.py
