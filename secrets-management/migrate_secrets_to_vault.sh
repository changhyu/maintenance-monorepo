#!/bin/bash
# 하드코딩된 시크릿을 Vault로 마이그레이션하는 스크립트
# 실행 방법: ./migrate_secrets_to_vault.sh

# Vault 환경 변수 설정
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='root'  # 개발 환경용, 실제 운영에서는 안전한 토큰 사용

# 현재 디렉토리
ROOT_DIR=$(cd .. && pwd)
LOG_FILE="./secrets_migration_$(date +"%Y%m%d_%H%M%S").log"

# 결과 로그 초기화
echo "# 시크릿 마이그레이션 로그 - $(date)" > $LOG_FILE
echo "실행 디렉토리: $ROOT_DIR" >> $LOG_FILE
echo "" >> $LOG_FILE

# Vault 연결 확인
echo "Vault 연결 확인 중..." | tee -a $LOG_FILE
if ! vault status > /dev/null 2>&1; then
  echo "❌ Vault 서버에 연결할 수 없습니다. docker-compose -f docker-compose.vault.yml up -d 실행 여부를 확인하세요." | tee -a $LOG_FILE
  exit 1
fi
echo "✅ Vault 서버에 연결되었습니다." | tee -a $LOG_FILE
echo "" >> $LOG_FILE

# 시크릿 엔진 확인 및 생성
echo "KV 시크릿 엔진 확인 중..." | tee -a $LOG_FILE
if ! vault secrets list | grep -q "^kv/"; then
  echo "KV 시크릿 엔진을 활성화합니다..." | tee -a $LOG_FILE
  vault secrets enable -version=2 -path=kv kv
  echo "✅ KV 시크릿 엔진이 활성화되었습니다." | tee -a $LOG_FILE
else
  echo "✅ KV 시크릿 엔진이 이미 활성화되어 있습니다." | tee -a $LOG_FILE
fi
echo "" >> $LOG_FILE

# 시크릿 패턴 검색
echo "## 하드코딩된 시크릿 검색 중..." | tee -a $LOG_FILE
echo "다음 패턴에 대해 검색합니다: API 키, 토큰, 비밀번호, 시크릿" | tee -a $LOG_FILE

# 검색할 파일 확장자 및 패턴
FILE_PATTERNS=("*.js" "*.py" "*.ts" "*.java" "*.yaml" "*.yml" "*.json" "*.env*" "*.properties" "*.xml" "*.sh")
SECRET_PATTERNS=("api[_-]key" "apikey" "token" "secret" "password" "passwd" "pwd" "auth" "credential" "private[_-]key")

# 임시 결과 파일
TEMP_RESULTS=$(mktemp)

# 각 패턴에 대해 검색
cd $ROOT_DIR
for file_pattern in "${FILE_PATTERNS[@]}"; do
  for secret_pattern in "${SECRET_PATTERNS[@]}"; do
    grep -r --include="$file_pattern" -i "$secret_pattern" --exclude-dir={node_modules,.git,.venv,.venv_py38,backup_*} . >> $TEMP_RESULTS 2>/dev/null
  done
done

# 결과 정리 및 보고
FOUND_COUNT=$(wc -l < $TEMP_RESULTS)
echo "발견된 잠재적 시크릿: $FOUND_COUNT 개" | tee -a $LOG_FILE

if [ $FOUND_COUNT -gt 0 ]; then
  echo "" >> $LOG_FILE
  echo "### 발견된 잠재적 시크릿 목록" >> $LOG_FILE
  cat $TEMP_RESULTS | sort -u >> $LOG_FILE
  
  # 시크릿 마이그레이션 유틸리티용 CSV 파일 생성
  echo "시크릿 마이그레이션 CSV 파일 생성..." | tee -a $LOG_FILE
  CSV_FILE="./secrets_to_migrate.csv"
  echo "파일경로,라인번호,시크릿키,시크릿값,마이그레이션상태" > $CSV_FILE
  
  cat $TEMP_RESULTS | grep -v "vault\|example" | sed -E 's/^([^:]+):([0-9]+):.*/\1,\2,,미완료/' | sort -u >> $CSV_FILE
  
  echo "✅ 마이그레이션할 시크릿을 $CSV_FILE 파일에 정리했습니다." | tee -a $LOG_FILE
  echo "이 파일을 열어 각 시크릿의 키와 값을 입력한 후 마이그레이션을 진행하세요." | tee -a $LOG_FILE
else
  echo "시크릿이 발견되지 않았습니다." | tee -a $LOG_FILE
fi

# 정리
rm $TEMP_RESULTS

echo "" >> $LOG_FILE
echo "## 다음 단계:" | tee -a $LOG_FILE
echo "1. secrets_to_migrate.csv 파일을 열어 시크릿 정보를 작성하세요." | tee -a $LOG_FILE
echo "2. 시크릿을 Vault에 저장하기 위해 import_secrets_to_vault.sh 스크립트를 실행하세요." | tee -a $LOG_FILE
echo "3. 애플리케이션 코드를 수정하여 Vault API를 통해 시크릿에 접근하도록 변경하세요." | tee -a $LOG_FILE

echo "✅ 스크립트 실행이 완료되었습니다. 결과는 $LOG_FILE 파일을 참조하세요."
