#!/bin/bash

# 블루-그린 배포 스크립트
# 무중단 배포를 위한 블루/그린 배포 전략 구현
# 사용법: ./deploy-blue-green.sh [environment]

set -e

# 환경 설정
ENVIRONMENT=$1
CONFIG_FILE="/opt/maintenance-app/deploy-config.env"
DOCKER_COMPOSE_PATH="/opt/maintenance-app"
LOG_FILE="/opt/maintenance-app/deploy-$(date +%Y%m%d-%H%M%S).log"
DEPLOYMENT_STATE_FILE="/opt/maintenance-app/${ENVIRONMENT}_deployment_state.json"

# 로깅 설정
exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== 배포 시작: $(date) ==="
echo "Environment: $ENVIRONMENT"

# 환경 유효성 검사
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "ERROR: 'staging' 또는 'production' 환경을 지정해 주세요"
  echo "사용법: $0 [staging|production]"
  exit 1
fi

# 설정 파일 로드
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: 설정 파일을 찾을 수 없습니다: $CONFIG_FILE"
  exit 1
fi

echo "설정 파일 로드: $CONFIG_FILE"
source "$CONFIG_FILE"

# 필수 변수 확인
if [ -z "$API_IMAGE" ] || [ -z "$FRONTEND_IMAGE" ] || [ -z "$GATEWAY_IMAGE" ]; then
  echo "ERROR: 필수 환경 변수가 누락되었습니다. API_IMAGE, FRONTEND_IMAGE, GATEWAY_IMAGE가 필요합니다."
  exit 1
fi

# 배포 상태 파일 로드 또는 생성
if [ -f "$DEPLOYMENT_STATE_FILE" ]; then
  echo "기존 배포 상태 파일 로드: $DEPLOYMENT_STATE_FILE"
  CURRENT_COLOR=$(jq -r '.current_color' $DEPLOYMENT_STATE_FILE)
  PREVIOUS_VERSION=$(jq -r '.version' $DEPLOYMENT_STATE_FILE)
  echo "현재 활성 색상: $CURRENT_COLOR"
  echo "이전 배포 버전: $PREVIOUS_VERSION"
else
  echo "배포 상태 파일이 없습니다. 새로 생성합니다."
  CURRENT_COLOR="blue"
  PREVIOUS_VERSION="none"
  echo '{
    "current_color": "blue",
    "version": "none",
    "last_deployment": "none",
    "status": "initial"
  }' > $DEPLOYMENT_STATE_FILE
fi

