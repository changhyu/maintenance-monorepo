#!/bin/bash
# 분기별 종속성 감사 스크립트
# 실행 방법: ./quarterly_dependency_audit.sh

# 현재 날짜 기록
DATE=$(date +"%Y-%m-%d")
QUARTER=$(( ($(date +%-m) - 1) / 3 + 1 ))
YEAR=$(date +%Y)
LOG_DIR="../logs/security-scans"
REPORT_DIR="../security-scans"

# 로그 및 보고서 디렉토리 생성
mkdir -p $LOG_DIR
mkdir -p $REPORT_DIR

echo "===== $YEAR년 Q$QUARTER 분기별 종속성 감사 시작: $DATE ====="

# 결과 파일 준비
REPORT_FILE="$REPORT_DIR/quarterly_dependency_audit_${YEAR}_Q${QUARTER}.md"

echo "# 분기별 종속성 감사 보고서" > $REPORT_FILE
echo "기간: $YEAR년 Q$QUARTER" >> $REPORT_FILE
echo "날짜: $DATE" >> $REPORT_FILE
echo "" >> $REPORT_FILE

cd ..

# 1. NPM 패키지 감사
echo "## 1. NPM 패키지 감사" >> $REPORT_FILE

if [ -f "package.json" ]; then
  if ! command -v npm &> /dev/null; then
    echo "npm이 설치되어 있지 않습니다." | tee -a $REPORT_FILE
  else
    echo "NPM 패키지 전체 보안 감사 실행 중..." | tee -a $REPORT_FILE
    
    # package-lock.json 백업
    if [ -f "package-lock.json" ]; then
      cp package-lock.json $REPORT_DIR/package-lock.json.backup_$DATE
    fi
    
    # NPM 전체 감사
    npm audit --json > "$REPORT_DIR/npm_full_audit_$DATE.json" || true
    
    # 감사 고급 보고서 생성
    echo "### 심각도별 취약점 요약" >> $REPORT_FILE
    
    LOW_COUNT=$(grep -c '"severity":"low"' "$REPORT_DIR/npm_full_audit_$DATE.json" || echo 0)
    MODERATE_COUNT=$(grep -c '"severity":"moderate"' "$REPORT_DIR/npm_full_audit_$DATE.json" || echo 0)
    HIGH_COUNT=$(grep -c '"severity":"high"' "$REPORT_DIR/npm_full_audit_$DATE.json" || echo 0)
    CRITICAL_COUNT=$(grep -c '"severity":"critical"' "$REPORT_DIR/npm_full_audit_$DATE.json" || echo 0)
    
    echo "| 심각도 | 취약점 수 |" >> $REPORT_FILE
    echo "| ------ | -------- |" >> $REPORT_FILE
    echo "| 낮음 | $LOW_COUNT |" >> $REPORT_FILE
    echo "| 중간 | $MODERATE_COUNT |" >> $REPORT_FILE
    echo "| 높음 | $HIGH_COUNT |" >> $REPORT_FILE
    echo "| 치명적 | $CRITICAL_COUNT |" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 수정 가능한 취약점 확인
    echo "### 자동 수정 가능 여부 확인" >> $REPORT_FILE
    npm audit fix --dry-run > "$REPORT_DIR/npm_fix_dry_run_$DATE.txt" || true
    
    FIXABLE=$(grep -c "fixed" "$REPORT_DIR/npm_fix_dry_run_$DATE.txt" || echo 0)
    NOT_FIXABLE=$(grep -c "not fixed" "$REPORT_DIR/npm_fix_dry_run_$DATE.txt" || echo 0)
    
    echo "- 자동 수정 가능한 취약점: $FIXABLE 개" | tee -a $REPORT_FILE
    echo "- 수동 업데이트 필요한 취약점: $NOT_FIXABLE 개" | tee -a $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 상위 5개 취약점 목록
    echo "### 상위 취약점 목록" >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
    cat "$REPORT_DIR/npm_full_audit_$DATE.json" | grep -A 10 -B 2 '"severity":"high"\|"severity":"critical"' | head -n 50 >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 오래된 패키지 점검
    echo "### 오래된 패키지 점검" >> $REPORT_FILE
    npm outdated --json > "$REPORT_DIR/npm_outdated_$DATE.json" || true
    
    OUTDATED_COUNT=$(cat "$REPORT_DIR/npm_outdated_$DATE.json" | grep -c "current" || echo 0)
    
    echo "- 업데이트 필요한 패키지: $OUTDATED_COUNT 개" | tee -a $REPORT_FILE
    
    if [ $OUTDATED_COUNT -gt 0 ]; then
      echo "#### 주요 업데이트 필요 패키지" >> $REPORT_FILE
      echo "| 패키지 | 현재 버전 | 최신 버전 | 타입 |" >> $REPORT_FILE
      echo "| ------ | -------- | -------- | ---- |" >> $REPORT_FILE
      
      # JSON 파싱을 통해 top 10 패키지 추출 (실제 환경에서는 jq 사용 추천)
      cat "$REPORT_DIR/npm_outdated_$DATE.json" | grep -A 5 "current" | head -n 50 | tr -d '{":,}' | awk 'NF > 1' | sed 's/^ *//g' >> $REPORT_FILE
    fi
  fi
else
  echo "package.json 파일이 존재하지 않습니다." | tee -a $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# 2. Python 패키지 감사
echo "## 2. Python 패키지 감사" >> $REPORT_FILE

