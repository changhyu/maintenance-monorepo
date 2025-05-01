#!/bin/bash
# 롤백 스크립트
# 이 스크립트는 이전 버전으로 롤백하는 기능을 제공합니다.
# 사용법: ./rollback.sh [environment] [version]
# environment: dev, staging, prod
# version: 롤백할 버전 (지정하지 않으면 마지막으로 성공한 배포 버전으로 롤백)

set -e

# 현재 스크립트 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/deploy-history.log"
ROLLBACK_LOG="$PROJECT_ROOT/logs/rollback-history.log"

# 로그 디렉토리 생성
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$ROLLBACK_LOG")"

# 인자 처리
ENV=${1:-dev}
TARGET_VERSION=${2:-""}

echo "========================================"
echo "롤백 시작: 환경=$ENV, 대상 버전=$TARGET_VERSION"
echo "========================================"

# 환경 변수 설정
echo "1. 환경 변수 설정 중..."
$SCRIPT_DIR/setup_env.sh $ENV

# 롤백할 버전 결정
if [ -z "$TARGET_VERSION" ]; then
    echo "대상 버전이 지정되지 않았습니다. 배포 히스토리에서 마지막으로 성공한 버전을 찾습니다..."
    
    if [ -f "$LOG_FILE" ]; then
        # 성공한 배포 중 가장 최근 버전 찾기 (STATUS가 true/true인 항목)
        LAST_SUCCESS=$(grep -E "STATUS: true/true" "$LOG_FILE" | tail -n 1)
        
        if [ -n "$LAST_SUCCESS" ]; then
            # VERSION 부분 추출
            TARGET_VERSION=$(echo $LAST_SUCCESS | grep -oP "VERSION: \K[^,]*")
            echo "마지막으로 성공한 배포 버전: $TARGET_VERSION"
        else
            echo "마지막으로 성공한 배포 정보를 찾을 수 없습니다. 'latest' 태그로 롤백합니다."
            TARGET_VERSION="latest"
        fi
    else
        echo "배포 히스토리 파일을 찾을 수 없습니다. 'latest' 태그로 롤백합니다."
        TARGET_VERSION="latest"
    fi
fi

# Docker 이미지 확인
echo "2. 롤백에 필요한 Docker 이미지 확인 중..."
API_IMAGE="maintenance-monorepo-api:${TARGET_VERSION}"
FRONTEND_IMAGE="maintenance-monorepo-frontend:${TARGET_VERSION}"

# 컨테이너 중지
echo "3. 현재 실행 중인 컨테이너 중지 중..."
docker-compose down || echo "실행 중인 컨테이너가 없거나 중지할 수 없습니다."

# 이미지 태그 확인 및 풀
echo "4. 롤백할 이미지 확인 중..."
if docker image inspect "$API_IMAGE" > /dev/null 2>&1; then
    echo "API 이미지 $API_IMAGE가 로컬에 존재합니다."
else
    echo "API 이미지 $API_IMAGE를 가져오는 중..."
    if ! docker pull "$API_IMAGE"; then
        echo "경고: API 이미지 $API_IMAGE를 가져올 수 없습니다. 최신 이미지를 사용합니다."
        API_IMAGE="maintenance-monorepo-api:latest"
    fi
fi

if docker image inspect "$FRONTEND_IMAGE" > /dev/null 2>&1; then
    echo "프론트엔드 이미지 $FRONTEND_IMAGE가 로컬에 존재합니다."
else
    echo "프론트엔드 이미지 $FRONTEND_IMAGE를 가져오는 중..."
    if ! docker pull "$FRONTEND_IMAGE"; then
        echo "경고: 프론트엔드 이미지 $FRONTEND_IMAGE를 가져올 수 없습니다. 최신 이미지를 사용합니다."
        FRONTEND_IMAGE="maintenance-monorepo-frontend:latest"
    fi
fi

# 현재 이미지에 롤백 태그 지정
echo "5. 롤백 이미지에 태그 지정 중..."
if ! docker tag "$API_IMAGE" "maintenance-monorepo-api:current"; then
    echo "API 이미지 태그 지정 실패"
