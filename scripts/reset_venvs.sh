#!/bin/bash
# 각 서비스의 가상환경을 재설정하고 공통 모듈을 설치하는 스크립트

# 기본 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SHARED_MODULE_PATH="$REPO_ROOT/packages/shared-python"
ERROR_COUNT=0

echo "서비스 가상환경 초기화 및 공통 모듈 설치 시작..."

# 각 서비스 목록
SERVICES=("api" "ml-service" "document-processing")

# 가상환경 재설정 및 공유 모듈 설치 함수
setup_for_service() {
    local service_name="$1"
    local service_path="$REPO_ROOT/packages/$service_name"
    
    echo "🔄 '$service_name' 서비스 처리 중..."
    
    # 가상환경 경로
    local venv_path="$service_path/venv"
    
    # 기존 가상환경 삭제
    echo "🗑️ 기존 가상환경 제거 중..."
    rm -rf "$venv_path"
    
    # 새 가상환경 생성
    echo "🆕 새 가상환경 생성 중..."
    python3 -m venv "$venv_path"
    local pip_bin="$venv_path/bin/pip"
    
    # pip 업그레이드
    echo "⬆️ pip 업그레이드 중..."
    "$pip_bin" install --upgrade pip setuptools wheel || {
        echo "❌ pip 업그레이드 실패"
        ERROR_COUNT=$((ERROR_COUNT+1))
        return 1
    }
    
    # 공통 모듈 설치
    echo "📦 공통 모듈 설치 중..."
    pushd "$SHARED_MODULE_PATH" > /dev/null || {
        echo "❌ 공통 모듈 디렉토리로 이동 실패"
        ERROR_COUNT=$((ERROR_COUNT+1))
        return 1
    }
    
    "$pip_bin" install -e . || {
        echo "❌ 공통 모듈 설치 실패"
        popd > /dev/null
        ERROR_COUNT=$((ERROR_COUNT+1))
        return 1
    }
    
    popd > /dev/null
    
    # 서비스별 요구사항 설치
    echo "📚 서비스 의존성 패키지 설치 중..."
    if [ -f "$service_path/requirements.txt" ]; then
        "$pip_bin" install -r "$service_path/requirements.txt" || {
            echo "⚠️ 일부 패키지 설치 실패 (무시하고 계속 진행)"
        }
    else
        echo "⚠️ requirements.txt 파일이 없습니다"
    fi
    
    echo "✅ '$service_name' 서비스 설정 완료"
    return 0
}

# 각 서비스에 대해 실행
for service in "${SERVICES[@]}"; do
    setup_for_service "$service"
    echo ""
done

# 결과 요약
echo "설정 작업이 완료되었습니다."
if [ $ERROR_COUNT -gt 0 ]; then
    echo "⚠️ $ERROR_COUNT 개의 서비스에서 설정 오류가 발생했습니다."
    exit 1
else
    echo "🎉 모든 서비스가 성공적으로 설정되었습니다!"
    exit 0
fi