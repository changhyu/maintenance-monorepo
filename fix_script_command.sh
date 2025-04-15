#!/bin/bash

# npm 스크립트 명령어 오류 수정 스크립트

# 로그 파일 설정
LOG_FILE="fix_script_result.log"
echo "$(date): 스크립트 실행 시작" > "$LOG_FILE"

# 로깅 함수
log_message() {
  local message="$1"
  echo "$message"
  echo "$(date): $message" >> "$LOG_FILE"
}

log_message "npm 스크립트 명령어 오류 수정 시작..."

# 기본 경로 변수 정의 (경로 하드코딩 문제 해결)
API_ROOT="packages/api"
FRONTEND_ROOT="packages/frontend"
API_SRC="${API_ROOT}/src"
FRONTEND_SRC="${FRONTEND_ROOT}/src"
SCRIPTS_DIR="scripts"

# 프로젝트 루트 경로 찾기
PROJECT_ROOT="$(pwd)"
log_message "프로젝트 루트 경로: $PROJECT_ROOT"

# Git 저장소 경로 확인
if [ -d "$PROJECT_ROOT/.git" ]; then
  log_message "✓ Git 저장소가 확인되었습니다: $PROJECT_ROOT/.git"
else
  log_message "⚠️ Git 저장소를 찾을 수 없습니다. 일부 기능이 제한될 수 있습니다."
fi

# 문제가 되는 npm 스크립트 확인
log_message "1. package.json 스크립트 섹션 검사 및 수정..."

# sed 명령어 호환성 확인 및 대응
check_sed_compatibility() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    log_message "✓ macOS 환경을 감지했습니다, sed -i '' 명령어를 사용합니다"
    SED_CMD="sed -i ''"
  else
    log_message "✓ Linux/기타 환경을 감지했습니다, sed -i 명령어를 사용합니다"
    SED_CMD="sed -i"
  fi
}

# 크로스 플랫폼 호환성을 위한 sed 명령어 래퍼 함수 개선
sedReplace() {
  local pattern="$1"
  local replacement="$2"
  local file="$3"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s#$pattern#$replacement#" "$file"
  else
    sed -i "s#$pattern#$replacement#" "$file"
  fi
}

# sed 호환성 확인
check_sed_compatibility

# 에러 처리 명령어 수정 (npm error 문제)
if grep -q "\"error\":" "package.json"; then
  sedReplace "\"error\":" "\"error-log\":" "package.json"
  log_message "✓ package.json에서 'error' 명령어를 'error-log'로 변경했습니다"
else
  log_message "✓ package.json에 'error' 명령어 충돌이 없습니다"
fi

# 각 패키지의 package.json 확인 및 수정
log_message "2. 패키지별 package.json 스크립트 섹션 검사 및 수정..."
for pkg_dir in packages/*/; do
  pkg_json="${pkg_dir}package.json"
  if [ -f "$pkg_json" ]; then
    if grep -q "\"error\":" "$pkg_json"; then
      log_message "패키지 ${pkg_dir} 수정 중..."
      sedReplace "\"error\":" "\"error-log\":" "$pkg_json"
      log_message "✓ ${pkg_dir}package.json에서 'error' 명령어를 'error-log'로 변경했습니다"
    else
      log_message "✓ ${pkg_dir}package.json에 'error' 명령어 충돌이 없습니다"
    fi
  fi
done

# TSConfig 파일 수정 (Typescript 버전 충돌 문제)
log_message "3. tsconfig.json 파일 검사 및 수정..."
for tsconfig_file in tsconfig.json packages/*/tsconfig.json; do
  if [ -f "$tsconfig_file" ]; then
    log_message "TSConfig 파일 $tsconfig_file 수정 중..."
    # skipLibCheck 옵션 추가
    if ! grep -q "\"skipLibCheck\":" "$tsconfig_file"; then
      # compilerOptions 객체 안에 추가
      sedReplace "\"compilerOptions\": {" "\"compilerOptions\": {\n    \"skipLibCheck\": true," "$tsconfig_file"
      log_message "✓ $tsconfig_file에 skipLibCheck 옵션을 추가했습니다"
    else
      log_message "✓ $tsconfig_file에 이미 skipLibCheck 옵션이 있습니다"
    fi

    # resolveJsonModule 옵션 추가 (JSON 모듈 가져오기 문제)
    if ! grep -q "\"resolveJsonModule\":" "$tsconfig_file"; then
      sedReplace "\"compilerOptions\": {" "\"compilerOptions\": {\n    \"resolveJsonModule\": true," "$tsconfig_file"
      log_message "✓ $tsconfig_file에 resolveJsonModule 옵션을 추가했습니다"
    else
      log_message "✓ $tsconfig_file에 이미 resolveJsonModule 옵션이 있습니다"
    fi
  fi
