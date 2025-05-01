#!/bin/bash

# 환경 변수 로드
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# 마이그레이션 명령어 실행
case "$1" in
  "upgrade")
    alembic upgrade head
    ;;
  "downgrade")
    alembic downgrade -1
    ;;
  "revision")
    alembic revision --autogenerate -m "$2"
    ;;
  "history")
    alembic history
    ;;
  "current")
    alembic current
    ;;
  *)
    echo "Usage: $0 {upgrade|downgrade|revision|history|current}"
    echo "  upgrade   : 최신 버전으로 마이그레이션 실행"
    echo "  downgrade : 이전 버전으로 롤백"
    echo "  revision  : 새로운 마이그레이션 스크립트 생성"
    echo "  history   : 마이그레이션 히스토리 조회"
    echo "  current   : 현재 마이그레이션 버전 조회"
    exit 1
    ;;
esac 