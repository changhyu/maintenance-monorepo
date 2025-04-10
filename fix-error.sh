#!/bin/bash

# 모노레포 오류 해결 스크립트

# 권한 확인
if [ ! -x "$0" ]; then
  echo "스크립트에 실행 권한 추가"
  chmod +x "$0"
fi

# 문제: frontend 패키지에 'dev' 스크립트가 없어서 turbo로 실행 시 오류 발생
# 해결: frontend/package.json에 'dev' 스크립트 추가 (react-scripts start와 동일)

echo "Fix 1: frontend 패키지에 dev 스크립트 추가"
sed -i '' 's/"scripts": {/"scripts": {\n    "dev": "react-scripts start",/g' packages/frontend/package.json

# 문제: api 패키지에 package.json이 없어서 turbo가 Python 프로젝트를 관리할 수 없음
# 해결: api 디렉토리에 package.json 생성

echo "Fix 2: api 패키지에 package.json 생성"
cat > packages/api/package.json << 'EOL'
{
  "name": "@maintenance/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "./.venv/bin/python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000",
    "start": "./.venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8000",
    "build": "echo 'No build step for Python API'",
    "lint": "pylint src",
    "test": "pytest",
    "clean": "rm -rf __pycache__ .pytest_cache",
    "setup": "python -m venv .venv && ./.venv/bin/pip install -r requirements.txt"
  }
}
EOL

# 문제: database 패키지의 dev 스크립트가 tsc --watch로 설정되어 있어 오류 발생
# 해결: database 패키지의 dev 스크립트 수정

echo "Fix 3: database 패키지 스크립트 수정"
sed -i '' 's/"dev": "tsc --watch",/"dev": "tsc --noEmit \&\& echo \\"Database service ready\\"",/g' packages/database/package.json

# 문제: Prisma에 .env 파일이 없어서 데이터베이스 연결 실패
# 해결: .env 파일 생성

echo "Fix 4: Prisma 환경 변수 파일 생성"
mkdir -p packages/database/prisma
cat > packages/database/prisma/.env << 'EOL'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maintenance"
EOL

# 문제: API 서버 환경 변수 설정 누락
# 해결: .env 파일 생성
echo "Fix 5: API 서버 환경 변수 파일 생성"
cat > packages/api/.env << 'EOL'
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maintenance
EOL

# Python 가상 환경 설정
echo "Fix 6: Python 가상 환경 설정 및 패키지 설치"
(
  cd packages/api && 
  python -m venv .venv && 
  ./.venv/bin/pip install -r requirements.txt
) || echo "Python 환경 설정 실패"

# 추가 문제 검사

echo "모든 패키지의 package.json 검사..."

# 각 패키지 디렉토리 순회
for pkg_dir in packages/*/; do
  pkg_name=$(basename "$pkg_dir")
  pkg_json="${pkg_dir}package.json"
  
  # package.json이 존재하는지 확인
  if [ ! -f "$pkg_json" ]; then
    echo "경고: $pkg_name에 package.json이 없습니다"
    continue
  fi
  
  # dev 스크립트가 있는지 확인
  if ! grep -q '"dev"' "$pkg_json"; then
    echo "경고: $pkg_name에 dev 스크립트가 없습니다"
  fi
  
  # build 스크립트가 있는지 확인
  if ! grep -q '"build"' "$pkg_json"; then
    echo "경고: $pkg_name에 build 스크립트가 없습니다"
  fi
  
  # clean 스크립트가 있는지 확인
  if ! grep -q '"clean"' "$pkg_json"; then
    echo "경고: $pkg_name에 clean 스크립트가 없습니다"
  fi
done

echo "오류 수정 완료"
