#!/bin/bash

# Prisma 의존성 버전 수정 스크립트

echo "Prisma 의존성 버전 수정 시작..."

# 루트 package.json에서 @prisma/client 버전 변경
echo "1. 루트 package.json 수정 중..."
sed -i '' 's/"@prisma\/client": "\^6.7.1"/"@prisma\/client": "\^5.7.1"/' package.json

# 각 패키지의 package.json 확인 및 수정
echo "2. 패키지별 package.json 수정 중..."
for pkg_dir in packages/*/; do
  pkg_json="${pkg_dir}package.json"
  if [ -f "$pkg_json" ]; then
    echo "패키지 ${pkg_dir} 수정 중..."
    sed -i '' 's/"@prisma\/client": "\^6.7.1"/"@prisma\/client": "\^5.7.1"/' "$pkg_json"
    # prisma 개발 의존성도 수정
    sed -i '' 's/"prisma": "\^6.[0-9].[0-9]"/"prisma": "\^5.7.1"/' "$pkg_json"
  fi
done

echo "Prisma 버전 수정 완료!"
echo "이제 npm 의존성을 다시 설치하세요: ./fix_npm_deps_force.sh" 