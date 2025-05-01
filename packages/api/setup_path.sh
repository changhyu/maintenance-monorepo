#!/bin/bash

# API 패키지 경로를 Python 경로로 추가하는 스크립트
export PYTHONPATH="$PYTHONPATH:/Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/api"

# shared-python 패키지 경로도 추가
export PYTHONPATH="$PYTHONPATH:/Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/shared-python/src"

echo "Python 경로가 설정되었습니다:"
echo $PYTHONPATH

echo ""
echo "다음과 같이 실행하세요:"
echo "cd /Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/api"
echo "source setup_path.sh"
echo "pip install msgpack pydantic-settings"
echo "python src/main.py"
