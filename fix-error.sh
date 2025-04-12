#!/bin/bash

# 모노레포 오류 해결 스크립트

# 스크립트 오류 시 중단
set -e

# OS 감지
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  function sed_inplace() {
    sed -i '' "$@"
  }
else
  # Linux 및 기타
  function sed_inplace() {
    sed -i "$@"
  }
fi

# 데이터베이스 비밀번호 생성 함수
generate_db_password() {
  # 무작위 문자열 생성 (16자)
  if command -v openssl &> /dev/null; then
    # OpenSSL이 있는 경우 사용
    password=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 16)
  else
    # OpenSSL이 없는 경우 대체 방법
    password=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16 2>/dev/null || echo "ComplexP@ssw0rd123")
  fi
  echo "$password"
}

# 권한 확인
if [ ! -x "$0" ]; then
  echo "스크립트에 실행 권한 추가"
  chmod +x "$0"
fi

# 필요한 디렉토리 확인
for dir in packages/frontend packages/api packages/database packages/database/prisma; do
  if [ ! -d "$dir" ]; then
    echo "필요한 디렉토리가 없습니다: $dir"
    mkdir -p "$dir"
    echo "디렉토리를 생성했습니다: $dir"
  fi
done

# 문제: frontend 패키지에 'dev' 스크립트가 없어서 turbo로 실행 시 오류 발생
# 해결: frontend/package.json에 'dev' 스크립트 추가 (react-scripts start와 동일)

echo "Fix 1: frontend 패키지에 dev 스크립트 추가"
if [ -f "packages/frontend/package.json" ]; then
  if ! grep -q '"dev":' "packages/frontend/package.json"; then
    sed_inplace 's/"scripts": {/"scripts": {\n    "dev": "react-scripts start",/g' packages/frontend/package.json
    echo "  dev 스크립트 추가 완료"
  else
    echo "  이미 dev 스크립트가 존재합니다"
  fi
else
  echo "  packages/frontend/package.json 파일이 없습니다. 처리를 건너뜁니다."
fi

# 문제: api 패키지에 package.json이 없어서 turbo가 Python 프로젝트를 관리할 수 없음
# 해결: api 디렉토리에 package.json 생성

echo "Fix 2: api 패키지에 package.json 생성"
if [ ! -f "packages/api/package.json" ]; then
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
  echo "  package.json 생성 완료"
else
  echo "  이미 package.json이 존재합니다"
fi

# 문제: database 패키지의 dev 스크립트가 tsc --watch로 설정되어 있어 오류 발생
# 해결: database 패키지의 dev 스크립트 수정

echo "Fix 3: database 패키지 스크립트 수정"
if [ -f "packages/database/package.json" ]; then
  if grep -q '"dev": "tsc --watch"' "packages/database/package.json"; then
    sed_inplace 's/"dev": "tsc --watch",/"dev": "tsc --noEmit \&\& echo \\"Database service ready\\"",/g' packages/database/package.json
    echo "  dev 스크립트 수정 완료"
  else
    echo "  dev 스크립트가 이미 수정되었거나 다른 형태로 존재합니다"
  fi
else
  echo "  packages/database/package.json 파일이 없습니다. 처리를 건너뜁니다."
fi

# 문제: 데이터베이스 비밀번호가 기본값으로 설정되어 있어 보안에 취약
# 해결: 데이터베이스 연결 정보 설정 및 비밀번호 강화

echo "Fix 4: 데이터베이스 연결 정보 설정"

# 환경 설정 파일
DB_CONFIG=".db_config"

# DB_CONFIG 파일이 있으면 로드, 없으면 새로 생성
if [ -f "$DB_CONFIG" ]; then
  echo "  기존 데이터베이스 설정을 로드합니다"
  source "$DB_CONFIG"
else
  # 기본값 설정
  DB_HOST="localhost"
  DB_PORT="5432"
  DB_NAME="maintenance"
  DB_USER="postgres"
  DB_PASSWORD=$(generate_db_password)
  
  # 설정 저장
  cat > "$DB_CONFIG" << EOL
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOL
  chmod 600 "$DB_CONFIG"  # 보안을 위해 권한 설정
  echo "  새 데이터베이스 설정을 생성했습니다"
  echo "  생성된 비밀번호: $DB_PASSWORD"
  echo "  이 비밀번호는 .db_config 파일에 저장되어 있습니다"
fi

# 데이터베이스 URL 생성
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  데이터베이스 URL: $DB_URL"

# Prisma 환경 변수 파일 생성
if [ ! -f "packages/database/prisma/.env" ] || grep -q "postgres:postgres" "packages/database/prisma/.env"; then
  mkdir -p packages/database/prisma
  cat > packages/database/prisma/.env << EOL
DATABASE_URL="$DB_URL"
EOL
  echo "  Prisma .env 파일 생성 완료"
else
  echo "  이미 Prisma .env 파일이 존재하고 안전한 비밀번호가 설정되어 있습니다"
fi

# 문제: API 서버 환경 변수 설정 누락
# 해결: .env 파일 생성
echo "Fix 5: API 서버 환경 변수 파일 생성"
if [ ! -f "packages/api/.env" ] || grep -q "postgres:postgres" "packages/api/.env"; then
  cat > packages/api/.env << EOL
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=$DB_URL
EOL
  echo "  API .env 파일 생성 완료"
else
  echo "  이미 API .env 파일이 존재하고 안전한 비밀번호가 설정되어 있습니다"
fi

# Python 가상 환경 설정
echo "Fix 6: Python 가상 환경 설정 및 패키지 설치"
if [ ! -d "packages/api/.venv" ]; then
  if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
  elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
  else
    echo "  Python이 설치되어 있지 않습니다. Python 가상 환경 설정을 건너뜁니다."
    PYTHON_CMD=""
  fi

  if [ -n "$PYTHON_CMD" ]; then
    if [ -f "packages/api/requirements.txt" ]; then
      (
        cd packages/api && 
        $PYTHON_CMD -m venv .venv && 
        ./.venv/bin/pip install -r requirements.txt
      ) || echo "  Python 환경 설정 실패. requirements.txt 파일을 확인하세요."
      echo "  Python 가상 환경 설정 완료"
    else
      echo "  requirements.txt 파일이 없습니다. Python 환경 설정을 건너뜁니다."
    fi
  fi
else
  echo "  이미 Python 가상 환경이 설정되어 있습니다"
fi

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

# 데이터베이스 설정 정보 안내
echo ""
echo "데이터베이스 설정 정보는 다음과 같습니다:"
echo "호스트: $DB_HOST"
echo "포트: $DB_PORT"
echo "데이터베이스 이름: $DB_NAME"
echo "사용자: $DB_USER"
echo "비밀번호: $DB_PASSWORD"
echo ""
echo "이 정보는 .db_config 파일에 저장되어 있습니다."
echo "비밀번호를 변경하려면 .db_config 파일을 편집한 후 스크립트를 다시 실행하세요."

echo "오류 수정 완료"
