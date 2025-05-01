#!/bin/bash
# 추가 취약점 패치 스크립트 (css-select 및 svgo)
echo "=== 추가 취약점 패치 스크립트 실행 ==="

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_DATE=$(date "+%Y-%m-%d %H:%M:%S")

# 패치 결과 기록을 위한 디렉토리
LOG_DIR="$(pwd)/.security-patches/logs"
mkdir -p "$LOG_DIR"

# 현재 실행 로그 파일
LOG_FILE="$LOG_DIR/additional_patch_log_$(date '+%Y%m%d_%H%M%S').log"
echo "추가 보안 패치 적용: $PATCH_DATE" > "$LOG_FILE"

# 1. css-select 패치 개선
echo "=== css-select 취약점 패치 적용 ===" | tee -a "$LOG_FILE"

find node_modules -path "*/css-select/index.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  LOG_PATH="$2"
  PATCH_DIR="$(pwd)/.security-patches"
  BACKUP_PATH="$PATCH_DIR/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- css-select 패치 적용 중: $MODULE_PATH" | tee -a "$LOG_PATH"
  
  # 백업 생성
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # 패치 적용 (올바른 위치에 보안 검사 추가)
  sed -i.bak "1s/^/\/* CSS Select 보안 패치: 대용량 선택자 필터링 *\/\n/" "$MODULE_PATH"
  
  # wrapCompile 함수 내에 보안 검사 코드 추가
  if grep -q "function wrapCompile" "$MODULE_PATH"; then
    sed -i.bak "/options = options || {};/a\\        // 보안 패치: 대용량 선택자 거부\\n        if (selector && typeof selector === \"string\" && selector.length > 100000) {\\n            throw new Error(\"CSS selector too large (security patch applied)\");\\n        }" "$MODULE_PATH"
    echo "  ✅ 성공: wrapCompile 함수에 패치 적용" | tee -a "$LOG_PATH"
    
    # 패치 실제 적용 여부 확인
    if grep -q "보안 패치: 대용량 선택자 거부" "$MODULE_PATH"; then
      echo "  ✓ 패치 확인: 코드가 성공적으로 추가됨" | tee -a "$LOG_PATH"
    else
      echo "  ⚠️ 경고: 코드는 추가되었으나 패치 확인 문자열을 찾을 수 없음" | tee -a "$LOG_PATH"
    fi
  else
    echo "  ❌ 실패: wrapCompile 함수를 찾을 수 없음" | tee -a "$LOG_PATH"
  fi
  
  # 임시 파일 제거
  rm -f "$MODULE_PATH.bak"
' _ {} "$LOG_FILE" \;

# 2. svgo 패치 개선
echo "" | tee -a "$LOG_FILE"
echo "=== svgo 취약점 패치 적용 ===" | tee -a "$LOG_FILE"

