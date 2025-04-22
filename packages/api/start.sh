#!/bin/bash

# API 서버 시작 스크립트
echo "API 서버를 시작합니다..."

# 이전 프로세스 종료
echo "이전 API 서버 프로세스를 종료합니다..."
pkill -f "python src/main.py" || true

# 포트 설정
export PORT=8081

# 직접 실행 (포그라운드 모드)
python src/main.py 