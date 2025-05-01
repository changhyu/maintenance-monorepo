#!/bin/bash
# 보안 민감 정보 스캔 및 수정 스크립트
# 2025-04-22 생성

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}           보안 민감 정보 스캔 및 수정 스크립트         ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 프로젝트 루트 디렉토리로 이동
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# 결과 저장 디렉토리
SCAN_DIR="$PROJECT_ROOT/security-scans"
mkdir -p "$SCAN_DIR"
SCAN_DATE=$(date +%Y%m%d%H%M%S)
SCAN_RESULT="$SCAN_DIR/security-scan-result-$SCAN_DATE.txt"

echo "보안 민감 정보 스캔 결과 - $(date)" > "$SCAN_RESULT"
echo "=========================================" >> "$SCAN_RESULT"

# 민감한 정보를 저장하는 Git 백업 디렉토리 검사
echo -e "\n${YELLOW}[1/4] Git 백업 파일에서 민감한 정보 검사 중...${NC}"
echo -e "\nGit 백업 파일에서 민감한 정보 검사 결과:" >> "$SCAN_RESULT"

# 민감한 패턴 정의
PATTERNS=(
  "password"
  "secret"
  "token"
  "key"
  "auth"
  "credential"
  "api_key"
  "passwd"
  "ConvertTo-SecureString"
)

# Git 백업 디렉토리 내 워크플로우 파일 검사
BACKUP_DIRS=$(find "$PROJECT_ROOT" -type d -name "*git*backup*" -o -name ".git-backup*")
WORKFLOW_FILES=$(find $BACKUP_DIRS -type f -name "*.yml" -o -name "*.yaml")
SECURITY_ISSUES=0

if [ -z "$WORKFLOW_FILES" ]; then
  echo -e "${GREEN}✓ Git 백업 디렉토리에서 워크플로우 파일이 발견되지 않았습니다.${NC}"
  echo "Git 백업 디렉토리에서 워크플로우 파일이 발견되지 않았습니다." >> "$SCAN_RESULT"
else
  echo -e "${YELLOW}! Git 백업 디렉토리에서 워크플로우 파일이 발견되었습니다. 민감한 정보를 검사합니다.${NC}"
  echo "! Git 백업 디렉토리에서 워크플로우 파일이 발견되었습니다." >> "$SCAN_RESULT"
  
  for file in $WORKFLOW_FILES; do
    echo -e "${BLUE}파일 검사 중: $file${NC}"
    echo -e "\n--- $(basename "$file") 분석 ---" >> "$SCAN_RESULT"
    
    for pattern in "${PATTERNS[@]}"; do
      MATCHES=$(grep -i "$pattern" "$file" | grep -v "example\|dummy\|placeholder\|test")
      if [ -n "$MATCHES" ]; then
        echo "⚠️ $pattern 패턴 발견:" >> "$SCAN_RESULT"
        echo "$MATCHES" >> "$SCAN_RESULT"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
        
        # 민감 정보 수정 (암호화된 환경 변수 형태로 변경)
        sed -i.bak "s/\($pattern.*: \).*$/\1\${{ secrets.SECURE_VALUE }}/" "$file"
      fi
    done
  done
fi

# Dockerfile 내 보안 문제 검사
echo -e "\n${YELLOW}[2/4] Dockerfile에서 보안 문제 검사 중...${NC}"
echo -e "\nDockerfile에서 보안 문제 검사 결과:" >> "$SCAN_RESULT"

DOCKERFILES=$(find "$PROJECT_ROOT" -name "Dockerfile*")

for dockerfile in $DOCKERFILES; do
  echo -e "${BLUE}파일 검사 중: $dockerfile${NC}"
  echo -e "\n--- $(basename "$dockerfile") 분석 ---" >> "$SCAN_RESULT"
  
  # ROOT 사용자 체크
  if ! grep -q "USER" "$dockerfile"; then
    echo "⚠️ ROOT 사용자 경고: ROOT가 아닌 사용자 설정이 없습니다" >> "$SCAN_RESULT"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
  fi
  
  # 민감한 정보 체크
  for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(grep -i "$pattern" "$dockerfile" | grep -v "example\|dummy\|placeholder\|test")
    if [ -n "$MATCHES" ]; then
      echo "⚠️ $pattern 패턴 발견:" >> "$SCAN_RESULT"
      echo "$MATCHES" >> "$SCAN_RESULT"
      SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    fi
  done