done

# 컨트롤러 경로 업데이트 (MaintenanceController 개선)
log_message "4. MaintenanceController 경로 감지 기능 확인..."
CONTROLLER_FILE="${API_SRC}/controllers/maintenance_controller.py"
if [ -f "$CONTROLLER_FILE" ]; then
  # 이미 자동 경로 감지 기능이 있는지 확인
  if grep -q "if path is None:" "$CONTROLLER_FILE"; then
    log_message "✓ MaintenanceController에 이미 자동 경로 감지 기능이 있습니다"
  else
    log_message "⚠️ MaintenanceController가 자동 경로 감지를 지원하지 않습니다. 업데이트가 필요할 수 있습니다."
  fi
else
  log_message "⚠️ MaintenanceController 파일을 찾을 수 없습니다: $CONTROLLER_FILE"
fi

# Todo 컴포넌트 오프라인 동기화 로직 확인
log_message "5. Todo 컴포넌트 오프라인 동기화 로직 확인..."
TODO_COMPONENT="${FRONTEND_SRC}/components/Todo.tsx"
if [ -f "$TODO_COMPONENT" ]; then
  # 오프라인 동기화 로직 확인
  if grep -q "useNetwork" "$TODO_COMPONENT"; then
    log_message "✓ Todo 컴포넌트에 네트워크 감지 로직이 있습니다"
  else
    log_message "⚠️ Todo 컴포넌트에 네트워크 감지 로직이 없습니다. 업데이트가 필요할 수 있습니다."
  fi

  # 오프라인 동기화 로직 확인
  if grep -q "OfflineNotice" "$TODO_COMPONENT"; then
    log_message "✓ Todo 컴포넌트에 오프라인 알림 로직이 있습니다"
  else
    log_message "⚠️ Todo 컴포넌트에 오프라인 알림 로직이 없습니다. 업데이트가 필요할 수 있습니다."
  fi
else
  log_message "⚠️ Todo 컴포넌트 파일을 찾을 수 없습니다: $TODO_COMPONENT"
fi

# MapService 클래스 에러 처리 로직 확인
log_message "6. MapService 클래스 에러 처리 로직 확인..."
MAP_SERVICE="${FRONTEND_SRC}/services/mapService.ts"
if [ -f "$MAP_SERVICE" ]; then
  # notification 사용 확인
  if grep -q "notification" "$MAP_SERVICE"; then
    log_message "✓ MapService 클래스에 notification 알림 시스템이 사용되고 있습니다"
  else
    log_message "⚠️ MapService 클래스에 notification 알림 시스템이 사용되지 않고 있습니다. 업데이트가 필요할 수 있습니다."
  fi

  # 에러 처리 표준화 확인
  if grep -q "catch (error)" "$MAP_SERVICE"; then
    log_message "✓ MapService 클래스에 에러 처리 로직이 있습니다"
  else
    log_message "⚠️ MapService 클래스에 에러 처리 로직이 부족할 수 있습니다. 업데이트가 필요할 수 있습니다."
  fi
else
  log_message "⚠️ MapService 파일을 찾을 수 없습니다: $MAP_SERVICE"
fi

