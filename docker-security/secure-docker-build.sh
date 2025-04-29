#!/bin/bash
# 보안 스캔이 통합된 Docker 빌드 스크립트
# 실행 방법: ./secure-docker-build.sh <Dockerfile경로> [이미지태그] [심각도레벨]

# 사용법 표시
if [ "$#" -lt 1 ]; then
  echo "사용법: $0 <Dockerfile경로> [이미지태그] [심각도레벨]"
  echo "심각도레벨 옵션: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN (기본값: HIGH,CRITICAL)"
  exit 1
fi

# 파라미터 설정
DOCKERFILE="$1"
if [ ! -f "$DOCKERFILE" ]; then
  echo "❌ Dockerfile이 존재하지 않습니다: $DOCKERFILE"
  exit 1
fi

# 이미지 태그 설정 (제공되지 않은 경우 기본값 사용)
if [ -n "$2" ]; then
  IMAGE_TAG="$2"
else
  # Dockerfile 이름에서 기본 태그 생성 (예: Dockerfile.api -> api:latest)
  BASE_NAME=$(basename "$DOCKERFILE" | sed 's/Dockerfile\.//')
  IMAGE_TAG="${BASE_NAME}:latest"
fi

# 심각도 레벨 설정
SEVERITY="${3:-HIGH,CRITICAL}"
SCRIPT_DIR=$(dirname "$0")

echo "===== 보안 스캔이 통합된 Docker 빌드 시작 ====="
echo "Dockerfile: $DOCKERFILE"
echo "이미지 태그: $IMAGE_TAG"
echo "검사 심각도: $SEVERITY"
echo ""

# 1단계: Dockerfile 보안 스캔
echo "1단계: Dockerfile 보안 스캔 중..."
if ! $SCRIPT_DIR/docker-scan.sh "$DOCKERFILE" "$SEVERITY"; then
  echo "❌ Dockerfile 보안 스캔에서 취약점이 발견되었습니다."
  echo "계속 진행하려면 'y'를 입력하세요. 취소하려면 다른 키를 입력하세요:"
  read -n 1 -r CONTINUE
  echo ""
  if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
    echo "빌드가 취소되었습니다."
    exit 1
  fi
  echo "⚠️ 경고와 함께 계속합니다."
fi

# 2단계: Docker 이미지 빌드
echo ""
echo "2단계: Docker 이미지 빌드 중..."
if ! docker build -t "$IMAGE_TAG" -f "$DOCKERFILE" .; then
  echo "❌ Docker 이미지 빌드에 실패했습니다."
  exit 1
fi
echo "✅ Docker 이미지 빌드 완료: $IMAGE_TAG"

# 3단계: 빌드된 이미지 취약점 스캔
echo ""
echo "3단계: 빌드된 이미지 취약점 스캔 중..."
if ! trivy image --severity "$SEVERITY" "$IMAGE_TAG"; then
  echo "❌ 이미지 보안 스캔에서 취약점이 발견되었습니다."
  echo "이 이미지를 배포하시겠습니까? (y/n)"
  read -n 1 -r DEPLOY
  echo ""
  if [[ ! $DEPLOY =~ ^[Yy]$ ]]; then
    echo "이미지가 빌드되었지만 취약점으로 인해 배포가 취소되었습니다."
    echo "이미지 ID: $(docker images -q "$IMAGE_TAG")"
    exit 1
  fi
  echo "⚠️ 취약점이 있지만 배포를 진행합니다."
else
  echo "✅ 이미지 보안 스캔 통과: $IMAGE_TAG"
fi

echo "===== 빌드 및 보안 스캔 완료 ====="
echo "이미지: $IMAGE_TAG"
echo "이미지 ID: $(docker images -q "$IMAGE_TAG")"
