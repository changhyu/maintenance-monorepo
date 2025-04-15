#!/bin/bash

# 모든 문제 해결 최종 스크립트

echo "========== 프로젝트 문제 최종 해결 ==========\n"

# 스크립트에 실행 권한 부여
echo "1. 스크립트에 실행 권한 부여..."
chmod +x fix_database.py fix_config.py fix_npm_deps.sh fix_port.py restart_project.sh fix_concurrently.sh fix_npm_deps_force.sh

# dependencies.py 파일 끝의 \n 문자 제거
echo "2. dependencies.py 파일 수정..."
if grep -q "\\\n" "packages/api/src/core/dependencies.py"; then
  sed -i '' 's/\\n$//' "packages/api/src/core/dependencies.py"
  echo "✓ dependencies.py 파일의 구문 오류 수정 완료"
fi

# 포트 충돌 해결
echo "3. API 서버 포트 변경..."
python fix_port.py 8080

# concurrently 패키지 설치 및 package.json 수정
echo "4. concurrently 패키지 설치 및 설정..."
./fix_concurrently.sh

# npm 의존성 충돌 해결 (강제 옵션 사용)
echo "5. npm 의존성 충돌 강제 해결..."
./fix_npm_deps_force.sh

echo "\n========== 모든 수정 완료 ==========\n"
echo "이제 프로젝트를 시작하려면:"
echo "npm run dev:api - API 서버 실행(포트 8080)"
echo "npm run dev:frontend - 프론트엔드 서버 실행"
echo "npm run dev:all - 모든 서버 함께 실행"