# GeofenceManager 컴포넌트 handleStatusChange 함수 확인
log_message "7. GeofenceManager 컴포넌트 handleStatusChange 함수 확인..."
GEOFENCE_MANAGER="${FRONTEND_SRC}/components/map/GeofenceManager.tsx"
if [ -f "$GEOFENCE_MANAGER" ]; then
  # handleStatusChange 함수 확인
  if grep -q "handleStatusChange" "$GEOFENCE_MANAGER"; then
    log_message "✓ GeofenceManager 컴포넌트에 handleStatusChange 함수가 있습니다"
    # 백엔드 인터페이스와의 일관성 확인
    if grep -q "updateGeofence" "$GEOFENCE_MANAGER" && grep -q "loadGeofences" "$GEOFENCE_MANAGER"; then
      log_message "✓ GeofenceManager 컴포넌트가 API 인터페이스를 올바르게 사용하고 있습니다"
    else
      log_message "⚠️ GeofenceManager 컴포넌트의 API 인터페이스 사용을 확인해야 합니다"
    fi
  else
    log_message "⚠️ GeofenceManager 컴포넌트에 handleStatusChange 함수가 없습니다. 업데이트가 필요할 수 있습니다."
  fi
else
  log_message "⚠️ GeofenceManager 컴포넌트 파일을 찾을 수 없습니다: $GEOFENCE_MANAGER"
fi

# 의존성 버전 확인
log_message "8. 의존성 버전 확인..."
if [ -f "package.json" ]; then
  # Node.js 버전 확인
  NODE_VERSION=$(grep -o '"node": *"[^"]*"' package.json | cut -d '"' -f 4)
  if [[ "$NODE_VERSION" == ">=18.0.0" ]]; then
    log_message "✓ Node.js 버전 요구사항이 적절합니다: $NODE_VERSION"
  else
    log_message "⚠️ Node.js 버전 요구사항을 업데이트해야 할 수 있습니다. 현재: $NODE_VERSION, 권장: >=18.0.0"
  fi

  # npm 버전 확인
  NPM_VERSION=$(grep -o '"packageManager": *"[^"]*"' package.json | cut -d '@' -f 2 | cut -d '"' -f 1)
  if [[ -n "$NPM_VERSION" ]]; then
    log_message "✓ npm 패키지 관리자 버전이 명시되어 있습니다: $NPM_VERSION"
  else
    log_message "⚠️ npm 패키지 관리자 버전을 명시하는 것이 좋습니다"
  fi

  # TypeScript 버전 확인
  TS_VERSION=$(grep -o '"typescript": *"[^"]*"' package.json | cut -d '"' -f 4)
  if [[ -n "$TS_VERSION" ]]; then
    log_message "✓ TypeScript 버전: $TS_VERSION"
  else
    log_message "⚠️ TypeScript 의존성을 찾을 수 없습니다"
  fi

  # Prisma 버전 확인
  PRISMA_VERSION=$(grep -o '"@prisma/client": *"[^"]*"' package.json | cut -d '"' -f 4)
  if [[ -n "$PRISMA_VERSION" ]]; then
    log_message "✓ Prisma 클라이언트 버전: $PRISMA_VERSION"
  else
    log_message "⚠️ Prisma 클라이언트 의존성을 찾을 수 없습니다"
  fi
else
  log_message "⚠️ package.json 파일을 찾을 수 없습니다"
fi

# 우선순위별 추가 기능 검사
log_message ""
log_message "===== 우선순위별 추가 기능 검사 ====="

# 디렉토리 생성 함수 개선
ensure_directory_exists() {
  local dir="$1"
  if [ -z "$dir" ]; then
    log_message "⚠️ 디렉토리 경로가 비어 있습니다."
    return 1
  fi
  
  if [ ! -d "$dir" ]; then
    log_message "  - 디렉토리 생성 필요: $dir (mkdir -p $dir 명령으로 생성할 수 있습니다)"
    # 여기서 자동 생성을 원한다면 아래 주석을 해제
    # mkdir -p "$dir" && echo "    ✓ 디렉토리 생성됨: $dir" || echo "    ⚠️ 디렉토리 생성 실패: $dir"
    return 1
  fi
  return 0
}

# 파일 세트 확인 함수 추가
check_file_set() {
  local file_set=("$@")
  local all_exist=true
  
  for file in "${file_set[@]}"; do
    if [ ! -f "$file" ]; then
      all_exist=false
      break
    fi
  done
  
  if $all_exist; then
    return 0  # 모든 파일이 존재
  else
    return 1  # 하나 이상의 파일이 없음
  fi
}

