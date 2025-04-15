#!/bin/bash

# 중요 오류 해결 스크립트를 실행합니다
echo "1. 문제 해결 스크립트 실행..."
python fix_all_issues.py
python fix_config.py

# 패키지 설치 여부 확인 후 설치
echo "2. 패키지 종속성 확인 및 설치..."
if [ ! -d "node_modules" ]; then
  npm install
fi

# 필요한 패키지 디렉토리 확인
for pkg in frontend api database shared api-client; do
  if [ ! -d "packages/$pkg/node_modules" ] && [ -f "packages/$pkg/package.json" ]; then
    echo "패키지 $pkg의 의존성 설치..."
    (cd "packages/$pkg" && npm install)
  fi
done

# API 서버에 실행 권한 부여
echo "3. API 서버 스크립트에 실행 권한 부여..."
chmod +x packages/api/run.sh

# 서버 시작
echo "4. 서버 시작..."
echo "프론트엔드 서버를 시작하려면: npm run dev:frontend"
echo "API 서버를 시작하려면: npm run dev:api"
echo "모든 서버를 함께 시작하려면: npm run dev:all"

# 사용자 선택에 따라 서버 시작
echo "어떤 서버를 시작하시겠습니까?"
echo "1) API 서버"
echo "2) 프론트엔드 서버"
echo "3) 모든 서버"
echo "4) 종료"

read -p "선택 (1-4): " choice

case $choice in
  1)
    npm run dev:api
    ;;
  2)
    npm run dev:frontend
    ;;
  3)
    npm run dev:all
    ;;
  4)
    echo "종료합니다."
    exit 0
    ;;
  *)
    echo "잘못된 선택입니다. 종료합니다."
    exit 1
    ;;
esac 