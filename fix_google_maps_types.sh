#!/bin/bash

# @types/google.maps 버전 수정 스크립트

echo "@types/google.maps 버전 수정 시작..."

# 최신 안정 버전을 사용 (3.54.10)
NEW_VERSION="3.54.10"

# 루트 package.json에서 @types/google.maps 버전 변경
echo "1. 루트 package.json 수정 중..."
sed -i '' 's/"@types\/google.maps": "\^3.59.0"/"@types\/google.maps": "\^'$NEW_VERSION'"/' package.json

# 각 패키지의 package.json 확인 및 수정
echo "2. 패키지별 package.json 수정 중..."
for pkg_dir in packages/*/; do
  pkg_json="${pkg_dir}package.json"
  if [ -f "$pkg_json" ]; then
    echo "패키지 ${pkg_dir} 수정 중..."
    sed -i '' 's/"@types\/google.maps": "\^3.59.0"/"@types\/google.maps": "\^'$NEW_VERSION'"/' "$pkg_json"
  fi
done

echo "@types/google.maps 버전 수정 완료! (버전 ^$NEW_VERSION으로 변경)"
echo "이제 npm 의존성을 다시 설치하세요: ./fix_npm_deps_force.sh" 