# 모듈 검사 함수 개선
check_module() {
  local module_file="$1"
  local module_name="$2"
  local description="$3"
  
  if [ -f "$module_file" ]; then
    log_message "✓ $module_name 기능이 구현되어 있습니다"
    return 0
  else
    log_message "⚠️ $module_name 기능 구현이 필요합니다: $module_file"
    if [ -n "$description" ]; then
      log_message "  - 설명: $description"
    fi
    
    # 디렉토리 경로가 유효한지 확인
    local dir=$(dirname "$module_file")
    if [ "$dir" != "." ]; then
      ensure_directory_exists "$dir"
    fi
    return 1
  fi
}

# 1순위 기능 검사
log_message "9. 1순위 기능 검사..."

# 정비 일정 관리 시스템 확인
log_message "9.1. 정비 일정 관리 시스템 검사..."
SCHEDULE_SERVICE="packages/api/src/modules/schedule_service.py"
SCHEDULE_CONTROLLER="packages/api/src/controllers/schedule_controller.py"
SCHEDULE_MODEL="packages/api/src/models/schedule.py"

if check_file_set "$SCHEDULE_SERVICE" "$SCHEDULE_CONTROLLER" "$SCHEDULE_MODEL"; then
  log_message "✓ 정비 일정 관리 시스템이 구현되어 있습니다"
else
  log_message "⚠️ 정비 일정 관리 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$SCHEDULE_SERVICE" ] && log_message "  - $SCHEDULE_SERVICE - 일정 관리 비즈니스 로직"
  [ ! -f "$SCHEDULE_CONTROLLER" ] && log_message "  - $SCHEDULE_CONTROLLER - 일정 관리 API 엔드포인트"
  [ ! -f "$SCHEDULE_MODEL" ] && log_message "  - $SCHEDULE_MODEL - 일정 데이터 모델"
  
  # 디렉토리 생성 체크 (개선됨)
  ensure_directory_exists "$(dirname "$SCHEDULE_SERVICE")"
  ensure_directory_exists "$(dirname "$SCHEDULE_CONTROLLER")"
  ensure_directory_exists "$(dirname "$SCHEDULE_MODEL")"
fi

# 부품 재고 관리 시스템 확인
log_message "9.2. 부품 재고 관리 시스템 검사..."
INVENTORY_SERVICE="packages/api/src/modules/inventory_service.py"
INVENTORY_CONTROLLER="packages/api/src/controllers/inventory_controller.py"
INVENTORY_MODEL="packages/api/src/models/inventory.py"

if check_file_set "$INVENTORY_SERVICE" "$INVENTORY_CONTROLLER" "$INVENTORY_MODEL"; then
  log_message "✓ 부품 재고 관리 시스템이 구현되어 있습니다"
else
  log_message "⚠️ 부품 재고 관리 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$INVENTORY_SERVICE" ] && log_message "  - $INVENTORY_SERVICE - 재고 관리 비즈니스 로직"
  [ ! -f "$INVENTORY_CONTROLLER" ] && log_message "  - $INVENTORY_CONTROLLER - 재고 관리 API 엔드포인트"
  [ ! -f "$INVENTORY_MODEL" ] && log_message "  - $INVENTORY_MODEL - 재고 데이터 모델"
  
  # 디렉토리 체크
  ensure_directory_exists "$(dirname "$INVENTORY_SERVICE")"
  ensure_directory_exists "$(dirname "$INVENTORY_CONTROLLER")"
  ensure_directory_exists "$(dirname "$INVENTORY_MODEL")"
fi

# 오프라인 작업 시스템 확인
log_message "9.3. 오프라인 작업 시스템 검사..."
OFFLINE_SERVICE="packages/frontend/src/services/offlineService.ts"
OFFLINE_HOOK="packages/frontend/src/hooks/useOfflineSync.ts"
OFFLINE_CONTEXT="packages/frontend/src/context/OfflineContext.tsx"

if check_file_set "$OFFLINE_SERVICE" "$OFFLINE_HOOK" "$OFFLINE_CONTEXT"; then
  log_message "✓ 오프라인 작업 시스템이 구현되어 있습니다"
