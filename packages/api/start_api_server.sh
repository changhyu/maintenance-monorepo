#!/bin/bash

# API 서버 자동 시작/중지 스크립트
# 사용법: ./start_api_server.sh [start|stop|status|restart]

API_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$API_DIR/api_server.pid"
LOG_FILE="$API_DIR/api_server.log"

# 서버 상태 확인 함수
check_status() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
      echo "API 서버가 실행 중입니다. (PID: $PID)"
      return 0
    else
      echo "API 서버가 비정상 종료되었습니다. PID 파일을 제거합니다."
      rm -f "$PID_FILE"
      return 1
    fi
  else
    echo "API 서버가 실행 중이 아닙니다."
    return 1
  fi
}

# 서버 시작 함수
start_server() {
  echo "API 서버를 시작합니다..."
  cd "$API_DIR"
  
  # 이미 실행 중인지 확인
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
      echo "API 서버가 이미 실행 중입니다. (PID: $PID)"
      return 0
    else
      rm -f "$PID_FILE"
    fi
  fi
  
  # 데이터베이스 연결 테스트
  echo "데이터베이스 연결을 확인합니다..."
  python -c "from sqlalchemy import create_engine, text; engine = create_engine('postgresql://gongchanghyeon:zDYQj96BLxNFR39f@localhost:5432/maintenance'); conn = engine.connect(); print('데이터베이스 연결 성공!')" || {
    echo "데이터베이스 연결 실패! API 서버를 시작할 수 없습니다."
    return 1
  }
  
  # 서버 시작
  echo "API 서버를 백그라운드로 시작합니다..."
  nohup python run_app.py > "$LOG_FILE" 2>&1 &
  PID=$!
  echo $PID > "$PID_FILE"
  
  echo "API 서버가 시작되었습니다. (PID: $PID)"
  echo "로그 파일: $LOG_FILE"
  
  # 서버가 정상적으로 시작되었는지 확인
  echo "서버 상태 확인 중..."
  sleep 3
  if curl -s http://localhost:8082/health | grep -q "ok"; then
    echo "API 서버가 정상적으로 응답합니다."
  else
    echo "경고: API 서버가 응답하지 않습니다. 로그 파일을 확인하세요."
  fi
}

# 서버 중지 함수
stop_server() {
  echo "API 서버를 중지합니다..."
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
      echo "PID $PID 프로세스를 종료합니다..."
      kill "$PID"
      sleep 2
      
      # 프로세스가 여전히 실행 중인지 확인
      if ps -p "$PID" > /dev/null; then
        echo "정상 종료 실패. 강제 종료합니다..."
        kill -9 "$PID"
        sleep 1
      fi
      
      if ps -p "$PID" > /dev/null; then
        echo "서버 종료 실패!"
        return 1
      else
        echo "서버가 성공적으로 종료되었습니다."
        rm -f "$PID_FILE"
        return 0
      fi
    else
      echo "서버가 이미 종료되었습니다."
      rm -f "$PID_FILE"
      return 0
    fi
  else
    echo "PID 파일이 없습니다. 서버가 실행 중이 아닙니다."
    return 0
  fi
}

# 서버 재시작 함수
restart_server() {
  echo "API 서버를 재시작합니다..."
  stop_server
  sleep 2
  start_server
}

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
  *)
    echo "사용법: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

exit 0 