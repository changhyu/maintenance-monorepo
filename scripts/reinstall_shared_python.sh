#!/bin/bash
# 공통 Python 모듈 재설치 스크립트

# 기본 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SHARED_MODULE_PATH="$REPO_ROOT/packages/shared-python"
ERROR_COUNT=0

echo "공통 Python 모듈 재설치 시작..."

# 각 서비스 목록
SERVICES=("api" "ml-service" "document-processing")

# 공유 모듈 설치 함수
install_for_service() {
    local service_name="$1"
    local service_path="$REPO_ROOT/packages/$service_name"
    
    echo "🔄 '$service_path' 서비스에 공통 모듈을 재설치합니다..."
    
    # 가상환경 경로
    local venv_path="$service_path/venv"
    local python_bin="$venv_path/bin/python"
    local pip_bin="$venv_path/bin/pip"
    
    # 가상환경이 없으면 생성
    if [ ! -d "$venv_path" ]; then
        echo "⚠️ 가상환경이 설정되어 있지 않습니다. 생성 중..."
        python3 -m venv "$venv_path"
        "$pip_bin" install --upgrade pip setuptools wheel
    fi
    
    # 기존 패키지 제거 후 재설치 (개발 모드)
    echo "🗑️ 기존 설치된 패키지 제거 중..."
    "$pip_bin" uninstall -y maintenance-shared-python || true
    
    echo "📦 공통 모듈 재설치 중..."
    cd "$SHARED_MODULE_PATH" && "$pip_bin" install -e . || {
        echo "❌ '$service_name' 서비스에 공통 패키지 재설치 실패"
        ERROR_COUNT=$((ERROR_COUNT+1))
        return 1
    }
    
    echo "✅ '$service_name' 서비스에 공통 패키지가 성공적으로 재설치되었습니다."
    return 0
}

# 각 서비스에 대해 설치 실행
for service in "${SERVICES[@]}"; do
    install_for_service "$service"
    echo ""
done

# 결과 요약
echo "설치 작업이 완료되었습니다."
if [ $ERROR_COUNT -gt 0 ]; then
    echo "⚠️ $ERROR_COUNT 개의 서비스에서 설치 오류가 발생했습니다."
    exit 1
else
    echo "🎉 모든 서비스에 성공적으로 설치되었습니다!"
    exit 0
fi