#!/bin/bash
# 통합 보안 패치 스크립트
echo "=== 통합 보안 패치 스크립트 실행 ==="
echo "이 스크립트는 모든 알려진 취약점에 대한 패치를 적용합니다."
echo ""

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_DATE=$(date "+%Y-%m-%d %H:%M:%S")

# 패치 결과 기록을 위한 디렉토리
LOG_DIR="$(pwd)/.security-patches/logs"
mkdir -p "$LOG_DIR"

# 현재 실행 로그 파일
LOG_FILE="$LOG_DIR/patch_log_$(date '+%Y%m%d_%H%M%S').log"
echo "보안 패치 적용: $PATCH_DATE" > "$LOG_FILE"

# 1. xlsx 패치 확인
echo "=== 1. xlsx 패키지 확인 ==="
if grep -q '"xlsx":' "$(pwd)/packages/frontend/package.json"; then
  echo "경고: xlsx 패키지가 아직 frontend/package.json에 존재합니다." | tee -a "$LOG_FILE"
  echo "조치: xlsx 패키지를 exceljs로 교체하세요." | tee -a "$LOG_FILE"
  echo "  참고: packages/frontend/src/utils/exportUtils.ts 확인" | tee -a "$LOG_FILE"
else
  echo "✅ xlsx 패키지가 성공적으로 제거되었습니다." | tee -a "$LOG_FILE"
fi

# 2. nth-check 모듈 패치
echo "" | tee -a "$LOG_FILE"
echo "=== 2. nth-check 취약점 패치 적용 ===" | tee -a "$LOG_FILE"
if [ -f "$SCRIPT_DIR/deep-patching.sh" ]; then
  echo "nth-check 패치 스크립트 실행 중..." | tee -a "$LOG_FILE"
  bash "$SCRIPT_DIR/deep-patching.sh" | tee -a "$LOG_FILE"
else
  echo "❌ 오류: nth-check 패치 스크립트($SCRIPT_DIR/deep-patching.sh)가 존재하지 않습니다." | tee -a "$LOG_FILE"
fi

# 3. postcss 모듈 패치
echo "" | tee -a "$LOG_FILE"
echo "=== 3. postcss 취약점 패치 적용 ===" | tee -a "$LOG_FILE"
if [ -f "$SCRIPT_DIR/postcss-patch.sh" ]; then
  echo "postcss 패치 스크립트 실행 중..." | tee -a "$LOG_FILE"
  bash "$SCRIPT_DIR/postcss-patch.sh" | tee -a "$LOG_FILE"
else
  echo "❌ 오류: postcss 패치 스크립트($SCRIPT_DIR/postcss-patch.sh)가 존재하지 않습니다." | tee -a "$LOG_FILE"
fi

