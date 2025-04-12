#!/bin/bash

# 보안 취약점 해결
echo "보안 취약점 해결 중..."
npm audit fix --legacy-peer-deps

# 데이터베이스 초기화 
echo "데이터베이스 초기화 중..."
bash init-db.sh

# 모노레포 빌드
echo "모노레포 빌드 중..."
npm run build

# 백엔드 API 실행
echo "백엔드 API 실행 중..."
cd packages/api
source .venv/bin/activate
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
cd ../..

echo "서비스가 실행되었습니다."
echo "백엔드 API: http://localhost:8000"
echo "종료하려면 Ctrl+C를 누르세요."

# 신호 처리 설정
trap "kill $API_PID 2>/dev/null; exit 0" SIGINT

# 프로세스가 종료될 때까지 대기
wait
