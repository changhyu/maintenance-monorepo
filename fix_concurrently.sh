#!/bin/bash

# concurrently 패키지 로컬 설치 스크립트

echo "concurrently 패키지를 로컬 의존성으로 설치 중..."

# 로컬 패키지 설치 (--save-dev 옵션 사용)
npm install --save-dev concurrently

# package.json의 scripts 섹션 수정
echo "package.json 파일 수정 중..."

# 임시 파일에 수정 내용 저장
cat package.json | sed 's|"dev:all": "concurrently \\"npm run dev:api\\" \\"npm run dev:frontend\\""|"dev:all": "concurrently \\"npm run dev:api\\" \\"npm run dev:frontend\\""|g' > package.json.tmp

# 원본 파일 대체
mv package.json.tmp package.json

echo "✓ concurrently 패키지 설치 및 package.json 수정 완료"
echo "이제 다음 명령어로 모든 서버를 함께 실행할 수 있습니다:"
echo "npm run dev:all" 