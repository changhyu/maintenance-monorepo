/**
 * 고유 ID를 생성하는 유틸리티 함수들
 */

/**
 * 타임스탬프 기반 고유 ID 생성
 * @returns 타임스탬프와 랜덤 값을 조합한 고유 ID
 */
export function generateTimeBasedId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 지역 ID 생성
 * @param name 지역 이름
 * @returns 지역 이름과 타임스탬프 기반 ID
 */
export function generateRegionId(name?: string): string {
  const prefix = name ? name.toLowerCase().replace(/[^\w]/g, '_').substring(0, 10) : 'region';
  return `${prefix}_${Date.now()}`;
}

/**
 * 경로 ID 생성
 * @returns 경로용 고유 ID
 */
export function generateRouteId(): string {
  return `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * 짧은 ID 생성
 * @returns 짧은 랜덤 ID (8자리)
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * UUID 스타일 ID 생성 (v4)
 * 참고: 완전한 RFC 준수 UUID는 아니지만 대부분의 용도에 충분히 고유함
 * @returns UUID 스타일 랜덤 ID
 */
export function generateUuid(): string {
  const hexDigits = '0123456789abcdef';
  let uuid = '';
  
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // 버전 4 UUID
    } else if (i === 19) {
      uuid += hexDigits[(Math.random() * 4) | 8]; // 변형 비트
    } else {
      uuid += hexDigits[(Math.random() * 16) | 0];
    }
  }
  
  return uuid;
}

/**
 * 범용 고유 ID 생성
 * @returns 고유 ID 문자열
 */
export function generateUniqueId(): string {
  return `unique_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}