else
  log_message "⚠️ 오프라인 작업 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$OFFLINE_SERVICE" ] && log_message "  - $OFFLINE_SERVICE - 오프라인 작업 서비스"
  [ ! -f "$OFFLINE_HOOK" ] && log_message "  - $OFFLINE_HOOK - 오프라인 동기화 훅"
  [ ! -f "$OFFLINE_CONTEXT" ] && log_message "  - $OFFLINE_CONTEXT - 오프라인 상태 컨텍스트"
  
  # 디렉토리 체크
  ensure_directory_exists "$(dirname "$OFFLINE_SERVICE")"
  ensure_directory_exists "$(dirname "$OFFLINE_HOOK")"
  ensure_directory_exists "$(dirname "$OFFLINE_CONTEXT")"
fi

# 데이터 백업 및 복원 시스템 확인
log_message "9.4. 데이터 백업 및 복원 시스템 검사..."
BACKUP_SERVICE="packages/api/src/modules/backup_service.py"
BACKUP_CONTROLLER="packages/api/src/controllers/backup_controller.py"
BACKUP_SCRIPT="scripts/backup.sh"

if check_file_set "$BACKUP_SERVICE" "$BACKUP_CONTROLLER" "$BACKUP_SCRIPT"; then
  log_message "✓ 데이터 백업 및 복원 시스템이 구현되어 있습니다"
else
  log_message "⚠️ 데이터 백업 및 복원 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$BACKUP_SERVICE" ] && log_message "  - $BACKUP_SERVICE - 백업 및 복원 비즈니스 로직"
  [ ! -f "$BACKUP_CONTROLLER" ] && log_message "  - $BACKUP_CONTROLLER - 백업 및 복원 API 엔드포인트"
  [ ! -f "$BACKUP_SCRIPT" ] && log_message "  - $BACKUP_SCRIPT - 자동 백업 스크립트"
  
  # 디렉토리 체크
  ensure_directory_exists "$(dirname "$BACKUP_SERVICE")"
  ensure_directory_exists "$(dirname "$BACKUP_CONTROLLER")"
  ensure_directory_exists "$(dirname "$BACKUP_SCRIPT")"
fi

# 2순위 기능 검사
log_message "10. 2순위 기능 검사..."

# 모바일 앱 지원 확인 (개선된 패턴 검색)
log_message "10.1. 모바일 앱 지원 검사..."
RESPONSIVE_CSS="${FRONTEND_SRC}/index.css"
SERVICE_WORKER="${FRONTEND_ROOT}/public/serviceWorker.js" # 경로 수정 (일반적인 위치로)

# CSS 파일 검사 (개선된 패턴 검색)
if [ -f "$RESPONSIVE_CSS" ]; then
  # 백슬래시 이스케이프 문제 수정
  if grep -q "@media.*\(max-width\|min-width\)" "$RESPONSIVE_CSS" && grep -q "\(mobile\|responsive\|screen\)" "$RESPONSIVE_CSS"; then
    log_message "✓ 모바일 반응형 CSS가 구현되어 있습니다"
  else
    log_message "⚠️ 모바일 반응형 CSS 구현이 필요합니다"
    log_message "  - $RESPONSIVE_CSS 파일에 @media 쿼리를 추가하세요 (예: @media (max-width: 768px) { ... })"
    log_message "  - 모바일 장치 타겟팅을 위한 키워드 추가 (mobile, responsive, screen 등)"
  fi
else
  log_message "⚠️ CSS 파일을 찾을 수 없습니다: $RESPONSIVE_CSS"
  ensure_directory_exists "$(dirname "$RESPONSIVE_CSS")"
fi

# 서비스 워커 검사 (여러 가능한 위치 확인)
SERVICE_WORKER_SRC="${FRONTEND_SRC}/serviceWorker.ts"
SERVICE_WORKER_SRC_ALT="${FRONTEND_SRC}/service-worker.ts"
SERVICE_WORKER_JS="${FRONTEND_SRC}/serviceWorker.js"

