#!/bin/bash
# 환경 변수 설정 스크립트
# 이 스크립트는 다양한 환경(개발, 스테이징, 프로덕션)에 맞는 환경 변수 파일을 자동으로 생성합니다.
# 사용법: ./setup_env.sh [environment]
# environment: dev, staging, prod (기본값은 dev)

# 현재 스크립트 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 기본 환경을 dev로 설정
ENV=${1:-dev}
echo "환경 설정: $ENV"

# 환경 설정에 따른 파일명 설정
if [ "$ENV" = "prod" ]; then
  ENV_FILE="$PROJECT_ROOT/.env.production"
  API_ENV_FILE="$PROJECT_ROOT/packages/api/.env.production"
  FRONTEND_ENV_FILE="$PROJECT_ROOT/packages/frontend/.env.production"
elif [ "$ENV" = "staging" ]; then
  ENV_FILE="$PROJECT_ROOT/.env.staging"
  API_ENV_FILE="$PROJECT_ROOT/packages/api/.env.staging"
  FRONTEND_ENV_FILE="$PROJECT_ROOT/packages/frontend/.env.staging"
else
  ENV_FILE="$PROJECT_ROOT/.env.development"
  API_ENV_FILE="$PROJECT_ROOT/packages/api/.env.development"
  FRONTEND_ENV_FILE="$PROJECT_ROOT/packages/frontend/.env.development"
fi

# 기존 파일 백업
backup_file() {
  if [ -f "$1" ]; then
    echo "백업 생성: $1.bak"
    cp "$1" "$1.bak"
  fi
}

backup_file "$ENV_FILE"
backup_file "$API_ENV_FILE"
backup_file "$FRONTEND_ENV_FILE"

# 디렉토리 생성
mkdir -p "$(dirname "$API_ENV_FILE")"
mkdir -p "$(dirname "$FRONTEND_ENV_FILE")"

# 환경에 따른 기본 환경 변수 설정
if [ "$ENV" = "prod" ]; then
  # 프로덕션 환경 변수
  cat > "$ENV_FILE" << EOF
# 프로덕션 환경 변수
ENV=production
DEBUG=False

# 데이터베이스 설정
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=prodpassword
DB_NAME=maintenance

# Redis 설정
REDIS_HOST=redis
REDIS_PORT=6379

# 보안 설정
SECRET_KEY=your-secret-key-for-production
JWT_SECRET=your-jwt-secret-for-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# 로깅 설정
LOG_LEVEL=ERROR
EOF

  # API 서비스 프로덕션 환경 변수
  cat > "$API_ENV_FILE" << EOF
# API 서비스 프로덕션 환경 변수
API_PORT=8000
HOST=0.0.0.0
DEBUG=False
ENV=production

# 데이터베이스 설정
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=prodpassword
DB_NAME=maintenance

# Redis 설정
REDIS_HOST=redis
REDIS_PORT=6379

# 보안 설정
SECRET_KEY=your-secret-key-for-production
JWT_SECRET=your-jwt-secret-for-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Git 서비스 설정
GIT_SERVICE_CACHE_ENABLED=true
GIT_SERVICE_CACHE_DIR=/var/cache/git-service
GIT_SERVICE_DEBUG=false

# 로깅 설정
LOG_LEVEL=ERROR
EOF

  # 프론트엔드 프로덕션 환경 변수
  cat > "$FRONTEND_ENV_FILE" << EOF
# 프론트엔드 프로덕션 환경 변수
VITE_API_URL=https://api.example.com
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
EOF

elif [ "$ENV" = "staging" ]; then
  # 스테이징 환경 변수
  cat > "$ENV_FILE" << EOF
# 스테이징 환경 변수
ENV=staging
DEBUG=True

# 데이터베이스 설정
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=stagingpassword
DB_NAME=maintenance_staging

# Redis 설정
REDIS_HOST=redis
REDIS_PORT=6379

# 보안 설정
SECRET_KEY=your-secret-key-for-staging
JWT_SECRET=your-jwt-secret-for-staging
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# 로깅 설정
LOG_LEVEL=INFO
EOF

  # API 서비스 스테이징 환경 변수
  cat > "$API_ENV_FILE" << EOF
# API 서비스 스테이징 환경 변수
API_PORT=8000
HOST=0.0.0.0
DEBUG=True
ENV=staging

# 데이터베이스 설정
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=stagingpassword
DB_NAME=maintenance_staging

# Redis 설정
REDIS_HOST=redis
REDIS_PORT=6379

# 보안 설정
SECRET_KEY=your-secret-key-for-staging
JWT_SECRET=your-jwt-secret-for-staging
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Git 서비스 설정
GIT_SERVICE_CACHE_ENABLED=true
GIT_SERVICE_CACHE_DIR=/var/cache/git-service
GIT_SERVICE_DEBUG=true

# 로깅 설정
LOG_LEVEL=INFO
EOF

  # 프론트엔드 스테이징 환경 변수
  cat > "$FRONTEND_ENV_FILE" << EOF
# 프론트엔드 스테이징 환경 변수
VITE_API_URL=https://api.staging.example.com
VITE_APP_ENV=staging
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
EOF

else
  # 개발 환경 변수
  cat > "$ENV_FILE" << EOF
# 개발 환경 변수
ENV=development
DEBUG=True

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=devpassword
DB_NAME=maintenance_dev

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379

# 보안 설정
SECRET_KEY=dev-secret-key
JWT_SECRET=dev-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION=7200

# 로깅 설정
LOG_LEVEL=DEBUG
EOF

  # API 서비스 개발 환경 변수
  cat > "$API_ENV_FILE" << EOF
# API 서비스 개발 환경 변수
API_PORT=8000
HOST=0.0.0.0
DEBUG=True
ENV=development

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=devpassword
DB_NAME=maintenance_dev

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379

# 보안 설정
SECRET_KEY=dev-secret-key
JWT_SECRET=dev-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION=7200

# Git 서비스 설정
GIT_SERVICE_CACHE_ENABLED=true
GIT_SERVICE_CACHE_DIR=/tmp/git-service-cache
GIT_SERVICE_DEBUG=true

# 로깅 설정
LOG_LEVEL=DEBUG
EOF

  # 프론트엔드 개발 환경 변수
  cat > "$FRONTEND_ENV_FILE" << EOF
# 프론트엔드 개발 환경 변수
VITE_API_URL=http://localhost:8000
VITE_APP_ENV=development
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_NOTIFICATIONS=true
EOF

fi

echo "환경 변수 파일 생성 완료:"
echo "- $ENV_FILE"
echo "- $API_ENV_FILE"
echo "- $FRONTEND_ENV_FILE"

echo "환경 변수 설정이 완료되었습니다."

# 권한 설정
chmod +x "$SCRIPT_DIR/setup_env.sh"

exit 0