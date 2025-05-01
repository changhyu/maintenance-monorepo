#!/bin/bash
# CSV 파일에서 시크릿을 읽어 Vault로 임포트하는 스크립트
# 실행 방법: ./import_secrets_to_vault.sh ./secrets_to_migrate.csv

# Vault 환경 변수 설정
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='root'  # 개발 환경용, 실제 운영에서는 안전한 토큰 사용

# 파라미터 확인
if [ "$#" -ne 1 ]; then
    echo "사용법: $0 <CSV_파일_경로>"
    exit 1
fi

CSV_FILE=$1
LOG_FILE="./vault_import_$(date +"%Y%m%d_%H%M%S").log"

# CSV 파일 존재 확인
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ CSV 파일을 찾을 수 없습니다: $CSV_FILE"
    exit 1
fi

# 결과 로그 초기화
echo "# Vault 시크릿 임포트 로그 - $(date)" > $LOG_FILE
echo "CSV 파일: $CSV_FILE" >> $LOG_FILE
echo "" >> $LOG_FILE

# Vault 연결 확인
echo "Vault 연결 확인 중..." | tee -a $LOG_FILE
if ! vault status > /dev/null 2>&1; then
  echo "❌ Vault 서버에 연결할 수 없습니다. docker-compose -f docker-compose.vault.yml up -d 실행 여부를 확인하세요." | tee -a $LOG_FILE
  exit 1
fi
echo "✅ Vault 서버에 연결되었습니다." | tee -a $LOG_FILE
echo "" >> $LOG_FILE

# CSV 파일 처리
echo "## Vault로 시크릿 임포트 중..." | tee -a $LOG_FILE

# 헤더 제외하고 CSV 파일 읽기
tail -n +2 "$CSV_FILE" | while IFS=, read -r filepath line key value status; do
    # 키와 값이 모두 제공된 경우만 처리
    if [ -n "$key" ] && [ -n "$value" ]; then
        # 파일 경로에서 카테고리 추출 (예: ./src/auth/config.js -> auth)
        category=$(echo "$filepath" | sed -E 's/.*\/(.*)\/.*/\1/' | tr '[:upper:]' '[:lower:]')
        if [ "$category" == "$filepath" ]; then
            # 패턴이 매치되지 않으면 'general' 카테고리 사용
            category="general"
        fi
        
        # 시크릿 키에서 특수문자 제거하고 소문자로 변환
        clean_key=$(echo "$key" | tr -cd '[:alnum:]_-' | tr '[:upper:]' '[:lower:]')
        
        # Vault 경로 구성
        vault_path="kv/$category/$clean_key"
        
        echo "시크릿 저장 중: $key -> $vault_path" | tee -a $LOG_FILE
        
        # Vault에 시크릿 저장
        if vault kv put "$vault_path" value="$value" source_file="$filepath" source_line="$line" > /dev/null 2>&1; then
            echo "✅ 성공: $vault_path" | tee -a $LOG_FILE
            
            # CSV 파일에서 해당 행의 상태 업데이트 (sed 인라인 수정)
            sed -i'' -e "s|$filepath,$line,$key,$value,미완료|$filepath,$line,$key,$value,완료|g" "$CSV_FILE"
        else
            echo "❌ 실패: $vault_path - Vault에 저장하지 못했습니다." | tee -a $LOG_FILE
        fi
    else
        echo "⚠️ 건너뜀: $filepath:$line - 키 또는 값이 비어 있습니다." | tee -a $LOG_FILE
    fi
done

echo "" >> $LOG_FILE
echo "## 임포트 요약" | tee -a $LOG_FILE
SUCCESS_COUNT=$(grep -c "✅ 성공" $LOG_FILE)
SKIPPED_COUNT=$(grep -c "⚠️ 건너뜀" $LOG_FILE)
FAILED_COUNT=$(grep -c "❌ 실패" $LOG_FILE)

echo "성공: $SUCCESS_COUNT" | tee -a $LOG_FILE
echo "건너뜀: $SKIPPED_COUNT" | tee -a $LOG_FILE
echo "실패: $FAILED_COUNT" | tee -a $LOG_FILE

echo "" >> $LOG_FILE
echo "## 다음 단계:" | tee -a $LOG_FILE
echo "1. 애플리케이션 코드를 수정하여 하드코딩된 시크릿 대신 Vault API를 사용하도록 변경하세요." | tee -a $LOG_FILE
echo "2. 아래 Vault 경로를 참조하여 시크릿에 접근하세요:" | tee -a $LOG_FILE

# 저장된 시크릿 경로 나열
echo "### 저장된 시크릿 경로" >> $LOG_FILE
vault kv list -format=json kv/ 2>/dev/null | jq -r '.[]' | while read -r category; do
    vault kv list -format=json "kv/$category/" 2>/dev/null | jq -r '.[]' | while read -r key; do
        echo "- kv/$category/$key" >> $LOG_FILE
    done
done

echo "✅ 시크릿 임포트가 완료되었습니다. 결과는 $LOG_FILE 파일을 참조하세요." | tee -a $LOG_FILE
