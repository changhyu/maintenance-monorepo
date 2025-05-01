#!/bin/bash

# shared-python 패키지를 개발 모드로 설치하는 스크립트
echo "차량 정비 서비스 공통 Python 모듈을 설치합니다..."

# 패키지 루트 디렉토리 지정
SHARED_PACKAGE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )/packages/shared-python"

# 파이썬 서비스 목록 지정
SERVICES=(
  "$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )/packages/api"
  "$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )/packages/ml-service"
  "$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )/packages/document-processing"
)

# shared-python 패키지에 대한 pip 개발 모드 설치
for service_dir in "${SERVICES[@]}"; do
  if [ -d "$service_dir/venv" ]; then
    echo "서비스 '$service_dir'에 공통 패키지를 설치합니다..."
    
    # 가상 환경 활성화 및 패키지 설치
    cd "$service_dir" && \
    . venv/bin/activate && \
    pip install -e "$SHARED_PACKAGE_DIR" && \
    deactivate
    
    if [ $? -eq 0 ]; then
      echo "✅ '$service_dir' 서비스에 공통 패키지가 성공적으로 설치되었습니다."
    else
      echo "❌ '$service_dir' 서비스에 공통 패키지 설치 중 오류가 발생했습니다."
    fi
  else
    echo "⚠️ '$service_dir' 서비스에 Python 가상환경이 존재하지 않습니다. 먼저 가상환경을 설치해야 합니다."
  fi
done

echo "설치 작업이 완료되었습니다."