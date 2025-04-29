/**
 * 오프라인 저장소 유틸리티
 * 
 * 로컬 스토리지를 사용하여 오프라인 모드에서 API 요청을 저장하고 관리하는 기능을 제공합니다.
 */

import { v4 as uuidv4 } from 'uuid';

// 오프라인 요청 인터페이스
export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  cacheKey?: string;
}

// 오프라인 저장소 인터페이스
export interface OfflineStorage {
  /**
   * 요청을 오프라인 큐에 저장
   */
  saveRequest(request: OfflineRequest): Promise<void>;
  
  /**
   * 저장된 모든 요청 검색
   */
  getPendingRequests(): Promise<OfflineRequest[]>;
  
  /**
   * 처리 완료된 요청 삭제
   */
  removeRequest(requestId: string): Promise<void>;
  
  /**
   * 오프라인 응답 가져오기
   */
  getCachedResponse(cacheKey: string): Promise<unknown>;
  
  /**
   * 오프라인 응답 저장
   */
  setCachedResponse(cacheKey: string, data: unknown, ttl?: number): Promise<void>;

  /**
   * 캐시 항목 만료 여부 확인
   */
  isExpired(timestamp: number, ttl: number): boolean;

  /**
   * 모든 만료된 캐시 항목 제거
   */
  clearExpiredCache(): Promise<void>;
}

// 로컬 스토리지 기반 오프라인 저장소 구현체
export class LocalStorageOfflineStorage implements OfflineStorage {
  private readonly PENDING_REQUESTS_KEY = 'offline_pending_requests';
  private readonly CACHE_PREFIX = 'offline_cache_';
  private readonly CACHE_META_PREFIX = 'offline_cache_meta_';
  
  /**
   * 요청을 오프라인 큐에 저장
   */
  public async saveRequest(request: OfflineRequest): Promise<void> {
    const pendingRequests = await this.getPendingRequests();
    
    // ID가 없는 경우 생성
    if (!request.id) {
      request.id = uuidv4();
    }
    
    // 생성 시간 기록
    if (!request.createdAt) {
      request.createdAt = Date.now();
    }
    
    pendingRequests.push(request);
    
    localStorage.setItem(
      this.PENDING_REQUESTS_KEY,
      JSON.stringify(pendingRequests)
    );
  }
  
  /**
   * 저장된 모든 요청 검색
   */
  public async getPendingRequests(): Promise<OfflineRequest[]> {
    const pendingRequestsJson = localStorage.getItem(this.PENDING_REQUESTS_KEY);
    
    if (!pendingRequestsJson) {
      return [];
    }
    
    try {
      return JSON.parse(pendingRequestsJson) as OfflineRequest[];
    } catch (error) {
      console.error('오프라인 요청 파싱 오류:', error);
      return [];
    }
  }
  
  /**
   * 처리 완료된 요청 삭제
   */
  public async removeRequest(requestId: string): Promise<void> {
    const pendingRequests = await this.getPendingRequests();
    const filteredRequests = pendingRequests.filter(request => request.id !== requestId);
    
    localStorage.setItem(
      this.PENDING_REQUESTS_KEY,
      JSON.stringify(filteredRequests)
    );
  }
  
  /**
   * 오프라인 응답 가져오기
   */
  public async getCachedResponse(cacheKey: string): Promise<unknown> {
    const cacheKeyWithPrefix = this.CACHE_PREFIX + cacheKey;
    const metaKeyWithPrefix = this.CACHE_META_PREFIX + cacheKey;
    
    const cachedDataJson = localStorage.getItem(cacheKeyWithPrefix);
    const metaDataJson = localStorage.getItem(metaKeyWithPrefix);
    
    if (!cachedDataJson || !metaDataJson) {
      return null;
    }
    
    try {
      const metaData = JSON.parse(metaDataJson);
      
      // TTL 만료 확인
      if (metaData.ttl && this.isExpired(metaData.timestamp, metaData.ttl)) {
        // 만료된 캐시 삭제
        localStorage.removeItem(cacheKeyWithPrefix);
        localStorage.removeItem(metaKeyWithPrefix);
        return null;
      }
      
      return JSON.parse(cachedDataJson);
    } catch (error) {
      console.error('캐시 데이터 파싱 오류:', error);
      return null;
    }
  }
  
  /**
   * 오프라인 응답 저장
   */
  public async setCachedResponse(cacheKey: string, data: unknown, ttl?: number): Promise<void> {
    const cacheKeyWithPrefix = this.CACHE_PREFIX + cacheKey;
    const metaKeyWithPrefix = this.CACHE_META_PREFIX + cacheKey;
    
    // 데이터 저장
    localStorage.setItem(
      cacheKeyWithPrefix,
      JSON.stringify(data)
    );
    
    // 메타데이터 저장
    const metaData = {
      timestamp: Date.now(),
      ttl: ttl || 0, // 0은 무제한
    };
    
    localStorage.setItem(
      metaKeyWithPrefix,
      JSON.stringify(metaData)
    );
  }
  
  /**
   * 캐시 항목 만료 여부 확인
   */
  public isExpired(timestamp: number, ttl: number): boolean {
    if (ttl === 0) return false; // 무제한
    
    const now = Date.now();
    const expirationTime = timestamp + (ttl * 1000);
    
    return now > expirationTime;
  }
  
  /**
   * 모든 만료된 캐시 항목 제거
   */
  public async clearExpiredCache(): Promise<void> {
    const keysToRemove: string[] = [];
    
    // localStorage의 모든 키 검사
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (!key) continue;
      
      // 캐시 메타데이터 키인 경우
      if (key.startsWith(this.CACHE_META_PREFIX)) {
        const metaDataJson = localStorage.getItem(key);
        
        if (!metaDataJson) continue;
        
        try {
          const metaData = JSON.parse(metaDataJson);
          
          // TTL이 설정되어 있고 만료된 경우
          if (metaData.ttl && this.isExpired(metaData.timestamp, metaData.ttl)) {
            // 캐시 키 추출
            const cacheKey = key.substring(this.CACHE_META_PREFIX.length);
            
            // 캐시 데이터와 메타데이터 키 추가
            keysToRemove.push(this.CACHE_PREFIX + cacheKey);
            keysToRemove.push(key);
          }
        } catch (error) {
          console.error('캐시 메타데이터 파싱 오류:', error);
        }
      }
    }
    
    // 만료된 항목 삭제
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// 오프라인 저장소 인스턴스 생성
export function createOfflineStorage(): OfflineStorage {
  return new LocalStorageOfflineStorage();
}

// 기본 내보내기
export default createOfflineStorage();