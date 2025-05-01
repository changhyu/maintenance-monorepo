import AsyncStorage from '@react-native-async-storage/async-storage';
import NetworkErrorManager from './NetworkErrorManager';
import { Platform } from 'react-native';

// 오프라인 데이터 항목 인터페이스
export interface OfflineDataItem<T> {
  data: T;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  id: string;
  lastAccessed?: number; // LRU 추적을 위한 마지막 접근 시간
  accessCount?: number;  // 접근 빈도 추적
}

// 캐시 옵션 인터페이스
export interface CacheOptions {
  prefix?: string;
  expirationTime?: number; // 밀리초 단위
  compression?: boolean;
  priority?: 'high' | 'medium' | 'low'; // 캐시 항목 우선순위
  maxSize?: number;       // 항목 최대 크기 (바이트)
}

// 동기화 옵션 인터페이스
export interface SyncOptions {
  maxRetries?: number;
  forceSyncAll?: boolean;
  onProgress?: (current: number, total: number) => void;
}

// 캐시 통계 인터페이스
interface CacheStats {
  hits: number;
  misses: number;
  totalItems: number;
  estimatedSize: number;
  oldestItemAge: number;
  hitRate?: string;       // 히트율 추가
  avgAccessTime?: number; // 평균 접근 시간 (ms)
  cacheThroughput?: number; // 초당 처리되는 캐시 요청 수
  itemTypeDistribution?: Record<string, number>; // 데이터 유형별 분포
  sizeByCategory?: Record<string, number>; // 카테고리별 캐시 크기
  accessTimeHistory?: number[]; // 최근 접근 시간 기록 (최대 100개)
  dataSizeDistribution?: { small: number, medium: number, large: number }; // 크기별 분포
  timeToLiveDistribution?: { short: number, medium: number, long: number }; // TTL별 분포
  memoryUtilization?: number; // 메모리 사용률
  storageTrend?: { timestamp: number, size: number }[]; // 캐시 크기 변화 추이
}

/**
 * 오프라인 데이터 관리 클래스
 * 로컬 저장소에 데이터를 캐싱하고 동기화하는 기능 제공
 */
class OfflineDataManager {
  private static instance: OfflineDataManager;
  private isNetworkConnected: boolean = true;
  private pendingSyncOperations: Set<string> = new Set();
  private syncInProgress: boolean = false;
  private unsubscribeNetwork: (() => void) | null = null;
  
