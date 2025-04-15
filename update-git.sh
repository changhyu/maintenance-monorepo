#!/bin/bash

# 로컬 Git 통합 스크립트
echo "로컬 Git 통합 스크립트 실행 중"

# 오류 발생 시 스크립트 중단
set -e

# 현재 디렉토리를 프로젝트 루트로 설정
cd "$(dirname "$0")"

# 환경 설정
export NODE_ENV=development
export PORT=3000
echo "로컬 환경으로 설정됨: NODE_ENV=development, PORT=3000"

# 커밋 메시지 설정 (기본값 또는 인자로 제공된 값)
COMMIT_MESSAGE=${1:-"fix: 로컬에서 commit, 변경 사항 반영"}
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

echo "===== 현재 브랜치: $BRANCH_NAME ====="

# 변경 사항 확인
echo "===== 변경 사항 확인 중 ====="
git status

# 충돌 확인
if git ls-files -u | grep -q .; then
    echo "===== 충돌이 감지되었습니다! ====="
    git ls-files -u
    echo "충돌을 해결한 후 다시 실행하세요."
    exit 1
fi

# 모든 변경 사항 스테이징
echo "===== 모든 변경 사항 스테이징 ====="
git add .

# 스테이징된 변경사항이 있는지 확인
if ! git diff --staged --quiet; then
    # 변경 사항 커밋
    echo "===== 변경 사항 커밋 ====="
    echo "커밋 메시지: $COMMIT_MESSAGE"
    git commit -m "$COMMIT_MESSAGE"
    
    # 원격 저장소 푸시 여부 확인
    read -p "변경 사항을 원격 저장소에 푸시하시겠습니까? (y/n): " PUSH_CHOICE
    if [[ $PUSH_CHOICE == "y" || $PUSH_CHOICE == "Y" ]]; then
        echo "===== 원격 저장소에 푸시 중 ====="
        git push origin $BRANCH_NAME || {
            echo "===== 푸시 실패! ====="
            echo "원격 저장소에서 최신 변경 사항을 가져온 후 다시 시도합니다."
            git pull --rebase origin $BRANCH_NAME
            git push origin $BRANCH_NAME
        }
    else
        echo "===== 푸시 취소됨 ====="
    fi
else
    echo "===== 커밋할 변경 사항이 없습니다 ====="
fi

echo "===== 완료 =====" 