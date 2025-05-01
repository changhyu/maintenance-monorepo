#!/bin/bash

echo "====== 향상된 API 서버 실행 스크립트 ======"

# 현재 경로 확인
CURRENT_DIR=$(pwd)
echo "현재 위치: $CURRENT_DIR"

# 실행 위치가 맞는지 확인
if [[ "$CURRENT_DIR" != *"maintenance-monorepo/packages/api"* ]]; then
  echo "경고: 올바른 디렉토리에서 실행하고 있지 않을 수 있습니다."
  echo "maintenance-monorepo/packages/api 디렉토리에서 실행해주세요."
  exit 1
fi

# 필요한 패키지 설치
echo "필수 패키지 설치 중..."
pip install msgpack pydantic-settings pydantic[email] fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart

# Python 환경 설정
echo "Python 경로 설정 중..."
export PYTHONPATH="$PWD:$PYTHONPATH"
export PYTHONPATH="$PWD/../shared-python/src:$PYTHONPATH"

# 향상된 버전으로 복사
echo "향상된 버전 적용 중..."
cp src/main_enhanced.py src/main.py

# 서버 실행
echo "향상된 서버를 실행합니다..."
cd src
python3 main.py
