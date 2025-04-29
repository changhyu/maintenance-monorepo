/**
 * 캐시 관리 유틸리티
 * 
 * 메모리 및 로컬 스토리지 기반 캐싱 기능을 제공합니다.
 */

// 캐시 아이템 타입
interface CacheItem<T> {
  value: T;
  expiry: number | null; // null은 만료 없음을 의미
}

// 메모리 캐시 저장소
const memoryCache: Record<string, CacheItem<any>> = {};

/**
 * 캐시에서 데이터를 가져옵니다.
 * @param key 캐시 키
 * @param storage 캐시 저장소 유형 ('memory' 또는 'local')
 * @returns 캐시된 값 또는 null (만료되었거나 존재하지 않는 경우)
 */
export function getCache<T>(key: string, storage: 'memory' | 'local' = 'memory'): T | null {
  const now = Date.now();

  if (storage === 'memory') {
    const item = memoryCache[key];
    
    if (!item) {
      return null;
    }
    
    // 만료 확인
    if (item.expiry && now > item.expiry) {
      delete memoryCache[key];
      return null;
    }
    
    return item.value;
  } else if (storage === 'local' && typeof localStorage !== 'undefined') {
    try {
      const itemStr = localStorage.getItem(key);
      
      if (!itemStr) {
        return null;
      }
      
      const item = JSON.parse(itemStr) as CacheItem<T>;
      
      // 만료 확인
      if (item.expiry && now > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('캐시 읽기 오류:', error);
      return null;
    }
  }
  
  return null;
}

/**
 * 캐시에 데이터를 저장합니다.
 * @param key 캐시 키
 * @param value 저장할 값
 * @param ttl 만료 시간(밀리초), 기본값은 1시간, null은 만료 없음을 의미
 * @param storage 캐시 저장소 유형 ('memory' 또는 'local')
 */
export function setCache<T>(
  key: string, 
  value: T, 
  ttl: number | null = 3600000, 
  storage: 'memory' | 'local' = 'memory'
): void {
  const expiry = ttl !== null ? Date.now() + ttl : null;
  
  const item: CacheItem<T> = {
    value,
    expiry
  };
  
  if (storage === 'memory') {
    memoryCache[key] = item;
  } else if (storage === 'local' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('캐시 저장 오류:', error);
    }
  }
}

/**
 * 캐시에서 특정 키의 데이터를 삭제합니다.
 * @param key 캐시 키
 * @param storage 캐시 저장소 유형 ('memory' 또는 'local')
 */
export function removeCache(key: string, storage: 'memory' | 'local' = 'memory'): void {
  if (storage === 'memory') {
    delete memoryCache[key];
  } else if (storage === 'local' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/**
 * 지정된 접두사로 시작하는 모든 캐시 항목을 삭제합니다.
 * @param prefix 캐시 키 접두사
 * @param storage 캐시 저장소 유형 ('memory' 또는 'local')
 */
export function removeCacheByPrefix(prefix: string, storage: 'memory' | 'local' = 'memory'): void {
  if (storage === 'memory') {
    Object.keys(memoryCache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete memoryCache[key];
      }
    });
  } else if (storage === 'local' && typeof localStorage !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * 모든 캐시를 비웁니다.
 * @param storage 캐시 저장소 유형 ('memory' 또는 'local')
 */
export function clearCache(storage: 'memory' | 'local' = 'memory'): void {
  if (storage === 'memory') {
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
  } else if (storage === 'local' && typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
}

/**
 * 만료된 모든 캐시 항목을 제거합니다.
 * @param storage 캐시 저장소 유형 ('memory' 또는 'local')
 */
export function cleanExpiredCache(storage: 'memory' | 'local' = 'memory'): void {
  const now = Date.now();
  
  if (storage === 'memory') {
    Object.keys(memoryCache).forEach(key => {
      const item = memoryCache[key];
      if (item && item.expiry && now > item.expiry) {
        delete memoryCache[key];
      }
    });
  } else if (storage === 'local' && typeof localStorage !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      try {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr) as CacheItem<unknown>;
          if (item && item.expiry && now > item.expiry) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // 잘못된 형식의 항목은 무시
      }
    });
  }
}

// 정기적인 캐시 정리 설정 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  // 5분마다 만료된 캐시 정리
  setInterval(() => {
    cleanExpiredCache('memory');
    cleanExpiredCache('local');
  }, 300000);
}

export default {
  getCache,
  setCache,
  removeCache,
  removeCacheByPrefix,
  clearCache,
  cleanExpiredCache
};