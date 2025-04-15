#!/bin/bash

# npm 의존성 충돌 해결 스크립트

echo "npm 의존성 충돌 해결을 시작합니다..."

# 루트 패키지 설치
echo "1. 루트 패키지 의존성 설치 중..."
npm install --legacy-peer-deps

# 각 패키지 디렉토리 의존성 설치
echo "2. 각 패키지 의존성 설치 중..."
for pkg in frontend api database shared api-client; do
  if [ -f "packages/$pkg/package.json" ]; then
    echo "패키지 $pkg의 의존성 설치 중..."
    (cd "packages/$pkg" && npm install --legacy-peer-deps)
  fi
done

# API 서버 스크립트에 실행 권한 부여
echo "3. API 서버 스크립트에 실행 권한 부여..."
chmod +x packages/api/run.sh

echo "모든 의존성 설치가 완료되었습니다!"
echo "이제 다음 명령어로 서버를 실행할 수 있습니다:"
echo "npm run dev:api - API 서버 실행"
echo "npm run dev:frontend - 프론트엔드 서버 실행"
echo "npm run dev:all - 모든 서버 함께 실행" 