if [ -f "requirements.txt" ]; then
  if ! command -v pip &> /dev/null; then
    echo "pip이 설치되어 있지 않습니다." | tee -a $REPORT_FILE
  else
    echo "Python 패키지 취약점 감사 실행 중..." | tee -a $REPORT_FILE
    
    # Pip 취약점 감사
    if ! command -v pip-audit &> /dev/null; then
      echo "pip-audit가 설치되어 있지 않습니다. 설치하려면: pip install pip-audit" | tee -a $REPORT_FILE
    else
      pip-audit -r requirements.txt -f json > "$REPORT_DIR/pip_full_audit_$DATE.json" || true
      
      # 취약점 수 계산
      VULN_COUNT=$(grep -c "vulnerability_id" "$REPORT_DIR/pip_full_audit_$DATE.json" || echo 0)
      
      echo "- 취약한 Python 패키지: $VULN_COUNT 개" | tee -a $REPORT_FILE
      
      if [ $VULN_COUNT -gt 0 ]; then
        echo "### Python 패키지 취약점 세부 사항" >> $REPORT_FILE
        echo "\`\`\`" >> $REPORT_FILE
        cat "$REPORT_DIR/pip_full_audit_$DATE.json" | head -n 50 >> $REPORT_FILE
        echo "\`\`\`" >> $REPORT_FILE
      fi
    fi
    
    # 오래된 패키지 점검
    echo "### 오래된 Python 패키지 점검" >> $REPORT_FILE
    
    if ! command -v pip-outdated &> /dev/null; then
      echo "pip-outdated가 설치되어 있지 않습니다. 설치하려면: pip install pip-outdated" | tee -a $REPORT_FILE
    else
      pip-outdated -r requirements.txt -o json > "$REPORT_DIR/pip_outdated_$DATE.json" || true
      
      OUTDATED_PY_COUNT=$(grep -c "package" "$REPORT_DIR/pip_outdated_$DATE.json" || echo 0)
      
      echo "- 업데이트 필요한 Python 패키지: $OUTDATED_PY_COUNT 개" | tee -a $REPORT_FILE
      
      if [ $OUTDATED_PY_COUNT -gt 0 ]; then
        echo "#### 주요 업데이트 필요 Python 패키지" >> $REPORT_FILE
        echo "\`\`\`" >> $REPORT_FILE
        cat "$REPORT_DIR/pip_outdated_$DATE.json" | head -n 30 >> $REPORT_FILE
        echo "\`\`\`" >> $REPORT_FILE
      fi
    fi
  fi
else
  echo "requirements.txt 파일이 존재하지 않습니다." | tee -a $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# 3. 깃허브 의존성 봇 상태 확인 (선택 사항)
echo "## 3. 의존성 관리 도구 상태" >> $REPORT_FILE

if [ -d ".github" ]; then
  echo "### Dependabot 설정 확인" >> $REPORT_FILE
  
  if [ -f ".github/dependabot.yml" ]; then
    echo "✅ Dependabot이 구성되어 있습니다." | tee -a $REPORT_FILE
    echo "\`\`\`yaml" >> $REPORT_FILE
    cat ".github/dependabot.yml" >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
  else
    echo "❌ Dependabot이 구성되어 있지 않습니다. 구성을 추천합니다." | tee -a $REPORT_FILE
    echo "예시 설정:" | tee -a $REPORT_FILE
    echo "\`\`\`yaml" >> $REPORT_FILE
    echo "version: 2
updates:
  - package-ecosystem: \"npm\"
    directory: \"/\"
    schedule:
      interval: \"weekly\"
    open-pull-requests-limit: 10
    
  - package-ecosystem: \"pip\"
    directory: \"/\"
    schedule:
      interval: \"weekly\"
    open-pull-requests-limit: 10" >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
  fi
fi

echo "" >> $REPORT_FILE

# 4. 전체 의존성 분석 요약
echo "## 4. 의존성 분석 요약 및 권장사항" >> $REPORT_FILE

# 심각도 기준 분류
if [ $HIGH_COUNT -gt 0 ] || [ $CRITICAL_COUNT -gt 0 ]; then
  echo "### ⚠️ 시급한 조치 필요 사항" >> $REPORT_FILE
  echo "- 총 $HIGH_COUNT 개의 높은 심각도와 $CRITICAL_COUNT 개의 치명적 심각도 취약점이 발견되었습니다." | tee -a $REPORT_FILE
  echo "- 가능한 빨리 이러한 취약점을 해결하기 위해 의존성을 업데이트하는 것이 권장됩니다." | tee -a $REPORT_FILE
  echo "" >> $REPORT_FILE
fi

echo "### 권장 조치 사항" >> $REPORT_FILE
echo "1. 취약한 NPM 패키지 업데이트: \`npm audit fix\`" | tee -a $REPORT_FILE
echo "2. 취약한 Python 패키지 업데이트: 최신 버전으로 requirements.txt 업데이트" | tee -a $REPORT_FILE
echo "3. 자동화된 의존성 관리 도구 통합 (아직 없는 경우)" | tee -a $REPORT_FILE
echo "4. 다음 분기에 해결되지 않은 취약점 재검토" | tee -a $REPORT_FILE

echo "===== 분기별 종속성 감사 완료: $DATE ====="
echo "상세 보고서 위치: $REPORT_FILE"

# 이메일 알림 (선택 사항 - 설정 필요)
# mail -s "$YEAR Q$QUARTER 분기별 종속성 감사 결과" security-team@example.com < $REPORT_FILE
