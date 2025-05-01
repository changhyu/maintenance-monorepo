#!/bin/bash
# 통합 스크립트에 실행 권한 추가

# 스크립트 실행 디렉토리 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 시작 시간 기록
start_time=$(date +%s)

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# 실행 권한 추가 함수
add_exec_permission() {
    local file="$1"
    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            log_info "👍 $file에 이미 실행 권한이 있습니다."
            return 0
        else
            chmod +x "$file"
            log_info "✅ $file에 실행 권한이 추가되었습니다."
            return 0
        fi
    else
        log_warn "❌ $file 파일을 찾을 수 없습니다."
        return 1
    fi
}

# 메인 로직 시작
log_section "통합 스크립트 실행 권한 설정"
log_info "현재 디렉토리: $SCRIPT_DIR"

# 실행 권한 추가 여부를 추적할 변수
total_files=5
success_count=0

# setup.sh에 실행 권한 추가
add_exec_permission "setup.sh" && ((success_count++))

# check.py에 실행 권한 추가
add_exec_permission "check.py" && ((success_count++))

# fix.sh에 실행 권한 추가
add_exec_permission "fix.sh" && ((success_count++))

# run_tests.sh에 실행 권한 추가
add_exec_permission "run_tests.sh" && ((success_count++))

# run_tests.py에 실행 권한 추가
add_exec_permission "run_tests.py" && ((success_count++))

# 종료 시간 기록 및 소요 시간 계산
end_time=$(date +%s)
duration=$((end_time - start_time))

# 요약 출력
log_section "실행 결과 요약"
log_info "실행 권한 추가 완료: $success_count/$total_files 파일"
log_info "소요 시간: ${duration}초"

if [ $success_count -eq $total_files ]; then
    log_info "모든 통합 스크립트에 실행 권한 추가가 완료되었습니다."
else
    log_warn "일부 스크립트 파일을 찾을 수 없었습니다."
    log_info "누락된 파일은 해당 스크립트를 먼저 생성한 후 다시 시도하세요."
fi

log_info "스크립트 실행이 완료되었습니다."
