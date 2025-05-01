#!/bin/bash
# Docker를 통한 시크릿 마이그레이션 스크립트
# 실행 방법: ./docker_migrate_secrets.sh

# 1. Vault 컨테이너 확인
VAULT_CONTAINER=$(docker ps | grep hashicorp-vault | awk '{print $1}')

if [ -z "$VAULT_CONTAINER" ]; then
  echo "❌ Vault 컨테이너가 실행 중이 아닙니다."
  echo "docker-compose -f docker-compose.vault.yml up -d 명령을 실행해 주세요."
  exit 1
fi

echo "✅ Vault 컨테이너가 실행 중입니다: $VAULT_CONTAINER"

# 2. KV 시크릿 엔진 활성화
echo "KV 시크릿 엔진 활성화 중..."
docker exec $VAULT_CONTAINER vault secrets enable -version=2 -path=kv kv 2>/dev/null || true
echo "✅ KV 시크릿 엔진이 활성화되었습니다."

# 3. 현재 디렉토리
ROOT_DIR=$(cd .. && pwd)
LOG_FILE="./docker_secrets_migration_$(date +"%Y%m%d_%H%M%S").log"

# 4. 로그 초기화
echo "# Docker를 통한 시크릿 마이그레이션 로그 - $(date)" > $LOG_FILE
echo "실행 디렉토리: $ROOT_DIR" >> $LOG_FILE
echo "" >> $LOG_FILE

# 5. 시크릿 패턴 검색
echo "## 하드코딩된 시크릿 검색 중..." | tee -a $LOG_FILE
echo "다음 패턴에 대해 검색합니다: API 키, 토큰, 비밀번호, 시크릿" | tee -a $LOG_FILE

# 6. 검색할 파일 확장자 및 패턴
FILE_PATTERNS=("*.js" "*.py" "*.ts" "*.java" "*.yaml" "*.yml" "*.json" "*.env*" "*.properties" "*.xml" "*.sh")
SECRET_PATTERNS=("api[_-]key" "apikey" "token" "secret" "password" "passwd" "pwd" "auth" "credential" "private[_-]key")

# 7. 임시 결과 파일
TEMP_RESULTS=$(mktemp)

# 8. 각 패턴에 대해 검색
cd $ROOT_DIR
for file_pattern in "${FILE_PATTERNS[@]}"; do
  for secret_pattern in "${SECRET_PATTERNS[@]}"; do
    find . -name "$file_pattern" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/backup_*/*" -type f -exec grep -l -i "$secret_pattern" {} \; >> $TEMP_RESULTS 2>/dev/null
  done
done

# 9. 결과 정리 및 보고
FOUND_COUNT=$(wc -l < $TEMP_RESULTS)
echo "발견된 잠재적 시크릿을 포함하는 파일: $FOUND_COUNT 개" | tee -a $LOG_FILE

if [ $FOUND_COUNT -gt 0 ]; then
  echo "" >> $LOG_FILE
  echo "### 발견된 잠재적 시크릿 포함 파일 목록" >> $LOG_FILE
  cat $TEMP_RESULTS | sort -u >> $LOG_FILE
  
  # 10. 각 파일에서 시크릿 찾기 및 Vault에 저장
  echo "## 발견된 파일에서 시크릿 검색 및 저장" | tee -a $LOG_FILE
  
  cat $TEMP_RESULTS | sort -u | while read file_path; do
    echo "파일 처리 중: $file_path" | tee -a $LOG_FILE
    
    # 파일 경로에서 카테고리 추출
    category=$(basename $(dirname "$file_path") | tr '[:upper:]' '[:lower:]')
    
    # 각 시크릿 패턴에 대해 검색
    for secret_pattern in "${SECRET_PATTERNS[@]}"; do
      grep -i "$secret_pattern" "$file_path" | while read -r line; do
        # 라인에서 시크릿 키와 값 추출 시도
        # 다음 패턴들을 시