fi

if ! docker tag "$FRONTEND_IMAGE" "maintenance-monorepo-frontend:current"; then
    echo "프론트엔드 이미지 태그 지정 실패"
fi

# 환경에 맞는 Docker Compose 파일 선택
if [ "$ENV" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

# 컨테이너 실행
echo "6. 롤백된 버전으로 컨테이너 실행 중..."
if [ -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
    echo "6.1. $COMPOSE_FILE을 사용하여 Docker Compose 실행 중..."
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        echo "롤백된 컨테이너 시작 성공!"
    else
        echo "롤백된 컨테이너 시작 실패! 개별 서비스 시작을 시도합니다..."
        # 포트 충돌 해결을 위해 대체 포트 사용
        docker-compose up -d db redis || echo "DB/Redis 시작 실패!"
        docker-compose up -d api || echo "API 시작 실패!"
        docker-compose run -d -p 3000:80 --name maintenance-monorepo-frontend-custom frontend || echo "프론트엔드 시작 실패!"
    fi
else
    echo "6.2. $COMPOSE_FILE 파일을 찾을 수 없습니다. 기본 docker-compose.yml을 사용합니다."
    if docker-compose up -d; then
        echo "롤백된 컨테이너 시작 성공!"
    else
        echo "롤백된 컨테이너 시작 실패! 개별 서비스 시작을 시도합니다..."
        # 포트 충돌 해결을 위해 대체 포트 사용
        docker-compose up -d db redis || echo "DB/Redis 시작 실패!"
        docker-compose up -d api || echo "API 시작 실패!"
        docker-compose run -d -p 3000:80 --name maintenance-monorepo-frontend-custom frontend || echo "프론트엔드 시작 실패!"
    fi
fi

# 컨테이너 상태 확인
echo "7. 컨테이너 상태 확인 중..."
docker ps

# 서비스 헬스체크
echo "8. 서비스 헬스체크 중..."
echo "8.1. API 헬스체크:"
API_URL="http://localhost:8000/health"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s $API_URL > /dev/null; then
        echo "API 서비스가 정상적으로 실행 중입니다."
        API_HEALTH_OK=true
        break
    else
        echo "API 서비스가 아직 준비되지 않았습니다. 재시도 중... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 5
    fi
done

if [ -z "$API_HEALTH_OK" ]; then
    echo "경고: API 서비스 헬스체크 실패!"
fi

echo "8.2. 프론트엔드 헬스체크:"
FRONTEND_URL="http://localhost:3000"
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s $FRONTEND_URL > /dev/null; then
        echo "프론트엔드 서비스가 정상적으로 실행 중입니다."
        FRONTEND_HEALTH_OK=true
        break
    else
        echo "프론트엔드 서비스가 아직 준비되지 않았습니다. 재시도 중... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 3
    fi
done

if [ -z "$FRONTEND_HEALTH_OK" ]; then
    echo "경고: 프론트엔드 서비스 헬스체크 실패!"
fi

echo "========================================"
if [ -n "$API_HEALTH_OK" ] && [ -n "$FRONTEND_HEALTH_OK" ]; then
    echo "롤백 완료: 모든 서비스가 정상적으로 실행 중입니다."
elif [ -n "$API_HEALTH_OK" ]; then
    echo "롤백 완료: API 서비스만 정상적으로 실행 중입니다."
elif [ -n "$FRONTEND_HEALTH_OK" ]; then
    echo "롤백 완료: 프론트엔드 서비스만 정상적으로 실행 중입니다."
else
    echo "롤백 경고: 모든 서비스의 헬스체크가 실패했습니다. 로그를 확인해주세요."
fi
echo "롤백 버전: $TARGET_VERSION"
echo "========================================"

# 로그 파일에 롤백 정보 기록
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "$TIMESTAMP - ENV: $ENV, VERSION: $TARGET_VERSION, STATUS: ${API_HEALTH_OK:-false}/${FRONTEND_HEALTH_OK:-false}" >> "$ROLLBACK_LOG"

exit 0