/*
 * 캐시 유틸리티 모듈
 * 간단한 인메모리 캐시 구현
 */

export const appCache: { [key: string]: any } = {};

/**
 * 캐시에 값을 저장합니다.
 * @param key 캐시 키
 * @param value 저장할 값
 */
export function setCache(key: string, value: any): void {
  appCache[key] = value;
}

/**
 * 캐시에서 값을 가져옵니다.
 * @param key 캐시 키
 * @returns 저장된 값, 없으면 undefined
 */
export function getCache(key: string): any {
  return appCache[key];
} 