#!/bin/bash
# Docker 이미지 보안 스캔 스크립트
# 실행 방법: ./docker-scan.sh <Dockerfile경로> [심각도레벨]

# 사용법 표시
if [ "$#" -lt 1 ]; then
  echo "사용법: $0 <Dockerfile경로> [심각도레벨]"
  echo "심각도레벨 옵션: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN (기본값: HIGH,CRITICAL)"
  exit 1
fi

# 파라미터 설정
DOCKERFILE="$1"
SEVERITY="${2:-HIGH,CRITICAL}"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="../docker-security-scans"
IMAGE_NAME=$(basename "$DOCKERFILE" | sed 's/Dockerfile\.//')

# 보고서 디렉토리 생성
mkdir -p "$REPORT_DIR"

# Trivy 설치 확인
if ! command -v trivy &> /dev/null; then
  echo "Trivy가 설치되어 있지 않습니다. 설치 방법:"
  echo "  - Mac: brew install aquasecurity/trivy/trivy"
  echo "  - Ubuntu: apt-get install trivy"
  echo "  - 자세한 내용: https://github.com/aquasecurity/trivy#installation"
  exit 1
fi

echo "===== Docker 이미지 취약점 스캔 시작: $DATE ====="
echo "Dockerfile: $DOCKERFILE"
echo "검사 심각도: $SEVERITY"
echo ""

# 결과 파일 경로
REPORT_FILE="$REPORT_DIR/$(basename $DOCKERFILE)_scan_$DATE.txt"
JSON_REPORT="$REPORT_DIR/$(basename $DOCKERFILE)_scan_$DATE.json"

# Dockerfile 스캔
echo "Dockerfile 설정 스캔 중..."
trivy config --severity "$SEVERITY" "$DOCKERFILE" > "$REPORT_FILE"
trivy config --severity "$SEVERITY" -f json "$DOCKERFILE" > "$JSON_REPORT"

# 결과 분석
VULN_COUNT=$(grep -c "Total:" "$REPORT_FILE" || echo 0)

echo "분석 결과:"
if [ "$VULN_COUNT" -gt 0 ]; then
  echo "⚠️ $DOCKERFILE에서 $VULN_COUNT 개의 취약점이 발견되었습니다!"
  cat "$REPORT_FILE" | grep -A 20 "Total:" | head -n 20
  echo "..."
  echo "상세 보고서는 $REPORT_FILE 파일을 확인하세요."
  exit 1
else
  echo "✅ $DOCKERFILE에서 심각한 취약점이 발견되지 않았습니다."
fi

echo "===== 스캔 완료: $DATE ====="
