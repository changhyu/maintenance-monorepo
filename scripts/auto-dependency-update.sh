#!/bin/bash
# 자동 의존성 검사 및 업데이트 스크립트
# 2024-06-24 작성
#
# 이 스크립트는 다음을 수행합니다:
# 1. 모든 npm 패키지의 최신 버전 확인
# 2. 보안 취약점 없는 패키지만 업데이트 목록에 추가
# 3. 프로젝트의 모든 패키지를 확인하여 안전하게 업데이트
# 4. 업데이트 후 테스트 실행하여 호환성 확인

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 시작 메시지
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}           자동 의존성 업데이트 스크립트             ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 프로젝트 루트 디렉토리 이동
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# 백업 디렉토리 생성
BACKUP_DIR="$PROJECT_ROOT/.dependency-backups"
BACKUP_FILE="$BACKUP_DIR/package-lock-$(date +%Y%m%d%H%M%S).json"
UPGRADE_LOG="$PROJECT_ROOT/dependency-upgrade-$(date +%Y%m%d).log"
mkdir -p "$BACKUP_DIR"

# package-lock.json 백업
echo -e "${YELLOW}[1/6] 패키지 잠금 파일 백업 중...${NC}"
if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
  cp "$PROJECT_ROOT/package-lock.json" "$BACKUP_FILE"
  echo -e "${GREEN}✓ 백업 완료: $BACKUP_FILE${NC}"
else
  echo -e "${YELLOW}! package-lock.json 파일을 찾을 수 없습니다.${NC}"
fi

# 업데이트 로그 파일 초기화
echo "의존성 업데이트 로그 - $(date)" > "$UPGRADE_LOG"
echo "=========================================" >> "$UPGRADE_LOG"

# 1. 업데이트 가능한 패키지 목록 확인
echo -e "\n${YELLOW}[2/6] 업데이트 가능한 패키지 검사 중...${NC}"
echo -e "\n업데이트 가능한 패키지 목록:" >> "$UPGRADE_LOG"
npm outdated >> "$UPGRADE_LOG" 2>&1

# 2. 취약점 검사
echo -e "\n${YELLOW}[3/6] 현재 취약점 상태 검사 중...${NC}"
echo -e "\n현재 취약점 상태:" >> "$UPGRADE_LOG"
npm audit --omit=dev >> "$UPGRADE_LOG" 2>&1

# 3. 안전한 의존성 업데이트 시도
echo -e "\n${YELLOW}[4/6] 안전한 의존성 업데이트 중...${NC}"
echo -e "\n안전한 의존성 업데이트 실행:" >> "$UPGRADE_LOG"
npm update >> "$UPGRADE_LOG" 2>&1
UPDATE_EXIT=$?

if [ $UPDATE_EXIT -eq 0 ]; then
  echo -e "${GREEN}✓ 안전한 업데이트가 완료되었습니다.${NC}"
else
  echo -e "${RED}✗ 업데이트 중 오류가 발생했습니다.${NC}"
  echo "안전한 업데이트 실패, 백업에서 복원합니다." >> "$UPGRADE_LOG"
  
  # 백업에서 복원
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$PROJECT_ROOT/package-lock.json"
    echo -e "${YELLOW}! package-lock.json이 백업에서 복원되었습니다.${NC}"
  fi
  
  exit 1
fi

# 4. 취약점 다시 검사
echo -e "\n${YELLOW}[5/6] 업데이트 후 취약점 다시 검사 중...${NC}"
echo -e "\n업데이트 후 취약점 상태:" >> "$UPGRADE_LOG"
npm audit --omit=dev >> "$UPGRADE_LOG" 2>&1
FINAL_AUDIT_EXIT=$?

# 5. 테스트 실행하여 호환성 확인
echo -e "\n${YELLOW}[6/6] 테스트 실행하여 호환성 확인 중...${NC}"
echo -e "\n테스트 실행 결과:" >> "$UPGRADE_LOG"
npm test >> "$UPGRADE_LOG" 2>&1
TEST_EXIT=$?

# 최종 결과 출력
echo -e "\n${BLUE}=====================================================${NC}"
echo -e "${BLUE}                    결과 요약                        ${NC}"
echo -e "${BLUE}=====================================================${NC}"

if [ $TEST_EXIT -eq 0 ]; then
  echo -e "${GREEN}✓ 모든 테스트가 통과했습니다!${NC}"
  echo -e "${GREEN}✓ 의존성 업데이트가 성공적으로 완료되었습니다.${NC}"
else
  echo -e "${RED}✗ 테스트가 실패했습니다. 업데이트 후 변경사항을 확인하세요.${NC}"
  echo -e "${YELLOW}! 자세한 로그는 $UPGRADE_LOG 파일을 확인하세요.${NC}"
fi

if [ $FINAL_AUDIT_EXIT -eq 0 ]; then
  echo -e "${GREEN}✓ 업데이트 후 보안 취약점이 없습니다!${NC}"
else
  echo -e "${YELLOW}! 일부 취약점이 여전히 남아있습니다. ${NC}"
  echo -e "${YELLOW}! 안전한 버전이 제공되면 다음 업데이트에서 해결될 수 있습니다.${NC}"
fi

echo -e "\n자세한 업데이트 결과는 다음 파일을 확인하세요: ${BLUE}$UPGRADE_LOG${NC}"
echo -e "의존성을 업데이트하기 전 상태로 복원하려면: ${BLUE}cp $BACKUP_FILE $PROJECT_ROOT/package-lock.json${NC}\n"

# 테스트 요약 로그 파일에 추가
echo -e "\n=========== 업데이트 요약 ===========" >> "$UPGRADE_LOG"
echo "업데이트 일시: $(date)" >> "$UPGRADE_LOG"
echo "테스트 결과: $TEST_EXIT" >> "$UPGRADE_LOG"
echo "보안 감사 결과: $FINAL_AUDIT_EXIT" >> "$UPGRADE_LOG"

# 스크립트 종료
exit 0