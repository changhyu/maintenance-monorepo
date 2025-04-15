#!/bin/bash

# 누락된 의존성 패키지 설치 스크립트

echo "==== 프론트엔드 의존성 패키지 설치 중... ===="

# packages/frontend 디렉토리로 이동
cd packages/frontend

# 다국어 지원 패키지 설치
echo "다국어 지원 패키지 설치 중..."
npm install --save i18next react-i18next i18next-browser-languagedetector --legacy-peer-deps

# 타입 정의 패키지 설치
echo "타입 정의 패키지 설치 중..."
npm install --save-dev @types/react-i18next --legacy-peer-deps

# 누락된 MUI 아이콘 패키지 설치
echo "MUI 아이콘 패키지 설치 중..."
npm install --save @mui/icons-material --legacy-peer-deps

echo "==== 패키지 설치 완료 ===="

# 루트 디렉토리로 돌아가기
cd ../..

echo "설치된 패키지:"
echo "- i18next"
echo "- react-i18next"
echo "- i18next-browser-languagedetector"
echo "- @types/react-i18next"
echo "- @mui/icons-material"
echo ""
echo "완료되었습니다." 