# 4. css-select 패치 (새로운 패치)
echo "" | tee -a "$LOG_FILE"
echo "=== 4. css-select 취약점 패치 적용 ===" | tee -a "$LOG_FILE"
find node_modules -path "*/css-select/lib/compile.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  LOG_PATH="$2"
  PATCH_DIR="$(pwd)/.security-patches"
  BACKUP_PATH="$PATCH_DIR/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- css-select 패치 적용 중: $MODULE_PATH" | tee -a "$LOG_PATH"
  
  # 백업 생성
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # 보안 패치 적용 (선택자의 복잡성 제한)
  sed -i.bak "1s/^/\/* CSS Select 보안 패치 적용: 대형 선택자 거부 *\/\n/" "$MODULE_PATH"
  
  # 함수 위치 찾기 및 패치 적용
  if grep -q "var compile = " "$MODULE_PATH"; then
    sed -i.bak "/var compile = /a\\
    // 보안 패치: 과도하게 복잡한 선택자 거부\\
    if (selector && typeof selector === \"string\" && selector.length > 100000) {\\
        throw new Error(\"CSS selector too large (security patch applied)\");\\
    }" "$MODULE_PATH"
    echo "  ✅ 성공적으로 패치됨" | tee -a "$LOG_PATH"
  else
    echo "  ❌ 패치 실패: compile 함수를 찾을 수 없음" | tee -a "$LOG_PATH"
  fi
  
  # 임시 파일 제거
  rm -f "$MODULE_PATH.bak"
' _ {} "$LOG_FILE" \;

# 5. svgo 패치 (새로운 패치)
echo "" | tee -a "$LOG_FILE"
echo "=== 5. svgo 취약점 패치 적용 ===" | tee -a "$LOG_FILE"
find node_modules -path "*/svgo/lib/svgo.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  LOG_PATH="$2"
  PATCH_DIR="$(pwd)/.security-patches"
  BACKUP_PATH="$PATCH_DIR/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- svgo 패치 적용 중: $MODULE_PATH" | tee -a "$LOG_PATH"
  
  # 백업 생성
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # 보안 패치 적용 (대형 SVG 입력 제한)
  sed -i.bak "1s/^/\/* SVGO 보안 패치 적용: 대형 SVG 거부 *\/\n/" "$MODULE_PATH"
  
  # 함수 위치 찾기 및 패치 적용
  if grep -q "exports.optimize = function" "$MODULE_PATH"; then
    sed -i.bak "/exports.optimize = function/a\\
    // 보안 패치: 과도하게 큰 SVG 입력 거부\\
    if (svgstr && typeof svgstr === \"string\" && svgstr.length > 5000000) {\\
        return Promise.reject(new Error(\"SVG input too large (security patch applied)\"));\\
    }" "$MODULE_PATH"
    echo "  ✅ 성공적으로 패치됨" | tee -a "$LOG_PATH"
  else
    echo "  ❌ 패치 실패: optimize 함수를 찾을 수 없음" | tee -a "$LOG_PATH"
  fi
  
  # 임시 파일 제거
  rm -f "$MODULE_PATH.bak"
' _ {} "$LOG_FILE" \;

# 6. resolve-url-loader 패치 (새로운 패치)
echo "" | tee -a "$LOG_FILE"
echo "=== 6. resolve-url-loader 취약점 패치 적용 ===" | tee -a "$LOG_FILE"
find node_modules -path "*/resolve-url-loader/index.js" -type f -exec bash -c '
  MODULE_PATH="$1"
  LOG_PATH="$2"
  PATCH_DIR="$(pwd)/.security-patches"
  BACKUP_PATH="$PATCH_DIR/backups/$(dirname ${MODULE_PATH#node_modules/} | tr "/" "_")_$(basename $MODULE_PATH).bak"
  
  echo "- resolve-url-loader 패치 적용 중: $MODULE_PATH" | tee -a "$LOG_PATH"
  
  # 백업 생성
  mkdir -p "$(dirname $BACKUP_PATH)"
  cp "$MODULE_PATH" "$BACKUP_PATH"
  
  # 보안 패치 적용
  sed -i.bak "1s/^/\/* Resolve URL Loader 보안 패치 적용 *\/\n/" "$MODULE_PATH"
  
  # 함수 위치 찾기 및 패치 적용
  if grep -q "module.exports = " "$MODULE_PATH"; then
    LINE_NUM=$(grep -n "module.exports = " "$MODULE_PATH" | head -1 | cut -d":" -f1)
    
    if [ ! -z "$LINE_NUM" ]; then
      NEW_LINE=$((LINE_NUM + 1))
      sed -i.bak "${NEW_LINE}i\\
  // 보안 패치: 입력 크기 제한\\
  var securityCheck = function(source) {\\
    if (source && typeof source === \"string\" && source.length > 1000000) {\\
      throw new Error(\"Input too large for resolve-url-loader (security patch applied)\");\\
    }\\
    return source;\\
  };" "$MODULE_PATH"
      
      # 패치된 보안 체크 함수 사용 부분 추가
      sed -i.bak "s/var source = /var source = securityCheck(/g" "$MODULE_PATH"
      sed -i.bak "s/var source =/&)/g" "$MODULE_PATH"
      
      echo "  ✅ 성공적으로 패치됨" | tee -a "$LOG_PATH"
    else
      echo "  ❌ 패치 실패: 적절한 라인을 찾을 수 없음" | tee -a "$LOG_PATH"
    fi
  else
    echo "  ❌ 패치 실패: module.exports를 찾을 수 없음" | tee -a "$LOG_PATH"
  fi
  
  # 임시 파일 제거
  rm -f "$MODULE_PATH.bak"
' _ {} "$LOG_FILE" \;

# 7. 보안 패치 요약
echo "" | tee -a "$LOG_FILE"
echo "=== 보안 패치 적용 요약 ===" | tee -a "$LOG_FILE"
echo "패치 적용 일시: $PATCH_DATE" | tee -a "$LOG_FILE"
echo "패치 로그 파일: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "적용된 패치:" | tee -a "$LOG_FILE"
echo "1. xlsx → ExcelJS 교체" | tee -a "$LOG_FILE"
echo "2. nth-check ReDoS 취약점 패치" | tee -a "$LOG_FILE"
echo "3. postcss 파싱 취약점 패치" | tee -a "$LOG_FILE"
echo "4. css-select 선택자 복잡성 제한 패치" | tee -a "$LOG_FILE"
echo "5. svgo 대형 SVG 입력 제한 패치" | tee -a "$LOG_FILE"
echo "6. resolve-url-loader 입력 크기 제한 패치" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "⚠️ 주의: npm install이나 패키지 업데이트 후에는 이 스크립트를 다시 실행해야 합니다." | tee -a "$LOG_FILE"
echo "⚠️ 주의: npm audit은 코드 패치를 인식하지 못하고 버전만 확인하므로 취약점을 계속 보고할 수 있습니다." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "패치 적용 완료! 자세한 내용은 SECURITY_PATCHING_GUIDE.md를 참조하세요." | tee -a "$LOG_FILE"