#!/bin/bash
# 프로젝트 백업 및 복원 시스템
# 2024-06-24 작성
#
# 이 스크립트는 다음을 수행합니다:
# 1. 전체 프로젝트 소스 코드 백업
# 2. 특정 백업으로부터 복원
# 3. 데이터베이스 덤프 및 복원 (선택적)
# 4. 증분 백업 및 구성 백업

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 현재 날짜 및 시간
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 스크립트 시작 메시지
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}           프로젝트 백업 및 복원 시스템               ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 프로젝트 루트 디렉토리 이동
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# 백업 디렉토리 설정
BACKUP_BASE_DIR="$PROJECT_ROOT/.project_backups"
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

# 데이터베이스 설정
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_NAME=${DB_NAME:-"maintenance"}

# 사용법 출력
usage() {
  echo -e "사용법: $0 [옵션]"
  echo -e ""
  echo -e "옵션:"
  echo -e "  --backup                  전체 프로젝트 백업 (기본 동작)"
  echo -e "  --restore TIMESTAMP       특정 백업으로부터 복원 (예: $0 --restore 20240624_120000)"
  echo -e "  --list                    사용 가능한 백업 목록 표시"
  echo -e "  --config-only             설정 파일만 백업"
  echo -e "  --source-only             소스 코드만 백업 (node_modules 등 제외)"
  echo -e "  --db-only                 데이터베이스만 백업/복원"
  echo -e "  --incremental             마지막 백업 이후 변경된 파일만 백업"
  echo -e "  --help                    이 도움말 표시"
  echo -e ""
  echo -e "예제:"
  echo -e "  $0                        전체 프로젝트 백업"
  echo -e "  $0 --restore 20240624_120000   특정 백업에서 복원"
  echo -e "  $0 --list                 백업 목록 보기"
  echo -e "  $0 --source-only          소스 코드만 백업"
  echo -e ""
}

