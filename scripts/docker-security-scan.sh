#!/bin/bash
# 도커 컨테이너 보안 스캔 스크립트
# 2024-06-24 작성
#
# 이 스크립트는 다음을 수행합니다:
# 1. 도커 이미지 취약점 스캔 (trivy 사용)
# 2. 도커 보안 모범 사례 체크
# 3. 컨테이너 구성 개선 권장사항 제공

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 시작 메시지
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}           도커 컨테이너 보안 스캔 스크립트           ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 프로젝트 루트 디렉토리 이동
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Trivy 설치 확인 및 설치
check_trivy() {
  if ! command -v trivy &> /dev/null; then
    echo -e "${YELLOW}Trivy가 설치되어 있지 않습니다. 설치를 시도합니다...${NC}"
    
    if command -v brew &> /dev/null; then
      brew install aquasecurity/trivy/trivy
    elif command -v apt-get &> /dev/null; then
      apt-get update
      apt-get install -y trivy
    else
      echo -e "${RED}Trivy를 자동으로 설치할 수 없습니다.${NC}"
      echo -e "${YELLOW}https://aquasecurity.github.io/trivy/latest/getting-started/installation/ 에서 설치 방법을 확인하세요.${NC}"
      exit 1
    fi
  fi
}

# 결과 디렉토리 설정
SCAN_DIR="$PROJECT_ROOT/docker-security-scans"
SCAN_DATE=$(date +%Y%m%d%H%M%S)
SCAN_RESULT="$SCAN_DIR/scan-result-$SCAN_DATE.txt"
mkdir -p "$SCAN_DIR"

echo "도커 보안 스캔 결과 - $(date)" > "$SCAN_RESULT"
echo "=========================================" >> "$SCAN_RESULT"

# 1. 도커 이미지 목록 확인
echo -e "\n${YELLOW}[1/4] 로컬 도커 이미지 확인 중...${NC}"
echo -e "\n로컬 도커 이미지 목록:" >> "$SCAN_RESULT"
docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" >> "$SCAN_RESULT"

# 프로젝트 관련 이미지만 필터링
PROJECT_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -i "maintenance\|monorepo" | grep -v "<none>")

# 2. Trivy로 이미지 스캔
echo -e "\n${YELLOW}[2/4] 도커 이미지 취약점 스캔 중...${NC}"
echo -e "\n도커 이미지 취약점 스캔 결과:" >> "$SCAN_RESULT"

check_trivy

if [ -z "$PROJECT_IMAGES" ]; then
  echo -e "${YELLOW}! 스캔할 프로젝트 관련 이미지가 없습니다.${NC}"
  echo "스캔할 프로젝트 관련 이미지가 없습니다." >> "$SCAN_RESULT"
else
  for IMAGE in $PROJECT_IMAGES
  do
    echo -e "${BLUE}이미지 스캔 중: $IMAGE${NC}"
    echo -e "\n--- $IMAGE 취약점 스캔 ---" >> "$SCAN_RESULT"
    trivy image --severity HIGH,CRITICAL --no-progress "$IMAGE" >> "$SCAN_RESULT" 2>&1
  done
fi

# 3. 도커파일 체크
echo -e "\n${YELLOW}[3/4] 도커파일 보안 모범 사례 검사 중...${NC}"
echo -e "\n도커파일 보안 모범 사례 검사 결과:" >> "$SCAN_RESULT"

DOCKERFILES=$(find "$PROJECT_ROOT" -name "Dockerfile*")