if [ -f "$SERVICE_WORKER" ]; then
  log_message "✓ 서비스 워커가 구현되어 있습니다 (public 디렉토리에 있음)"
elif [ -f "$SERVICE_WORKER_SRC" ]; then
  log_message "✓ 서비스 워커가 구현되어 있습니다 (src/serviceWorker.ts)"
elif [ -f "$SERVICE_WORKER_SRC_ALT" ]; then
  log_message "✓ 서비스 워커가 구현되어 있습니다 (src/service-worker.ts)"
elif [ -f "$SERVICE_WORKER_JS" ]; then
  log_message "✓ 서비스 워커가 구현되어 있습니다 (src/serviceWorker.js)"
else
  log_message "⚠️ 서비스 워커 구현이 필요합니다"
  log_message "  - 일반적인 위치: public/serviceWorker.js 또는 src/serviceWorker.ts"
  ensure_directory_exists "$(dirname "$SERVICE_WORKER")"
  ensure_directory_exists "$(dirname "$SERVICE_WORKER_SRC")"
fi

# 정비 견적 시스템 확인
log_message "10.2. 정비 견적 시스템 검사..."
ESTIMATE_SERVICE="packages/api/src/modules/estimate_service.py"
ESTIMATE_CONTROLLER="packages/api/src/controllers/estimate_controller.py"
ESTIMATE_MODEL="packages/api/src/models/estimate.py"

if check_file_set "$ESTIMATE_SERVICE" "$ESTIMATE_CONTROLLER" "$ESTIMATE_MODEL"; then
  log_message "✓ 정비 견적 시스템이 구현되어 있습니다"
else
  log_message "⚠️ 정비 견적 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$ESTIMATE_SERVICE" ] && log_message "  - $ESTIMATE_SERVICE - 견적 관리 비즈니스 로직"
  [ ! -f "$ESTIMATE_CONTROLLER" ] && log_message "  - $ESTIMATE_CONTROLLER - 견적 관리 API 엔드포인트"
  [ ! -f "$ESTIMATE_MODEL" ] && log_message "  - $ESTIMATE_MODEL - 견적 데이터 모델"
  
  # 디렉토리 체크
  ensure_directory_exists "$(dirname "$ESTIMATE_SERVICE")"
  ensure_directory_exists "$(dirname "$ESTIMATE_CONTROLLER")"
  ensure_directory_exists "$(dirname "$ESTIMATE_MODEL")"
fi

# 다크 모드 지원 확인
log_message "10.3. 다크 모드 지원 검사..."
THEME_CONTEXT="${FRONTEND_SRC}/context/ThemeContext.tsx"
THEME_HOOK="${FRONTEND_SRC}/hooks/useTheme.ts"

if check_file_set "$THEME_CONTEXT" "$THEME_HOOK"; then
  log_message "✓ 다크 모드 지원 시스템이 구현되어 있습니다"
else
  log_message "⚠️ 다크 모드 지원 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$THEME_CONTEXT" ] && log_message "  - $THEME_CONTEXT - 테마 컨텍스트"
  [ ! -f "$THEME_HOOK" ] && log_message "  - $THEME_HOOK - 테마 훅"
  
  # 디렉토리 체크
  ensure_directory_exists "$(dirname "$THEME_CONTEXT")"
  ensure_directory_exists "$(dirname "$THEME_HOOK")"
fi

# Docker 통합 확인 (다양한 파일명 검사)
log_message "10.4. Docker 통합 검사..."
DOCKERFILE="Dockerfile"
DOCKERFILE_ALT="docker/Dockerfile"
DOCKER_COMPOSE="docker-compose.yml"
DOCKER_COMPOSE_ALT="docker/docker-compose.yml"

# Docker 디렉토리 존재 여부 먼저 확인 (이스케이프 처리 개선)
if [ ! -d "docker" ]; then
  log_message "  - docker/ 디렉토리가 존재하지 않습니다. 필요한 경우 생성하세요."
fi

