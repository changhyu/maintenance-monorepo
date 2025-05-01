#!/bin/bash

echo "====== 업데이트된 API 서버 실행 스크립트 ======"

# 현재 경로 확인
CURRENT_DIR=$(pwd)
echo "현재 위치: $CURRENT_DIR"

# 필요한 패키지 설치
echo "필수 패키지 설치 중..."
pip install msgpack pydantic-settings fastapi uvicorn sqlalchemy

# Python 환경 설정
echo "Python 경로 설정 중..."
export PYTHONPATH="$PWD:$PYTHONPATH"
export PYTHONPATH="$PWD/../shared-python/src:$PYTHONPATH"

# 업데이트된 main.py로 복사
echo "업데이트된 main.py 파일 적용 중..."
cp src/main_updated.py src/main.py

# 서버 실행
echo "서버를 실행합니다..."
cd src
python main.py
