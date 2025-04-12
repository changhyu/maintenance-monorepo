#!/bin/bash

# API 디렉토리 경로 설정
cd "$(dirname "$(dirname "$(dirname "$0")")")" || exit 1

# 가상환경 생성 및 활성화
python3 -m venv .venv
source .venv/bin/activate

# 패키지 설치
pip install -e . > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# 환경 변수 설정
export PYTHONPATH="$PWD:$PYTHONPATH"
export DATABASE_URL="postgresql://gongchanghyeon@localhost:5432/maintenance"

# 테스트 데이터 생성 스크립트 실행
echo "테스트 데이터 생성 스크립트 실행 중..."
python3 src/scripts/create_test_data.py 