done

# 코드 내 하드코딩된 민감 정보 검사
echo -e "\n${YELLOW}[3/4] 코드 파일에서 하드코딩된 민감 정보 검사 중...${NC}"
echo -e "\n코드 파일에서 하드코딩된 민감 정보 검사 결과:" >> "$SCAN_RESULT"

CODE_FILES=$(find "$PROJECT_ROOT" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.sh" \) -not -path "*/node_modules/*" -not -path "*/.git/*")

for file in $CODE_FILES; do
  # 민감한 정보 체크
  for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(grep -i "$pattern.*=.*[\"'][a-zA-Z0-9]" "$file" | grep -v "example\|dummy\|placeholder\|test\|process.env\|\${\|import\|require")
    if [ -n "$MATCHES" ]; then
      echo -e "${YELLOW}! 파일에서 민감한 정보 발견: $file${NC}"
      echo -e "\n--- $(basename "$file") 분석 ---" >> "$SCAN_RESULT"
      echo "⚠️ $pattern 패턴 발견:" >> "$SCAN_RESULT"
      echo "$MATCHES" >> "$SCAN_RESULT"
      SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    fi
  done
done

# 보안 제안사항 생성
echo -e "\n${YELLOW}[4/4] 보안 개선 권장사항 생성 중...${NC}"
echo -e "\n보안 개선 권장사항:" >> "$SCAN_RESULT"
echo "1. 모든 Dockerfile에 비루트 사용자 설정 추가" >> "$SCAN_RESULT"
echo "2. CI/CD 파이프라인에서 민감한 정보는 환경 변수로 처리" >> "$SCAN_RESULT"
echo "3. 하드코딩된 자격 증명은 환경 변수나 시크릿 관리자로 이전" >> "$SCAN_RESULT"
echo "4. .gitignore 파일에 민감한 백업 파일과 디렉토리 추가" >> "$SCAN_RESULT"
echo "5. 정기적인 보안 스캔 수행" >> "$SCAN_RESULT"

# 최종 결과 출력
echo -e "\n${BLUE}=====================================================${NC}"
echo -e "${BLUE}                    결과 요약                        ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo -e "${YELLOW}보안 스캔 완료: $SCAN_RESULT${NC}"

if [ $SECURITY_ISSUES -gt 0 ]; then
  echo -e "${RED}⚠️ 총 $SECURITY_ISSUES 개의 잠재적 보안 문제가 발견되었습니다.${NC}"
  echo -e "${YELLOW}자세한 내용은 스캔 결과 파일을 확인하세요.${NC}"
else
  echo -e "${GREEN}✓ 스캔에서 보안 문제가 발견되지 않았습니다.${NC}"
fi

# .gitignore 업데이트
echo -e "\n${BLUE}==== .gitignore 파일 업데이트 중... ====${NC}"
if ! grep -q "security-scans" "$PROJECT_ROOT/.gitignore"; then
  echo "" >> "$PROJECT_ROOT/.gitignore"
  echo "# 보안 관련 파일" >> "$PROJECT_ROOT/.gitignore"
  echo "security-scans/" >> "$PROJECT_ROOT/.gitignore"
  echo "*git*backup*/" >> "$PROJECT_ROOT/.gitignore"
  echo ".git-backup*/" >> "$PROJECT_ROOT/.gitignore"
  echo -e "${GREEN}✓ .gitignore 파일이 업데이트되었습니다.${NC}"
else
  echo -e "${GREEN}✓ .gitignore 파일이 이미 적절하게 설정되어 있습니다.${NC}"
fi

echo -e "\n${BLUE}보안 스캔 작업이 완료되었습니다.${NC}"
echo -e "${YELLOW}민감한 정보가 발견된 경우, 해당 정보를 환경 변수 또는 비밀 관리 시스템으로 이전하는 것을 권장합니다.${NC}"
exit 0