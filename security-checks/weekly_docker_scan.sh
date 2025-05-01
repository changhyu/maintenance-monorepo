#!/bin/bash
# 주간 Docker 이미지 보안 스캔 스크립트
# 실행 방법: ./weekly_docker_scan.sh

# 현재 날짜 기록
DATE=$(date +"%Y-%m-%d")
LOG_DIR="../logs/security-scans"
REPORT_DIR="../docker-security-scans"

# 로그 및 보고서 디렉토리 생성
mkdir -p $LOG_DIR
mkdir -p $REPORT_DIR

echo "===== 주간 Docker 이미지 보안 스캔 시작: $DATE ====="

# 스캔할 Docker 이미지 목록
DOCKER_IMAGES=(
  "Dockerfile.api"
  "Dockerfile.frontend"
  "Dockerfile.gateway"
  "Dockerfile.ml"
  "Dockerfile.mobile-api"
  "Dockerfile.docs"
)

# Trivy를 사용한 Docker 이미지 스캔
for image in "${DOCKER_IMAGES[@]}"; do
  echo "스캐닝: $image"
  
  # Trivy가 설치되어 있는지 확인
  if ! command -v trivy &> /dev/null; then
    echo "Trivy가 설치되어 있지 않습니다. 설치 방법:"
    echo "  - brew install trivy (Mac)"
    echo "  - apt-get install trivy (Ubuntu)"
    echo "  - https://github.com/aquasecurity/trivy#installation"
    exit 1
  fi
  
  # Dockerfile 스캔
  trivy config --severity HIGH,CRITICAL "../$image" > "$REPORT_DIR/${image}_scan_$DATE.txt"
  
  # 이미지가 빌드되어 있다면 이미지도 스캔
  IMAGE_NAME=$(basename $image | sed 's/Dockerfile.//')
  if docker image inspect "$IMAGE_NAME" &> /dev/null; then
    trivy image --severity HIGH,CRITICAL "$IMAGE_NAME" >> "$REPORT_DIR/${image}_scan_$DATE.txt"
  fi
  
  # 결과 요약
  if grep -q "CRITICAL" "$REPORT_DIR/${image}_scan_$DATE.txt" || grep -q "HIGH" "$REPORT_DIR/${image}_scan_$DATE.txt"; then
    echo "⚠️ $image에서 취약점이 발견되었습니다!"
    grep -A 3 "CRITICAL\|HIGH" "$REPORT_DIR/${image}_scan_$DATE.txt"
  else
    echo "✅ $image: 중요한 취약점이 발견되지 않았습니다."
  fi
done

echo "===== 스캔 완료: $DATE ====="
echo "상세 보고서 위치: $REPORT_DIR"

# 이메일 알림 (선택 사항 - 설정 필요)
# mail -s "주간 Docker 보안 스캔 결과: $DATE" security-team@example.com < "$REPORT_DIR/summary_$DATE.txt"
