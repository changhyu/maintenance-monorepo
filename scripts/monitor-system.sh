#!/bin/bash
# 시스템 성능 모니터링 도구
# 2024-06-24 작성
#
# 이 스크립트는 다음을 수행합니다:
# 1. 시스템 리소스 모니터링 (CPU, 메모리, 디스크)
# 2. Docker 컨테이너 상태 모니터링
# 3. 주요 서비스 상태 확인 (API, 프론트엔드, DB 등)
# 4. 로그 분석 및 문제 감지

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 스크립트 시작 메시지
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}            시스템 성능 모니터링 도구                 ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 프로젝트 루트 디렉토리 이동
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# 모니터링 데이터 디렉토리
MONITOR_DIR="$PROJECT_ROOT/.monitoring"
CURRENT_DATE=$(date +%Y%m%d)
LOG_DIR="$MONITOR_DIR/$CURRENT_DATE"
mkdir -p "$LOG_DIR"

# 모니터링 설정 및 임계값
CPU_THRESHOLD=80  # CPU 사용량 임계값 (%)
MEM_THRESHOLD=85  # 메모리 사용량 임계값 (%)
DISK_THRESHOLD=90 # 디스크 사용량 임계값 (%)
INTERVAL=5        # 모니터링 간격 (초)
ENDPOINTS=(       # 상태 확인할 엔드포인트
  "http://localhost:3000/healthcheck"
  "http://localhost:4000/health"
  "http://localhost:5000/api/health"
  "http://localhost:8000/api/status"
)

# 사용법 출력
usage() {
  echo -e "사용법: $0 [옵션]"
  echo -e ""
  echo -e "옵션:"
  echo -e "  --live              실시간 모니터링 모드 (Ctrl+C로 중단)"
  echo -e "  --docker            Docker 컨테이너 상태만 모니터링"
  echo -e "  --services          서비스 상태만 확인"
  echo -e "  --logs              로그 분석 및 오류 감지"
  echo -e "  --report            일일 보고서 생성"
  echo -e "  --cleanup           오래된 모니터링 데이터 정리 (30일 이상)"
  echo -e "  --help              이 도움말 표시"
  echo -e ""
  echo -e "예제:"
  echo -e "  $0 --live           실시간 모니터링 시작"
  echo -e "  $0 --report         보고서 생성"
  echo -e "  $0 --services       서비스 상태만 확인"
  echo -e "  $0                  전체 상태 확인 (1회 실행)"
  echo -e ""
}

