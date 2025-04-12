#!/bin/bash

# 로컬 Git 통합 스크립트
echo "로컬 Git 통합 스크립트 실행 중"

# 현재 디렉토리를 프로젝트 루트로 설정
cd "$(dirname "$0")"

export NODE_ENV=development
export PORT=3000
echo "로컬 환경으로 설정됨: NODE_ENV=development, PORT=3000"

echo "===== 변경 사항 확인 중 ====="
git status

echo "===== 모든 변경 사항 스테이징 ====="
git add .

echo "===== 변경 사항 커밋 ====="
git commit -m "fix: 로컬에서 commit, 변경 사항 반영"

echo "===== 완료 =====" 