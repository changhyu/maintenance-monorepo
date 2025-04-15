/**
 * 애플리케이션 전반에 걸쳐 일관된 캐시 관리를 위한 유틸리티
 */

export interface CacheOptions {
  /** 캐시 만료 시간 (밀리초) */
  expiresIn: number;
  /** 자동으로 만료된 항목 제거 여부 */
  autoRemoveExpired?: boolean;
}

export interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  expiresIn: 3600000, // 1시간
  autoRemoveExpired: true,
};

/**
 * 메모리 기반 캐시 관리자
 */
class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private options: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }

  /**
   * 캐시에 항목 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param options 캐시 옵션 (기본값 재정의)
   */
  set<T>(key: string, value: T, options?: Partial<CacheOptions>): void {
    const mergedOptions = { ...this.options, ...options };
    const expiresAt = Date.now() + mergedOptions.expiresIn;

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  /**
   * 캐시에서 항목 조회
   * @param key 캐시 키
   * @returns 캐시된 값 또는 null (만료 또는 미존재)
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      if (this.options.autoRemoveExpired) {
        this.cache.delete(key);
      }
      return null;
    }

    return item.value as T;
  }

  /**
   * 캐시에서 항목 삭제
   * @param key 삭제할 캐시 항목의 키
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 모든 캐시 항목 삭제
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 항목 정리
   */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// 싱글톤 인스턴스 생성
export const appCache = new CacheManager();