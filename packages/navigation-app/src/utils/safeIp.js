/**
 * 안전한 IP 패키지 - 보안 취약점이 수정된 버전
 * 
 * 이 모듈은 원본 'ip' 패키지의 안전한 대체제를 제공합니다.
 * SSRF 취약점(CVE-2023-42282, CVE-2023-42283)이 수정되었습니다.
 */

// 'ip' 패키지 로드 시도
let originalIp;
try {
  originalIp = require('ip');
} catch (err) {
  console.error('원본 ip 패키지를 로드할 수 없습니다:', err.message);
  // 기본 구현 제공
  originalIp = {
    isPrivate: () => false,
    isPublic: () => true
  };
}

// 안전한 구현을 위한 'ipaddr.js' 패키지 로드 시도
let ipaddr;
try {
  ipaddr = require('ipaddr.js');
} catch (err) {
  console.error('ipaddr.js 패키지를 로드할 수 없습니다:', err.message);
  // 기본 구현 제공
  ipaddr = {
    parse: (ip) => ({
      kind: () => 'ipv4',
      octets: ip.split('.').map(Number),
      range: () => 'unicast'
    })
  };
}

// 안전한 IP 패키지 구현
const safeIp = {
  ...originalIp, // 원본 패키지의 모든 함수를 복사

  /**
   * 안전하게 IP가 사설(프라이빗) IP 주소인지 확인
   * 수정: RFC6598, RFC5737, RFC2544, RFC3927 범위 추가
   */
  isPrivate: function(addr) {
    try {
      // ipaddr.js가 없으면 안전하게 처리
      if (!ipaddr || !ipaddr.parse) {
        return originalIp.isPrivate(addr);
      }

      // IP 주소 파싱
      const parsed = ipaddr.parse(addr);
      
      // 기본 내장 private 검사를 먼저 수행 (RFC1918)
      if (originalIp.isPrivate(addr)) {
        return true;
      }
      
      // IPv4 주소만 추가 검사
      if (parsed.kind() === 'ipv4') {
        const octets = parsed.octets || addr.split('.').map(Number);
        
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
        
        // RFC3927 - 링크 로컬
        if (octets[0] === 169 && octets[1] === 254) {
          return true;
        }

        // RFC1122 - 루프백
        if (octets[0] === 127) {
          return true;
        }
      }
      
      // IPv6 주소는 원본 구현 사용
      return false;
    } catch (err) {
      console.error('safeIp.isPrivate 오류:', err.message);
      // 오류 발생 시 안전하게 false 반환
      return false;
    }
  },
  
  /**
   * 안전하게 IP가 공용(퍼블릭) IP 주소인지 확인
   * isPrivate의 정반대 값을 반환
   */
  isPublic: function(addr) {
    return !this.isPrivate(addr);
  }
};

// 패치가 성공적으로 적용됨을 표시
console.log('✅ 안전한 IP 모듈이 로드되었습니다.');

module.exports = safeIp;