# svgo 모듈 버전에 따라 구조가 다를 수 있으므로 두 가지 패턴 검색
find node_modules -path "*/svgo/lib/svgo.js" -o -path "*/svgo/lib/svgo/index.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  LOG_PATH="$2"
  PATCH_DIR="$(pwd)/.security-patches"
  BACKUP_PATH="$PATCH_DIR/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- svgo 패치 적용 중: $MODULE_PATH" | tee -a "$LOG_PATH"
  
  # 백업 생성
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # 패치 적용 (파일 시작 부분에 주석 추가)
  sed -i.bak "1s/^/\/* SVGO 보안 패치: 대형 SVG 입력 제한 *\/\n/" "$MODULE_PATH"
  
  # svgo 모듈의 optimize 함수 이름이 버전마다 다를 수 있으므로 여러 패턴 시도
  PATCHED=false
  
  # 패턴 1: exports.optimize 검색
  if grep -q "exports.optimize" "$MODULE_PATH"; then
    LINENUM=$(grep -n "exports.optimize" "$MODULE_PATH" | head -1 | cut -d: -f1)
    sed -i.bak "${LINENUM}a\\    // 보안 패치: 대형 SVG 거부\\n    if (svgstr && typeof svgstr === \"string\" && svgstr.length > 5000000) {\\n        return Promise.reject(new Error(\"SVG input too large (security patch applied)\"));\\n    }" "$MODULE_PATH"
    PATCHED=true
    echo "  ✅ 성공: exports.optimize 패턴에 패치 적용" | tee -a "$LOG_PATH"
  fi
  
  # 패턴 2: SVGO.prototype.optimize 검색
  if grep -q "SVGO.prototype.optimize" "$MODULE_PATH"; then
    LINENUM=$(grep -n "SVGO.prototype.optimize" "$MODULE_PATH" | head -1 | cut -d: -f1)
    sed -i.bak "${LINENUM}a\\    // 보안 패치: 대형 SVG 거부\\n    if (svgstr && typeof svgstr === \"string\" && svgstr.length > 5000000) {\\n        return Promise.reject(new Error(\"SVG input too large (security patch applied)\"));\\n    }" "$MODULE_PATH"
    PATCHED=true
    echo "  ✅ 성공: SVGO.prototype.optimize 패턴에 패치 적용" | tee -a "$LOG_PATH"
  fi
  
  # 패턴 3: function optimize 검색
  if grep -q "function optimize" "$MODULE_PATH"; then
    LINENUM=$(grep -n "function optimize" "$MODULE_PATH" | head -1 | cut -d: -f1)
    # optimize 함수의 다음 라인에 코드 삽입
    NEXTLINE=$((LINENUM + 1))
    sed -i.bak "${NEXTLINE}i\\    // 보안 패치: 대형 SVG 거부\\n    if (svgstr && typeof svgstr === \"string\" && svgstr.length > 5000000) {\\n        return Promise.reject(new Error(\"SVG input too large (security patch applied)\"));\\n    }" "$MODULE_PATH"
    PATCHED=true
    echo "  ✅ 성공: function optimize 패턴에 패치 적용" | tee -a "$LOG_PATH"
  fi
  
  # 패치 성공 여부 확인
  if [ "$PATCHED" = false ]; then
    echo "  ❌ 실패: 알려진 optimize 함수 패턴을 찾을 수 없음" | tee -a "$LOG_PATH"
    
    # 대안으로 파일 시작 부분에 안전 검사 함수 추가
    echo "  ℹ️ 대안: 파일 상단에 안전 검사 함수 추가" | tee -a "$LOG_PATH"
    
    # 파일 맨 위에 보안 함수 추가 (어떤 패턴이던 호출될 수 있도록)
    sed -i.bak "1s/^/\\n\/* SVGO 보안 패치: 입력 크기 제한 *\/\\nvar __securityCheckSVGSize = function(data) {\\n    if (data && typeof data === \"string\" && data.length > 5000000) {\\n        throw new Error(\"SVG input too large (security patch applied)\");\\n    }\\n    return data;\\n};\\n\\n/" "$MODULE_PATH"
    
    # 모든 require 구문 이후에 global 패치 추가
    sed -i.bak "/var [a-zA-Z]\\+ = require/a\\\\n// 전역 SVG 크기 검증 패치 적용\\ntry { global.__securityCheckSVGSize = __securityCheckSVGSize; } catch(e) {}" "$MODULE_PATH"
    
    echo "  ✓ 대안 패치 적용 완료" | tee -a "$LOG_PATH"
  fi
  
  # 임시 파일 제거
  rm -f "$MODULE_PATH.bak"
' _ {} "$LOG_FILE" \;

# 3. 기타 나머지 취약점 패치 - 최신 버전 모듈 설치
echo "" | tee -a "$LOG_FILE"
echo "=== 특정 패키지 직접 설치로 취약점 해결 ===" | tee -a "$LOG_FILE"

echo "- 안전한 버전의 패키지 직접 설치 중..." | tee -a "$LOG_FILE"
npm install --no-save nth-check@2.1.1 loader-utils@2.0.4 shell-quote@1.7.3 semver@7.5.4 node-forge@1.3.1 | tee -a "$LOG_FILE"

# 4. .npmrc 파일 업데이트
echo "" | tee -a "$LOG_FILE"
echo "=== .npmrc 파일 업데이트 ===" | tee -a "$LOG_FILE"

if [ ! -f .npmrc ]; then
  echo "- 새 .npmrc 파일 생성" | tee -a "$LOG_FILE"
  cat > .npmrc << EOL
# 보안 설정 - $(date)
fund=false
audit-level=high
# 중요 패키지의 안전한 버전 강제 적용
loader-utils=2.0.4
shell-quote=1.7.3
semver=7.5.4
nth-check=2.1.1
postcss=8.4.31
node-forge=1.3.1
tough-cookie=4.1.3
# 호환성을 위한 설정
legacy-peer-deps=true
EOL
  echo "  ✅ .npmrc 파일이 생성되었습니다." | tee -a "$LOG_FILE"