# 새 배포 색상 결정 (블루/그린 스위칭)
if [ "$CURRENT_COLOR" == "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo "새 배포 색상: $NEW_COLOR"
NEW_VERSION="${COMMIT_SHA:-$(date +%Y%m%d-%H%M%S)}"

# 배포 설정 파일 생성
COMPOSE_FILE="${DOCKER_COMPOSE_PATH}/docker-compose.${ENVIRONMENT}.yml"
DEPLOY_COMPOSE_FILE="${DOCKER_COMPOSE_PATH}/docker-compose.${ENVIRONMENT}.${NEW_COLOR}.yml"

echo "배포 설정 파일 생성: $DEPLOY_COMPOSE_FILE"
cat > $DEPLOY_COMPOSE_FILE << EOF
version: '3.8'

services:
  api-${NEW_COLOR}:
    image: ${API_IMAGE}
    environment:
      - ENVIRONMENT=${ENVIRONMENT}
      - NODE_ENV=${ENVIRONMENT}
      - SERVICE_COLOR=${NEW_COLOR}
    networks:
      - maintenance-net
    restart: unless-stopped
    volumes:
      - api-data:/app/data
      - api-logs:/app/logs
    depends_on:
      - postgres
      - redis

  frontend-${NEW_COLOR}:
    image: ${FRONTEND_IMAGE}
    environment:
      - NODE_ENV=${ENVIRONMENT}
      - SERVICE_COLOR=${NEW_COLOR}
    networks:
      - maintenance-net
    restart: unless-stopped
    depends_on:
      - api-${NEW_COLOR}

  gateway-${NEW_COLOR}:
    image: ${GATEWAY_IMAGE}
    environment:
      - ENVIRONMENT=${ENVIRONMENT}
      - SERVICE_COLOR=${NEW_COLOR}
      - API_HOST=api-${NEW_COLOR}
      - FRONTEND_HOST=frontend-${NEW_COLOR}
    ports:
      - "8080:8080"
    networks:
      - maintenance-net
    restart: unless-stopped
    depends_on:
      - api-${NEW_COLOR}
      - frontend-${NEW_COLOR}

networks:
  maintenance-net:
    external: true

volumes:
  api-data:
    external: true
  api-logs:
    external: true
EOF

# 새 환경 배포
echo "=== 새 환경 배포: ${NEW_COLOR} ==="
cd $DOCKER_COMPOSE_PATH
echo "Docker 이미지 가져오기..."
docker-compose -f $DEPLOY_COMPOSE_FILE pull

echo "컨테이너 시작 중..."
docker-compose -f $DEPLOY_COMPOSE_FILE up -d

# 배포 상태 업데이트
echo "배포 상태를 '배포 중'으로 업데이트합니다."
jq --arg color "$NEW_COLOR" \
   --arg version "$NEW_VERSION" \
   --arg time "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
   --arg status "deploying" \
   '.current_color=$color | .version=$version | .last_deployment=$time | .status=$status' \
   $DEPLOYMENT_STATE_FILE > ${DEPLOYMENT_STATE_FILE}.tmp && mv ${DEPLOYMENT_STATE_FILE}.tmp $DEPLOYMENT_STATE_FILE

# 헬스체크 - 새 서비스가 준비될 때까지 대기
echo "=== 새 서비스 헬스체크: ${NEW_COLOR} ==="
MAX_RETRIES=30
RETRY_INTERVAL=10
COUNTER=0

echo "서비스가 준비될 때까지 대기 중..."
while [ $COUNTER -lt $MAX_RETRIES ]; do
  sleep $RETRY_INTERVAL
  COUNTER=$((COUNTER+1))
  echo "헬스체크 시도 ($COUNTER/$MAX_RETRIES)..."
  
  if curl -s http://localhost:8000/health | grep -q "ok"; then
    echo "✅ 새 서비스가 준비되었습니다!"
    SERVICE_READY=true
    break
  else
    echo "새 서비스가 아직 준비되지 않았습니다. 재시도 중..."
  fi
done

if [ "$SERVICE_READY" != "true" ]; then
  echo "❌ ERROR: 새 서비스가 준비 시간 내에 준비되지 않았습니다."
  echo "롤백 수행 중..."
  
  # 롤백 - 새 환경 제거
  docker-compose -f $DEPLOY_COMPOSE_FILE down
  
  # 상태 업데이트
  jq --arg status "rollback" '.status=$status' $DEPLOYMENT_STATE_FILE > ${DEPLOYMENT_STATE_FILE}.tmp && \
  mv ${DEPLOYMENT_STATE_FILE}.tmp $DEPLOYMENT_STATE_FILE
  
  echo "DEPLOYMENT_FAILED: 배포가 실패했습니다."
  exit 1
fi

# 트래픽 전환 - 로드 밸런서/Nginx 설정 업데이트
echo "=== 트래픽 전환: ${CURRENT_COLOR} -> ${NEW_COLOR} ==="

# Nginx 설정 업데이트
NGINX_CONFIG_PATH="/opt/maintenance-app/nginx"
NGINX_CONFIG_FILE="${NGINX_CONFIG_PATH}/default.conf"

echo "Nginx 설정 업데이트 중..."
cat > $NGINX_CONFIG_FILE << EOF
upstream api_backend {
  server api-${NEW_COLOR}:3000;
}

upstream frontend_backend {
  server frontend-${NEW_COLOR}:3000;
}

server {
  listen 80;
  server_name ${ENVIRONMENT}.car-goro.com;
  
  location /api/ {
    proxy_pass http://api_backend/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
  
  location / {
    proxy_pass http://frontend_backend/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
  
  location /health {
    access_log off;
    return 200 '{"status":"ok","color":"${NEW_COLOR}","version":"${NEW_VERSION}"}';
    add_header Content-Type application/json;
  }
}
EOF

# Nginx 재시작
echo "Nginx 설정 적용을 위해 재시작합니다..."
docker-compose restart nginx

# 배포 상태 업데이트
echo "배포 상태를 '활성'으로 업데이트합니다."
jq --arg status "active" '.status=$status' $DEPLOYMENT_STATE_FILE > ${DEPLOYMENT_STATE_FILE}.tmp && \
mv ${DEPLOYMENT_STATE_FILE}.tmp $DEPLOYMENT_STATE_FILE

# 이전 환경 정리 (선택적)
if [ "$PREVIOUS_VERSION" != "none" ]; then
  echo "=== 이전 환경 정리: ${CURRENT_COLOR} ==="
  OLD_COMPOSE_FILE="${DOCKER_COMPOSE_PATH}/docker-compose.${ENVIRONMENT}.${CURRENT_COLOR}.yml"
  
  if [ -f "$OLD_COMPOSE_FILE" ]; then
    echo "잠시 대기 후 이전 환경을 정리합니다..."
    sleep 60 # 모든 활성 연결이 완료될 시간 부여
    
    echo "이전 환경을 정리합니다..."
    docker-compose -f $OLD_COMPOSE_FILE down
    echo "이전 환경이 성공적으로 정리되었습니다."
  fi
fi

echo "=== 배포 완료: $(date) ==="
echo "배포 환경: $ENVIRONMENT"
echo "활성 색상: $NEW_COLOR"
echo "배포 버전: $NEW_VERSION"

echo "DEPLOYMENT_SUCCESS: 배포가 성공적으로 완료되었습니다."
exit 0