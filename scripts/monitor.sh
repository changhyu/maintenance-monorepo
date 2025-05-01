#!/bin/bash
# Docker 컨테이너 모니터링 스크립트
# 이 스크립트는 Docker 컨테이너의 리소스 사용량과 상태를 모니터링합니다.
# 사용법: ./monitor.sh [interval]
# interval: 모니터링 주기(초), 기본값은 10초

# 기본 주기 설정
INTERVAL=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs/monitoring"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 로그 파일 설정
LOG_FILE="$LOG_DIR/container_stats_$(date +%Y%m%d).log"

echo "Docker 컨테이너 모니터링 시작 (주기: ${INTERVAL}초)"
echo "로그 파일: $LOG_FILE"
echo "모니터링을 중단하려면 Ctrl+C를 누르세요."

# 헤더 출력
echo "====================================================" >> "$LOG_FILE"
echo "모니터링 시작: $(date)" >> "$LOG_FILE"
echo "====================================================" >> "$LOG_FILE"
echo "TIMESTAMP,CONTAINER_ID,NAME,CPU%,MEM_USAGE,MEM%,NET_IO,BLOCK_IO,STATUS" >> "$LOG_FILE"

# 지속적인 모니터링 실행
while true; do
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # 컨테이너 상태 가져오기
    containers=$(docker ps -q)
    
    # 컨테이너가 없는 경우
    if [ -z "$containers" ]; then
        echo "$timestamp,,,,,,,," >> "$LOG_FILE"
        echo "실행 중인 컨테이너가 없습니다."
    else
        # 각 컨테이너에 대한 stats 수집
        for container in $containers; do
            stats=$(docker stats --no-stream --format "{{.ID}},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.Status}}" $container)
            echo "$timestamp,$stats" >> "$LOG_FILE"
            
            # 화면에 출력
            container_name=$(echo $stats | cut -d',' -f2)
            cpu_usage=$(echo $stats | cut -d',' -f3)
            mem_usage=$(echo $stats | cut -d',' -f4)
            status=$(echo $stats | cut -d',' -f8)
            
            echo "컨테이너: $container_name, CPU: $cpu_usage, MEM: $mem_usage, 상태: $status"
        done
    fi
    
    # API 및 프론트엔드 헬스 체크
    echo -n "API 헬스체크: "
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "정상"
        api_status="UP"
    else
        echo "오류"
        api_status="DOWN"
    fi
    
    echo -n "프론트엔드 헬스체크: "
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "정상"
        frontend_status="UP"
    else
        echo "오류"
        frontend_status="DOWN"
    fi
    
    # 헬스체크 결과 로깅
    echo "$timestamp,HEALTHCHECK,API,$api_status,-,-,-,-,-" >> "$LOG_FILE"
    echo "$timestamp,HEALTHCHECK,FRONTEND,$frontend_status,-,-,-,-,-" >> "$LOG_FILE"
    
    echo "---------------------------------------------------"
    
    # 로그 파일 크기 관리 (10MB 이상이면 로테이션)
    if [ -f "$LOG_FILE" ] && [ $(du -m "$LOG_FILE" | cut -f1) -gt 10 ]; then
        mv "$LOG_FILE" "$LOG_FILE.$(date +%H%M%S).bak"
        echo "====================================================" >> "$LOG_FILE"
        echo "모니터링 재시작: $(date)" >> "$LOG_FILE"
        echo "====================================================" >> "$LOG_FILE"
        echo "TIMESTAMP,CONTAINER_ID,NAME,CPU%,MEM_USAGE,MEM%,NET_IO,BLOCK_IO,STATUS" >> "$LOG_FILE"
    fi
    
    # 지정된 간격만큼 대기
    sleep $INTERVAL
done