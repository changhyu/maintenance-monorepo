#!/bin/bash

# 통합된 문제 해결 스크립트
# 사용법: ./fix.sh [옵션]
# 옵션:
#   --all: 모든 수정 사항 적용
#   --prisma: Prisma 관련 수정만 적용
#   --deps: 의존성 관련 수정만 적용
#   --types: 타입 관련 수정만 적용
#   --port: 포트 설정만 변경
#   --help: 도움말 표시

show_help() {
    echo "사용법: ./fix.sh [옵션]"
    echo "옵션:"
    echo "  --all        모든 수정 사항 적용"
    echo "  --prisma     Prisma 관련 수정만 적용"
    echo "  --deps       의존성 관련 수정만 적용"
    echo "  --types      타입 관련 수정만 적용"
    echo "  --port       포트 설정만 변경"
    echo "  --help       이 도움말 표시"
    exit 0
}

# 스크립트 실행 권한 부여
setup_permissions() {
    echo "스크립트 실행 권한 부여 중..."
    chmod +x fix_database.py fix_all_issues.py fix_config.py fix_npm_deps.sh fix_port.py restart_project.sh fix_concurrently.sh fix_npm_deps_force.sh fix_prisma_version.sh fix_file_saver_types.sh fix_google_maps_types.sh
}

# dependencies.py 파일 수정
fix_dependencies() {
    echo "dependencies.py 파일 수정 중..."
    if grep -q "\\\n" "packages/api/src/core/dependencies.py"; then
        sed -i '' 's/\\n$//' "packages/api/src/core/dependencies.py"
        echo "✓ dependencies.py 파일의 구문 오류 수정 완료"
    fi
}

# 포트 설정 변경
fix_port_settings() {
    echo "API 서버 포트 변경 중..."
    python fix_port.py 8080
}

# Prisma 관련 수정
fix_prisma() {
    echo "Prisma 의존성 버전 수정 중..."
    ./fix_prisma_version.sh
}

# 의존성 관련 수정
fix_dependencies_all() {
    echo "의존성 문제 해결 중..."
    ./fix_concurrently.sh
    ./fix_npm_deps_force.sh
}

# 타입 관련 수정
fix_types() {
    echo "타입 정의 수정 중..."
    ./fix_file_saver_types.sh
    ./fix_google_maps_types.sh
}

# 모든 수정사항 적용
fix_all() {
    setup_permissions
    fix_dependencies
    fix_port_settings
    fix_prisma
    fix_dependencies_all
    fix_types
}

# 매개변수가 없으면 도움말 표시
if [ $# -eq 0 ]; then
    show_help
fi

# 매개변수 처리
while [ "$1" != "" ]; do
    case $1 in
        --all )    fix_all
                   ;;
        --prisma ) fix_prisma
                   ;;
        --deps )   fix_dependencies_all
                   ;;
        --types )  fix_types
                   ;;
        --port )   fix_port_settings
                   ;;
        --help )   show_help
                   ;;
        * )        echo "알 수 없는 옵션: $1"
                   show_help
                   exit 1
    esac
    shift
done

echo "\n========== 수정 완료 ==========\n"
echo "이제 프로젝트를 시작하려면:"
echo "npm run dev:api    - API 서버 실행(포트 8080)"
echo "npm run dev:frontend - 프론트엔드 서버 실행"
echo "npm run dev:all    - 모든 서버 함께 실행" 