# 시스템 리소스 정보 수집
check_system_resources() {
  echo -e "\n${YELLOW}[1/4] 시스템 리소스 확인 중...${NC}"
  
  # CPU 사용량
  if command -v top &> /dev/null; then
    echo -e "${BLUE}CPU 사용량:${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | tr -d '%')
      CPU_IDLE=$(top -l 1 | grep "CPU usage" | awk '{print $5}' | tr -d '%')
      CPU_USED=$(echo "100 - $CPU_IDLE" | bc)
      echo -e "사용자: $CPU_USAGE%, 시스템: $(echo "100 - $CPU_USAGE - $CPU_IDLE" | bc)%, 총: $CPU_USED%"
    else
      # Linux
      CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
      echo -e "총 사용량: ${CPU_USAGE}%"
    fi
    
    # CPU 사용량 임계값 체크
    if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
      echo -e "${RED}⚠️ 경고: CPU 사용량이 임계값($CPU_THRESHOLD%)을 초과했습니다!${NC}"
    else
      echo -e "${GREEN}✓ CPU 사용량이 정상 범위 내에 있습니다.${NC}"
    fi
  else
    echo -e "${YELLOW}! top 명령이 없습니다. CPU 정보를 확인할 수 없습니다.${NC}"
  fi
  
  # 메모리 사용량
  echo -e "\n${BLUE}메모리 사용량:${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOTAL_MEM=$(sysctl hw.memsize | awk '{print $2/1024/1024/1024}')
    USED_MEM=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages free: (\d+)/ and print $ARGV[0]-$1*$size/1024/1024/1024' $TOTAL_MEM)
    MEM_PERCENT=$(echo "scale=2; $USED_MEM / $TOTAL_MEM * 100" | bc)
    echo -e "총 메모리: ${TOTAL_MEM}GB, 사용 중: ${USED_MEM}GB (${MEM_PERCENT}%)"
  else
    # Linux
    TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
    USED_MEM=$(free -m | awk '/^Mem:/ {print $3}')
    MEM_PERCENT=$(echo "scale=2; $USED_MEM / $TOTAL_MEM * 100" | bc)
    echo -e "총 메모리: ${TOTAL_MEM}MB, 사용 중: ${USED_MEM}MB (${MEM_PERCENT}%)"
  fi
  
  # 메모리 사용량 임계값 체크
  if (( $(echo "$MEM_PERCENT > $MEM_THRESHOLD" | bc -l) )); then
    echo -e "${RED}⚠️ 경고: 메모리 사용량이 임계값($MEM_THRESHOLD%)을 초과했습니다!${NC}"
  else
    echo -e "${GREEN}✓ 메모리 사용량이 정상 범위 내에 있습니다.${NC}"
  fi
  
  # 디스크 사용량
  echo -e "\n${BLUE}디스크 사용량:${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    df -h | grep -v "map\|Filesystem" | while read -r line; do
      DISK_NAME=$(echo "$line" | awk '{print $1}')
      DISK_SIZE=$(echo "$line" | awk '{print $2}')
      DISK_USED=$(echo "$line" | awk '{print $3}')
      DISK_AVAIL=$(echo "$line" | awk '{print $4}')
      DISK_PERCENT=$(echo "$line" | awk '{print $5}' | tr -d '%')
      
      echo -e "디스크: ${DISK_NAME}, 크기: ${DISK_SIZE}, 사용 중: ${DISK_USED} (${DISK_PERCENT}%), 여유: ${DISK_AVAIL}"
      
      # 디스크 사용량 임계값 체크
      if [[ "$DISK_PERCENT" -gt "$DISK_THRESHOLD" ]]; then
        echo -e "${RED}⚠️ 경고: 디스크 ${DISK_NAME} 사용량이 임계값($DISK_THRESHOLD%)을 초과했습니다!${NC}"
      fi
    done
  else
    # Linux
    df -h | grep -v "tmp\|udev\|Filesystem" | while read -r line; do
      DISK_NAME=$(echo "$line" | awk '{print $1}')
      DISK_SIZE=$(echo "$line" | awk '{print $2}')
      DISK_USED=$(echo "$line" | awk '{print $3}')
      DISK_AVAIL=$(echo "$line" | awk '{print $4}')
      DISK_PERCENT=$(echo "$line" | awk '{print $5}' | tr -d '%')
      
      echo -e "디스크: ${DISK_NAME}, 크기: ${DISK_SIZE}, 사용 중: ${DISK_USED} (${DISK_PERCENT}%), 여유: ${DISK_AVAIL}"
      
      # 디스크 사용량 임계값 체크
      if [[ "$DISK_PERCENT" -gt "$DISK_THRESHOLD" ]]; then
        echo -e "${RED}⚠️ 경고: 디스크 ${DISK_NAME} 사용량이 임계값($DISK_THRESHOLD%)을 초과했습니다!${NC}"
      fi
    done
  fi
  
  # 로드 평균
  echo -e "\n${BLUE}시스템 로드:${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOAD_AVG=$(sysctl -n vm.loadavg | awk '{print $2, $3, $4}')
  else
    # Linux
    LOAD_AVG=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
  fi
  
  echo -e "로드 평균 (1분, 5분, 15분): $LOAD_AVG"
  
  # 시스템 정보를 파일에 저장
  {
    echo "# 시스템 리소스 모니터링 - $(date)"
    echo "CPU 사용량: ${CPU_USAGE}%"
    echo "메모리 사용량: ${MEM_PERCENT}%"
    echo "로드 평균: $LOAD_AVG"
  } > "$LOG_DIR/system_resources.log"
  
  echo -e "${GREEN}✓ 시스템 리소스 확인 완료${NC}"
}

