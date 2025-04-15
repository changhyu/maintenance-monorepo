#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}차량 정비 관리 시스템 Docker 문제 해결 스크립트${NC}"
echo "===================================================="

# Docker 상태 확인
echo -e "${YELLOW}1. Docker 상태 확인...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker가 실행중이지 않습니다. Docker Desktop을 실행하세요.${NC}"
  exit 1
else
  echo -e "${GREEN}Docker가 정상 실행중입니다.${NC}"
fi

# 컨테이너 상태 확인
echo -e "\n${YELLOW}2. 컨테이너 상태 확인...${NC}"
docker compose ps

# 컨테이너 로그 확인
echo -e "\n${YELLOW}3. 실패한 컨테이너 로그 확인${NC}"
FAILED_CONTAINERS=$(docker compose ps --services --filter "status=exited")

if [ -n "$FAILED_CONTAINERS" ]; then
  echo -e "${RED}실패한 컨테이너가 있습니다:${NC}"
  for container in $FAILED_CONTAINERS; do
    echo -e "\n${RED}[$container] 로그:${NC}"
    docker compose logs --tail 50 $container
  done
else
  echo -e "${GREEN}모든 컨테이너가 정상적으로 실행 중입니다.${NC}"
fi

# 네트워크 확인
echo -e "\n${YELLOW}4. Docker 네트워크 확인...${NC}"
docker network ls | grep maintenance

# 볼륨 확인
echo -e "\n${YELLOW}5. Docker 볼륨 확인...${NC}"
docker volume ls | grep maintenance

# 환경 변수 확인
echo -e "\n${YELLOW}6. .env 파일 확인...${NC}"
if [ -f ".env" ]; then
  echo -e "${GREEN}.env 파일이 존재합니다.${NC}"
  # 중요한 환경 변수들이 설정되어 있는지 확인
  if grep -q "SECRET_KEY" .env && grep -q "DB_PASSWORD" .env; then
    echo -e "${GREEN}필수 환경 변수가 설정되어 있습니다.${NC}"
  else
    echo -e "${RED}.env 파일에 필수 환경 변수가 누락되었습니다.${NC}"
  fi
else
  echo -e "${RED}.env 파일이 존재하지 않습니다. .env.example 파일을 복사하여 생성하세요.${NC}"
fi

# 정리 옵션
echo -e "\n${YELLOW}7. 문제 해결을 위한 옵션:${NC}"
echo -e "${BLUE}a) 모든 컨테이너 재시작: ${NC}docker compose restart"
echo -e "${BLUE}b) 모든 컨테이너 제거 후 재생성: ${NC}docker compose down && docker compose up -d"
echo -e "${BLUE}c) 이미지 재빌드 후 재시작: ${NC}docker compose build --no-cache && docker compose up -d"
echo -e "${BLUE}d) 볼륨 삭제 후 완전 재설치: ${NC}docker compose down -v && docker compose up -d"

echo -e "\n${GREEN}문제 해결 스크립트 완료${NC}" 