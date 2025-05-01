#!/bin/bash
# 월간 코드베이스 보안 점검 스크립트
# 실행 방법: ./monthly_codebase_scan.sh

# 현재 날짜 기록
DATE=$(date +"%Y-%m-%d")
LOG_DIR="../logs/security-scans"
REPORT_DIR="../security-scans"

# 로그 및 보고서 디렉토리 생성
mkdir -p $LOG_DIR
mkdir -p $REPORT_DIR

echo "===== 월간 코드베이스 보안 점검 시작: $DATE ====="

# 결과 파일 준비
REPORT_FILE="$REPORT_DIR/monthly_security_scan_$DATE.md"

echo "# 월간 코드베이스 보안 점검 보고서" > $REPORT_FILE
echo "날짜: $DATE" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 1. Secret 스캔 (gitleaks 사용)
echo "## 1. Secret 및 민감 정보 스캔" >> $REPORT_FILE

if ! command -v gitleaks &> /dev/null; then
  echo "gitleaks가 설치되어 있지 않습니다. 설치 방법:" | tee -a $REPORT_FILE
  echo "  - brew install gitleaks (Mac)" | tee -a $REPORT_FILE
  echo "  - https://github.com/zricethezav/gitleaks#installation" | tee -a $REPORT_FILE
else
  echo "Gitleaks를 사용하여 민감 정보 스캔 중..." | tee -a $REPORT_FILE
  
  # 루트 디렉토리 기준으로 스캔
  cd ..
  gitleaks detect --report-path=$REPORT_DIR/gitleaks_report_$DATE.json
  
  # 결과 요약
  if [ -s "$REPORT_DIR/gitleaks_report_$DATE.json" ]; then
    echo "⚠️ 잠재적인 민감 정보가 발견되었습니다!" | tee -a $REPORT_FILE
    echo "상세 내용은 $REPORT_DIR/gitleaks_report_$DATE.json 파일을 확인하세요." | tee -a $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
    cat "$REPORT_DIR/gitleaks_report_$DATE.json" | grep -A 2 "Description\|File\|Line" | head -n 20 >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
  else
    echo "✅ 민감 정보가 발견되지 않았습니다." | tee -a $REPORT_FILE
  fi
fi

echo "" >> $REPORT_FILE

# 2. SonarQube를 사용한 정적 코드 분석 (선택 사항 - SonarQube 설정 필요)
echo "## 2. 정적 코드 분석" >> $REPORT_FILE

if ! command -v sonar-scanner &> /dev/null; then
  echo "SonarQube Scanner가 설치되어 있지 않습니다. 설치를 고려하세요:" | tee -a $REPORT_FILE
  echo "  - https://docs.sonarqube.org/latest/setup/get-started-2-minutes/" | tee -a $REPORT_FILE
else
  echo "SonarQube를 사용하여 정적 코드 분석 실행 중..." | tee -a $REPORT_FILE
  cd ..
  sonar-scanner -Dsonar.projectKey=maintenance-monorepo -Dsonar.sources=. -Dsonar.host.url=http://localhost:9000
  echo "SonarQube 대시보드에서 결과를 확인하세요: http://localhost:9000" | tee -a $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# 3. OWASP Dependency Check (의존성 점검)
echo "## 3. 의존성 취약점 점검" >> $REPORT_FILE
echo "### NPM 패키지 점검" >> $REPORT_FILE

if [ -f "../package.json" ]; then
  cd ..
  if ! command -v npm &> /dev/null; then
    echo "npm이 설치되어 있지 않습니다." | tee -a $REPORT_FILE
  else
    echo "npm audit 실행 중..." | tee -a $REPORT_FILE
    npm audit --json > "$REPORT_DIR/npm_audit_$DATE.json" || true
    
    # 결과 요약
    HIGH_COUNT=$(cat "$REPORT_DIR/npm_audit_$DATE.json" | grep -c "high")
    CRITICAL_COUNT=$(cat "$REPORT_DIR/npm_audit_$DATE.json" | grep -c "critical")
    
    echo "- 높은 심각도 취약점: $HIGH_COUNT 개" | tee -a $REPORT_FILE
    echo "- 치명적 심각도 취약점: $CRITICAL_COUNT 개" | tee -a $REPORT_FILE
    echo "상세 내용은 $REPORT_DIR/npm_audit_$DATE.json 파일을 확인하세요." | tee -a $REPORT_FILE
  fi
fi

echo "" >> $REPORT_FILE
echo "### Python 패키지 점검" >> $REPORT_FILE

if [ -f "../requirements.txt" ]; then
  cd ..
  if ! command -v pip-audit &> /dev/null; then
    echo "pip-audit가 설치되어 있지 않습니다. 설치 방법:" | tee -a $REPORT_FILE
    echo "  - pip install pip-audit" | tee -a $REPORT_FILE
  else
    echo "pip-audit 실행 중..." | tee -a $REPORT_FILE
    pip-audit -r requirements.txt -o json > "$REPORT_DIR/pip_audit_$DATE.json" || true
    
    # 결과 요약
    VULN_COUNT=$(cat "$REPORT_DIR/pip_audit_$DATE.json" | grep -c "vulnerability_id")
    
    echo "- 발견된 취약점: $VULN_COUNT 개" | tee -a $REPORT_FILE
    echo "상세 내용은 $REPORT_DIR/pip_audit_$DATE.json 파일을 확인하세요." | tee -a $REPORT_FILE
  fi
fi

echo "" >> $REPORT_FILE

# 4. 파일 권한 점검
echo "## 4. 파일 권한 점검" >> $REPORT_FILE
cd ..
find . -type f -perm -o+w ! -path "*/node_modules/*" ! -path "*/.git/*" | grep -v "\.sh$" > "$REPORT_DIR/world_writable_files_$DATE.txt"

if [ -s "$REPORT_DIR/world_writable_files_$DATE.txt" ]; then
  echo "⚠️ 다음 파일들은 모든 사용자가 쓰기 권한을 가지고 있습니다:" | tee -a $REPORT_FILE
  echo "\`\`\`" >> $REPORT_FILE
  cat "$REPORT_DIR/world_writable_files_$DATE.txt" | head -n 20 >> $REPORT_FILE
  echo "\`\`\`" >> $REPORT_FILE
else
  echo "✅ 모든 사용자가 쓰기 권한을 가진 파일이 발견되지 않았습니다." | tee -a $REPORT_FILE
fi

echo "" >> $REPORT_FILE

echo "===== 월간 코드베이스 보안 점검 완료: $DATE ====="
echo "상세 보고서 위치: $REPORT_FILE"

# 이메일 알림 (선택 사항 - 설정 필요)
# mail -s "월간 코드베이스 보안 점검 결과: $DATE" security-team@example.com < $REPORT_FILE
