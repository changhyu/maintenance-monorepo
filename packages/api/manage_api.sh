#!/bin/bash

# API 서버 통합 관리 스크립트

API_DIR="/Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/api"
cd "$API_DIR"

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 사용법 출력 함수
usage() {
  echo -e "${BLUE}API 서버 통합 관리 스크립트${NC}"
  echo -e "사용법: $0 [명령어]"
  echo
  echo -e "명령어:"
  echo -e "  ${GREEN}start${NC}        API 서버 시작"
  echo -e "  ${RED}stop${NC}         API 서버 종료"
  echo -e "  ${YELLOW}restart${NC}      API 서버 재시작"
  echo -e "  ${BLUE}status${NC}       API 서버 상태 확인"
  echo -e "  ${BLUE}log${NC}          API 서버 로그 확인"
  echo -e "  ${BLUE}test${NC}         API 기본 엔드포인트 테스트"
  echo -e "  ${YELLOW}test-all${NC}     모든 API 엔드포인트 상세 테스트"
  echo -e "  ${YELLOW}autostart${NC}    시스템 시작 시 자동 실행 설정"
  echo -e "  ${RED}remove${NC}       자동 실행 설정 제거"
  echo -e "  ${BLUE}help${NC}         이 도움말 출력"
  exit 1
}

# API 서버 시작 함수
start_server() {
  echo -e "${BLUE}API 서버를 시작합니다...${NC}"
  "$API_DIR/start_api_server.sh" start
}

# API 서버 종료 함수
stop_server() {
  echo -e "${RED}API 서버를 종료합니다...${NC}"
  "$API_DIR/start_api_server.sh" stop
}

# API 서버 재시작 함수
restart_server() {
  echo -e "${YELLOW}API 서버를 재시작합니다...${NC}"
  "$API_DIR/start_api_server.sh" restart
}

# API 서버 상태 확인 함수
check_status() {
  echo -e "${BLUE}API 서버 상태를 확인합니다...${NC}"
  "$API_DIR/check_status.sh"
}

# API 서버 로그 확인 함수
view_logs() {
  echo -e "${BLUE}API 서버 로그를 확인합니다...${NC}"
  LOG_FILE="$API_DIR/api_server.log"
  if [ -f "$LOG_FILE" ]; then
    tail -n 50 "$LOG_FILE"
    echo -e "\n${GREEN}전체 로그 파일: $LOG_FILE${NC}"
  else
    echo -e "${RED}로그 파일이 없습니다: $LOG_FILE${NC}"
  fi
}

# API 엔드포인트 테스트 함수
test_endpoints() {
  echo -e "${BLUE}API 엔드포인트 테스트를 실행합니다...${NC}"
  
  echo -e "\n${YELLOW}1. 헬스 체크 엔드포인트 테스트${NC}"
  curl -s http://localhost:8082/health | python -m json.tool
  
  echo -e "\n${YELLOW}2. 루트 엔드포인트 테스트${NC}"
  curl -s http://localhost:8082/ | python -m json.tool
  
  echo -e "\n${YELLOW}3. 차량 API 테스트${NC}"
  curl -s http://localhost:8082/api/vehicles | python -m json.tool
  
  echo -e "\n${YELLOW}4. 사용자 API 테스트${NC}"
  curl -s http://localhost:8082/api/users | python -m json.tool
  
  echo -e "\n${YELLOW}5. 정비 API 테스트${NC}"
  curl -s http://localhost:8082/api/maintenance | python -m json.tool
}

# API 엔드포인트 상세 테스트 함수
test_all_endpoints() {
  echo -e "${BLUE}모든 API 엔드포인트의 상세 테스트를 실행합니다...${NC}"
  "$API_DIR/test_api_endpoints.sh"
}

# 자동 시작 설정 함수
setup_autostart() {
  echo -e "${YELLOW}API 서버 자동 시작 설정을 구성합니다...${NC}"
  "$API_DIR/setup_autostart.sh"
}

# 자동 시작 설정 제거 함수
remove_autostart() {
  echo -e "${RED}API 서버 자동 시작 설정을 제거합니다...${NC}"
  PLIST_PATH="$HOME/Library/LaunchAgents/com.maintenance.api.plist"
  
  if [ -f "$PLIST_PATH" ]; then
    echo "LaunchAgent 설정을 제거합니다..."
    launchctl unload "$PLIST_PATH"
    rm -f "$PLIST_PATH"
    echo -e "${GREEN}자동 시작 설정이 제거되었습니다.${NC}"
  else
    echo -e "${YELLOW}자동 시작 설정 파일이 없습니다: $PLIST_PATH${NC}"
  fi
}

# 명령어가 없으면 사용법 출력
if [ $# -eq 0 ]; then
  usage
fi

# 명령어에 따른 동작 실행
case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
    ;;
  status)
    check_status
    ;;
  log)
    view_logs
    ;;
  test)
    test_endpoints
    ;;
  test-all)
    test_all_endpoints
    ;;
  autostart)
    setup_autostart
    ;;
  remove)
    remove_autostart
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo -e "${RED}알 수 없는 명령어: $1${NC}"
    usage
    ;;
esac

exit 0 