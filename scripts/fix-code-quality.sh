#!/bin/bash

# 코드 품질 향상을 위한 자동화 스크립트
# 작성자: GitHub Copilot
# 날짜: 2025-04-27

echo "===== 코드 품질 향상 스크립트 시작 ====="

# 작업 디렉토리가 프로젝트의 루트 디렉토리인지 확인
if [ ! -f "package.json" ]; then
  echo "오류: 이 스크립트는 프로젝트 루트 디렉토리에서 실행해야 합니다."
  exit 1
fi

# ESLint를 사용하여 자동 수정 가능한 문제 해결
echo "1. ESLint로 자동 수정 가능한 문제 해결 중..."
npx eslint . --ext .js,.jsx,.ts,.tsx --fix

# Prettier를 사용하여 코드 포맷팅
echo "2. Prettier로 코드 포맷팅 중..."
npx prettier --write "**/*.{js,jsx,ts,tsx,json,md,yml}"

# TypeScript 타입 검사
echo "3. TypeScript 타입 검사 중..."
npx tsc --noEmit

# 테스트 실행
echo "4. 테스트 실행 중..."
npm test || echo "일부 테스트가 실패했습니다. 수동 확인이 필요할 수 있습니다."

# Git hooks 퍼미션 확인
echo "5. Git hooks 퍼미션 설정 중..."
if [ -d ".husky" ]; then
  chmod +x .husky/*
  echo "Git hooks에 실행 권한이 부여되었습니다."
else
  echo "Husky가 설치되지 않았습니다. 'npm run prepare'를 실행하여 설치해 주세요."
fi

echo "===== 코드 품질 향상 스크립트 완료 ====="
echo "다음 단계로 진행하세요:"
echo "1. 자동으로 수정되지 않은 ESLint 경고를 확인하세요: npm run lint"
echo "2. 'any' 타입 사용을 더 구체적인 타입으로 대체하세요."
echo "3. 사용하지 않는 변수에 접두사 '_'를 추가하세요."
echo "4. 개발 중인 코드의 문서화를 향상시키세요(JSDoc 사용)."
echo "5. 단위 테스트 및 통합 테스트를 추가하여 코드 신뢰성을 높이세요."