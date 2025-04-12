#!/bin/bash

# 가상 환경 확인 및 생성
if [ ! -d ".venv" ]; then
    echo "가상 환경이 존재하지 않습니다. 새로 생성합니다..."
    python -m venv .venv
    ./.venv/bin/pip install -r requirements.txt
fi

# API 서버 실행
./.venv/bin/python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