  // LRU 캐시를 위한 변수
  private lruQueue: string[] = []; 
  private accessCountMap: Map<string, number> = new Map();
  private estimatedCacheSize: number = 0;
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    totalItems: 0,
    estimatedSize: 0,
    oldestItemAge: 0,
    hitRate: '0.00%',
    avgAccessTime: 0,
    cacheThroughput: 0,
    itemTypeDistribution: {},
    sizeByCategory: {},
    accessTimeHistory: [],
    dataSizeDistribution: { small: 0, medium: 0, large: 0 },
    timeToLiveDistribution: { short: 0, medium: 0, long: 0 },
    memoryUtilization: 0,
    storageTrend: []
  };
  
  // 메모리 캐시 (빠른 접근을 위한)
  private memoryCache: Map<string, any> = new Map();
  
  // 접근 패턴 분석을 위한 변수
  private accessPatterns: Map<string, Map<string, number>> = new Map();
  private lastAccessedKey: string | null = null;
  private preloadInProgress: boolean = false;
  
  // 기본 캐시 옵션
  private defaultCacheOptions: CacheOptions = {
    prefix: 'offline_data_',
    expirationTime: 24 * 60 * 60 * 1000, // 24시간
    compression: false,
    priority: 'medium',
    maxSize: 5 * 1024 * 1024, // 5MB
  };
  
  // 캐시 제한
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_CACHE_ITEMS = 1000;            // 최대 항목 수
  private readonly MEMORY_CACHE_MAX_ITEMS = 200;      // 메모리 캐시 최대 항목 수 증가 (100 -> 200)

  // 캐시 접근 시간 측정을 위한 변수
  private accessTimeRecords: number[] = [];
  private lastAccessTimestamp: number = 0;
  private accessCountInLastMinute: number = 0;
  private lastThroughputUpdate: number = Date.now();
  
  private constructor() {
    // 네트워크 상태 모니터링
    this.unsubscribeNetwork = NetworkErrorManager.addNetworkListener(this.handleNetworkChange);
    
    // 정기적인 캐시 최적화 수행
    this.initializePeriodicOptimization();
    
    // 시작 시 캐시 통계 로드
    this.loadCacheStats();
    
    // 자주 사용되는 데이터 사전 로딩
    this.preloadFrequentlyUsedItems();
  }

  /**
   * 정기적인 캐시 최적화 초기화
   */
  private initializePeriodicOptimization(): void {
    // 1시간마다 캐시 최적화 수행
    setInterval(() => {
      this.optimizeCache()
        .catch(error => console.error('캐시 최적화 중 오류:', error));
    }, 60 * 60 * 1000); // 1시간
    
    // 앱이 백그라운드로 전환될 때 캐시 최적화 수행
    if (Platform.OS !== 'web') {
      // AppState 리스너는 여기서 구현 가능
    }
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): OfflineDataManager {
    if (!OfflineDataManager.instance) {
      OfflineDataManager.instance = new OfflineDataManager();
    }
    return OfflineDataManager.instance;
  }

  /**
   * 네트워크 상태 변경 처리
   */
  private handleNetworkChange = (isConnected: boolean): void => {
    const wasConnected = this.isNetworkConnected;
    this.isNetworkConnected = isConnected;
    
    // 오프라인 -> 온라인 전환 시 자동 동기화 수행
    if (!wasConnected && isConnected) {
      this.synchronize().catch(error => {
        console.error('자동 동기화 중 오류 발생:', error);
      });
    }
  };

  /**
   * 스토리지 키 생성
   */
  private getStorageKey(key: string, options?: CacheOptions): string {
    const prefix = options?.prefix || this.defaultCacheOptions.prefix;
    return `${prefix}${key}`;
  }

  /**
   * LRU 캐시 큐 업데이트
   */
  private updateLRU(key: string): void {
    // 기존 항목 제거
    const index = this.lruQueue.indexOf(key);
    if (index > -1) {
      this.lruQueue.splice(index, 1);
    }
    
    // 항목을 큐의 맨 앞에 추가 (가장 최근에 사용됨)
    this.lruQueue.unshift(key);
    
    // 접근 횟수 증가
    const currentCount = this.accessCountMap.get(key) || 0;
    this.accessCountMap.set(key, currentCount + 1);
    
    // 접근 패턴 기록
    this.recordAccessPattern(key);
  }
  
  /**
   * 접근 패턴 기록
   * 연속적으로 접근하는 항목들 간의 관계를 기록
   */
  private recordAccessPattern(currentKey: string): void {
    if (this.lastAccessedKey && this.lastAccessedKey !== currentKey) {
      if (!this.accessPatterns.has(this.lastAccessedKey)) {
        this.accessPatterns.set(this.lastAccessedKey, new Map());
      }
      
      const patterns = this.accessPatterns.get(this.lastAccessedKey)!;
      const count = patterns.get(currentKey) || 0;
      patterns.set(currentKey, count + 1);
    }
    
    this.lastAccessedKey = currentKey;
  }
  
  /**
   * 관련 항목 사전 로딩
   * 접근 패턴에 기반하여 함께 접근될 가능성이 높은 항목들을 메모리에 미리 로드
   */
  private async preloadRelatedItems(key: string): Promise<void> {
    if (this.preloadInProgress || !this.accessPatterns.has(key)) {
      return;
    }
    
    this.preloadInProgress = true;
    
    try {
      const patterns = this.accessPatterns.get(key)!;
      
      // 관련성 점수에 따라 정렬
      const relatedItems = Array.from(patterns.entries())
        .sort((a, b) => b[1] - a[1]) // 관련성 높은 순으로 정렬
        .slice(0, 3);                // 최대 3개 항목 선택
      
      for (const [relatedKey, score] of relatedItems) {
        // 최소 관련성 점수 체크 (3번 이상 연관되었을 때만 사전 로딩)
        if (score < 3) continue;
        
        const storageKey = this.getStorageKey(relatedKey);
        
        // 이미 메모리 캐시에 있으면 건너뛰기
        if (this.memoryCache.has(storageKey)) {
          continue;
        }
        
        // 관련 항목 사전 로딩
        const cachedDataStr = await AsyncStorage.getItem(storageKey);
        if (cachedDataStr) {
          const cachedItem = JSON.parse(cachedDataStr);
          const expirationTime = this.defaultCacheOptions.expirationTime || 24 * 60 * 60 * 1000;
          
          // 만료되지 않은 항목만 메모리에 로드
          if (Date.now() - cachedItem.timestamp <= expirationTime) {
            this.memoryCache.set(storageKey, cachedItem);
            console.log(`관련 항목 사전 로드됨: ${relatedKey}`);
          }
        }
      }
    } catch (error) {
      console.error('관련 항목 사전 로딩 중 오류:', error);
    } finally {
      this.preloadInProgress = false;
    }
  }
  
  /**
   * 자주 사용되는 항목 사전 로딩
   * 앱 시작 시나 주요 화면 진입 시 호출하여 자주 사용되는 항목들을 미리 메모리에 로드
   */
  private async preloadFrequentlyUsedItems(): Promise<void> {
    try {
      // 모든 캐시 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = this.defaultCacheOptions.prefix || 'offline_data_';
      const cacheKeys = allKeys.filter(key => key.startsWith(prefix));
      
      // 접근 횟수에 따른 항목 분석
      const frequentItems: { key: string; accessCount: number }[] = [];
      
      for (const key of cacheKeys) {
        const itemStr = await AsyncStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          if (item.accessCount && item.accessCount > 5) { // 5회 이상 접근한 항목만 선택
            frequentItems.push({ key, accessCount: item.accessCount });
          }
        }
      }
      
      // 접근 빈도에 따라 정렬
      frequentItems.sort((a, b) => b.accessCount - a.accessCount);
      
      // 상위 10개 항목만 메모리에 사전 로드
      const itemsToPreload = frequentItems.slice(0, 10);
      
      for (const { key } of itemsToPreload) {
        const itemStr = await AsyncStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          this.memoryCache.set(key, item);
          this.updateLRU(key);
          console.log(`자주 사용되는 항목 사전 로드됨: ${key}`);
        }
      }
      
      console.log(`자주 사용되는 항목 ${itemsToPreload.length}개 사전 로드 완료`);
    } catch (error) {
      console.error('자주 사용되는 항목 사전 로딩 중 오류:', error);
    }
  }
  
  /**
   * 지능형 TTL 관리
   * 접근 빈도에 따라 캐시 만료 시간을 동적으로 조정
   */
  private getAdaptiveTTL(key: string): number {
    const accessCount = this.accessCountMap.get(key) || 0;
    const baseTTL = this.defaultCacheOptions.expirationTime || 24 * 60 * 60 * 1000; // 기본 24시간
    
    if (accessCount > 15) {
      return baseTTL * 3; // 매우 자주 사용되는 항목은 기본의 3배 (3일)
    } else if (accessCount > 8) {
      return baseTTL * 2; // 자주 사용되는 항목은 기본의 2배 (2일)
    } else if (accessCount > 3) {
      return baseTTL * 1.5; // 적당히 사용되는 항목은 기본의 1.5배 (36시간)
    }
    
    return baseTTL; // 기본 TTL (24시간)
  }

  /**
   * LRU 캐시에서 항목 제거
   */
  private removeLRU(key: string): void {
    // LRU 큐에서 제거
    const index = this.lruQueue.indexOf(key);
    if (index > -1) {
      this.lruQueue.splice(index, 1);
    }
    
    // 접근 횟수 제거
    this.accessCountMap.delete(key);
    
    // 메모리 캐시에서 제거
    this.memoryCache.delete(key);
  }
  
  /**
   * 항목의 크기 추정
   */
  private estimateItemSize<T>(item: OfflineDataItem<T>): number {
    // 문자열로 변환하여 크기 추정
    const jsonString = JSON.stringify(item);
    
    // UTF-16 인코딩에서 각 문자는 2바이트, 기본 추가 크기 50바이트
    return jsonString.length * 2 + 50; 
  }

  /**
   * 데이터 캐싱
   */
  public async cacheData<T>(
    key: string, 
    data: T, 
    options?: CacheOptions
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const storageKey = this.getStorageKey(key, options);
      
      // TTL 계산 (지능형 TTL 또는 옵션 TTL)
      const ttl = this.getAdaptiveTTL(storageKey);
      const expiration = Date.now() + (options?.expirationTime || ttl);
      
      const item: OfflineDataItem<T> = {
        data,
        timestamp: Date.now(),
        syncStatus: 'synced',
        id: key,
        lastAccessed: Date.now(),
        accessCount: 1
      };
      
      // 항목 크기 추정
      const estimatedSize = this.estimateItemSize(item);
      
      // 최대 항목 크기 검사
      const maxSize = options?.maxSize || this.defaultCacheOptions.maxSize;
      if (estimatedSize > maxSize) {
        console.warn(`캐시 항목 크기가 제한을 초과했습니다. 키: ${key}, 크기: ${estimatedSize}바이트, 제한: ${maxSize}바이트`);
        return;
      }
      
      // 캐시 항목 저장
      await AsyncStorage.setItem(storageKey, JSON.stringify(item));
      
      // LRU 캐시 및 메모리 캐시 업데이트
      this.updateLRU(storageKey);
      
      // 메모리 캐시에 추가 (메모리 캐시에 너무 많은 항목이 있으면 가장 오래된 항목 제거)
      if (this.memoryCache.size >= this.MEMORY_CACHE_MAX_ITEMS) {
        // 가장 오래 사용되지 않은 항목 찾기
        const oldestKey = this.lruQueue[this.lruQueue.length - 1];
        if (oldestKey) {
          this.memoryCache.delete(oldestKey);
        }
      }
      
      // 메모리 캐시에 추가
      this.memoryCache.set(storageKey, item);
      
      // 캐시 통계 업데이트
      this.estimatedCacheSize += estimatedSize;
      this.cacheStats.totalItems++;
      this.cacheStats.estimatedSize = this.estimatedCacheSize;
      this.updateHitRate();
      
      // 캐시 크기가 제한을 초과하면 최적화 수행
      if (this.estimatedCacheSize > this.MAX_CACHE_SIZE || 
          this.cacheStats.totalItems > this.MAX_CACHE_ITEMS) {
        this.optimizeCache();
      }
      
      // 항목 유형 분포 업데이트
      this.updateItemTypeDistribution(storageKey, estimatedSize);
      
      // TTL 분포 업데이트
      this.updateTTLDistribution(options?.expirationTime || this.defaultCacheOptions.expirationTime || 0);
      
      // 메모리 사용률 업데이트
      this.updateMemoryUtilization();
      
      // 접근 시간 기록
      this.recordAccessTime(startTime);
      
    } catch (error) {
      console.error(`데이터 캐싱 중 오류 (키: ${key}):`, error);
      throw error;
    }
  }

  /**
   * 데이터 조회
   */
  public async getData<T>(
    key: string, 
    fetchFn?: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T | null> {
    const startTime = Date.now();
    const storageKey = this.getStorageKey(key, options);
    
    try {
      // 메모리 캐시에서 먼저 확인 (빠른 접근)
      if (this.memoryCache.has(storageKey)) {
        const cachedItem = this.memoryCache.get(storageKey) as OfflineDataItem<T>;
        const expirationTime = options?.expirationTime || this.getAdaptiveTTL(storageKey);
        const isExpired = Date.now() - cachedItem.timestamp > expirationTime;
        
        if (!isExpired || !this.isNetworkConnected || !fetchFn) {
          // 메모리 캐시 적중
          this.updateLRU(storageKey);
          cachedItem.lastAccessed = Date.now();
          cachedItem.accessCount = (cachedItem.accessCount || 0) + 1;
          this.memoryCache.set(storageKey, cachedItem);
          this.cacheStats.hits++;
          this.updateHitRate();
          
          // 접근 패턴에 기반한 사전 로딩 (백그라운드에서 비동기적으로 실행)
          setTimeout(() => {
            this.preloadRelatedItems(storageKey).catch(err => 
              console.error('관련 항목 사전 로딩 오류:', err)
            );
          }, 0);
          
          // 접근 시간 기록
          this.recordAccessTime(startTime);
          
          return cachedItem.data;
        }
      }
      
      // 캐시에서 데이터 조회
      const cachedDataStr = await AsyncStorage.getItem(storageKey);
      
      if (cachedDataStr) {
        const cachedItem: OfflineDataItem<T> = JSON.parse(cachedDataStr);
        const expirationTime = options?.expirationTime || this.getAdaptiveTTL(storageKey);
        const isExpired = Date.now() - cachedItem.timestamp > expirationTime;
        
        // 캐시가 유효하고 네트워크 연결이 없거나 fetchFn이 제공되지 않은 경우
        if (!isExpired || !this.isNetworkConnected || !fetchFn) {
          // 캐시 적중
          this.updateLRU(storageKey);
          this.cacheStats.hits++;
          this.updateHitRate();
          
          // LRU 정보 업데이트
          cachedItem.lastAccessed = Date.now();
          cachedItem.accessCount = (cachedItem.accessCount || 0) + 1;
          
          // 메모리 캐시에 추가/업데이트
          this.memoryCache.set(storageKey, cachedItem);
          
          // 디스크에 업데이트된 접근 정보 저장
          AsyncStorage.setItem(storageKey, JSON.stringify(cachedItem))
            .catch(err => console.error('캐시 접근 정보 업데이트 중 오류:', err));
          
          // 접근 패턴에 기반한 사전 로딩 (백그라운드에서 비동기적으로 실행)
          setTimeout(() => {
            this.preloadRelatedItems(storageKey).catch(err => 
              console.error('관련 항목 사전 로딩 오류:', err)
            );
          }, 0);
          
          // 접근 시간 기록
          this.recordAccessTime(startTime);
          
          return cachedItem.data;
        }
      }
      
      // 캐시 미스
      this.cacheStats.misses++;
      this.updateHitRate();
      
      // 네트워크 연결이 있고 fetchFn이 제공된 경우 데이터 가져오기
      if (this.isNetworkConnected && fetchFn) {
        try {
          const freshData = await NetworkErrorManager.withRetry(fetchFn);
          
          // 새 데이터 캐싱
          await this.cacheData(key, freshData, options);
          return freshData;
        } catch (error) {
          // 네트워크 오류 발생 시 캐시된 데이터 반환
          if (cachedDataStr) {
            const cachedItem: OfflineDataItem<T> = JSON.parse(cachedDataStr);
            return cachedItem.data;
          }
          throw error;
        }
      }
      
      // 캐시도 없고 네트워크도 없는 경우
      return null;
    } catch (error) {
      console.error(`데이터 조회 중 오류 (키: ${key}):`, error);
      throw error;
    }
  }

  /**
   * 캐시 히트율 업데이트
   */
  private updateHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    if (total > 0) {
      const hitRate = (this.cacheStats.hits / total) * 100;
      this.cacheStats.hitRate = `${hitRate.toFixed(2)}%`;
    } else {
      this.cacheStats.hitRate = '0.00%';
    }
  }

  /**
   * 오프라인 상태에서 작업을 큐에 추가
   */
  public async queueOperation<T>(
    key: string,
    data: T,
    syncFn: (data: T) => Promise<void>
  ): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key);
      const item: OfflineDataItem<T> = {
        data,
        timestamp: Date.now(),
        syncStatus: 'pending',
        id: key,
        lastAccessed: Date.now(),
        accessCount: 1
      };
      
      // 항목 크기 추정 및 검사
      const estimatedSize = this.estimateItemSize(item);
      if (estimatedSize > this.defaultCacheOptions.maxSize!) {
        console.warn(`오프라인 작업 항목 크기가 제한을 초과했습니다. 키: ${key}, 크기: ${estimatedSize}바이트`);
        throw new Error(`항목 크기 제한 초과: ${estimatedSize}바이트`);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(item));
      this.pendingSyncOperations.add(key);
      
      // LRU 캐시 업데이트 및 메모리 캐시에 추가
      this.updateLRU(storageKey);
      this.memoryCache.set(storageKey, item);
      
      // 캐시 통계 업데이트
      this.estimatedCacheSize += estimatedSize;
      this.cacheStats.totalItems++;
      
      // 네트워크 연결되어 있으면 즉시 동기화 시도
      if (this.isNetworkConnected) {
        this.syncItem(key, data, syncFn).catch(error => {
          console.error(`항목 동기화 중 오류 (키: ${key}):`, error);
        });
      }
    } catch (error) {
      console.error(`작업 큐 추가 중 오류 (키: ${key}):`, error);
      throw error;
    }
  }

  /**
   * 특정 항목 동기화
   */
  private async syncItem<T>(
    key: string,
    data: T,
    syncFn: (data: T) => Promise<void>
  ): Promise<boolean> {
    if (!this.isNetworkConnected) {
      return false;
    }
    
    const storageKey = this.getStorageKey(key);
    
    try {
      // 서버와 동기화
      await NetworkErrorManager.withRetry(() => syncFn(data));
      
      // 동기화 상태 업데이트
      const itemStr = await AsyncStorage.getItem(storageKey);
      if (itemStr) {
        const item: OfflineDataItem<T> = JSON.parse(itemStr);
        item.syncStatus = 'synced';
        item.lastAccessed = Date.now();
        await AsyncStorage.setItem(storageKey, JSON.stringify(item));
        
        // 메모리 캐시 업데이트
        this.memoryCache.set(storageKey, item);
      }
      
      this.pendingSyncOperations.delete(key);
      return true;
    } catch (error) {
      // 동기화 실패 상태 저장
      const itemStr = await AsyncStorage.getItem(storageKey);
      if (itemStr) {
        const item: OfflineDataItem<T> = JSON.parse(itemStr);
        item.syncStatus = 'failed';
        await AsyncStorage.setItem(storageKey, JSON.stringify(item));
        
        // 메모리 캐시 업데이트
        this.memoryCache.set(storageKey, item);
      }
      
      console.error(`항목 동기화 실패 (키: ${key}):`, error);
      return false;
    }
  }

  /**
   * 모든 보류 중인 작업 동기화
   */
  public async synchronize(options?: SyncOptions): Promise<boolean> {
    if (this.syncInProgress || !this.isNetworkConnected) {
      return false;
    }
    
    this.syncInProgress = true;
    const opts = { ...options };
    let success = true;
    
    try {
      // 동기화할 항목 수집
      const allPendingKeys: string[] = [];
      
      // 강제 전체 동기화 옵션이 활성화된 경우 모든 항목 검색
      if (opts.forceSyncAll) {
        const allKeys = await AsyncStorage.getAllKeys();
        const prefix = this.defaultCacheOptions.prefix || 'offline_data_';
        const offlineKeys = allKeys.filter(key => key.startsWith(prefix));
        
        for (const key of offlineKeys) {
          const itemStr = await AsyncStorage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            if (item.syncStatus === 'pending' || item.syncStatus === 'failed') {
              const rawKey = key.replace(prefix, '');
              allPendingKeys.push(rawKey);
            }
          }
        }
      } else {
        // 기존에 보류 중인 작업만 동기화
        allPendingKeys.push(...Array.from(this.pendingSyncOperations));
      }
      
      // 진행 상황 계산 준비
      const total = allPendingKeys.length;
      let current = 0;
      
      // 각 항목 동기화
      for (const key of allPendingKeys) {
        const storageKey = this.getStorageKey(key);
        const itemStr = await AsyncStorage.getItem(storageKey);
        
        if (itemStr) {
          const item = JSON.parse(itemStr);
          
          // syncFn은 원래 큐에 추가할 때 제공되어야 하지만, 여기서는 임시 처리
          // 실제 구현에서는 syncFn도 함께 저장하거나 맵핑 테이블을 사용해야 함
          const syncSuccess = await this.genericSyncItem(key, item.data);
          success = success && syncSuccess;
          
          // 진행 상황 보고
          current++;
          if (opts.onProgress) {
            opts.onProgress(current, total);
          }
        }
      }
      
      // 동기화 완료 후 캐시 최적화
      await this.optimizeCache();
      
      return success;
    } catch (error) {
      console.error('동기화 중 오류 발생:', error);
      return false;
    } finally {
      this.syncInProgress = false;
      
      // 캐시 통계 저장
      this.saveCacheStats();
    }
  }
  
  /**
   * 일반적인 항목 동기화 처리 (타입별 구현 필요)
   */
  private async genericSyncItem(key: string, data: any): Promise<boolean> {
    // 이 메서드는 실제 구현에서 타입별로 적절한 동기화 함수를 호출해야 함
    // 여기서는 예시로 빈 구현만 제공
    console.warn(`항목 ${key}에 대한 동기화 함수가 정의되지 않았습니다.`);
    return false;
  }

  /**
   * 캐시 항목 만료 여부 확인
   */
  public async isExpired(key: string, options?: CacheOptions): Promise<boolean> {
    const storageKey = this.getStorageKey(key, options);
    const expirationTime = options?.expirationTime || this.defaultCacheOptions.expirationTime;
    
    try {
      // 메모리 캐시 확인
      if (this.memoryCache.has(storageKey)) {
        const item = this.memoryCache.get(storageKey);
        return Date.now() - item.timestamp > expirationTime;
      }
      
      // 디스크 캐시 확인
      const itemStr = await AsyncStorage.getItem(storageKey);
      if (!itemStr) {
        return true;
      }
      
      const item = JSON.parse(itemStr);
      return Date.now() - item.timestamp > expirationTime;
    } catch (error) {
      console.error(`만료 확인 중 오류 (키: ${key}):`, error);
      return true;
    }
  }

  /**
   * 캐시 항목 삭제
   */
  public async removeItem(key: string, options?: CacheOptions): Promise<void> {
    const storageKey = this.getStorageKey(key, options);
    try {
      // 항목 크기 추정 (메모리에서 제거 전에)
      let estimatedSize = 0;
      if (this.memoryCache.has(storageKey)) {
        const item = this.memoryCache.get(storageKey);
        estimatedSize = this.estimateItemSize(item);
      }
      
      // 디스크에서 제거
      await AsyncStorage.removeItem(storageKey);
      
      // LRU 캐시 및 메모리 캐시에서 제거
      this.removeLRU(storageKey);
      this.memoryCache.delete(storageKey);
      
      // 보류 중인 작업에서 제거
      const rawKey = storageKey.replace(this.defaultCacheOptions.prefix || 'offline_data_', '');
      this.pendingSyncOperations.delete(rawKey);
      
      // 캐시 통계 업데이트
      this.estimatedCacheSize = Math.max(0, this.estimatedCacheSize - estimatedSize);
      this.cacheStats.totalItems = Math.max(0, this.cacheStats.totalItems - 1);
      this.cacheStats.estimatedSize = this.estimatedCacheSize;
    } catch (error) {
      console.error(`항목 삭제 중 오류 (키: ${key}):`, error);
      throw error;
    }
  }

  /**
   * 모든 캐시 지우기
   */
  public async clearCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = this.defaultCacheOptions.prefix || 'offline_data_';
      const keysToRemove = allKeys.filter(key => key.startsWith(prefix));
      
      // 메모리 캐시 및 LRU 큐 초기화
      this.memoryCache.clear();
      this.lruQueue = [];
      this.accessCountMap.clear();
      
      // 디스크에서 삭제
      await AsyncStorage.multiRemove(keysToRemove);
      
      // 보류 중인 작업 초기화
      this.pendingSyncOperations.clear();
      
      // 캐시 통계 초기화
      this.estimatedCacheSize = 0;
      this.cacheStats = {
        hits: 0,
        misses: 0,
        totalItems: 0,
        estimatedSize: 0,
        oldestItemAge: 0,
        hitRate: '0.00%',
        avgAccessTime: 0,
        cacheThroughput: 0,
        itemTypeDistribution: {},
        sizeByCategory: {},
        accessTimeHistory: [],
        dataSizeDistribution: { small: 0, medium: 0, large: 0 },
        timeToLiveDistribution: { short: 0, medium: 0, long: 0 },
        memoryUtilization: 0,
        storageTrend: []
      };
      
      // 캐시 통계 저장
      this.saveCacheStats();
    } catch (error) {
      console.error('캐시 지우기 중 오류:', error);
      throw error;
    }
  }

  /**
   * 캐시 최적화 수행
   */
  public async optimizeCache(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }
    
    try {
      // 제한을 초과하지 않으면 최적화 건너뛰기
      if (this.estimatedCacheSize <= this.MAX_CACHE_SIZE * 0.8 &&
          this.cacheStats.totalItems <= this.MAX_CACHE_ITEMS * 0.8) {
        return;
      }
      
      console.log('캐시 최적화 수행 중...');
      
      // 모든 캐시 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = this.defaultCacheOptions.prefix || 'offline_data_';
      const cacheKeys = allKeys.filter(key => key.startsWith(prefix));
      
      // 캐시 항목 수집 및 분석
      const itemInfos: { key: string; item: any; score: number; size: number }[] = [];
      
      for (const key of cacheKeys) {
        // 동기화가 필요한 항목은 건너뛰기
        const rawKey = key.replace(prefix, '');
        if (this.pendingSyncOperations.has(rawKey)) {
          continue;
        }
        
        const itemStr = await AsyncStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          const accessCount = item.accessCount || 0;
          const lastAccessed = item.lastAccessed || item.timestamp;
          const age = Date.now() - item.timestamp;
          
          // 항목 크기 추정
          const size = this.estimateItemSize(item);
          
          // 접근 빈도와 최근성에 기반한 점수 계산 (LRU + LFU 하이브리드)
          const recencyFactor = Math.max(0, 1 - (Date.now() - lastAccessed) / (7 * 24 * 60 * 60 * 1000)); // 1주일 기준
          const ageFactor = Math.max(0, 1 - age / (30 * 24 * 60 * 60 * 1000)); // 1달 기준
          const frequencyFactor = Math.min(1, accessCount / 20); // 최대 20회까지 고려
          
          // 항목 우선순위 고려
          const priorityFactor = item.priority === 'high' ? 1.5 : 
                               item.priority === 'low' ? 0.5 : 1.0;
          
          // 접근 빈도(40%), 최근성(40%), 나이(10%), 우선순위(10%) 고려
          const score = (frequencyFactor * 0.4 + recencyFactor * 0.4 + ageFactor * 0.1) * priorityFactor;
          
          itemInfos.push({ key, item, score, size });
        }
      }
      
      // 스코어 기준으로 정렬 (낮은 점수 = 제거 대상)
      itemInfos.sort((a, b) => a.score - b.score);
      
      // 캐시 크기를 목표치로 줄이기 위해 항목 제거
      let removedItems = 0;
      let removedSize = 0;
      const targetSize = this.MAX_CACHE_SIZE * 0.7; // 최대 크기의 70%로 감소
      const targetItems = this.MAX_CACHE_ITEMS * 0.7; // 최대 항목 수의 70%로 감소
      
      for (const { key, size } of itemInfos) {
        if (this.estimatedCacheSize - removedSize <= targetSize &&
            this.cacheStats.totalItems - removedItems <= targetItems) {
          break;
        }
        
        // 항목 제거
        await AsyncStorage.removeItem(key);
        this.memoryCache.delete(key);
        this.removeLRU(key);
        
        removedItems++;
        removedSize += size;
      }
      
      // 통계 업데이트
      this.estimatedCacheSize -= removedSize;
      this.cacheStats.totalItems -= removedItems;
      this.cacheStats.estimatedSize = this.estimatedCacheSize;
      this.updateHitRate();
      
      // 메모리 캐시 최적화
      this.optimizeMemoryCache();
      
      console.log(`캐시 최적화 완료: ${removedItems}개 항목 제거, ${removedSize} 바이트 회수됨`);
      
      // 캐시 통계 저장
      this.saveCacheStats();
    } catch (error) {
      console.error('캐시 최적화 중 오류:', error);
      throw error;
    }
  }
  
  /**
   * 메모리 캐시 최적화
   */
  private optimizeMemoryCache(): void {
    // 메모리 캐시가 너무 크면 줄이기
    if (this.memoryCache.size > this.MEMORY_CACHE_MAX_ITEMS) {
      // LRU 순서로 정렬된 키 사용
      const removeCount = this.memoryCache.size - this.MEMORY_CACHE_MAX_ITEMS;
      
      // LRU 큐의 맨 뒤에서부터 제거 (가장 오래 사용되지 않은 항목들)
      for (let i = 0; i < removeCount && this.lruQueue.length > 0; i++) {
        const key = this.lruQueue.pop(); // 가장 오래된 항목
        if (key) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  /**
   * 만료된 캐시 항목 정리
   */
  public async cleanExpiredCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = this.defaultCacheOptions.prefix || 'offline_data_';
      const cacheKeys = allKeys.filter(key => key.startsWith(prefix));
      
      const keysToRemove: string[] = [];
      let removedSize = 0;
      
      for (const key of cacheKeys) {
        const itemStr = await AsyncStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          const expirationTime = this.defaultCacheOptions.expirationTime;
          
          // 동기화된 항목만 만료 여부 확인
          if (item.syncStatus === 'synced' && Date.now() - item.timestamp > expirationTime) {
            keysToRemove.push(key);
            removedSize += this.estimateItemSize(item);
            
            // 메모리 캐시 및 LRU에서도 제거
            this.memoryCache.delete(key);
            this.removeLRU(key);
          }
        }
      }
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        
        // 캐시 통계 업데이트
        this.estimatedCacheSize = Math.max(0, this.estimatedCacheSize - removedSize);
        this.cacheStats.totalItems = Math.max(0, this.cacheStats.totalItems - keysToRemove.length);
        this.cacheStats.estimatedSize = this.estimatedCacheSize;
        
        // 캐시 통계 저장
        this.saveCacheStats();
      }
    } catch (error) {
      console.error('만료된 캐시 정리 중 오류:', error);
      throw error;
    }
  }

  /**
   * 캐시 통계 저장
   */
  private async saveCacheStats(): Promise<void> {
    try {
      // 현재 통계 저장
      await AsyncStorage.setItem('offline_data_cache_stats', JSON.stringify(this.cacheStats));
    } catch (error) {
      console.error('캐시 통계 저장 중 오류:', error);
    }
  }
  
  /**
   * 캐시 통계 로드
   */
  private async loadCacheStats(): Promise<void> {
    try {
      const statsStr = await AsyncStorage.getItem('offline_data_cache_stats');
      if (statsStr) {
        this.cacheStats = JSON.parse(statsStr);
      }
    } catch (error) {
      console.error('캐시 통계 로드 중 오류:', error);
    }
  }

  /**
   * 캐시 통계 가져오기
   */
  public getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * 보류 중인 작업 수 반환
   */
  public getPendingOperationsCount(): number {
    return this.pendingSyncOperations.size;
  }

  /**
   * 동기화 상태 확인
   */
  public isSynchronizing(): boolean {
    return this.syncInProgress;
  }

  /**
   * 리소스 정리
   */
  public dispose(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
      this.unsubscribeNetwork = null;
    }
    
    // 캐시 통계 저장
    this.saveCacheStats();
  }

  /**
   * 접근 시간 기록
   */
  private recordAccessTime(startTime: number): void {
    const accessTime = Date.now() - startTime;
    
    // 접근 시간 기록 추가 (최대 100개 유지)
    this.accessTimeRecords.push(accessTime);
    if (this.accessTimeRecords.length > 100) {
      this.accessTimeRecords.shift();
    }
    
    // 평균 접근 시간 계산
    if (this.accessTimeRecords.length > 0) {
      const sum = this.accessTimeRecords.reduce((a, b) => a + b, 0);
      this.cacheStats.avgAccessTime = sum / this.accessTimeRecords.length;
    }
    
    // 캐시 스루풋(처리량) 계산 (1분마다 업데이트)
    this.accessCountInLastMinute++;
    const now = Date.now();
    if (now - this.lastThroughputUpdate >= 60000) { // 1분
      this.cacheStats.cacheThroughput = this.accessCountInLastMinute / 60; // 초당 처리량
      this.accessCountInLastMinute = 0;
      this.lastThroughputUpdate = now;
    }
    
    // 접근 시간 기록
    if (this.cacheStats.accessTimeHistory) {
      this.cacheStats.accessTimeHistory.push(accessTime);
      if (this.cacheStats.accessTimeHistory.length > 100) {
        this.cacheStats.accessTimeHistory.shift();
      }
    }
  }

  /**
   * 항목 유형 업데이트
   */
  private updateItemTypeDistribution(key: string, size: number): void {
    // 키 패턴으로 항목 유형 추정
    const type = key.split('_')[0] || 'unknown';
    
    if (!this.cacheStats.itemTypeDistribution) {
      this.cacheStats.itemTypeDistribution = {};
    }
    
    // 항목 유형별 개수 업데이트
    this.cacheStats.itemTypeDistribution[type] = 
      (this.cacheStats.itemTypeDistribution[type] || 0) + 1;
    
    // 크기 분포 업데이트
    if (!this.cacheStats.dataSizeDistribution) {
      this.cacheStats.dataSizeDistribution = { small: 0, medium: 0, large: 0 };
    }
    
    if (size < 10 * 1024) { // 10KB 미만
      this.cacheStats.dataSizeDistribution.small++;
    } else if (size < 100 * 1024) { // 10KB-100KB
      this.cacheStats.dataSizeDistribution.medium++;
    } else { // 100KB 이상
      this.cacheStats.dataSizeDistribution.large++;
    }
    
    // 카테고리별 크기 업데이트
    if (!this.cacheStats.sizeByCategory) {
      this.cacheStats.sizeByCategory = {};
    }
    
    this.cacheStats.sizeByCategory[type] = 
      (this.cacheStats.sizeByCategory[type] || 0) + size;
  }

  /**
   * 메모리 사용률 업데이트
   */
  private updateMemoryUtilization(): void {
    const totalSize = this.MAX_CACHE_SIZE;
    const usedSize = this.estimatedCacheSize;
    
    this.cacheStats.memoryUtilization = (usedSize / totalSize) * 100;
    
    // 저장소 트렌드 업데이트 (1시간마다)
    const now = Date.now();
    const lastTrend = this.cacheStats.storageTrend?.slice(-1)[0];
    
    if (!this.cacheStats.storageTrend) {
      this.cacheStats.storageTrend = [];
    }
    
    if (!lastTrend || now - lastTrend.timestamp >= 3600000) { // 1시간
      this.cacheStats.storageTrend.push({ timestamp: now, size: usedSize });
      
      // 최대 72개 포인트 유지 (3일치)
      if (this.cacheStats.storageTrend.length > 72) {
        this.cacheStats.storageTrend.shift();
      }
    }
  }

  /**
   * TTL 분포 업데이트
   */
  private updateTTLDistribution(expirationTime: number): void {
    if (!this.cacheStats.timeToLiveDistribution) {
      this.cacheStats.timeToLiveDistribution = { short: 0, medium: 0, long: 0 };
    }
    
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (expirationTime < oneDay) { // 1일 미만
      this.cacheStats.timeToLiveDistribution.short++;
    } else if (expirationTime < 7 * oneDay) { // 1-7일
      this.cacheStats.timeToLiveDistribution.medium++;
    } else { // 7일 이상
      this.cacheStats.timeToLiveDistribution.long++;
    }
  }

  /**
   * 캐시 성능 분석 실행
   * 현재 캐시 상태에 대한 상세 분석 수행
   */
  public async analyzeCachePerformance(): Promise<{
    basicStats: CacheStats,
    detailedAnalysis: {
      accessTimePercentiles: { p50: number, p90: number, p99: number },
      topAccessedItems: Array<{ key: string, count: number }>,
      storageEfficiency: number,
      recommendations: string[]
    }
  }> {
    try {
      // 기본 통계 복제
      const basicStats = { ...this.cacheStats };
      
      // 접근 시간 백분위수 계산
      const sortedAccessTimes = [...this.accessTimeRecords].sort((a, b) => a - b);
      const p50 = sortedAccessTimes[Math.floor(sortedAccessTimes.length * 0.5)] || 0;
      const p90 = sortedAccessTimes[Math.floor(sortedAccessTimes.length * 0.9)] || 0;
      const p99 = sortedAccessTimes[Math.floor(sortedAccessTimes.length * 0.99)] || 0;
      
      // 접근 빈도순으로 정렬된 아이템 목록 (상위 10개)
      const sortedAccessItems = [...this.accessCountMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, count }));
      
      // 저장소 효율성 계산 (히트율과 접근 시간 고려)
      const hitRateValue = this.cacheStats.hits / 
        (this.cacheStats.hits + this.cacheStats.misses || 1);
      const normalizedAccessTime = Math.min(1, 50 / (this.cacheStats.avgAccessTime || 50));
      const memoryEfficiency = 1 - (this.estimatedCacheSize / this.MAX_CACHE_SIZE);
      const storageEfficiency = (hitRateValue * 0.5) + (normalizedAccessTime * 0.3) + (memoryEfficiency * 0.2);
      
      // 개선 권장사항 생성
      const recommendations: string[] = [];
      
      if (hitRateValue < 0.7) {
        recommendations.push('히트율이 낮습니다. 캐시 만료 시간 증가 또는 사전 로딩 전략 개선을 고려하세요.');
      }
      
      if (this.estimatedCacheSize > this.MAX_CACHE_SIZE * 0.9) {
        recommendations.push('캐시 사용량이 90%를 초과했습니다. 최적화 빈도를 높이거나 불필요한 항목을 제거하세요.');
      }
      
      if (p90 > 100) { // 90% 접근이 100ms 초과
        recommendations.push('접근 시간이 느립니다. 메모리 캐시 크기 증가를 고려하세요.');
      }
      
      if (this.cacheStats.oldestItemAge > 30 * 24 * 60 * 60 * 1000) { // 30일 초과
        recommendations.push('오래된 항목이 너무 많습니다. 만료 정책을 검토하세요.');
      }
      
      // 최종 분석 결과 반환
      return {
        basicStats,
        detailedAnalysis: {
          accessTimePercentiles: { p50, p90, p99 },
          topAccessedItems: sortedAccessItems,
          storageEfficiency,
          recommendations
        }
      };
    } catch (error) {
      console.error('캐시 성능 분석 중 오류:', error);
      throw error;
    }
  }
}

export default OfflineDataManager.getInstance(); 