
/**
 * 보안 패치가 적용된 IP 패키지 타입 정의
 */
declare module 'ip' {
  /**
   * IP 주소가 프라이빗 네트워크에 속하는지 확인
   * 패치: SSRF 취약점 해결을 위해 개선된 구현
   */
  export function isPrivate(ip: string): boolean;
  
  /**
   * IP 주소가 공용 네트워크에 속하는지 확인
   * 패치: SSRF 취약점 해결을 위해 개선된 구현
   */
  export function isPublic(ip: string): boolean;
  
  // 기존 메소드들
  export function isEqual(ip1: string, ip2: string): boolean;
  export function toBuffer(ip: string, buffer?: Buffer, offset?: number): Buffer;
  export function toString(ip: Buffer, offset?: number, length?: number): string;
  export function fromPrefixLen(prefixlen: number, family?: string): string;
  export function mask(ip: string, mask: string): string;
  export function cidr(cidr: string): string;
  export function subnet(ip: string, mask: string): Subnet;
  export function cidrSubnet(cidr: string): Subnet;
  export function or(ip: string, mask: string): string;
  export function isLoopback(ip: string): boolean;
  export function isV4Format(ip: string): boolean;
  export function isV6Format(ip: string): boolean;
  
  // 추가 유틸리티 타입
  export interface Subnet {
    networkAddress: string;
    firstAddress: string;
    lastAddress: string;
    broadcastAddress: string;
    subnetMask: string;
    subnetMaskLength: number;
    numHosts: number;
    length: number;
    contains(ip: string): boolean;
  }
  
  export function subnet(ip: string, mask: string): Subnet;
  export function cidrSubnet(cidr: string): Subnet;
  export function not(ip: string): string;
  export function or(ip: string, mask: string): string;
  export function and(ip: string, mask: string): string;
  export function xor(ip: string, mask: string): string;
}