# 백업 목록 표시
list_backups() {
  echo -e "\n${BLUE}사용 가능한 백업 목록:${NC}"
  if [ -d "$BACKUP_BASE_DIR" ]; then
    if [ "$(ls -A "$BACKUP_BASE_DIR")" ]; then
      echo -e "${YELLOW}백업 타임스탬프 | 백업 크기 | 백업 유형${NC}"
      for backup in "$BACKUP_BASE_DIR"/*; do
        if [ -d "$backup" ]; then
          backup_name=$(basename "$backup")
          backup_size=$(du -sh "$backup" | cut -f1)
          backup_type="전체"
          
          if [ -f "$backup/backup_type.txt" ]; then
            backup_type=$(cat "$backup/backup_type.txt")
          fi
          
          echo -e "${backup_name} | ${backup_size} | ${backup_type}"
        fi
      done | sort -r
    else
      echo -e "${YELLOW}백업이 없습니다.${NC}"
    fi
  else
    echo -e "${YELLOW}백업 디렉토리가 존재하지 않습니다.${NC}"
  fi
  echo ""
}

# 백업 검증
validate_backup() {
  local backup_dir=$1
  
  if [ ! -d "$backup_dir" ]; then
    echo -e "${RED}오류: 백업 디렉토리 '$backup_dir'가 존재하지 않습니다.${NC}"
    return 1
  fi
  
  if [ ! -f "$backup_dir/backup_manifest.txt" ]; then
    echo -e "${RED}오류: '$backup_dir'에 백업 매니페스트가 없습니다. 유효한 백업이 아닙니다.${NC}"
    return 1
  fi
  
  return 0
}

# 파일 백업
backup_files() {
  local backup_type=$1
  local include_node_modules=${2:-false}
  local incremental=${3:-false}
  
  echo -e "\n${YELLOW}[1/3] 프로젝트 파일 백업 중...${NC}"
  
  mkdir -p "$BACKUP_DIR"
  
  # 백업 유형 저장
  echo "$backup_type" > "$BACKUP_DIR/backup_type.txt"
  
  # 소스 파일 백업
  if [ "$backup_type" == "설정만" ]; then
    # 설정 파일만 백업
    echo -e "${BLUE}설정 파일 백업 중...${NC}"
    find "$PROJECT_ROOT" -type f \( -name "*.json" -o -name "*.env*" -o -name "*.yml" -o -name "*.yaml" -o -name "*.config.*" -o -name ".env*" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" | while read -r file; do
      rel_path=${file#"$PROJECT_ROOT/"}
      mkdir -p "$BACKUP_DIR/$(dirname "$rel_path")"
      cp "$file" "$BACKUP_DIR/$rel_path"
    done
  else
    # 전체 또는 소스코드만 백업
    echo -e "${BLUE}소스 코드 백업 중...${NC}"
    
    # 증분 백업이면 마지막 백업 이후 변경된 파일만 백업
    if [ "$incremental" == true ]; then
      # 마지막 백업 찾기
      last_backup=$(find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r | head -n 1)
      
      if [ -n "$last_backup" ] && [ -f "$last_backup/backup_timestamp.txt" ]; then
        last_backup_time=$(cat "$last_backup/backup_timestamp.txt")
        echo -e "${BLUE}마지막 백업($last_backup_time) 이후 변경된 파일 백업 중...${NC}"
        
        find "$PROJECT_ROOT" \( -type f -o -type d \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" -not -path "*/.project_backups/*" -newer "$last_backup/backup_timestamp.txt" | while read -r item; do
          if [ -f "$item" ]; then
            rel_path=${item#"$PROJECT_ROOT/"}
            mkdir -p "$BACKUP_DIR/$(dirname "$rel_path")"
            cp "$item" "$BACKUP_DIR/$rel_path"
          elif [ -d "$item" ] && [ ! -d "$BACKUP_DIR/${item#"$PROJECT_ROOT/"}" ]; then
            mkdir -p "$BACKUP_DIR/${item#"$PROJECT_ROOT/"}"
          fi
        done
      else
        echo -e "${YELLOW}마지막 백업을 찾을 수 없어 전체 백업을 진행합니다.${NC}"
        perform_full_backup "$include_node_modules"
      fi
    else
      perform_full_backup "$include_node_modules"
    fi
  fi
  
  # 매니페스트 파일 생성 (백업된 파일 목록)
  find "$BACKUP_DIR" -type f -not -path "*/\.git/*" | sort > "$BACKUP_DIR/backup_manifest.txt"
  
  # 백업 타임스탬프 저장
  date +"%Y-%m-%d %H:%M:%S" > "$BACKUP_DIR/backup_timestamp.txt"
  
  # 기본 프로젝트 정보 저장
  echo "프로젝트: maintenance-monorepo" > "$BACKUP_DIR/backup_info.txt"
  echo "백업 시간: $(date)" >> "$BACKUP_DIR/backup_info.txt"
  echo "백업 유형: $backup_type" >> "$BACKUP_DIR/backup_info.txt"
  echo "노드 버전: $(node -v)" >> "$BACKUP_DIR/backup_info.txt"
  echo "NPM 버전: $(npm -v)" >> "$BACKUP_DIR/backup_info.txt"
  
  echo -e "${GREEN}✓ 파일 백업 완료: $BACKUP_DIR${NC}"
}

# 전체 백업 수행
perform_full_backup() {
  local include_node_modules=$1
  
  if [ "$include_node_modules" == true ]; then
    # node_modules 포함 전체 백업
    echo -e "${BLUE}전체 프로젝트 백업 중 (node_modules 포함)...${NC}"
    rsync -a --exclude=".git" --exclude=".project_backups" "$PROJECT_ROOT/" "$BACKUP_DIR/"
  else
    # node_modules 제외 백업
    echo -e "${BLUE}전체 프로젝트 백업 중 (node_modules 제외)...${NC}"
    rsync -a --exclude=".git" --exclude=".project_backups" --exclude="node_modules" --exclude="dist" "$PROJECT_ROOT/" "$BACKUP_DIR/"
  fi
}

# 데이터베이스 백업
backup_database() {
  echo -e "\n${YELLOW}[2/3] 데이터베이스 백업 중...${NC}"
  
  # PostgreSQL 백업 (pg_dump)
  if command -v pg_dump &> /dev/null; then
    mkdir -p "$BACKUP_DIR/database"
    echo -e "${BLUE}PostgreSQL 데이터베이스 백업 중...${NC}"
    
    DB_PASSWORD_PROMPT=""
    if [ -z "$PGPASSWORD" ]; then
      read -rsp "PostgreSQL 비밀번호 입력 (설정되어 있지 않으면 Enter): " DB_PASSWORD
      echo ""
      if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
        DB_PASSWORD_PROMPT="-W"
      fi
    fi
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" $DB_PASSWORD_PROMPT -d "$DB_NAME" -F c -f "$BACKUP_DIR/database/postgres_dump.sql" || {
      echo -e "${RED}PostgreSQL 백업 실패${NC}"
      return 1
    }
    
    echo -e "${GREEN}✓ PostgreSQL 데이터베이스 백업 완료${NC}"
  else
    echo -e "${YELLOW}! pg_dump 명령이 없습니다. PostgreSQL 백업을 건너뜁니다.${NC}"
  fi
  
  return 0
}

# Git 저장소 상태 백업
backup_git_state() {
  echo -e "\n${YELLOW}[3/3] Git 저장소 상태 백업 중...${NC}"
  
  if [ -d "$PROJECT_ROOT/.git" ]; then
    mkdir -p "$BACKUP_DIR/git"
    
    # 현재 브랜치 및 커밋 정보
    git branch > "$BACKUP_DIR/git/branches.txt"
    git log --oneline -n 10 > "$BACKUP_DIR/git/recent_commits.txt"
    git status > "$BACKUP_DIR/git/status.txt"
    
    # 변경된 파일 목록
    git diff --name-status > "$BACKUP_DIR/git/changed_files.txt"
    
    # 변경 내용
    git diff > "$BACKUP_DIR/git/changes.patch"
    
    echo -e "${GREEN}✓ Git 저장소 상태 백업 완료${NC}"
  else
    echo -e "${YELLOW}! Git 저장소가 아닙니다. Git 상태 백업을 건너뜁니다.${NC}"
  fi
}

# 백업 복원
restore_backup() {
  local backup_timestamp=$1
  local restore_dir="$BACKUP_BASE_DIR/$backup_timestamp"
  
  echo -e "\n${YELLOW}백업 '$backup_timestamp'에서 복원 중...${NC}"
  
  # 백업 검증
  validate_backup "$restore_dir" || return 1
  
  # 백업 종류 확인
  local backup_type="전체"
  if [ -f "$restore_dir/backup_type.txt" ]; then
    backup_type=$(cat "$restore_dir/backup_type.txt")
  fi
  
  echo -e "${BLUE}백업 유형: $backup_type${NC}"
  
  # 복원 전 확인
  read -rp "복원을 진행하시겠습니까? 현재 파일들이 덮어쓰기될 수 있습니다. (y/n): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}복원이 취소되었습니다.${NC}"
    return 0
  fi
  
  # 복원 진행
  echo -e "\n${BLUE}[1/2] 파일 복원 중...${NC}"
  
  # 백업 매니페스트 확인
  if [ -f "$restore_dir/backup_manifest.txt" ]; then
    # 매니페스트 기반 복원
    while IFS= read -r backup_file; do
      # 백업 디렉토리 경로를 제외
      rel_path=${backup_file#"$restore_dir/"}
      
      # 백업 관련 메타파일 제외
      if [[ "$rel_path" == "backup_manifest.txt" || "$rel_path" == "backup_timestamp.txt" || "$rel_path" == "backup_type.txt" || "$rel_path" == "backup_info.txt" ]]; then
        continue
      fi
      
      # 원본 경로 구성
      target_path="$PROJECT_ROOT/$rel_path"
      
      # 디렉토리 생성
      mkdir -p "$(dirname "$target_path")"
      
      # 파일 복원
      cp "$backup_file" "$target_path"
    done < "$restore_dir/backup_manifest.txt"
  else
    # rsync 기반 복원
    rsync -a --exclude="backup_manifest.txt" --exclude="backup_timestamp.txt" --exclude="backup_type.txt" --exclude="backup_info.txt" --exclude="database" --exclude="git" "$restore_dir/" "$PROJECT_ROOT/"
  fi
  
  echo -e "${GREEN}✓ 파일 복원 완료${NC}"
  
  # 데이터베이스 복원
  if [ -f "$restore_dir/database/postgres_dump.sql" ]; then
    echo -e "\n${BLUE}[2/2] 데이터베이스 복원 중...${NC}"
    
    read -rp "데이터베이스도 복원하시겠습니까? 현재 데이터가 덮어쓰기될 수 있습니다. (y/n): " confirm_db
    if [[ "$confirm_db" =~ ^[Yy]$ ]]; then
      if command -v pg_restore &> /dev/null; then
        DB_PASSWORD_PROMPT=""
        if [ -z "$PGPASSWORD" ]; then
          read -rsp "PostgreSQL 비밀번호 입력 (설정되어 있지 않으면 Enter): " DB_PASSWORD
          echo ""
          if [ -n "$DB_PASSWORD" ]; then
            export PGPASSWORD="$DB_PASSWORD"
            DB_PASSWORD_PROMPT="-W"
          fi
        fi
        
        # 데이터베이스 복원
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" $DB_PASSWORD_PROMPT -d "$DB_NAME" -c "$restore_dir/database/postgres_dump.sql" || {
          echo -e "${RED}PostgreSQL 복원 실패${NC}"
        }
        
        echo -e "${GREEN}✓ 데이터베이스 복원 완료${NC}"
      else
        echo -e "${YELLOW}! pg_restore 명령이 없습니다. 데이터베이스 복원을 건너뜁니다.${NC}"
      fi
    else
      echo -e "${YELLOW}데이터베이스 복원을 건너뜁니다.${NC}"
    fi
  else
    echo -e "${YELLOW}! 데이터베이스 백업 파일이 없습니다.${NC}"
  fi
  
  echo -e "\n${GREEN}=====================================================${NC}"
  echo -e "${GREEN}   복원이 완료되었습니다: $backup_timestamp   ${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  
  return 0
}

# 메인 로직
main() {
  local action="backup"
  local backup_type="전체"
  local include_node_modules=false
  local incremental=false
  local restore_timestamp=""
  
  # 인자 파싱
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --backup)
        action="backup"
        shift
        ;;
      --restore)
        action="restore"
        restore_timestamp="$2"
        shift 2
        ;;
      --list)
        action="list"
        shift
        ;;
      --config-only)
        backup_type="설정만"
        shift
        ;;
      --source-only)
        backup_type="소스만"
        shift
        ;;
      --db-only)
        action="db-backup"
        shift
        ;;
      --incremental)
        incremental=true
        shift
        ;;
      --with-modules)
        include_node_modules=true
        shift
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        echo -e "${RED}오류: 알 수 없는 옵션 $1${NC}"
        usage
        exit 1
        ;;
    esac
  done
  
  case "$action" in
    backup)
      # 백업 디렉토리 생성
      mkdir -p "$BACKUP_BASE_DIR"
      
      echo -e "${BLUE}백업 유형: $backup_type${NC}"
      echo -e "${BLUE}증분 백업: $incremental${NC}"
      
      # 파일 백업
      backup_files "$backup_type" "$include_node_modules" "$incremental"
      
      # 데이터베이스 백업 (소스만 백업일 때는 건너뜀)
      if [ "$backup_type" != "소스만" ] && [ "$backup_type" != "설정만" ]; then
        backup_database
      else
        echo -e "\n${YELLOW}[2/3] 데이터베이스 백업 건너뜀 (백업 유형: $backup_type)${NC}"
      fi
      
      # Git 상태 백업
      backup_git_state
      
      echo -e "\n${GREEN}=====================================================${NC}"
      echo -e "${GREEN}   백업이 완료되었습니다: $TIMESTAMP   ${NC}"
      echo -e "${GREEN}=====================================================${NC}"
      echo -e "백업 디렉토리: $BACKUP_DIR"
      ;;
    
    db-backup)
      # 백업 디렉토리 생성
      mkdir -p "$BACKUP_BASE_DIR"
      mkdir -p "$BACKUP_DIR"
      
      echo "데이터베이스만" > "$BACKUP_DIR/backup_type.txt"
      backup_database
      
      # 매니페스트 파일 생성
      find "$BACKUP_DIR" -type f -not -path "*/\.git/*" | sort > "$BACKUP_DIR/backup_manifest.txt"
      
      # 백업 타임스탬프 저장
      date +"%Y-%m-%d %H:%M:%S" > "$BACKUP_DIR/backup_timestamp.txt"
      
      # 기본 프로젝트 정보 저장
      echo "프로젝트: maintenance-monorepo" > "$BACKUP_DIR/backup_info.txt"
      echo "백업 시간: $(date)" >> "$BACKUP_DIR/backup_info.txt"
      echo "백업 유형: 데이터베이스만" >> "$BACKUP_DIR/backup_info.txt"
      
      echo -e "\n${GREEN}=====================================================${NC}"
      echo -e "${GREEN}   데이터베이스 백업이 완료되었습니다: $TIMESTAMP   ${NC}"
      echo -e "${GREEN}=====================================================${NC}"
      echo -e "백업 디렉토리: $BACKUP_DIR"
      ;;
      
    restore)
      if [ -z "$restore_timestamp" ]; then
        echo -e "${RED}오류: 복원할 타임스탬프를 지정해야 합니다.${NC}"
        usage
        exit 1
      fi
      
      restore_backup "$restore_timestamp"
      ;;
      
    list)
      list_backups
      ;;
  esac
}

# 스크립트 실행
main "$@"