if [ -f "$DOCKERFILE" ] || [ -f "$DOCKERFILE_ALT" ]; then
  if [ -f "$DOCKER_COMPOSE" ] || [ -f "$DOCKER_COMPOSE_ALT" ]; then
    log_message "✓ Docker 통합이 구현되어 있습니다"
  else
    log_message "⚠️ Docker Compose 파일이 필요합니다"
    log_message "  - docker-compose.yml 파일을 생성하세요"
    log_message "  - 일반적인 위치: 프로젝트 루트 또는 docker/ 디렉토리"
  fi
else
  log_message "⚠️ Docker 통합이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  log_message "  - Dockerfile - 프로젝트 Dockerfile"
  log_message "  - docker-compose.yml - Docker Compose 설정"
  
  # docker 디렉토리 확인 (수정된 로직)
  if [ -d "docker" ]; then
    log_message "  - docker/ 디렉토리가 이미 존재합니다. 이 디렉토리에 파일을 생성하세요."
  else
    log_message "  - docker/ 디렉토리를 생성한 후 필요한 파일을 추가하거나, 프로젝트 루트에 직접 파일을 생성하세요."
  fi
fi

# API 성능 모니터링 확인
log_message "10.5. API 성능 모니터링 검사..."
MONITORING_SERVICE="${API_SRC}/core/monitoring.py"
MONITORING_MIDDLEWARE="${API_SRC}/core/middleware/monitoring_middleware.py"

if check_file_set "$MONITORING_SERVICE" "$MONITORING_MIDDLEWARE"; then
  log_message "✓ API 성능 모니터링 시스템이 구현되어 있습니다"
else
  log_message "⚠️ API 성능 모니터링 시스템이 완전히 구현되지 않았습니다. 다음 파일 생성이 필요합니다:"
  [ ! -f "$MONITORING_SERVICE" ] && log_message "  - $MONITORING_SERVICE - 모니터링 서비스"
  [ ! -f "$MONITORING_MIDDLEWARE" ] && log_message "  - $MONITORING_MIDDLEWARE - 모니터링 미들웨어"
  
  # 디렉토리 체크
  ensure_directory_exists "$(dirname "$MONITORING_SERVICE")"
  ensure_directory_exists "$(dirname "$MONITORING_MIDDLEWARE")"
fi

# 3순위 기능 검사 (간단히)
log_message "11. 3순위 기능 검사 (간략하게)..."

# CRM 기능 확인
log_message "11.1. 고객 관계 관리(CRM) 기능 검사..."
CRM_SERVICE="${API_SRC}/modules/crm_service.py"
check_module "$CRM_SERVICE" "CRM" "고객 관리 및 차량 정보 통합 관리 기능"

# QR 코드 차량 식별 시스템 확인
log_message "11.2. QR 코드 차량 식별 시스템 검사..."
QR_SERVICE="${API_SRC}/modules/qr_service.py"
check_module "$QR_SERVICE" "QR 코드 차량 식별 시스템" "차량별 QR 코드 생성 및 스캔 기능"

# 데이터 분석 및 리포팅 확인
log_message "11.3. 데이터 분석 및 리포팅 기능 검사..."
ANALYTICS_SERVICE="${API_SRC}/modules/analytics_service.py"
check_module "$ANALYTICS_SERVICE" "데이터 분석 및 리포팅" "정비 이력 및 비용 패턴 분석 기능"

# 사용자 권한 관리 확인
log_message "11.4. 고급 사용자 권한 관리 검사..."
RBAC_SERVICE="${API_SRC}/modules/rbac_service.py"
check_module "$RBAC_SERVICE" "고급 사용자 권한 관리" "역할 기반 액세스 제어(RBAC) 시스템"

# 다국어 지원 확인 (경로 수정 - i18n이 더 일반적인 이름)
log_message "11.5. 다국어 지원 검사..."
I18N_SERVICE="${FRONTEND_SRC}/services/i18nService.ts"
I18N_ALT="${FRONTEND_SRC}/i18n/index.ts"

if [ -f "$I18N_SERVICE" ] || [ -f "$I18N_ALT" ]; then
  log_message "✓ 다국어 지원 기능이 구현되어 있습니다"
