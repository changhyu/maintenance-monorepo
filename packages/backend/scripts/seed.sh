#!/bin/bash

# 환경 변수 로드
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# 가상 환경 활성화 (있는 경우)
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# 시드 스크립트 실행
echo "시드 데이터 삽입 시작..."
python src/api/v1/database/seeds/seed.py

# 실행 결과 확인
if [ $? -eq 0 ]; then
  echo "시드 데이터 삽입이 완료되었습니다."
else
  echo "시드 데이터 삽입 중 오류가 발생했습니다."
  exit 1
fi

# 가상 환경 비활성화 (활성화된 경우)
if [ -d "venv" ]; then
  deactivate
fi 