# Docker 컨테이너 상태 확인
check_docker_containers() {
  echo -e "\n${YELLOW}[2/4] Docker 컨테이너 상태 확인 중...${NC}"
  
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}! Docker가 설치되어 있지 않습니다.${NC}"
    return 1
  fi
  
  # Docker 실행 중인지 확인
  if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker 서비스가 실행 중이지 않습니다.${NC}"
    return 1
  fi
  
  # 컨테이너 목록 가져오기
  echo -e "${BLUE}컨테이너 상태:${NC}"
  docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | sort
  
  # 컨테이너별 상태 확인
  echo -e "\n${BLUE}컨테이너 상세 정보:${NC}"
  docker ps --format "{{.Names}}" | while read -r container; do
    echo -e "\n${CYAN}[$container]${NC}"
    
    # 컨테이너 상태
    STATUS=$(docker inspect -f '{{.State.Status}}' "$container")
    RUNNING=$(docker inspect -f '{{.State.Running}}' "$container")
    STARTED=$(docker inspect -f '{{.State.StartedAt}}' "$container")
    
    echo -e "상태: $STATUS"
    echo -e "실행 중: $RUNNING"
    echo -e "시작 시간: $STARTED"
    
    # 컨테이너가 실행 중이면 리소스 사용량 확인
    if [[ "$RUNNING" == "true" ]]; then
      # CPU 및 메모리 사용량
      docker stats "$container" --no-stream --format "CPU: {{.CPUPerc}}, 메모리: {{.MemUsage}} ({{.MemPerc}})"
      
      # 로그 이슈 확인 (최근 10개의 로그에서 error, warning 등의 패턴 검색)
      ERROR_COUNT=$(docker logs --tail 100 "$container" 2>&1 | grep -iE 'error|exception|fatal|critical|warning' | wc -l | tr -d ' ')
      if [[ "$ERROR_COUNT" -gt 0 ]]; then
        echo -e "${YELLOW}! 최근 로그에서 ${ERROR_COUNT}개의 경고/오류 발견${NC}"
        docker logs --tail 5 "$container" 2>&1 | grep -iE 'error|exception|fatal|critical|warning'
      else
        echo -e "${GREEN}✓ 최근 로그에서 오류 없음${NC}"
      fi
    else
      echo -e "${RED}✗ 컨테이너가 실행 중이지 않습니다.${NC}"
    fi
  done
  
  # Docker 상태를 파일에 저장
  {
    echo "# Docker 컨테이너 상태 - $(date)"
    docker ps -a --format "{{.Names}},{{.Status}},{{.Ports}}" | sort
    
    echo -e "\n# 컨테이너 리소스 사용량:"
    docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}"
  } > "$LOG_DIR/docker_status.log"
  
  echo -e "\n${GREEN}✓ Docker 컨테이너 확인 완료${NC}"
}

# 서비스 상태 확인
check_services() {
  echo -e "\n${YELLOW}[3/4] 서비스 상태 확인 중...${NC}"
  
  # 프로세스 확인
  echo -e "${BLUE}주요 프로세스:${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    ps -ef | grep -E 'node|npm|python|java|docker' | grep -v grep
  else
    # Linux
    ps aux | grep -E 'node|npm|python|java|docker' | grep -v grep
  fi
  
  # 포트 상태 확인
  echo -e "\n${BLUE}포트 상태:${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    netstat -an | grep -E 'LISTEN|3000|4000|5000|8000|5432|27017' | sort -k 4
  else
    # Linux
    netstat -tulpn | grep -E 'LISTEN|3000|4000|5000|8000|5432|27017' | sort -k 4
  fi
  
  # 서비스 헬스체크
  echo -e "\n${BLUE}서비스 헬스체크:${NC}"
  for endpoint in "${ENDPOINTS[@]}"; do
    echo -n "$endpoint: "
    if command -v curl &> /dev/null; then
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" --max-time 5)
      if [[ "$RESPONSE" =~ ^[2] ]]; then
        echo -e "${GREEN}✓ 정상 (HTTP $RESPONSE)${NC}"
      else
        echo -e "${RED}✗ 실패 (HTTP $RESPONSE)${NC}"
      fi
    else
      echo -e "${YELLOW}! curl 명령이 없습니다. 확인할 수 없습니다.${NC}"
    fi
  done
  
  # PostgreSQL 상태 확인 (설치되어 있는 경우)
  echo -e "\n${BLUE}데이터베이스 상태:${NC}"
  if command -v pg_isready &> /dev/null; then
    pg_isready -h localhost -p 5432 && echo -e "${GREEN}✓ PostgreSQL 정상${NC}" || echo -e "${RED}✗ PostgreSQL 연결 실패${NC}"
  else
    echo -e "${YELLOW}! pg_isready 명령이 없습니다. PostgreSQL 상태를 확인할 수 없습니다.${NC}"
  fi
  
  # Redis 상태 확인 (설치되어 있는 경우)
  if command -v redis-cli &> /dev/null; then
    redis-cli ping &> /dev/null && echo -e "${GREEN}✓ Redis 정상${NC}" || echo -e "${RED}✗ Redis 연결 실패${NC}"
  else
    echo -e "${YELLOW}! redis-cli 명령이 없습니다. Redis 상태를 확인할 수 없습니다.${NC}"
  fi
  
  # 서비스 상태를 파일에 저장
  {
    echo "# 서비스 상태 - $(date)"
    echo "## 헬스체크 결과:"
    for endpoint in "${ENDPOINTS[@]}"; do
      if command -v curl &> /dev/null; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" --max-time 5)
        echo "$endpoint: $RESPONSE"
      else
        echo "$endpoint: 확인 불가 (curl 없음)"
      fi
    done
    
    echo -e "\n## 포트 상태:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      netstat -an | grep -E 'LISTEN|3000|4000|5000|8000|5432|27017'
    else
      # Linux
      netstat -tulpn | grep -E 'LISTEN|3000|4000|5000|8000|5432|27017'
    fi
  } > "$LOG_DIR/services_status.log"
  
  echo -e "\n${GREEN}✓ 서비스 상태 확인 완료${NC}"
}

