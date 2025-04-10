#!/bin/bash

# 현재 디렉토리를 프로젝트 루트로 설정
cd "$(dirname "$0")"

echo "===== 변경 사항 확인 중 ====="
git status

echo "===== 모든 변경 사항 스테이징 ====="
git add .

echo "===== 변경 사항 커밋 ====="
git commit -m "fix: 모든 패키지 오류 수정 및 데이터베이스 연결 구현"

echo "===== 원격 저장소에 푸시 ====="
git push

echo "===== 완료 =====" 