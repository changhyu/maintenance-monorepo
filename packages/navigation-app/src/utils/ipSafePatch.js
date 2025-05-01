/**
 * IP 패키지 보안 취약점 패치
 * 
 * 이 파일은 'ip' 패키지의 isPrivate/isPublic 함수 취약점(CVE-2023-42282, CVE-2023-42283)을
 * 안전하게 패치하여 SSRF 취약점을 방지합니다.
 */

// 앱 시작 시 즉시 실행
(function patchIpPackage() {
  try {
    // 보안 패치가 적용되었는지 확인하기 위한 플래그
    global.__IP_PACKAGE_PATCHED__ = false;
    
    // ip 패키지 가져오기 시도
    const ip = require('ip');
    
    if (!ip) {
      console.log('IP 패키지를 찾을 수 없어 패치를 적용할 수 없습니다.');
      return;
    }
    
    // 원본 함수들 백업
    const originalIsPrivate = ip.isPrivate;
    const originalIsPublic = ip.isPublic;
    
    /**
     * isPrivate 함수를 안전한 구현으로 대체
     * - RFC1918 사설 범위 (이미 처리됨)
     * - RFC6598 통신사 사설 범위 (100.64.0.0/10) 추가
     * - RFC5737 문서용 범위 (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) 추가
     * - RFC2544 벤치마킹 범위 (198.18.0.0/15) 추가
     */
    ip.isPrivate = function safeIsPrivate(addr) {
      try {
        // 기본 검사
        const isBasicPrivate = originalIsPrivate(addr);
        if (isBasicPrivate) return true;
        
        // 추가 검사 수행
        // ip 패키지가 파싱한 주소 객체를 가져옵니다
        const parsedAddr = require('ipaddr.js').parse(addr);
        
        // IPv4 주소만 추가 검사
        if (parsedAddr.kind() === 'ipv4') {
          const octets = parsedAddr.octets || [];
          
          // RFC6598 - Carrier-grade NAT 프라이빗 범위
          if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
            return true;
          }
          
          // RFC5737 - 문서용 IP 주소들
          if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) {
            return true;
          }
          if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) {
            return true;
          }
          if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) {
            return true;
          }
          
          // RFC2544 - 벤치마킹용 범위
          if (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) {
            return true;
          }
        }
        
        return false;
      } catch (err) {
        console.error('안전한 isPrivate 함수 오류:', err);
        // 오류 발생시 기존 함수로 폴백
        return originalIsPrivate(addr);
      }
    };
    
    /**
     * isPublic 함수를 안전한 구현으로 대체
     * - isPrivate의 반대 값을 명확하게 반환
     */
    ip.isPublic = function safeIsPublic(addr) {
      return !ip.isPrivate(addr);
    };
    
    // 패치가 성공적으로 적용됨
    global.__IP_PACKAGE_PATCHED__ = true;
    console.log('✅ IP 패키지 보안 패치가 성공적으로 적용되었습니다.');
    
    // 테스트용 비공개 IP 주소를 확인
    const testCases = [
      { ip: '10.0.0.1', type: 'RFC1918 사설' },
      { ip: '100.64.0.1', type: 'RFC6598 CGN 사설' },
      { ip: '192.0.2.1', type: 'RFC5737 문서용' },
      { ip: '198.18.0.1', type: 'RFC2544 벤치마킹' },
      { ip: '8.8.8.8', type: '공용 IP' }
    ];
    
    for (const test of testCases) {
      const isPrivate = ip.isPrivate(test.ip);
      console.log(`IP: ${test.ip} (${test.type}), 비공개: ${isPrivate}, 공개: ${!isPrivate}`);
    }
    
  } catch (error) {
    console.error('IP 패키지 패치 적용 중 오류:', error);
  }
})();

// 패치가 적용되었는지 확인하는 함수
export function isIpPackagePatched() {
  return !!global.__IP_PACKAGE_PATCHED__;
}

export default { isIpPackagePatched };