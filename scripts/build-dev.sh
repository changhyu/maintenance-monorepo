#!/bin/bash

# 환경 변수 설정
export NODE_ENV=development
export PYTHON_ENV=development

# 이전 컨테이너 정리
docker-compose down

# 개발 환경 빌드 및 실행
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# 빌드 완료 메시지
echo "Development environment is ready!" 