#!/bin/bash
# 통합 배포 스크립트
# 이 스크립트는 Docker 컨테이너 빌드부터 배포, 상태 확인까지 전체 과정을 자동화합니다.
# 사용법: ./deploy.sh [environment] [version]
# environment: dev, staging, prod (기본값은 dev)
# version: 배포할 버전 태그 (기본값은 latest)

set -e

# 현재 스크립트 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 인자 처리
ENV=${1:-dev}
VERSION=${2:-latest}
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DEPLOY_TAG="${VERSION}-${TIMESTAMP}"

echo "========================================"
echo "배포 시작: 환경=$ENV, 버전=$VERSION, 태그=$DEPLOY_TAG"
echo "========================================"

# 환경 변수 설정
echo "1. 환경 변수 설정 중..."
$SCRIPT_DIR/setup_env.sh $ENV

# 필요한 디렉토리 생성
echo "2. Docker 볼륨 디렉토리 생성 중..."
mkdir -p "$PROJECT_ROOT/docker/volumes/db"
mkdir -p "$PROJECT_ROOT/docker/volumes/redis"
mkdir -p "$PROJECT_ROOT/docker/volumes/logs"

# 도커 이미지 빌드
echo "3. Docker 이미지 빌드 중..."
cd "$PROJECT_ROOT"

# 첫 번째 시도: 일반 빌드
echo "3.1. 기본 서비스 이미지 빌드 중..."
if docker-compose build api frontend db redis; then
    echo "기본 서비스 이미지 빌드 성공!"
else
    echo "기본 서비스 이미지 빌드 실패. 오직 필수 서비스만 빌드합니다..."
    # 개별 서비스 빌드 시도
    docker-compose build api || echo "API 이미지 빌드 실패!"
    docker-compose build frontend || echo "프론트엔드 이미지 빌드 실패!"
    docker-compose build db || echo "데이터베이스 이미지 빌드 실패!"
    docker-compose build redis || echo "Redis 이미지 빌드 실패!"
fi

# 이미지 태그 지정
echo "4. 이미지 태깅 중..."
if docker tag maintenance-monorepo-api:latest maintenance-monorepo-api:$DEPLOY_TAG; then
    echo "API 이미지 태그 지정 성공"
fi

if docker tag maintenance-monorepo-frontend:latest maintenance-monorepo-frontend:$DEPLOY_TAG; then
    echo "프론트엔드 이미지 태그 지정 성공"
fi

# 현재 실행 중인 컨테이너 확인
echo "5. 현재 실행 중인 컨테이너 확인..."
docker ps

# 컨테이너 중지 (이미 실행 중인 경우)
echo "6. 기존 컨테이너 중지 중..."
docker-compose down || echo "실행 중인 컨테이너가 없거나 중지할 수 없습니다."

# 컨테이너 실행
echo "7. 컨테이너 실행 중..."
if [ "$ENV" = "prod" ]; then
    echo "7.1. 프로덕션 환경에서 Docker Compose 실행 중..."
    if docker-compose -f docker-compose.prod.yml up -d; then
        echo "프로덕션 컨테이너 시작 성공!"
    else
        echo "프로덕션 컨테이너 시작 실패. 기본 배포로 시도합니다..."
        if docker-compose up -d; then
            echo "기본 배포 성공!"
        else
            echo "컨테이너 시작 실패! 개별 서비스 시작을 시도합니다..."
            # 포트 충돌 해결을 위해 대체 포트 사용
            docker-compose up -d db redis || echo "DB/Redis 시작 실패!"
            docker-compose up -d api || echo "API 시작 실패!"
            docker-compose run -d -p 3000:80 --name maintenance-monorepo-frontend-custom frontend || echo "프론트엔드 시작 실패!"
        fi
    fi
else
    echo "7.2. 개발/스테이징 환경에서 Docker Compose 실행 중..."
    if docker-compose up -d; then
        echo "컨테이너 시작 성공!"
    else
        echo "컨테이너 시작 실패! 개별 서비스 시작을 시도합니다..."
        # 포트 충돌 해결을 위해 대체 포트 사용
        docker-compose up -d db redis || echo "DB/Redis 시작 실패!"
        docker-compose up -d api || echo "API 시작 실패!"
        docker-compose run -d -p 3000:80 --name maintenance-monorepo-frontend-custom frontend || echo "프론트엔드 시작 실패!"
    fi
fi

# 컨테이너 상태 확인
echo "8. 컨테이너 상태 확인 중..."
docker ps

# 컨테이너 로그 확인 (API 및 프론트엔드만)
echo "9. 컨테이너 로그 확인 중..."
echo "9.1. API 로그 확인:"
docker-compose logs api --tail 50 || echo "API 로그를 확인할 수 없습니다."

echo "9.2. 프론트엔드 로그 확인:"
docker-compose logs frontend --tail 50 || echo "프론트엔드 로그를 확인할 수 없습니다."

# 서비스 헬스체크
echo "10. 서비스 헬스체크 중..."
echo "10.1. API 헬스체크:"
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

echo "10.2. 프론트엔드 헬스체크:"
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
    echo "배포 완료: 모든 서비스가 정상적으로 실행 중입니다."
elif [ -n "$API_HEALTH_OK" ]; then
    echo "배포 완료: API 서비스만 정상적으로 실행 중입니다."
elif [ -n "$FRONTEND_HEALTH_OK" ]; then
    echo "배포 완료: 프론트엔드 서비스만 정상적으로 실행 중입니다."
else
    echo "배포 경고: 모든 서비스의 헬스체크가 실패했습니다. 로그를 확인해주세요."
fi
echo "배포 태그: $DEPLOY_TAG"
echo "========================================"

# 로그 파일에 배포 정보 기록
LOG_FILE="$PROJECT_ROOT/logs/deploy-history.log"
mkdir -p "$(dirname "$LOG_FILE")"
echo "$(date '+%Y-%m-%d %H:%M:%S') - ENV: $ENV, VERSION: $VERSION, TAG: $DEPLOY_TAG, STATUS: ${API_HEALTH_OK:-false}/${FRONTEND_HEALTH_OK:-false}" >> "$LOG_FILE"

exit 0