#!/bin/bash

# 캐시 대시보드 시작 스크립트
# Docker 컨테이너 내에서 실행됩니다.

set -e

echo "캐시 대시보드를 시작합니다..."

# 기본값 설정
REPO_PATH=${REPO_PATH:-"/app/gitmanager"}
PORT=${PORT:-5000}
DEBUG=${DEBUG:-false}

# 필요한 디렉토리 생성
mkdir -p /app/templates
mkdir -p /app/logs

# 대시보드 시작
if [ "$DEBUG" = "true" ]; then
    echo "디버그 모드로 실행 중..."
    python /app/cache_dashboard.py "$REPO_PATH" -p "$PORT" -d
else
    echo "운영 모드로 실행 중..."
    python /app/cache_dashboard.py "$REPO_PATH" -p "$PORT"
fi