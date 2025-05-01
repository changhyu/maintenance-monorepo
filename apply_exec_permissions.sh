#!/bin/bash
# 모든 스크립트에 실행 권한 부여

# 현재 스크립트에 이미 권한이 부여되어 있다고 가정
# chmod +x apply_exec_permissions.sh
chmod +x fix_all_dependencies.sh
chmod +x scripts/*.sh
chmod +x scripts/*.py

echo "모든 스크립트에 실행 권한을 부여했습니다."
echo "다음 명령어로 의존성 문제를 해결할 수 있습니다:"
echo "./fix_all_dependencies.sh"
