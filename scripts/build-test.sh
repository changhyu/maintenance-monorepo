#!/bin/bash

# 환경 변수 설정
export NODE_ENV=test
export PYTHON_ENV=test

# 이전 컨테이너 정리
docker-compose down

# 테스트 환경 빌드 및 실행
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --build

# 테스트 실행
docker-compose exec api pytest
docker-compose exec frontend npm run test

# 빌드 완료 메시지
echo "Test environment is ready!" 