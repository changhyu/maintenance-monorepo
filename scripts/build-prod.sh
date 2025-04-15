#!/bin/bash

# 환경 변수 설정
export NODE_ENV=production
export PYTHON_ENV=production

# 이전 컨테이너 정리
docker-compose down

# 프로덕션 환경 빌드 및 실행
docker-compose -f docker-compose.yml up --build -d

# 헬스 체크
sleep 10
curl -f http://localhost:3000/health || exit 1

# 빌드 완료 메시지
echo "Production environment is ready!" 