#!/bin/bash
# 스크립트에 실행 권한 부여

# 컬러 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}모든 스크립트에 실행 권한 부여 중...${NC}"

# 현재 디렉토리의 모든 .sh 파일에 실행 권한 부여
chmod +x *.sh

# scripts 디렉토리의 모든 .sh 파일에 실행 권한 부여
find "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" -name "*.sh" -exec chmod +x {} \;

echo -e "${GREEN}✓ 모든 스크립트에 실행 권한 부여 완료${NC}"

echo "다음 명령어를 실행하여 의존성 문제를 해결하세요:"
echo "./scripts/fix-dependencies.sh"
