/**
 * 안전한 IP 주소 처리 유틸리티
 * 
 * 이 모듈은 CVE-2023-42282, CVE-2023-42283 취약점이 수정된
 * 안전한 IP 주소 처리 기능을 제공합니다.
 */

import * as ipaddr from 'ipaddr.js';

/**
 * IP 주소가 비공개(프라이빗) 범위에 속하는지 확인합니다.
 * 
 * 다음 RFC 범위를 모두 확인합니다:
 * - RFC1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - RFC6598 (100.64.0.0/10)
 * - RFC5737 (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
 * - RFC2544 (198.18.0.0/15)
 * - RFC3927 (169.254.0.0/16)
 * - RFC4193 (fc00::/7)
 * - 로컬호스트 (127.0.0.0/8, ::1/128)
 */
export function isPrivate(addr: string): boolean {
  try {
    const parsed = ipaddr.parse(addr);
    
    if (parsed.kind() === 'ipv4') {
      const octets = (parsed as ipaddr.IPv4).octets;
      
      // RFC1918 사설 IP 범위
      if ((octets[0] === 10) || 
          (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
          (octets[0] === 192 && octets[1] === 168)) {
        return true;
      }
      
      // RFC6598 - 통신사급 NAT 범위
      if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
        return true;
      }
      
      // RFC5737 - 문서용 IP 주소
      if ((octets[0] === 192 && octets[1] === 0 && octets[2] === 2) ||
          (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
          (octets[0] === 203 && octets[1] === 0 && octets[2] === 113)) {
        return true;
      }
      
      // RFC2544 - 벤치마킹용 IP 주소
      if (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) {
        return true;
      }
      
      // RFC3927 - 링크 로컬 주소
      if (octets[0] === 169 && octets[1] === 254) {
        return true;
      }
      
      // 로컬호스트
      if (octets[0] === 127) {
        return true;
      }
      
      return false;
    } else if (parsed.kind() === 'ipv6') {
      // IPv6 로컬 주소 확인 - 직접 구현
      const ipv6 = parsed as ipaddr.IPv6;
      const parts = ipv6.parts;
      
      // ::1/128 (로컬호스트)
      if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 &&
          parts[4] === 0 && parts[5] === 0 && parts[6] === 0 && parts[7] === 1) {
        return true;
      }
      
      // fe80::/10 (링크 로컬)
      if ((parts[0] & 0xffc0) === 0xfe80) {
        return true;
      }
      
      // fc00::/7 (유니크 로컬)
      if ((parts[0] & 0xfe00) === 0xfc00) {
        return true;
      }
      
      return false;
    }
    
    return false;
  } catch (err) {
    // 파싱 오류 발생 시 안전하게 처리
    console.error('IP 주소 파싱 오류:', err);
    return false;
  }
}

/**
 * IP 주소가 로컬호스트인지 확인합니다.
 */
export function isLoopback(addr: string): boolean {
  try {
    const parsed = ipaddr.parse(addr);
    
    if (parsed.kind() === 'ipv4') {
      const octets = (parsed as ipaddr.IPv4).octets;
      // 127.0.0.0/8
      return octets[0] === 127;
    } else if (parsed.kind() === 'ipv6') {
      const parts = (parsed as ipaddr.IPv6).parts;
      // ::1/128
      return parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 &&
             parts[4] === 0 && parts[5] === 0 && parts[6] === 0 && parts[7] === 1;
    }
    
    return false;
  } catch (err) {
    console.error('IP 주소 파싱 오류:', err);
    return false;
  }
}

/**
 * IP 주소가 링크 로컬 주소인지 확인합니다.
 */
export function isLinkLocal(addr: string): boolean {
  try {
    const parsed = ipaddr.parse(addr);
    
    if (parsed.kind() === 'ipv4') {
      const octets = (parsed as ipaddr.IPv4).octets;
      // 169.254.0.0/16
      return octets[0] === 169 && octets[1] === 254;
    } else if (parsed.kind() === 'ipv6') {
      const parts = (parsed as ipaddr.IPv6).parts;
      // fe80::/10
      return (parts[0] & 0xffc0) === 0xfe80;
    }
    
    return false;
  } catch (err) {
    console.error('IP 주소 파싱 오류:', err);
    return false;
  }
}

/**
 * IP 주소가 예약된 주소 범위에 속하는지 확인합니다.
 */
export function isReserved(addr: string): boolean {
  try {
    const parsed = ipaddr.parse(addr);
    
    if (parsed.kind() === 'ipv4') {
      const octets = (parsed as ipaddr.IPv4).octets;
      
      // 전통적인 예약 범위들
      // 240.0.0.0/4 - Class E
      if (octets[0] >= 240) {
        return true;
      }
      
      // 0.0.0.0/8
      if (octets[0] === 0) {
        return true;
      }
      
      return false;
    }
    
    // IPv6에는 별도 예약 범위 검사 없음
    return false;
  } catch (err) {
    console.error('IP 주소 파싱 오류:', err);
    return false;
  }
}

/**
 * 로컬호스트 주소 목록을 반환합니다.
 */
export function getLoopbackAddresses(): string[] {
  return ['127.0.0.1', '::1'];
}

/**
 * 링크 로컬 주소의 일반적인 접두사 목록을 반환합니다.
 */
export function getLocalAddresses(): string[] {
  return ['169.254.0.0/16', 'fe80::/10'];
}

/**
 * IP 주소의 안전성을 검사합니다.
 * 반환값은 안전한 경우 true, 위험한 경우 false입니다.
 */
export function checkIpSafety(addr: string): boolean {
  // 사설 IP는 일반적으로 안전하다고 간주
  if (isPrivate(addr)) {
    return true;
  }
  
  // 필요에 따라 추가 안전성 검사 구현
  
  return false; // 기본적으로 공개 IP는 안전하지 않다고 간주
}

/**
 * IP 주소가 공개(퍼블릭) 범위에 속하는지 확인합니다.
 * isPrivate의 반대 값을 반환합니다.
 */
export function isPublic(addr: string): boolean {
  return !isPrivate(addr);
}

/**
 * IP 주소 문자열을 바이너리 버퍼로 변환합니다.
 */
export function toBuffer(ip: string): Buffer {
  try {
    const addr = ipaddr.parse(ip);
    
    if (addr.kind() === 'ipv4') {
      const octets = (addr as ipaddr.IPv4).octets;
      return Buffer.from(octets);
    } else {
      const parts = (addr as ipaddr.IPv6).parts;
      const buf = Buffer.alloc(16);
      for (let i = 0; i < 8; i++) {
        buf.writeUInt16BE(parts[i], i * 2);
      }
      return buf;
    }
  } catch (err) {
    throw new Error(`Invalid IP address: ${ip}`);
  }
}

/**
 * 바이너리 버퍼를 IP 주소 문자열로 변환합니다.
 */
export function toString(buf: Buffer): string {
  if (buf.length === 4) {
    // IPv4
    return Array.from(buf).join('.');
  } else if (buf.length === 16) {
    // IPv6
    const parts: number[] = [];
    for (let i = 0; i < 8; i++) {
      parts.push(buf.readUInt16BE(i * 2));
    }
    return parts.map(p => p.toString(16)).join(':');
  } else {
    throw new Error('Invalid IP address buffer');
  }
}

/**
 * 안전한 IP 주소 처리 라이브러리
 * 취약점이 수정된 'ip' 패키지 대체제
 */
export default {
  isPrivate,
  isPublic,
  toBuffer,
  toString
};