# 로그 분석 및 오류 감지
analyze_logs() {
  echo -e "\n${YELLOW}[4/4] 로그 분석 및 오류 감지 중...${NC}"
  
  # 로그 파일 목록
  LOG_FILES=(
    "logs/api.log"
    "logs/frontend.log"
    "logs/error.log"
    "logs/access.log"
    "packages/api/logs/*.log"
    "packages/gateway/logs/*.log"
  )
  
  # 로그 분석 결과 파일
  LOG_ANALYSIS="$LOG_DIR/log_analysis.log"
  touch "$LOG_ANALYSIS"
  
  echo -e "${BLUE}로그 분석 중...${NC}"
  {
    echo "# 로그 분석 결과 - $(date)"
    echo ""
  } > "$LOG_ANALYSIS"
  
  # 각 로그 파일 분석
  for pattern in "${LOG_FILES[@]}"; do
    # glob 패턴 확장
    for log_file in $pattern; do
      if [ -f "$log_file" ]; then
        echo -e "\n${CYAN}[$log_file]${NC} 분석 중..."
        
        # 파일 크기 확인
        LOG_SIZE=$(du -h "$log_file" | awk '{print $1}')
        echo -e "파일 크기: ${LOG_SIZE}"
        
        # 오류 및 경고 횟수 계산
        ERROR_COUNT=$(grep -i "error" "$log_file" | wc -l)
        WARN_COUNT=$(grep -i "warn" "$log_file" | wc -l)
        EXCEPTION_COUNT=$(grep -i "exception" "$log_file" | wc -l)
        
        echo -e "오류 횟수: ${ERROR_COUNT}"
        echo -e "경고 횟수: ${WARN_COUNT}"
        echo -e "예외 횟수: ${EXCEPTION_COUNT}"
        
        # 최근 발생한 주요 오류 표시 (최대 5개)
        if (( ERROR_COUNT > 0 || EXCEPTION_COUNT > 0 )); then
          echo -e "\n${YELLOW}주요 오류 (최신 5개):${NC}"
          grep -i -E "error|exception|fatal" "$log_file" | tail -n 5
        else
          echo -e "${GREEN}✓ 로그에서 오류를 발견하지 못했습니다.${NC}"
        fi
        
        # 로그 분석 결과 저장
        {
          echo "## $log_file 분석"
          echo "파일 크기: $LOG_SIZE"
          echo "오류 횟수: $ERROR_COUNT"
          echo "경고 횟수: $WARN_COUNT"
          echo "예외 횟수: $EXCEPTION_COUNT"
          
          if (( ERROR_COUNT > 0 || EXCEPTION_COUNT > 0 )); then
            echo -e "\n### 주요 오류 (최신 5개):"
            grep -i -E "error|exception|fatal" "$log_file" | tail -n 5
          fi
          
          echo -e "\n"
        } >> "$LOG_ANALYSIS"
      fi
    done
  done
  
  echo -e "\n${GREEN}✓ 로그 분석 완료${NC}"
  echo -e "분석 결과 저장 위치: ${LOG_ANALYSIS}"
}