check_dockerfile() {
  local dockerfile=$1
  local issues=0
  echo -e "\n--- $(basename "$dockerfile") 분석 ---" >> "$SCAN_RESULT"
  
  # 1. ROOT 사용자 체크
  if ! grep -q "USER" "$dockerfile"; then
    echo "⚠️ ROOT 사용자 경고: ROOT가 아닌 사용자 설정이 없습니다" >> "$SCAN_RESULT"
    issues=$((issues+1))
  fi
  
  # 2. 최신 태그 사용 체크
  if grep -q "FROM.*:latest" "$dockerfile"; then
    echo "⚠️ 태그 경고: 'latest' 태그를 사용하고 있습니다" >> "$SCAN_RESULT"
    issues=$((issues+1))
  fi
  
  # 3. COPY 대신 ADD 사용 체크
  if grep -q "ADD " "$dockerfile"; then
    echo "⚠️ ADD 명령어 경고: 보안을 위해 COPY 사용 권장" >> "$SCAN_RESULT"
    issues=$((issues+1))
  fi
  
  # 4. 보안 스캔 단계 체크
  if ! grep -q "trivy\|clair\|scanner" "$dockerfile"; then
    echo "⚠️ 보안 스캔 경고: 이미지 빌드 중 보안 스캔 단계가 없습니다" >> "$SCAN_RESULT"
    issues=$((issues+1))
  fi
  
  # 5. Secrets 체크
  if grep -i -E "password|secret|token|key" "$dockerfile"; then
    echo "⚠️ 보안 비밀 경고: 도커파일에 민감한 정보가 있을 수 있습니다" >> "$SCAN_RESULT"
    issues=$((issues+1))
  fi
  
  # 6. 다단계 빌드 체크
  if ! grep -q "FROM.*AS" "$dockerfile"; then
    echo "⚠️ 다단계 빌드 경고: 다단계 빌드를 사용하지 않고 있습니다" >> "$SCAN_RESULT"
    issues=$((issues+1))
  fi
  
  echo "문제 발견: $issues 건" >> "$SCAN_RESULT"
  return $issues
}

TOTAL_ISSUES=0

for dockerfile in $DOCKERFILES
do
  echo -e "${BLUE}도커파일 검사 중: $(basename "$dockerfile")${NC}"
  check_dockerfile "$dockerfile"
  TOTAL_ISSUES=$((TOTAL_ISSUES + $?))
done

# 4. 컨테이너 구성 개선 권장사항
echo -e "\n${YELLOW}[4/4] 보안 개선 권장사항 생성 중...${NC}"
echo -e "\n도커 보안 개선 권장사항:" >> "$SCAN_RESULT"
echo "1. 모든 도커파일에 비-루트 사용자 추가: USER app" >> "$SCAN_RESULT"
echo "2. 다단계 빌드 사용하여 이미지 크기 최소화" >> "$SCAN_RESULT"
echo "3. 명시적 버전 태그 사용 (latest 대신)" >> "$SCAN_RESULT"
echo "4. .dockerignore 파일을 사용하여 민감한 파일 제외" >> "$SCAN_RESULT"
echo "5. 컨테이너에 보안 스캐너 통합 (trivy, clair 등)" >> "$SCAN_RESULT"
echo "6. 읽기 전용 파일시스템 사용 고려" >> "$SCAN_RESULT"
echo "7. 환경 변수 대신 Docker Secrets 또는 환경 관리 도구 사용" >> "$SCAN_RESULT"

# 최종 결과 출력
echo -e "\n${BLUE}=====================================================${NC}"
echo -e "${BLUE}                    결과 요약                        ${NC}"
echo -e "${BLUE}=====================================================${NC}"

echo -e "${YELLOW}도커 이미지 스캔 완료: $SCAN_RESULT${NC}"

if [ $TOTAL_ISSUES -gt 0 ]; then
  echo -e "${RED}⚠️ 도커파일에서 총 $TOTAL_ISSUES 개의 잠재적 보안 문제가 발견되었습니다.${NC}"
  echo -e "${YELLOW}자세한 내용은 스캔 결과 파일을 확인하세요.${NC}"
else
  echo -e "${GREEN}✓ 도커파일 검사에서 문제가 발견되지 않았습니다.${NC}"
fi

echo -e "\n도커 보안 모범 사례 정보:"
echo -e "${BLUE}- https://docs.docker.com/develop/security-best-practices/${NC}"
echo -e "${BLUE}- https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html${NC}"

# 스크립트 종료
exit 0