else
  log_message "⚠️ 다국어 지원 기능 구현이 필요합니다"
  log_message "  - 일반적인 위치: ${FRONTEND_SRC}/services/i18nService.ts 또는 ${FRONTEND_SRC}/i18n/"
  log_message "  - 설명: 다국어 지원을 위한 번역 시스템 구현"
  
  # 디렉토리 체크 (개선됨 - local 키워드 제거)
  i18n_service_dir=$(dirname "$I18N_SERVICE")
  
  ensure_directory_exists "$i18n_service_dir"
  # i18n 디렉토리 확인
  if [ ! -d "${FRONTEND_SRC}/i18n" ]; then
    log_message "  - ${FRONTEND_SRC}/i18n/ 디렉토리 생성 필요"
  fi
fi

# CI/CD 파이프라인 확인 (여러 위치 확인)
log_message "11.6. CI/CD 파이프라인 검사..."
GITHUB_WORKFLOW=".github/workflows/ci.yml"
GITHUB_ACTIONS=".github/workflows/main.yml"
GITLAB_CI=".gitlab-ci.yml"

if [ -f "$GITHUB_WORKFLOW" ] || [ -f "$GITHUB_ACTIONS" ] || [ -f "$GITLAB_CI" ]; then
  log_message "✓ CI/CD 파이프라인이 구현되어 있습니다"
else
  log_message "⚠️ CI/CD 파이프라인 구현이 필요합니다"
  log_message "  - GitHub Actions: .github/workflows/ci.yml 또는 .github/workflows/main.yml"
  log_message "  - GitLab CI: .gitlab-ci.yml"
  log_message "  - 설명: 자동 테스트 및 배포 파이프라인 구성"
  
  # GitHub 워크플로우 디렉토리 확인 (개선됨)
  github_dir=".github"
  workflows_dir=".github/workflows"
  
  if [ ! -d "$workflows_dir" ]; then
    log_message "  - $workflows_dir/ 디렉토리 생성 필요"
    if [ ! -d "$github_dir" ]; then
      log_message "    - $github_dir/ 디렉토리부터 생성해야 합니다"
    fi
  fi
fi

# 수정 요약 생성
log_message ""
log_message "===== 수정 요약 ====="
log_message "1. npm 스크립트 섹션 검사 및 'error' 명령어 충돌 해결"
log_message "2. TSConfig 파일에 skipLibCheck 및 resolveJsonModule 옵션 추가"
log_message "3. MaintenanceController 경로 감지 기능 확인"
log_message "4. Todo 컴포넌트 오프라인 동기화 로직 확인"
log_message "5. MapService 에러 처리 및 알림 시스템 확인"
log_message "6. GeofenceManager 컴포넌트 API 인터페이스 일관성 확인"
log_message "7. 주요 의존성 버전 확인"
log_message ""
log_message "===== 우선순위별 추가 기능 요약 ====="
log_message "1순위 (핵심 비즈니스 기능):"
log_message "- 정비 일정 관리 시스템 구현"
log_message "- 부품 재고 관리 시스템 구현"
log_message "- 오프라인 작업 시스템 강화"
log_message "- 데이터 백업 및 복원 시스템 구현"
log_message ""
log_message "2순위 (사용자 경험 향상):"
log_message "- 모바일 앱 지원 강화"
log_message "- 정비 견적 시스템 구현"
log_message "- 다크 모드 지원"
log_message "- Docker 통합"
log_message "- API 성능 모니터링 구현"
log_message ""
log_message "3순위 (고급 기능):"
log_message "- 고객 관계 관리(CRM) 구현"
log_message "- QR 코드 차량 식별 시스템"
log_message "- 데이터 분석 및 리포팅"
log_message "- 고급 사용자 권한 관리"
log_message "- 다국어 지원"
log_message "- CI/CD 파이프라인 구축"
log_message ""
log_message "npm 스크립트 명령어 오류 수정 및 기능 추가 검사 완료!"
log_message "이제 npm install 및 빌드 명령을 다시 실행해보세요."

# 스크립트 마지막에 실행 요약 추가
log_message ""
log_message "===== 스크립트 실행 요약 ====="
log_message "실행 결과가 ${LOG_FILE}에 저장되었습니다."
log_message "발견된 문제를 검토하고 필요한 수정을 수행하세요."
log_message "모든 검사가 완료되었습니다." 