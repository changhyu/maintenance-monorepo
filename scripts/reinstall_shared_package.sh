#!/bin/bash
# 공통 모듈 재설치 스크립트

set -e  # 오류 발생 시 스크립트 중단

# 기본 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SHARED_MODULE_PATH="$REPO_ROOT/packages/shared-python"

echo "🔄 공통 모듈 패키지 재설치 중..."

# egg-info 디렉토리 정리
echo "🧹 egg-info 디렉토리 정리 중..."
find "$SHARED_MODULE_PATH" -name "*.egg-info" -type d -exec rm -rf {} + 2>/dev/null || true
find "$REPO_ROOT" -name "*.egg-info" -type d -exec rm -rf {} + 2>/dev/null || true

# 각 서비스 목록
SERVICES=("api" "ml-service" "document-processing")

# 각 서비스에 대해 가상환경 재설정 및 패키지 설치
for service in "${SERVICES[@]}"; do
    SERVICE_PATH="$REPO_ROOT/packages/$service"
    VENV_PATH="$SERVICE_PATH/venv"
    
    echo "🔄 '$service' 서비스 처리 중..."
    
    # 가상환경 삭제 및 재생성
    echo "   🗑️ 가상환경 삭제 중..."
    rm -rf "$VENV_PATH"
    
    echo "   🆕 가상환경 생성 중..."
    python3 -m venv "$VENV_PATH"
    
    # pip 업그레이드
    echo "   ⬆️ pip 업그레이드 중..."
    "$VENV_PATH/bin/pip" install --upgrade pip setuptools wheel
    
    # 공통 모듈 설치 (개발 모드)
    echo "   📦 공통 모듈 설치 중..."
    "$VENV_PATH/bin/pip" install -e "$SHARED_MODULE_PATH"
    
    # 서비스별 요구사항 설치
    if [ -f "$SERVICE_PATH/requirements.txt" ]; then
        echo "   📚 서비스 요구사항 설치 중..."
        "$VENV_PATH/bin/pip" install -r "$SERVICE_PATH/requirements.txt" || echo "   ⚠️ 일부 패키지 설치 실패 (계속 진행)"
    fi
    
    echo "✅ '$service' 서비스 설정 완료"
    echo ""
done

echo "🎉 모든 서비스 설정 완료!"