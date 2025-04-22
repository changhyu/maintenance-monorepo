#!/bin/bash

# 차량 정비 시스템 유지보수 스크립트
# 이 스크립트는 여러 fix_*.sh 스크립트의 기능을 통합한 것입니다.

set -e  # 오류 발생 시 스크립트 중단

# 컬러 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
  echo -e "사용법: $0 [옵션]"
  echo -e "옵션:"
  echo -e "  ${YELLOW}--setup${NC}          기본 환경 설정 (의존성 설치 및 환경 변수 설정)"
  echo -e "  ${YELLOW}--fix-deps${NC}       의존성 문제 해결 (npm 패키지 충돌 해결)"
  echo -e "  ${YELLOW}--fix-db${NC}         데이터베이스 연결 문제 해결"
  echo -e "  ${YELLOW}--fix-port${NC}       API 서버 포트 충돌 해결"
  echo -e "  ${YELLOW}--fix-all${NC}        모든 문제 해결"
  echo -e "  ${YELLOW}--docker-setup${NC}   Docker 환경 설정"
  echo -e "  ${YELLOW}--help${NC}           도움말 표시"
}

setup_env() {
  echo -e "${BLUE}========== 차량 정비 관리 시스템 - 기본 환경 설정 ==========\n${NC}"
  
  # Node.js 의존성 설치
  echo -e "${YELLOW}Node.js 의존성 설치 중...${NC}"
  npm install
  
  # Python 가상환경 설정 (API 서비스용)
  echo -e "${YELLOW}Python 의존성 설치 중...${NC}"
  cd packages/api || exit 1
  if [ ! -d "venv" ]; then
    python3 -m venv venv
  fi
  source venv/bin/activate
  pip install -r requirements.txt
  deactivate
  cd ../..
  
  # 환경 변수 파일 설정
  echo -e "${YELLOW}환경 변수 파일 설정 중...${NC}"
  if [ ! -f ".env" ]; then
    echo "NODE_ENV=development" > .env
    echo "PYTHON_ENV=development" >> .env
  fi
  
  if [ ! -f ".env.db" ]; then
    echo "POSTGRES_USER=postgres" > .env.db
    echo "POSTGRES_PASSWORD=postgres" >> .env.db
    echo "POSTGRES_DB=maintenance" >> .env.db
  fi
  
  if [ ! -f "packages/api/.env" ]; then
    echo "DATABASE_URL=postgresql://postgres:postgres@db:5432/maintenance" > packages/api/.env
    echo "SECRET_KEY=dev_secret_key_change_in_production" >> packages/api/.env
    echo "ENVIRONMENT=development" >> packages/api/.env
    echo "DEBUG=true" >> packages/api/.env
    echo "API_PORT=8000" >> packages/api/.env
  fi
  
  if [ ! -f "packages/frontend/.env" ]; then
    echo "VITE_API_URL=http://localhost:8000" > packages/frontend/.env
  fi
  
  # 스크립트 실행 권한 설정
  echo -e "${YELLOW}스크립트 실행 권한 설정 중...${NC}"
  chmod +x packages/api/run.sh
  chmod +x packages/api/start.sh
  find scripts -name "*.sh" -exec chmod +x {} \;
  
  echo -e "${GREEN}✓ 기본 환경 설정 완료${NC}\n"
}

fix_dependencies() {
  echo -e "${BLUE}========== npm 의존성 충돌 해결 ==========\n${NC}"
  
  echo -e "${YELLOW}concurrently 패키지 추가 중...${NC}"
  npm install --save-dev concurrently
  
  echo -e "${YELLOW}타입 관련 의존성 버전 충돌 해결 중...${NC}"
  npm install --save-dev @types/file-saver@^2.0.7
  npm install --save-dev @types/google.maps@^3.54.10
  
  echo -e "${YELLOW}Prisma 버전 문제 해결 중...${NC}"
  npm install --save-dev prisma@^5.10.2
  
  echo -e "${YELLOW}의존성 패키지 강제 설치 중...${NC}"
  npm install --force
  
  echo -e "${GREEN}✓ npm 의존성 충돌 해결 완료${NC}\n"
}

fix_database() {
  echo -e "${BLUE}========== 데이터베이스 연결 문제 해결 ==========\n${NC}"
  
  echo -e "${YELLOW}데이터베이스 연결 확인 중...${NC}"
  cd packages/api || exit 1
  python check_db_connection.sh
  cd ../..
  
  echo -e "${GREEN}✓ 데이터베이스 연결 문제 해결 완료${NC}\n"
}

fix_port() {
  echo -e "${BLUE}========== API 서버 포트 충돌 해결 ==========\n${NC}"
  
  local PORT=8000
  echo -e "${YELLOW}API 서버 포트를 ${PORT}로 설정 중...${NC}"
  
  if [ -f "packages/api/.env" ]; then
    sed -i.bak "s/API_PORT=.*/API_PORT=$PORT/" packages/api/.env
    rm -f packages/api/.env.bak 2>/dev/null || true
  else
    echo "API_PORT=$PORT" > packages/api/.env
  fi
  
  echo -e "${GREEN}✓ API 서버 포트를 ${PORT}로 설정 완료${NC}\n"
}

docker_setup() {
  echo -e "${BLUE}========== Docker 환경 설정 ==========\n${NC}"
  
  echo -e "${YELLOW}Docker 구성 파일 확인 중...${NC}"
  if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓ Docker Compose 파일 확인${NC}"
  else
    echo -e "${RED}오류: docker-compose.yml 파일이 존재하지 않습니다.${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}Docker 디렉토리 구조 확인 중...${NC}"
  mkdir -p docker/postgres
  mkdir -p docker/redis
  mkdir -p docker/nginx
  
  if [ ! -f "docker/postgres/init.sql" ]; then
    echo "-- 데이터베이스 초기화 스크립트" > docker/postgres/init.sql
    echo "CREATE DATABASE maintenance;" >> docker/postgres/init.sql
  fi
  
  if [ ! -f "docker/redis/redis.conf" ]; then
    echo "# Redis 설정 파일" > docker/redis/redis.conf
  fi
  
  echo -e "${GREEN}✓ Docker 환경 설정 완료${NC}\n"
}

fix_all() {
  setup_env
  fix_dependencies
  fix_database
  fix_port
  docker_setup
  
  echo -e "${BLUE}========== 모든 문제 해결 완료 ==========\n${NC}"
  echo -e "이제 다음 명령어로 개발을 시작할 수 있습니다:"
  echo -e "  ${GREEN}npm run dev:api${NC} - API 서버 실행"
  echo -e "  ${GREEN}npm run dev:frontend${NC} - 프론트엔드 서버 실행"
  echo -e "  ${GREEN}npm run dev:all${NC} - 모든 서비스 실행"
}

# 파라미터가 없으면 도움말 표시
if [ $# -eq 0 ]; then
  usage
  exit 1
fi

# 파라미터 처리
case "$1" in
  --setup)
    setup_env
    ;;
  --fix-deps)
    fix_dependencies
    ;;
  --fix-db)
    fix_database
    ;;
  --fix-port)
    fix_port
    ;;
  --fix-all)
    fix_all
    ;;
  --docker-setup)
    docker_setup
    ;;
  --help)
    usage
    ;;
  *)
    echo -e "${RED}Error: 알 수 없는 옵션: $1${NC}"
    usage
    exit 1
    ;;
esac

exit 0