# 일일 보고서 생성
generate_report() {
  echo -e "\n${YELLOW}일일 모니터링 보고서 생성 중...${NC}"
  
  # 오늘 날짜의 모니터링 데이터가 있는지 확인
  if [ ! -d "$LOG_DIR" ] || [ ! -f "$LOG_DIR/system_resources.log" ]; then
    echo -e "${RED}오늘 수집된 모니터링 데이터가 없습니다. 먼저 모니터링을 실행하세요.${NC}"
    return 1
  fi
  
  # 보고서 파일
  REPORT_FILE="$LOG_DIR/daily_report_$(date +%Y%m%d).md"
  
  # HTML 보고서
  HTML_REPORT="${REPORT_FILE%.md}.html"
  
  # 보고서 생성
  {
    echo "# 시스템 모니터링 일일 보고서"
    echo "생성 일시: $(date)"
    echo ""
    
    echo "## 1. 시스템 리소스 요약"
    echo "```"
    cat "$LOG_DIR/system_resources.log"
    echo "```"
    echo ""
    
    echo "## 2. Docker 컨테이너 상태"
    if [ -f "$LOG_DIR/docker_status.log" ]; then
      echo "```"
      cat "$LOG_DIR/docker_status.log"
      echo "```"
    else
      echo "Docker 상태 정보가 없습니다."
    fi
    echo ""
    
    echo "## 3. 서비스 상태"
    if [ -f "$LOG_DIR/services_status.log" ]; then
      echo "```"
      cat "$LOG_DIR/services_status.log"
      echo "```"
    else
      echo "서비스 상태 정보가 없습니다."
    fi
    echo ""
    
    echo "## 4. 로그 분석 결과"
    if [ -f "$LOG_DIR/log_analysis.log" ]; then
      echo "```"
      cat "$LOG_DIR/log_analysis.log"
      echo "```"
    else
      echo "로그 분석 정보가 없습니다."
    fi
    echo ""
    
    echo "## 5. 권장 조치"
    echo "- 높은 CPU 또는 메모리 사용량이 지속되면 리소스 확장을 고려하세요."
    echo "- 로그에서 반복적으로 발생하는 오류는 개발팀에 보고하세요."
    echo "- 디스크 공간이 80% 이상 사용된 경우 불필요한 파일 정리를 검토하세요."
    echo ""
    
    echo "### 자동 생성된 보고서입니다."
  } > "$REPORT_FILE"
  
  # HTML 보고서 생성 (Markdown 변환 도구가 있는 경우)
  if command -v pandoc &> /dev/null; then
    pandoc "$REPORT_FILE" -f markdown -t html -s -o "$HTML_REPORT" --metadata title="시스템 모니터링 보고서"
    echo -e "${GREEN}✓ HTML 보고서 생성 완료: $HTML_REPORT${NC}"
  fi
  
  echo -e "${GREEN}✓ 일일 보고서 생성 완료: $REPORT_FILE${NC}"
}

# 오래된 모니터링 데이터 정리 (30일 이상)
cleanup_old_data() {
  echo -e "\n${YELLOW}오래된 모니터링 데이터 정리 중...${NC}"
  
  if [ ! -d "$MONITOR_DIR" ]; then
    echo -e "${YELLOW}모니터링 데이터 디렉토리가 없습니다.${NC}"
    return 0
  fi
  
  # 현재 날짜에서 30일 이전의 날짜 계산
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CUTOFF_DATE=$(date -v-30d +%Y%m%d)
  else
    # Linux
    CUTOFF_DATE=$(date -d "30 days ago" +%Y%m%d)
  fi
  
  echo -e "${BLUE}${CUTOFF_DATE} 이전의 데이터 삭제 중...${NC}"
  
  # 디렉토리 순회하며 오래된 데이터 삭제
  find "$MONITOR_DIR" -maxdepth 1 -type d | while read -r dir; do
    dir_name=$(basename "$dir")
    
    # 날짜 형식 확인 (8자리 숫자)
    if [[ "$dir_name" =~ ^[0-9]{8}$ ]]; then
      if [[ "$dir_name" < "$CUTOFF_DATE" ]]; then
        echo -e "삭제 중: $dir (오래된 데이터)"
        rm -rf "$dir"
      fi
    fi
  done
  
  echo -e "${GREEN}✓ 오래된 데이터 정리 완료${NC}"
}

