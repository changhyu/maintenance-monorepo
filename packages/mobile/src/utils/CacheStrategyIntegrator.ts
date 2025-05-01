import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedCacheOptimizer, OptimizationStrategy, CacheItemPriority, CacheItemMetadata } from './EnhancedCacheOptimizer';
import { OfflineDataManager } from './OfflineDataManager';

/**
 * OfflineDataManager와 향상된 캐시 최적화 전략(SLRU)을 통합하는 클래스
 */
export class CacheStrategyIntegrator {
  private offlineDataManager: OfflineDataManager;
  private optimizer: EnhancedCacheOptimizer;
  private itemsMetadata: Map<string, CacheItemMetadata>;
  private lastAccessedKey: string | null = null;
  private optimizationInProgress: boolean = false;
  private hitCount: number = 0;
  private missCount: number = 0;
  
  constructor(options: {
    maxSize?: number;
    maxCount?: number;
    strategy?: OptimizationStrategy;
    reductionTarget?: number;
    protectedRatio?: number;
  } = {}) {
    // OfflineDataManager 인스턴스 생성
    this.offlineDataManager = new OfflineDataManager();
    
    // 향상된 캐시 최적화 엔진 생성
    this.optimizer = new EnhancedCacheOptimizer({
      strategy: options.strategy || OptimizationStrategy.SLRU, // 기본 SLRU 전략 사용
      maxSize: options.maxSize || 50 * 1024 * 1024, // 50MB
      maxCount: options.maxCount || 1000,
      reductionTarget: options.reductionTarget || 0.3, // 30% 감소
      slruProtectedRatio: options.protectedRatio || 0.8, // 80% 보호 비율
      ttlExtensionFactor: 1.5,
      priorityWeight: 0.3,
      ageWeight: 0.2,
      frequencyWeight: 0.3,
      sizeWeight: 0.2,
      learningEnabled: true,
      prefetchingEnabled: true
    });
    
    this.itemsMetadata = new Map();
    
    // 기존 캐시된 항목의 메타데이터 로드
    this.loadCacheMetadata();
  }
  
  /**
   * 기존 캐시 메타데이터 로드
   */
  private async loadCacheMetadata() {
    try {
      // 모든 캐시 키 가져오기
      const keys = await this.offlineDataManager.getAllKeys();
      
      for (const key of keys) {
        try {
          // 캐시 항목 메타데이터 가져오기
          const metadata = await AsyncStorage.getItem(`cache_meta:${key}`);
          
          if (metadata) {
            // 메타데이터가 있으면 파싱하여 저장
            const parsedMetadata = JSON.parse(metadata) as CacheItemMetadata;
            this.itemsMetadata.set(key, parsedMetadata);
            
            // 최적화 엔진에 항목 기록
            this.optimizer.recordItemCreation(
              key, 
              parsedMetadata.size, 
              parsedMetadata.dataType, 
              parsedMetadata.priority
            );
          } else {
            // 메타데이터가 없으면 기본값 생성
            const now = Date.now();
            const newMetadata: CacheItemMetadata = {
              key,
              size: 0, // 크기 알 수 없음, 나중에 업데이트될 예정
              accessCount: 1,
              lastAccessed: now,
              created: now,
              ttl: 7 * 24 * 60 * 60 * 1000, // 7일
              dataType: 'unknown',
              priority: CacheItemPriority.MEDIUM
            };
            
            this.itemsMetadata.set(key, newMetadata);
            
            // 최적화 엔진에 항목 기록
            this.optimizer.recordItemCreation(
              key, 
              newMetadata.size, 
              newMetadata.dataType, 
              newMetadata.priority
            );
            
            // 메타데이터 저장
            await AsyncStorage.setItem(`cache_meta:${key}`, JSON.stringify(newMetadata));
          }
        } catch (err) {
          console.warn(`캐시 메타데이터 로드 오류: ${key}`, err);
        }
      }
      
      console.log(`캐시 메타데이터 로드 완료: ${this.itemsMetadata.size}개 항목`);
    } catch (err) {
      console.error('캐시 메타데이터 로드 실패', err);
    }
  }
  
