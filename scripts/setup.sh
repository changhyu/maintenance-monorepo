#!/bin/bash

# 차량 정비 관리 시스템 - 통합 설정 스크립트
# 이 스크립트는 기존의 여러 fix_* 스크립트를 통합하여 개발 환경 설정을 간소화합니다.

set -e  # 오류 발생 시 스크립트 중단

# 컬러 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== 차량 정비 관리 시스템 - 개발 환경 설정 ==========\n${NC}"

# 1. 환경 확인
echo -e "${YELLOW}1. 환경 확인 중...${NC}"

# Node.js 버전 확인
NODE_VERSION=$(node -v)
echo -e "- Node.js 버전: ${NODE_VERSION}"
if [[ "${NODE_VERSION:1:2}" -lt 16 ]]; then
  echo -e "${RED}오류: Node.js 버전이 16 이상이어야 합니다.${NC}"
  exit 1
fi

# npm 버전 확인
NPM_VERSION=$(npm -v | cut -d. -f1)
echo -e "- npm 버전: $(npm -v)"
if [[ "$NPM_VERSION" -lt 8 ]]; then
  echo -e "${RED}오류: npm 버전이 8 이상이어야 합니다.${NC}"
  exit 1
fi

# Python 확인
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo -e "- Python 버전: ${PYTHON_VERSION}"
if [[ "${PYTHON_VERSION:0:1}" -lt 3 || ("${PYTHON_VERSION:0:1}" -eq 3 && "${PYTHON_VERSION:2:1}" -lt 8) ]]; then
  echo -e "${RED}오류: Python 3.8 이상이 필요합니다.${NC}"
  exit 1
fi

# Docker 확인
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  echo -e "- Docker 버전: ${DOCKER_VERSION}"
else
  echo -e "${RED}경고: Docker가 설치되어 있지 않습니다. Docker 환경에서 실행하려면 Docker를 설치하세요.${NC}"
fi

echo -e "${GREEN}✓ 환경 확인 완료${NC}\n"

# 2. 의존성 설치
echo -e "${YELLOW}2. 의존성 설치 중...${NC}"

# Node.js 의존성 설치
echo -e "- Node.js 의존성 설치 중..."
npm install

# Python 가상환경 설정 (API 서비스용)
echo -e "- Python 의존성 설치 중..."
cd packages/api || exit 1
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..

echo -e "${GREEN}✓ 의존성 설치 완료${NC}\n"

# 3. 환경 변수 설정
echo -e "${YELLOW}3. 환경 변수 설정 중...${NC}"

# .env 파일 생성 (없는 경우)
if [ ! -f ".env" ]; then
  echo -e "- .env 파일 생성 중..."
  echo "NODE_ENV=development" > .env
  echo "PYTHON_ENV=development" >> .env
fi

# .env.db 파일 생성 (없는 경우)
if [ ! -f ".env.db" ]; then
  echo -e "- .env.db 파일 생성 중..."
  echo "POSTGRES_USER=postgres" > .env.db
  echo "POSTGRES_PASSWORD=postgres" >> .env.db
  echo "POSTGRES_DB=maintenance" >> .env.db
fi

# API 서비스용 .env 파일 생성 (없는 경우)
if [ ! -f "packages/api/.env" ]; then
  echo -e "- packages/api/.env 파일 생성 중..."
  echo "DATABASE_URL=postgresql://postgres:postgres@db:5432/maintenance" > packages/api/.env
  echo "SECRET_KEY=dev_secret_key_change_in_production" >> packages/api/.env
  echo "ENVIRONMENT=development" >> packages/api/.env
  echo "DEBUG=true" >> packages/api/.env
  echo "API_PORT=8000" >> packages/api/.env
fi

# 프론트엔드용 .env 파일 생성 (없는 경우)
if [ ! -f "packages/frontend/.env" ]; then
  echo -e "- packages/frontend/.env 파일 생성 중..."
  echo "VITE_API_URL=http://localhost:8000" > packages/frontend/.env
fi

echo -e "${GREEN}✓ 환경 변수 설정 완료${NC}\n"

# 4. 스크립트 권한 설정
echo -e "${YELLOW}4. 스크립트 권한 설정 중...${NC}"

# API 서비스 스크립트 실행 권한 부여
chmod +x packages/api/run.sh
chmod +x packages/api/start.sh

# 기타 스크립트 실행 권한 부여
find scripts -name "*.sh" -exec chmod +x {} \;

echo -e "${GREEN}✓ 스크립트 권한 설정 완료${NC}\n"

# 5. API 포트 설정 (필요한 경우)
echo -e "${YELLOW}5. API 서비스 포트 설정 중...${NC}"

# 포트 값을 8000으로 설정
PORT=8000
sed -i.bak "s/API_PORT=.*/API_PORT=$PORT/" packages/api/.env
rm -f packages/api/.env.bak 2>/dev/null || true

echo -e "${GREEN}✓ API 서비스 포트가 ${PORT}으로 설정되었습니다${NC}\n"

# 6. Docker 환경 설정 (선택 사항)
if command -v docker &> /dev/null; then
  echo -e "${YELLOW}6. Docker 환경 설정 중...${NC}"
  
  # Docker Compose 파일 확인
  if [ -f "docker-compose.yml" ]; then
    echo -e "- Docker Compose 환경 확인 중..."
  else
    echo -e "${RED}경고: docker-compose.yml 파일을 찾을 수 없습니다.${NC}"
  fi
  
  echo -e "${GREEN}✓ Docker 환경 설정 완료${NC}\n"
fi

echo -e "${BLUE}========== 설정 완료 ==========\n${NC}"
echo -e "개발 환경이 성공적으로 설정되었습니다."
echo -e "다음 명령어로 개발을 시작할 수 있습니다:"
echo -e "- ${GREEN}npm run dev:all${NC} - API 및 프론트엔드 서버 함께 실행"
echo -e "- ${GREEN}npm run dev:api${NC} - API 서버만 실행"
echo -e "- ${GREEN}npm run dev:frontend${NC} - 프론트엔드 서버만 실행"
echo -e "- ${GREEN}npm run docker:dev${NC} - Docker 환경에서 개발 서버 실행"

echo -e "\n질문이나 문제가 있으면 README.md 파일을 참조하세요."