/**
 * IP 패키지 보안 취약점 패치 적용기
 * 
 * 이 모듈은 'ip' 패키지를 안전한 버전으로 대체하여 
 * SSRF 취약점(CVE-2023-42282, CVE-2023-42283)을 해결합니다.
 */

// 안전한 IP 구현 불러오기
const safeIp = require('./safeIp');

// 모듈 캐시에 접근
const moduleCache = require.cache;

// 패치 적용 여부 추적
let patchApplied = false;

/**
 * 모듈 캐시에서 'ip' 패키지를 찾아 안전한 구현으로 교체
 */
function applyPatch() {
  if (patchApplied) {
    return true; // 이미 적용됨
  }

  let patchCount = 0;
  
  // 모든 캐시된 모듈 순회
  Object.keys(moduleCache).forEach(modulePath => {
    // 'ip' 패키지 관련 모듈 찾기
    if (modulePath.includes('node_modules/ip/') || modulePath.endsWith('/ip')) {
      try {
        // 원본 모듈의 exports 백업
        const originalExports = moduleCache[modulePath].exports;
        
        // 안전한 구현으로 교체
        moduleCache[modulePath].exports = safeIp;
        
        patchCount++;
        console.log(`✅ 패치 적용됨: ${modulePath}`);
      } catch (err) {
        console.error(`❌ 패치 적용 실패 (${modulePath}):`, err.message);
      }
    }
  });

  patchApplied = patchCount > 0;
  console.log(`🔒 총 ${patchCount}개 모듈에 보안 패치 적용됨`);
  
  return patchApplied;
}

// 패치 자동 적용
applyPatch();

// 패치 다시 적용하는 함수 내보내기
module.exports = {
  applyPatch,
  isPatched: () => patchApplied
};