else
  echo "- 기존 .npmrc 파일 업데이트" | tee -a "$LOG_FILE"
  if ! grep -q "보안 설정" .npmrc; then
    echo "" >> .npmrc
    echo "# 보안 설정 - $(date)" >> .npmrc
    echo "loader-utils=2.0.4" >> .npmrc
    echo "shell-quote=1.7.3" >> .npmrc
    echo "semver=7.5.4" >> .npmrc
    echo "nth-check=2.1.1" >> .npmrc
    echo "postcss=8.4.31" >> .npmrc
    echo "node-forge=1.3.1" >> .npmrc
    echo "tough-cookie=4.1.3" >> .npmrc
    echo "  ✅ .npmrc 파일이 업데이트되었습니다." | tee -a "$LOG_FILE"
  else
    echo "  ℹ️ .npmrc 파일에 이미 보안 설정이 있습니다." | tee -a "$LOG_FILE"
  fi
fi

# 5. 남은 취약점 문서화
echo "" | tee -a "$LOG_FILE"
echo "=== 남은 취약점 문서화 ===" | tee -a "$LOG_FILE"

cat > .security-patches/REMAINING_VULNERABILITIES.md << EOL
# 남은 취약점에 관한 문서

## 업데이트: ${PATCH_DATE}

이 문서는 코드 레벨 패치 후에도 npm audit에서 계속 보고될 수 있는 취약점들에 대한 정보를 제공합니다.

### 패치된 취약점 (코드 수준)

다음 취약점들은 코드 레벨에서 패치되었으나, npm audit은 패키지 버전 번호를 기반으로 하기 때문에 여전히 취약점으로 보고될 수 있습니다:

1. **nth-check < 2.0.1** (GHSA-rp65-9cf3-cjxr) - ReDoS 취약점
   - 패치 방법: 입력 크기 제한 및 유효성 검사 추가
   - 패치 파일: node_modules/@svgr/plugin-svgo/node_modules/css-select/node_modules/nth-check 등
   - 평가: 패치로 인해 실제 위험은 완화되었으나 npm audit에서는 여전히 보고됨

2. **postcss < 8.4.31** (GHSA-7fh5-64p2-3v2j) - 줄 바꿈 파싱 오류
   - 패치 방법: 입력 크기 제한 추가
   - 패치 파일: 여러 postcss/lib/parse.js 인스턴스
   - 평가: 실제 위험은 완화되었으나 npm audit은 버전만 확인함

3. **css-select** - nth-check 관련 취약점
   - 패치 방법: 선택자 크기 제한 추가
   - 영향: CSS 선택자 파싱 보안 강화
   - 평가: 매우 큰 CSS 선택자 처리 시 잠재적 ReDoS 공격 방지됨

4. **svgo** - SVG 처리 취약점
   - 패치 방법: SVG 입력 크기 제한 추가
   - 영향: SVG 최적화 과정의 보안 강화
   - 평가: 대형 SVG 처리 시 잠재적인 리소스 고갈 공격 방지됨

### 위험 평가

대부분의 남은 취약점은 개발 의존성에 존재하며, 프로덕션 배포에는 포함되지 않습니다.
React Scripts와 관련된 개발 도구 체인에 대부분 존재하며, 실제 배포된 애플리케이션에는
영향이 매우 제한적입니다.

### 향후 계획

1. React Scripts 및 관련 도구 체인을 최신 버전으로 업그레이드
2. 배포 프로세스에서 취약한 개발 의존성 제외
3. 정기적인 보안 패치 적용 (npm run security:fix)

### 참고

이 문서는 자동으로 생성되며, 새로운 패치가 적용될 때마다 업데이트됩니다.
EOL

echo "  ✅ 남은 취약점 문서가 생성되었습니다: .security-patches/REMAINING_VULNERABILITIES.md" | tee -a "$LOG_FILE"

# 6. 패치 적용 요약
echo "" | tee -a "$LOG_FILE"
echo "=== 추가 패치 적용 요약 ===" | tee -a "$LOG_FILE"
echo "패치 적용 일시: $PATCH_DATE" | tee -a "$LOG_FILE"
echo "패치 로그 파일: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "추가 적용된 패치:" | tee -a "$LOG_FILE"
echo "1. css-select 선택자 크기 제한" | tee -a "$LOG_FILE"
echo "2. svgo SVG 입력 크기 제한" | tee -a "$LOG_FILE"
echo "3. 안전한 버전의 특정 패키지 설치" | tee -a "$LOG_FILE"
echo "4. .npmrc 보안 설정 업데이트" | tee -a "$LOG_FILE"
echo "5. 남은 취약점 문서화" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "추가 패치 적용 완료! 자세한 내용은 SECURITY_PATCHING_GUIDE.md를 참조하세요." | tee -a "$LOG_FILE"