# 실시간 모니터링 (반복 실행)
live_monitoring() {
  echo -e "\n${BLUE}실시간 모니터링 시작. Ctrl+C로 중단하세요...${NC}\n"
  
  # 화면 지우기 함수
  clear_screen() {
    clear
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${BLUE}           실시간 성능 모니터링 (${INTERVAL}초 간격)            ${NC}"
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${YELLOW}마지막 업데이트: $(date)${NC}"
    echo -e "${YELLOW}Ctrl+C로 중단${NC}"
  }
  
  # 처음 화면 지우기
  clear_screen
  
  # 종료 신호 처리
  trap 'echo -e "\n${BLUE}모니터링 종료...${NC}"; exit 0' INT TERM
  
  while true; do
    # 시스템 리소스 표시
    echo -e "\n${CYAN}[시스템 리소스]${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | tr -d '%')
      CPU_IDLE=$(top -l 1 | grep "CPU usage" | awk '{print $5}' | tr -d '%')
      CPU_USED=$(echo "100 - $CPU_IDLE" | bc)
      
      echo -e "CPU: ${CPU_USED}% 사용 중"
      
      TOTAL_MEM=$(sysctl hw.memsize | awk '{print $2/1024/1024/1024}')
      USED_MEM=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages free: (\d+)/ and print $ARGV[0]-$1*$size/1024/1024/1024' $TOTAL_MEM)
      MEM_PERCENT=$(echo "scale=2; $USED_MEM / $TOTAL_MEM * 100" | bc)
      
      echo -e "메모리: ${MEM_PERCENT}% 사용 중"
    else
      # Linux
      CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
      echo -e "CPU: ${CPU_USAGE}% 사용 중"
      
      TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
      USED_MEM=$(free -m | awk '/^Mem:/ {print $3}')
      MEM_PERCENT=$(echo "scale=2; $USED_MEM / $TOTAL_MEM * 100" | bc)
      
      echo -e "메모리: ${USED_MEM}MB / ${TOTAL_MEM}MB (${MEM_PERCENT}%)"
    fi
    
    # 로드 평균
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      LOAD_AVG=$(sysctl -n vm.loadavg | awk '{print $2, $3, $4}')
    else
      # Linux
      LOAD_AVG=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
    fi
    
    echo -e "로드 평균: $LOAD_AVG"
    
    # Docker 컨테이너 상태 (Docker가 설치된 경우)
    if command -v docker &> /dev/null && docker info &> /dev/null; then
      echo -e "\n${CYAN}[Docker 컨테이너]${NC}"
      docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    fi
    
    # 서비스 상태
    echo -e "\n${CYAN}[서비스 상태]${NC}"
    for endpoint in "${ENDPOINTS[@]}"; do
      echo -n "$endpoint: "
      if command -v curl &> /dev/null; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" --max-time 2)
        if [[ "$RESPONSE" =~ ^[2] ]]; then
          echo -e "${GREEN}✓ 정상 ($RESPONSE)${NC}"
        else
          echo -e "${RED}✗ 실패 ($RESPONSE)${NC}"
        fi
      else
        echo -e "${YELLOW}! 확인 불가${NC}"
      fi
    done
    
    # 주요 프로세스
    echo -e "\n${CYAN}[주요 프로세스]${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      ps -eo pcpu,pmem,pid,user,comm | sort -k 1 -r | head -n 5
    else
      # Linux
      ps aux --sort=-%cpu | head -n 5
    fi
    
    # 지정된 간격만큼 대기
    sleep $INTERVAL
    clear_screen
  done
}

# 메인 실행 함수
main() {
  # 명령행 인자 파싱
  case "$1" in
    --live)
      live_monitoring
      ;;
    --docker)
      check_docker_containers
      ;;
    --services)
      check_services
      ;;
    --logs)
      analyze_logs
      ;;
    --report)
      # 먼저 모든 데이터 수집
      check_system_resources
      check_docker_containers
      check_services
      analyze_logs
      # 보고서 생성
      generate_report
      ;;
    --cleanup)
      cleanup_old_data
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      # 인자가 없거나 알 수 없는 인자인 경우, 기본 동작 실행
      check_system_resources
      check_docker_containers
      check_services
      analyze_logs
      ;;
  esac
}

# 스크립트 실행
main "$@"