  /**
   * 데이터 캐싱
   */
  public async cacheData<T>(key: string, data: T, options: {
    ttl?: number;
    priority?: string;
    dataType?: string;
    optimizeImmediately?: boolean;
  } = {}): Promise<boolean> {
    try {
      // OfflineDataManager를 통해 데이터 캐싱
      const result = await this.offlineDataManager.cacheData(key, data, options.ttl);
      
      if (result) {
        // 캐시 메타데이터 생성 및 저장
        const now = Date.now();
        const dataString = JSON.stringify(data);
        const size = dataString.length;
        const priority = options.priority || CacheItemPriority.MEDIUM;
        const dataType = options.dataType || this.inferDataType(data);
        const ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 기본 7일
        
        const metadata: CacheItemMetadata = {
          key,
          size,
          accessCount: 1,
          lastAccessed: now,
          created: now,
          ttl,
          dataType,
          priority
        };
        
        // 메타데이터 저장
        this.itemsMetadata.set(key, metadata);
        await AsyncStorage.setItem(`cache_meta:${key}`, JSON.stringify(metadata));
        
        // 최적화 엔진에 항목 생성 기록
        this.optimizer.recordItemCreation(key, size, dataType, priority);
        
        // 즉시 최적화 옵션이 있으면 최적화 시도
        if (options.optimizeImmediately) {
          await this.optimizeCache();
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error(`데이터 캐싱 오류: ${key}`, err);
      return false;
    }
  }
  
  /**
   * 데이터 가져오기
   */
  public async getData<T>(key: string, prefetch: boolean = true): Promise<T | null> {
    try {
      // OfflineDataManager를 통해 데이터 가져오기
      const data = await this.offlineDataManager.getData<T>(key);
      
      if (data !== null) {
        // 캐시 히트
        this.hitCount++;
        
        // 메타데이터 업데이트
        const metadata = this.itemsMetadata.get(key);
        
        if (metadata) {
          const now = Date.now();
          
          // 접근 카운트 및 마지막 접근 시간 업데이트
          metadata.accessCount++;
          metadata.lastAccessed = now;
          
          // 메타데이터 저장
          this.itemsMetadata.set(key, metadata);
          
          // 비동기적으로 메타데이터 저장 (결과 기다리지 않음)
          AsyncStorage.setItem(`cache_meta:${key}`, JSON.stringify(metadata)).catch(err => {
            console.warn(`메타데이터 업데이트 오류: ${key}`, err);
          });
          
          // 최적화 엔진에 접근 기록
          this.optimizer.recordItemAccess(key, this.lastAccessedKey || undefined);
          
          // 마지막 접근 키 업데이트
          this.lastAccessedKey = key;
          
          // 관련 항목 프리페칭
          if (prefetch) {
            this.prefetchRelatedItems(key);
          }
        }
        
        return data;
      } else {
        // 캐시 미스
        this.missCount++;
        this.optimizer.recordCacheMiss(key);
        
        return null;
      }
    } catch (err) {
      console.error(`데이터 조회 오류: ${key}`, err);
      return null;
    }
  }
  
  /**
   * 관련 항목 프리페칭
   */
  private prefetchRelatedItems(currentKey: string, limit: number = 3) {
    if (!this.optimizer.selectItemsForPrefetch) return;
    
    const itemsToFetch = this.optimizer.selectItemsForPrefetch(currentKey, limit);
    
    if (itemsToFetch.length === 0) return;
    
    // 백그라운드에서 프리페칭
    setTimeout(() => {
      itemsToFetch.forEach(key => {
        this.getData(key, false).catch(() => {
          // 프리페칭 오류는 무시
        });
      });
    }, 0);
  }
  
  /**
   * 항목 제거
   */
  public async removeItem(key: string): Promise<boolean> {
    try {
      // OfflineDataManager를 통해 항목 제거
      const result = await this.offlineDataManager.removeItem(key);
      
      if (result) {
        // 메타데이터 제거
        this.itemsMetadata.delete(key);
        await AsyncStorage.removeItem(`cache_meta:${key}`);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error(`항목 제거 오류: ${key}`, err);
      return false;
    }
  }
  
  /**
   * 특정 접두사로 시작하는 모든 캐시 항목 삭제
   */
  public async clearCache(prefix: string = ''): Promise<number> {
    try {
      // OfflineDataManager를 통해 캐시 비우기
      const result = await this.offlineDataManager.clearCache(prefix);
      
      if (result > 0) {
        // 메타데이터도 함께 제거
        const keysToRemove: string[] = [];
        
        for (const [key] of this.itemsMetadata.entries()) {
          if (key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        
        // 메타데이터 제거
        keysToRemove.forEach(key => {
          this.itemsMetadata.delete(key);
        });
        
        // 메타데이터 저장소에서도 제거
        await AsyncStorage.multiRemove(keysToRemove.map(key => `cache_meta:${key}`));
      }
      
      return result;
    } catch (err) {
      console.error(`캐시 비우기 오류: ${prefix}`, err);
      return 0;
    }
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  public async cleanExpiredCache(): Promise<number> {
    try {
      // OfflineDataManager를 통해 만료된 항목 제거
      const result = await this.offlineDataManager.cleanExpiredCache();
      
      if (result > 0) {
        // 만료된 항목의 메타데이터도 함께 제거
        const now = Date.now();
        const keysToRemove: string[] = [];
        
        for (const [key, metadata] of this.itemsMetadata.entries()) {
          if (metadata.created + metadata.ttl < now) {
            keysToRemove.push(key);
          }
        }
        
        // 메타데이터 제거
        keysToRemove.forEach(key => {
          this.itemsMetadata.delete(key);
        });
        
        // 메타데이터 저장소에서도 제거
        await AsyncStorage.multiRemove(keysToRemove.map(key => `cache_meta:${key}`));
      }
      
      return result;
    } catch (err) {
      console.error('만료된 캐시 정리 오류', err);
      return 0;
    }
  }
  
  /**
   * 캐시 최적화 수행
   */
  public async optimizeCache(): Promise<{
    totalItems: number;
    removedCount: number;
    freedSpace: number;
    newSize: number;
    hitRate: number;
    strategyUsed: string;
  }> {
    if (this.optimizationInProgress) {
      return Promise.reject(new Error('최적화가 이미 진행 중입니다.'));
    }
    
    this.optimizationInProgress = true;
    
    try {
      // 히트율 업데이트
      const totalAccesses = this.hitCount + this.missCount;
      const hitRate = totalAccesses > 0 ? this.hitCount / totalAccesses : 0;
      this.optimizer.updateHitRate(hitRate);
      
      // 메타데이터 배열 생성
      const itemsMetadata = Array.from(this.itemsMetadata.values());
      
      // 최적화 실행
      const result = this.optimizer.optimize(itemsMetadata);
      
      // 제거할 항목 처리
      const keysToRemove = result.removedItems.map(item => item.key);
      
      if (keysToRemove.length > 0) {
        // OfflineDataManager를 통해 항목 제거
        for (const key of keysToRemove) {
          await this.offlineDataManager.removeItem(key);
          this.itemsMetadata.delete(key);
        }
        
        // 메타데이터 제거
        await AsyncStorage.multiRemove(keysToRemove.map(key => `cache_meta:${key}`));
      }
      
      // TTL 조정
      if (result.ttlAdjustments && Object.keys(result.ttlAdjustments).length > 0) {
        for (const [key, newTtl] of Object.entries(result.ttlAdjustments)) {
          const metadata = this.itemsMetadata.get(key);
          
          if (metadata) {
            // TTL 업데이트
            metadata.ttl = newTtl;
            this.itemsMetadata.set(key, metadata);
            
            // 메타데이터 저장
            AsyncStorage.setItem(`cache_meta:${key}`, JSON.stringify(metadata)).catch(err => {
              console.warn(`TTL 업데이트 오류: ${key}`, err);
            });
          }
        }
      }
      
      // 캐시 크기 계산
      const totalSize = Array.from(this.itemsMetadata.values())
        .reduce((sum, item) => sum + item.size, 0);
      
      return {
        totalItems: this.itemsMetadata.size,
        removedCount: keysToRemove.length,
        freedSpace: result.freedSpace,
        newSize: totalSize,
        hitRate,
        strategyUsed: result.strategyUsed
      };
    } catch (err) {
      console.error('캐시 최적화 오류', err);
      throw err;
    } finally {
      this.optimizationInProgress = false;
    }
  }
  
  /**
   * 캐시 통계 얻기
   */
  public getCacheStats() {
    const items = Array.from(this.itemsMetadata.values());
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const totalAccesses = this.hitCount + this.missCount;
    const hitRate = totalAccesses > 0 ? this.hitCount / totalAccesses : 0;
    
    // 데이터 타입 분포
    const dataTypes: Record<string, number> = {};
    items.forEach(item => {
      dataTypes[item.dataType] = (dataTypes[item.dataType] || 0) + 1;
    });
    
    // 우선순위 분포
    const priorities: Record<string, number> = {};
    items.forEach(item => {
      priorities[item.priority] = (priorities[item.priority] || 0) + 1;
    });
    
    // 항목 나이 분포
    const now = Date.now();
    const ageDistribution = {
      recent: 0, // 1일 미만
      medium: 0, // 1~3일
      old: 0     // 3일 이상
    };
    
    items.forEach(item => {
      const ageHours = (now - item.created) / (60 * 60 * 1000);
      
      if (ageHours < 24) {
        ageDistribution.recent++;
      } else if (ageHours < 72) {
        ageDistribution.medium++;
      } else {
        ageDistribution.old++;
      }
    });
    
    // 보호/시험 세그먼트 분포 계산
    let protectedCount = 0;
    let probationaryCount = 0;
    
    items.forEach(item => {
      // 현재 키의 세그먼트 확인
      const isProtected = this.optimizer.isItemProtected?.(item.key) ?? false;
      
      if (isProtected) {
        protectedCount++;
      } else {
        probationaryCount++;
      }
    });
    
    const segmentDistribution = {
      protected: protectedCount,
      probationary: probationaryCount,
      protectedRatio: items.length > 0 ? protectedCount / items.length : 0
    };
    
    return {
      totalItems: items.length,
      totalSize,
      hitRate,
      missRate: 1 - hitRate,
      hitCount: this.hitCount,
      missCount: this.missCount,
      dataTypes,
      priorities,
      ageDistribution,
      segmentDistribution,
      avgItemSize: items.length > 0 ? totalSize / items.length : 0
    };
  }
  
  /**
   * 데이터 타입 추론
   */
  private inferDataType(data: any): string {
    if (data === null || data === undefined) {
      return 'null';
    }
    
    if (Array.isArray(data)) {
      // 배열 항목 확인하여 추론
      if (data.length > 0) {
        if (typeof data[0] === 'object') {
          // entity 배열 확인
          if ('id' in data[0]) {
            return 'entity_list';
          }
        }
      }
      return 'array';
    }
    
    if (typeof data === 'object') {
      // Git 관련 데이터 확인
      if ('commitHash' in data || 'branch' in data || 'commits' in data) {
        return 'git';
      }
      
      // 이미지 데이터 확인
      if ('uri' in data && typeof data.uri === 'string') {
        return 'image';
      }
      
      // 엔티티(DB 항목) 확인
      if ('id' in data && ('name' in data || 'title' in data)) {
        return 'entity';
      }
      
      // 사용자 데이터 확인
      if ('userId' in data || 'username' in data || 'email' in data) {
        return 'user';
      }
      
      // 설정 데이터 확인
      if ('settings' in data || 'config' in data || 'preferences' in data) {
        return 'config';
      }
      
      return 'object';
    }
    
    if (typeof data === 'string') {
      // JSON 문자열 확인
      if (data.startsWith('{') || data.startsWith('[')) {
        try {
          JSON.parse(data);
          return 'json_string';
        } catch {
          // JSON이 아님
        }
      }
      
      // URL 확인
      if (data.startsWith('http') || data.includes('://')) {
        return 'url';
      }
      
      // 날짜 확인
      if (!isNaN(Date.parse(data))) {
        return 'date';
      }
    }
    
    return typeof data;
  }
} 