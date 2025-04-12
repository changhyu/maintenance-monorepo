#!/bin/bash

# 데이터베이스 초기화 스크립트

echo "데이터베이스 초기화 스크립트 실행 중..."

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

# 데이터베이스 연결 정보 설정
echo "데이터베이스 연결 정보 설정 중..."

# DB 환경 설정 파일
DB_CONFIG=".db_config"

# DB_CONFIG 파일이 있으면 로드, 없으면 새로 생성
if [ -f "$DB_CONFIG" ]; then
  echo "기존 데이터베이스 설정을 로드합니다"
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
  echo "새 데이터베이스 설정을 생성했습니다"
  echo "생성된 비밀번호: $DB_PASSWORD"
  echo "이 비밀번호는 .db_config 파일에 저장되어 있습니다"
fi

# 데이터베이스 URL 생성
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Prisma 데이터베이스 생성 및 스키마 적용
echo "Prisma 데이터베이스 설정 중..."
cd packages/database

# .env 파일이 존재하는지 확인
if [ ! -f "prisma/.env" ] || grep -q "postgres:postgres" "prisma/.env"; then
  echo "Prisma 환경 변수 파일 생성 중..."
  mkdir -p prisma
  cat > prisma/.env << EOL
DATABASE_URL="$DB_URL"
EOL
  echo "안전한 데이터베이스 연결 정보가 설정되었습니다"
else
  echo "이미 존재하는 Prisma 환경 변수 파일을 사용합니다"
fi

# PostgreSQL 데이터베이스 실행 확인
echo "PostgreSQL 데이터베이스 연결 확인 중..."
if command -v pg_isready > /dev/null; then
  if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo "PostgreSQL 서버 연결 성공"
  else
    echo "경고: PostgreSQL 서버가 실행 중이 아니거나 연결할 수 없습니다."
    echo "PostgreSQL이 설치되고 실행 중인지 확인하세요."
    echo "연결 정보: $DB_HOST:$DB_PORT, 사용자: $DB_USER"
    exit 1
  fi
else
  echo "경고: PostgreSQL 클라이언트 도구가 설치되어 있지 않습니다."
  echo "데이터베이스 연결을 확인할 수 없습니다."
fi

# Prisma 데이터베이스 생성 및 마이그레이션
echo "Prisma 데이터베이스 설정 중..."
npx prisma db push --accept-data-loss --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma

echo "데이터베이스 초기화 완료"
cd ../../

# API 서버 환경 변수 설정
echo "API 서버 환경 변수 설정 중..."
if [ ! -f "packages/api/.env" ] || grep -q "postgres:postgres" "packages/api/.env"; then
  echo "API 서버 환경 변수 파일 생성 중..."
  cat > packages/api/.env << EOL
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=$DB_URL
EOL
  echo "API 서버 환경 변수 설정 완료"
else
  echo "이미 존재하는 API 환경 변수 파일을 사용합니다"
fi

# Python API 서버 가상환경 설정
echo "Python API 가상환경 설정 중..."
cd packages/api

# 가상환경 존재 확인 및 생성
if [ ! -d ".venv" ]; then
  echo "Python 가상환경 생성 중..."
  python -m venv .venv
fi

# 패키지 설치
echo "Python 패키지 설치 중..."
./.venv/bin/pip install -r requirements.txt

echo "API 서버 설정 완료"
cd ../../

echo "초기화 스크립트 실행 완료"
echo ""
echo "데이터베이스 설정 정보:"
echo "호스트: $DB_HOST"
echo "포트: $DB_PORT"
echo "데이터베이스: $DB_NAME"
echo "사용자: $DB_USER"
echo "비밀번호: $DB_PASSWORD"
echo ""
echo "이 정보는 .db_config 파일에도 저장되어 있습니다." 