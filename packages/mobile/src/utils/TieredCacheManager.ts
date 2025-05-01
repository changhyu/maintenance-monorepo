import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { deflate, inflate } from 'pako';
import { EnhancedCacheOptimizer, OptimizationStrategy, CacheItemPriority } from './EnhancedCacheOptimizer';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import LZString from 'lz-string';

// 캐시 계층 타입 정의
export enum CacheTier {
  MEMORY = 'memory',
  STORAGE = 'storage',
  REMOTE = 'remote'
}

// 캐시 아이템 인터페이스
export interface CacheItem {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  size: number;
  tier: CacheTier;
  metadata?: Record<string, any>;
  compressed: boolean;
}

// 캐시 옵션 인터페이스
export interface TieredCacheOptions {
  memoryLimit: number;
  storageLimit: number;
  defaultTTL: number;
  compressionThreshold: number;
  autoOptimizeInterval: number;
  prefetchThreshold: number;
  gitDataPriority: boolean;
}

/**
 * 계층화된 캐시 관리자
 * 
 * 3단계 계층 구조로 캐시를 관리합니다:
 * 1. 메모리 캐시: 가장 빠른 접근, 하지만 앱 재시작 시 초기화됨
 * 2. AsyncStorage: 중간 계층, 간단한 영구 저장
 * 3. 파일시스템: 대용량 데이터, 압축 지원
 */
export class TieredCacheManager {
  // 캐시 계층
  private memoryCache: Map<string, any> = new Map();
  private memoryCacheStats: Map<string, { size: number, accessCount: number, lastAccessed: number }> = new Map();
  
  // 캐시 설정
  private readonly MAX_MEMORY_CACHE_SIZE: number;
  private readonly MAX_ASYNC_STORAGE_SIZE: number;
  private readonly MAX_FILE_SYSTEM_SIZE: number;
  private readonly MAX_MEMORY_ITEMS: number;
  private readonly CACHE_DIR: string;
  private readonly PREFIX: string;
  
  // 캐시 최적화 엔진
  private optimizer: EnhancedCacheOptimizer;
  
  // 통계
  private hitCount: { memory: number, asyncStorage: number, fileSystem: number } = { memory: 0, asyncStorage: 0, fileSystem: 0 };
  private missCount: number = 0;
  
  private static instance: TieredCacheManager;
  private options: TieredCacheOptions;
  private storagePrefixKey: string = '@TieredCache:';
  private accessStats: Map<string, { count: number, lastAccess: number }> = new Map();
  private currentMemoryUsage: number = 0;
  private currentStorageUsage: number = 0;
  private optimizationTimer?: NodeJS.Timeout;
  private networkStatus: boolean = true;
  private appState: string = 'active';

  constructor(options: {
    maxMemoryCacheSize?: number;
    maxAsyncStorageSize?: number;
    maxFileSystemSize?: number;
    maxMemoryItems?: number;
    cacheDir?: string;
    prefix?: string;
    optimizationStrategy?: OptimizationStrategy;
  } = {}) {
    this.MAX_MEMORY_CACHE_SIZE = options.maxMemoryCacheSize || 10 * 1024 * 1024; // 10MB
    this.MAX_ASYNC_STORAGE_SIZE = options.maxAsyncStorageSize || 50 * 1024 * 1024; // 50MB
    this.MAX_FILE_SYSTEM_SIZE = options.maxFileSystemSize || 200 * 1024 * 1024; // 200MB
    this.MAX_MEMORY_ITEMS = options.maxMemoryItems || 100;
    this.CACHE_DIR = options.cacheDir || `${RNFS.DocumentDirectoryPath}/cache`;
    this.PREFIX = options.prefix || 'tiered_cache:';
    
    // 최적화 엔진 초기화
    this.optimizer = new EnhancedCacheOptimizer({
      strategy: options.optimizationStrategy || OptimizationStrategy.SLRU,
      maxSize: this.MAX_MEMORY_CACHE_SIZE + this.MAX_ASYNC_STORAGE_SIZE,
      maxCount: this.MAX_MEMORY_ITEMS * 10,
      slruProtectedRatio: 0.8
    });
    
    // 캐시 디렉토리 생성
    this.initializeFileSystem();
    
    // 메모리 캐시 모니터링 설정
    this.setupMemoryMonitoring();

    this.options = {
      memoryLimit: this.MAX_MEMORY_CACHE_SIZE,
      storageLimit: this.MAX_ASYNC_STORAGE_SIZE,
      defaultTTL: 24 * 60 * 60 * 1000, // 24시간
      compressionThreshold: 1024, // 1KB 이상은 압축
      autoOptimizeInterval: 30 * 60 * 1000, // 30분
      prefetchThreshold: 0.7, // 70% 이상 접근 빈도
      gitDataPriority: true // git 데이터 우선 처리
    };
    
    this.memoryCache = new Map<string, CacheItem>();
    this.accessStats = new Map();
    
    // 네트워크 상태 모니터링
    NetInfo.addEventListener(state => {
      this.networkStatus = state.isConnected ?? false;
      if (this.networkStatus) {
        this.syncFromRemoteIfNeeded();
      }
    });
    
    // 앱 상태 모니터링
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && this.appState !== 'active') {
        this.loadFromStorage();
      } else if (nextAppState !== 'active' && this.appState === 'active') {
        this.persistToStorage();
      }
      this.appState = nextAppState;
    });
    
    // 초기 로드 및 자동 최적화 타이머 설정
    this.loadFromStorage();
    this.startAutoOptimization();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(options?: Partial<TieredCacheOptions>): TieredCacheManager {
    if (!TieredCacheManager.instance) {
      TieredCacheManager.instance = new TieredCacheManager(options);
    }
    return TieredCacheManager.instance;
  }
  
  /**
   * 파일시스템 초기화
   */
  private async initializeFileSystem(): Promise<void> {
    try {
      const dirExists = await RNFS.exists(this.CACHE_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.CACHE_DIR);
      }
    } catch (error) {
      console.error(`[TieredCacheManager] 파일시스템 초기화 오류:`, error);
    }
  }
  
  /**
   * 데이터 저장
   */
  public async setItem<T>(key: string, data: T, options: {
    ttl?: number;
    priority?: string;
    compress?: boolean;
    forceStorage?: 'memory' | 'asyncStorage' | 'fileSystem';
  } = {}): Promise<boolean> {
    try {
      const fullKey = `${this.PREFIX}${key}`;
      const dataString = JSON.stringify(data);
      const size = dataString.length;
      const now = Date.now();
      const ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 기본 7일
      const priority = options.priority || CacheItemPriority.MEDIUM;
      
      // 압축 설정
      const shouldCompress = options.compress !== false && size > 1024; // 1KB 이상이면 압축
      
      // 저장 위치 결정
      const storageType = options.forceStorage || this.determineStorageType(size, priority);
      
      // 메타데이터
      const metadata = {
        key,
        size,
        timestamp: now,
        expires: now + ttl,
        compressed: shouldCompress,
        priority,
        storageType
      };
      
      // 최적화 엔진에 항목 기록
      this.optimizer.recordItemCreation(key, size, typeof data, priority);
      
      // 데이터 저장
      switch (storageType) {
        case 'memory':
          // 메모리에 저장
          this.memoryCache.set(key, data);
          this.memoryCacheStats.set(key, { size, accessCount: 1, lastAccessed: now });
          
          // 메모리 최적화 (필요 시)
          if (this.getMemoryCacheSize() > this.MAX_MEMORY_CACHE_SIZE || this.memoryCache.size > this.MAX_MEMORY_ITEMS) {
            await this.optimizeMemoryCache();
          }
          break;
          
        case 'asyncStorage':
          // AsyncStorage에 저장
          const valueToStore = shouldCompress 
            ? { data: Buffer.from(deflate(dataString)).toString('base64'), ...metadata }
            : { data: dataString, ...metadata };
          
          await AsyncStorage.setItem(fullKey, JSON.stringify(valueToStore));
          break;
          
        case 'fileSystem':
          // 파일시스템에 저장
          // 메타데이터 저장
          await AsyncStorage.setItem(
            `${fullKey}_meta`,
            JSON.stringify(metadata)
          );
          
          // 파일 저장
          const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
          const fileData = shouldCompress 
            ? Buffer.from(deflate(dataString))
            : Buffer.from(dataString);
          
          await RNFS.writeFile(filePath, fileData.toString('base64'), 'base64');
          break;
      }
      
      return true;
    } catch (error) {
      console.error(`[TieredCacheManager] 데이터 저장 오류: ${key}`, error);
      return false;
    }
  }
  
  /**
   * 데이터 가져오기
   */
  public async getItem<T>(key: string, options: {
    defaultValue?: T;
    updateAccess?: boolean;
    prefetch?: boolean;
  } = {}): Promise<T | undefined> {
    try {
      const fullKey = `${this.PREFIX}${key}`;
      const now = Date.now();
      const updateAccess = options.updateAccess !== false;
      
      // 1. 메모리 캐시 확인
      if (this.memoryCache.has(key)) {
        this.hitCount.memory++;
        
        // 접근 통계 업데이트
        if (updateAccess) {
          const stats = this.memoryCacheStats.get(key);
          if (stats) {
            stats.accessCount++;
            stats.lastAccessed = now;
            this.memoryCacheStats.set(key, stats);
            
            // 최적화 엔진에 접근 기록
            this.optimizer.recordItemAccess(key);
          }
        }
        
        return this.memoryCache.get(key) as T;
      }
      
      // 2. AsyncStorage 확인
      const asyncItem = await AsyncStorage.getItem(fullKey);
      if (asyncItem) {
        const parsedItem = JSON.parse(asyncItem);
        
        // 만료 확인
        if (parsedItem.expires && parsedItem.expires < now) {
          // 만료된 항목 제거
          await AsyncStorage.removeItem(fullKey);
          this.missCount++;
          return options.defaultValue;
        }
        
        // 데이터 복원
        let resultData: T;
        
        if (parsedItem.compressed) {
          // 압축된 데이터 복원
          const decompressedData = inflate(Buffer.from(parsedItem.data, 'base64'));
          resultData = JSON.parse(Buffer.from(decompressedData).toString('utf-8')) as T;
        } else {
          resultData = JSON.parse(parsedItem.data) as T;
        }
        
        this.hitCount.asyncStorage++;
        
        // 자주 접근하는 항목을 메모리로 승격
        if (updateAccess) {
          this.optimizer.recordItemAccess(key);
          
          // 접근 빈도가 높으면 메모리로 승격
          if (this.shouldPromoteToMemory(key)) {
            this.memoryCache.set(key, resultData);
            this.memoryCacheStats.set(key, {
              size: parsedItem.size || JSON.stringify(resultData).length,
              accessCount: 1,
              lastAccessed: now
            });
            
            // 메모리 최적화 (필요 시)
            if (this.getMemoryCacheSize() > this.MAX_MEMORY_CACHE_SIZE) {
              await this.optimizeMemoryCache();
            }
          }
        }
        
        return resultData;
      }
      
      // 3. 파일시스템 확인
      const metaKey = `${fullKey}_meta`;
      const metaItem = await AsyncStorage.getItem(metaKey);
      
      if (metaItem) {
        const metadata = JSON.parse(metaItem);
        const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
        
        // 만료 확인
        if (metadata.expires && metadata.expires < now) {
          // 만료된 항목 제거
          await AsyncStorage.removeItem(metaKey);
          await RNFS.unlink(filePath).catch(() => { /* 파일이 없어도 무시 */ });
          this.missCount++;
          return options.defaultValue;
        }
        
        // 파일 존재 확인
        const fileExists = await RNFS.exists(filePath);
        if (fileExists) {
          // 파일 데이터 읽기
          const fileData = await RNFS.readFile(filePath, 'base64');
          const buffer = Buffer.from(fileData, 'base64');
          
          // 데이터 복원
          let resultData: T;
          
          if (metadata.compressed) {
            // 압축된 데이터 복원
            const decompressedData = inflate(buffer);
            resultData = JSON.parse(Buffer.from(decompressedData).toString('utf-8')) as T;
          } else {
            resultData = JSON.parse(buffer.toString('utf-8')) as T;
          }
          
          this.hitCount.fileSystem++;
          
          // 접근 기록
          if (updateAccess) {
            this.optimizer.recordItemAccess(key);
            
            // 작은 파일이고 자주 접근하면 메모리나 AsyncStorage로 승격
            if (metadata.size < 1024 * 100) { // 100KB 이하
              // 메모리로 승격
              this.memoryCache.set(key, resultData);
              this.memoryCacheStats.set(key, {
                size: metadata.size,
                accessCount: 1,
                lastAccessed: now
              });
              
              // 메모리 최적화 (필요 시)
              if (this.getMemoryCacheSize() > this.MAX_MEMORY_CACHE_SIZE) {
                await this.optimizeMemoryCache();
              }
            }
          }
          
          return resultData;
        }
      }
      
      // 캐시 미스
      this.missCount++;
      return options.defaultValue;
    } catch (error) {
      console.error(`[TieredCacheManager] 데이터 가져오기 오류: ${key}`, error);
      return options.defaultValue;
    }
  }
  
  /**
   * 캐시 항목 제거
   */
  public async removeItem(key: string): Promise<boolean> {
    try {
      const fullKey = `${this.PREFIX}${key}`;
      
      // 메모리 캐시에서 제거
      this.memoryCache.delete(key);
      this.memoryCacheStats.delete(key);
      
      // AsyncStorage에서 제거
      await AsyncStorage.removeItem(fullKey);
      
      // 파일시스템에서 제거
      const metaKey = `${fullKey}_meta`;
      await AsyncStorage.removeItem(metaKey);
      
      const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
      await RNFS.unlink(filePath).catch(() => { /* 파일이 없어도 무시 */ });
      
      return true;
    } catch (error) {
      console.error(`[TieredCacheManager] 항목 제거 오류: ${key}`, error);
      return false;
    }
  }
  
  /**
   * 캐시 최적화
   */
  public async optimizeCache(): Promise<{
    memoryItems: number;
    asyncStorageItems: number;
    fileSystemItems: number;
    freedSpace: number;
  }> {
    try {
      // 1. 메모리 캐시 최적화
      const memoryResult = await this.optimizeMemoryCache();
      
      // 2. AsyncStorage 최적화
      const asyncResult = await this.optimizeAsyncStorage();
      
      // 3. 파일시스템 최적화
      const fileResult = await this.optimizeFileSystem();
      
      return {
        memoryItems: memoryResult.removedItems,
        asyncStorageItems: asyncResult.removedItems,
        fileSystemItems: fileResult.removedItems,
        freedSpace: memoryResult.freedSpace + asyncResult.freedSpace + fileResult.freedSpace
      };
    } catch (error) {
      console.error(`[TieredCacheManager] 캐시 최적화 오류:`, error);
      return { memoryItems: 0, asyncStorageItems: 0, fileSystemItems: 0, freedSpace: 0 };
    }
  }
  
  /**
   * 메모리 캐시 최적화
   */
  private async optimizeMemoryCache(): Promise<{ removedItems: number, freedSpace: number }> {
    if (this.memoryCache.size <= 0) {
      return { removedItems: 0, freedSpace: 0 };
    }
    
    // 메모리 사용량 확인
    const currentSize = this.getMemoryCacheSize();
    const itemCount = this.memoryCache.size;
    
    // 최적화 필요 여부 확인
    if (currentSize <= this.MAX_MEMORY_CACHE_SIZE && itemCount <= this.MAX_MEMORY_ITEMS) {
      return { removedItems: 0, freedSpace: 0 };
    }
    
    // 최적화를 위한 메타데이터 수집
    const itemsMetadata = Array.from(this.memoryCacheStats.entries()).map(([key, stats]) => ({
      key,
      size: stats.size,
      accessCount: stats.accessCount,
      lastAccessed: stats.lastAccessed,
      created: stats.lastAccessed, // 정확한 생성 시간 없음
      ttl: 86400000, // 1일 (메모리 캐시이므로 짧게 설정)
      dataType: 'memory',
      priority: CacheItemPriority.MEDIUM
    }));
    
    // 최적화 실행
    const result = this.optimizer.optimize(itemsMetadata);
    
    // 제거할 항목 처리
    let freedSpace = 0;
    
    for (const item of result.removedItems) {
      const key = item.key;
      const stats = this.memoryCacheStats.get(key);
      
      if (stats) {
        freedSpace += stats.size;
        this.memoryCache.delete(key);
        this.memoryCacheStats.delete(key);
      }
    }
    
    return {
      removedItems: result.removedItems.length,
      freedSpace
    };
  }
  
  /**
   * AsyncStorage 최적화
   */
  private async optimizeAsyncStorage(): Promise<{ removedItems: number, freedSpace: number }> {
    try {
      // 모든 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(this.PREFIX) && !key.endsWith('_meta')
      );
      
      if (cacheKeys.length === 0) {
        return { removedItems: 0, freedSpace: 0 };
      }
      
      // 메타데이터 수집
      const itemsData = await AsyncStorage.multiGet(cacheKeys);
      const itemsMetadata = [];
      
      for (const [fullKey, value] of itemsData) {
        if (!value) continue;
        
        try {
          const item = JSON.parse(value);
          const key = fullKey.replace(this.PREFIX, '');
          
          itemsMetadata.push({
            key,
            size: item.size || 0,
            accessCount: item.accessCount || 1,
            lastAccessed: item.lastAccessed || item.timestamp || Date.now(),
            created: item.timestamp || Date.now(),
            ttl: (item.expires ? item.expires - item.timestamp : 7 * 24 * 60 * 60 * 1000),
            dataType: item.dataType || 'unknown',
            priority: item.priority || CacheItemPriority.MEDIUM
          });
        } catch (error) {
          console.warn(`[TieredCacheManager] 캐시 항목 파싱 오류: ${fullKey}`);
        }
      }
      
      // 최적화 실행
      const result = this.optimizer.optimize(itemsMetadata);
      
      // 제거할 항목 처리
      if (result.removedItems.length > 0) {
        const keysToRemove = result.removedItems.map(item => `${this.PREFIX}${item.key}`);
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      return {
        removedItems: result.removedItems.length,
        freedSpace: result.freedSpace
      };
    } catch (error) {
      console.error(`[TieredCacheManager] AsyncStorage 최적화 오류:`, error);
      return { removedItems: 0, freedSpace: 0 };
    }
  }
  
  /**
   * 파일시스템 최적화
   */
  private async optimizeFileSystem(): Promise<{ removedItems: number, freedSpace: number }> {
    try {
      // 모든 메타데이터 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const metaKeys = allKeys.filter(key => 
        key.startsWith(this.PREFIX) && key.endsWith('_meta')
      );
      
      if (metaKeys.length === 0) {
        return { removedItems: 0, freedSpace: 0 };
      }
      
      // 메타데이터 수집
      const metaData = await AsyncStorage.multiGet(metaKeys);
      const itemsMetadata = [];
      const now = Date.now();
      
      for (const [fullKey, value] of metaData) {
        if (!value) continue;
        
        try {
          const metadata = JSON.parse(value);
          const key = fullKey.replace(`${this.PREFIX}`, '').replace('_meta', '');
          
          // 만료 확인
          if (metadata.expires && metadata.expires < now) {
            // 만료된 항목 제거
            await AsyncStorage.removeItem(fullKey);
            const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
            await RNFS.unlink(filePath).catch(() => { /* 파일이 없어도 무시 */ });
            continue;
          }
          
          itemsMetadata.push({
            key,
            size: metadata.size || 0,
            accessCount: metadata.accessCount || 1,
            lastAccessed: metadata.lastAccessed || metadata.timestamp || now,
            created: metadata.timestamp || now,
            ttl: (metadata.expires ? metadata.expires - metadata.timestamp : 7 * 24 * 60 * 60 * 1000),
            dataType: metadata.dataType || 'file',
            priority: metadata.priority || CacheItemPriority.MEDIUM
          });
        } catch (error) {
          console.warn(`[TieredCacheManager] 메타데이터 파싱 오류: ${fullKey}`);
        }
      }
      
      // 최적화 실행
      const result = this.optimizer.optimize(itemsMetadata);
      
      // 제거할 항목 처리
      let freedSpace = 0;
      
      for (const item of result.removedItems) {
        const key = item.key;
        const metaKey = `${this.PREFIX}${key}_meta`;
        freedSpace += item.size;
        
        // 메타데이터 제거
        await AsyncStorage.removeItem(metaKey);
        
        // 파일 제거
        const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
        await RNFS.unlink(filePath).catch(() => { /* 파일이 없어도 무시 */ });
      }
      
      return {
        removedItems: result.removedItems.length,
        freedSpace
      };
    } catch (error) {
      console.error(`[TieredCacheManager] 파일시스템 최적화 오류:`, error);
      return { removedItems: 0, freedSpace: 0 };
    }
  }
  
  /**
   * 메모리 캐시 크기 계산
   */
  private getMemoryCacheSize(): number {
    let totalSize = 0;
    
    for (const [_, stats] of this.memoryCacheStats) {
      totalSize += stats.size;
    }
    
    return totalSize;
  }
  
  /**
   * 아이템을 메모리로 승격할지 결정
   */
  private shouldPromoteToMemory(key: string): boolean {
    // 최적화 엔진의 추천을 통해 결정
    // isItemProtected 메서드가 있으면 사용
    if (typeof this.optimizer.isItemProtected === 'function') {
      return this.optimizer.isItemProtected(key);
    }
    
    // 아니면 기본값으로 메모리 여유 공간이 있는 경우만 승격
    return this.getMemoryCacheSize() < this.MAX_MEMORY_CACHE_SIZE * 0.9;
  }
  
  /**
   * 저장 유형 결정
   */
  private determineStorageType(
    size: number,
    priority: string
  ): 'memory' | 'asyncStorage' | 'fileSystem' {
    // 우선순위가 높은 작은 아이템은 메모리에 저장
    if (
      (priority === CacheItemPriority.HIGH || priority === CacheItemPriority.CRITICAL) &&
      size < 50 * 1024 && // 50KB 이하
      this.getMemoryCacheSize() < this.MAX_MEMORY_CACHE_SIZE * 0.9
    ) {
      return 'memory';
    }
    
    // 큰 아이템은 파일시스템에 저장
    if (size > 100 * 1024) { // 100KB 초과
      return 'fileSystem';
    }
    
    // 중간 크기 아이템은 AsyncStorage에 저장
    return 'asyncStorage';
  }
  
  /**
   * 메모리 모니터링 설정
   */
  private setupMemoryMonitoring(): void {
    // 1분마다 메모리 사용량 체크 및 필요시 최적화
    setInterval(async () => {
      const memorySize = this.getMemoryCacheSize();
      
      if (memorySize > this.MAX_MEMORY_CACHE_SIZE * 0.9 || 
          this.memoryCache.size > this.MAX_MEMORY_ITEMS * 0.9) {
        await this.optimizeMemoryCache();
      }
    }, 60000);
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  public async cleanExpiredCache(): Promise<number> {
    try {
      const now = Date.now();
      let removedCount = 0;
      
      // 1. 메모리 캐시 정리
      for (const [key, value] of this.memoryCacheStats.entries()) {
        // 1시간 이상 접근하지 않은 항목 제거 (메모리 캐시는 TTL이 짧음)
        if (now - value.lastAccessed > 3600000) {
          this.memoryCache.delete(key);
          this.memoryCacheStats.delete(key);
          removedCount++;
        }
      }
      
      // 2. AsyncStorage 정리
      const asyncKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = asyncKeys.filter(key => 
        key.startsWith(this.PREFIX) && !key.endsWith('_meta')
      );
      
      for (const fullKey of cacheKeys) {
        const rawItem = await AsyncStorage.getItem(fullKey);
        
        if (rawItem) {
          try {
            const item = JSON.parse(rawItem);
            
            if (item.expires && item.expires < now) {
              await AsyncStorage.removeItem(fullKey);
              removedCount++;
            }
          } catch (error) {
            // 손상된 항목 제거
            await AsyncStorage.removeItem(fullKey);
            removedCount++;
          }
        }
      }
      
      // 3. 파일시스템 정리
      const metaKeys = asyncKeys.filter(key => 
        key.startsWith(this.PREFIX) && key.endsWith('_meta')
      );
      
      for (const metaKey of metaKeys) {
        const rawMeta = await AsyncStorage.getItem(metaKey);
        
        if (rawMeta) {
          try {
            const metadata = JSON.parse(rawMeta);
            const key = metaKey.replace(`${this.PREFIX}`, '').replace('_meta', '');
            
            if (metadata.expires && metadata.expires < now) {
              // 만료된 항목 제거
              await AsyncStorage.removeItem(metaKey);
              
              // 파일 제거
              const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
              await RNFS.unlink(filePath).catch(() => { /* 파일이 없어도 무시 */ });
              
              removedCount++;
            }
          } catch (error) {
            // 손상된 메타데이터 제거
            await AsyncStorage.removeItem(metaKey);
            removedCount++;
          }
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error(`[TieredCacheManager] 만료된 캐시 정리 오류:`, error);
      return 0;
    }
  }
  
  /**
   * 캐시 통계 얻기
   */
  public async getCacheStats(): Promise<{
    memoryCacheSize: number;
    memoryCacheItems: number;
    asyncStorageSize: number;
    asyncStorageItems: number;
    fileSystemSize: number;
    fileSystemItems: number;
    hitRate: {
      memory: number;
      asyncStorage: number;
      fileSystem: number;
      overall: number;
    };
  }> {
    try {
      // 메모리 캐시 통계
      const memoryCacheSize = this.getMemoryCacheSize();
      const memoryCacheItems = this.memoryCache.size;
      
      // AsyncStorage 통계
      const asyncKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = asyncKeys.filter(key => 
        key.startsWith(this.PREFIX) && !key.endsWith('_meta')
      );
      
      let asyncStorageSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          asyncStorageSize += value.length;
        }
      }
      
      // 파일시스템 통계
      const metaKeys = asyncKeys.filter(key => 
        key.startsWith(this.PREFIX) && key.endsWith('_meta')
      );
      
      let fileSystemSize = 0;
      let fileSystemItems = 0;
      
      for (const metaKey of metaKeys) {
        const rawMeta = await AsyncStorage.getItem(metaKey);
        
        if (rawMeta) {
          try {
            const metadata = JSON.parse(rawMeta);
            const key = metaKey.replace(`${this.PREFIX}`, '').replace('_meta', '');
            const filePath = `${this.CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, '_')}`;
            
            // 파일 크기 확인
            const fileExists = await RNFS.exists(filePath);
            if (fileExists) {
              const fileStats = await RNFS.stat(filePath);
              fileSystemSize += fileStats.size || 0;
              fileSystemItems++;
            }
          } catch (error) {
            console.warn(`[TieredCacheManager] 메타데이터 파싱 오류: ${metaKey}`);
          }
        }
      }
      
      // 히트율 계산
      const totalHits = this.hitCount.memory + this.hitCount.asyncStorage + this.hitCount.fileSystem;
      const totalAccesses = totalHits + this.missCount;
      
      return {
        memoryCacheSize,
        memoryCacheItems,
        asyncStorageSize,
        asyncStorageItems: cacheKeys.length,
        fileSystemSize,
        fileSystemItems,
        hitRate: {
          memory: totalAccesses > 0 ? this.hitCount.memory / totalAccesses : 0,
          asyncStorage: totalAccesses > 0 ? this.hitCount.asyncStorage / totalAccesses : 0,
          fileSystem: totalAccesses > 0 ? this.hitCount.fileSystem / totalAccesses : 0,
          overall: totalAccesses > 0 ? totalHits / totalAccesses : 0
        }
      };
    } catch (error) {
      console.error(`[TieredCacheManager] 캐시 통계 얻기 오류:`, error);
      return {
        memoryCacheSize: 0,
        memoryCacheItems: 0,
        asyncStorageSize: 0,
        asyncStorageItems: 0,
        fileSystemSize: 0,
        fileSystemItems: 0,
        hitRate: {
          memory: 0,
          asyncStorage: 0,
          fileSystem: 0,
          overall: 0
        }
      };
    }
  }

  // 메모리 캐시에 항목 설정
  public async set(
    key: string, 
    value: any, 
    options?: { 
      ttl?: number, 
      tier?: CacheTier,
      metadata?: Record<string, any>,
      priority?: number
    }
  ): Promise<void> {
    const actualKey = this.getActualKey(key, options?.metadata);
    
    // 현재 캐시에서 항목 제거 (있는 경우)
    await this.remove(actualKey);
    
    // 데이터 크기 계산
    const serializedValue = JSON.stringify(value);
    const size = new Blob([serializedValue]).size;
    
    // 항목 생성
    const item: CacheItem = {
      key: actualKey,
      value: value,
      timestamp: Date.now(),
      ttl: options?.ttl || this.options.defaultTTL,
      size: size,
      tier: options?.tier || CacheTier.MEMORY,
      metadata: options?.metadata || {},
      compressed: false
    };
    
    // git 데이터 우선순위 설정
    if (this.options.gitDataPriority && actualKey.includes('git')) {
      item.metadata = { ...item.metadata, priority: (options?.priority || 0) + 10 };
    }
    
    // 압축 적용 (임계값 이상이고 메모리 계층이 아닌 경우)
    if (size > this.options.compressionThreshold && item.tier !== CacheTier.MEMORY) {
      item.value = LZString.compressToUTF16(serializedValue);
      item.compressed = true;
    }
    
    // 계층에 따라 저장
    if (item.tier === CacheTier.MEMORY) {
      this.memoryCache.set(actualKey, item);
      this.currentMemoryUsage += size;
    } else if (item.tier === CacheTier.STORAGE) {
      await this.setToStorage(actualKey, item);
      this.currentStorageUsage += size;
    } else {
      // 원격 저장의 경우 별도 로직 필요 (구현 필요)
    }
    
    // 최적화 검사
    this.checkAndOptimizeIfNeeded();
  }
  
  // 캐시에서 항목 조회
  public async get<T>(key: string, options?: { 
    fetchIfMissing?: boolean, 
    fetchFn?: () => Promise<T>,
    metadata?: Record<string, any>
  }): Promise<T | null> {
    const actualKey = this.getActualKey(key, options?.metadata);
    
    // 접근 통계 기록
    this.recordAccess(actualKey);
    
    // 메모리 캐시 확인
    if (this.memoryCache.has(actualKey)) {
      const item = this.memoryCache.get(actualKey)!;
      
      // TTL 확인
      if (this.isExpired(item)) {
        await this.remove(actualKey);
        return this.handleCacheMiss(actualKey, options);
      }
      
      return item.value;
    }
    
    // 스토리지 캐시 확인
    try {
      const storageItem = await this.getFromStorage(actualKey);
      if (storageItem) {
        // TTL 확인
        if (this.isExpired(storageItem)) {
          await this.remove(actualKey);
          return this.handleCacheMiss(actualKey, options);
        }
        
        // 압축 해제 (필요한 경우)
        let value = storageItem.value;
        if (storageItem.compressed) {
          value = JSON.parse(LZString.decompressFromUTF16(value));
        }
        
        // 접근 빈도가 높은 항목은 메모리로 승격
        if (this.shouldPromoteToMemory(actualKey)) {
          this.memoryCache.set(actualKey, {
            ...storageItem,
            value,
            compressed: false
          });
          this.currentMemoryUsage += storageItem.size;
        }
        
        return value;
      }
    } catch (err) {
      console.error('Storage cache access error:', err);
    }
    
    // 캐시 미스 처리
    return this.handleCacheMiss(actualKey, options);
  }
  
  // 캐시에서 항목 제거
  public async remove(key: string): Promise<void> {
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key)!;
      this.currentMemoryUsage -= item.size;
      this.memoryCache.delete(key);
    }
    
    try {
      await AsyncStorage.removeItem(`${this.storagePrefixKey}${key}`);
    } catch (err) {
      console.error('Error removing from storage:', err);
    }
    
    this.accessStats.delete(key);
  }
  
  // 캐시 비우기
  public async clear(): Promise<void> {
    this.memoryCache.clear();
    this.currentMemoryUsage = 0;
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.storagePrefixKey));
      await AsyncStorage.multiRemove(cacheKeys);
      this.currentStorageUsage = 0;
    } catch (err) {
      console.error('Error clearing storage cache:', err);
    }
    
    this.accessStats.clear();
  }
  
  // 캐시 최적화 실행
  public async optimize(): Promise<{
    memoryItemsRemoved: number,
    storageItemsRemoved: number,
    memorySizeFreed: number,
    storageSizeFreed: number
  }> {
    let result = {
      memoryItemsRemoved: 0,
      storageItemsRemoved: 0,
      memorySizeFreed: 0,
      storageSizeFreed: 0
    };
    
    // 메모리 캐시 최적화
    if (this.currentMemoryUsage > this.options.memoryLimit * 0.9) {
      const memoryResult = await this.optimizeMemoryCache();
      result.memoryItemsRemoved = memoryResult.itemsRemoved;
      result.memorySizeFreed = memoryResult.sizeFreed;
    }
    
    // 스토리지 캐시 최적화
    if (this.currentStorageUsage > this.options.storageLimit * 0.9) {
      const storageResult = await this.optimizeStorageCache();
      result.storageItemsRemoved = storageResult.itemsRemoved;
      result.storageSizeFreed = storageResult.sizeFreed;
    }
    
    return result;
  }
  
  // 메모리 캐시 최적화
  private async optimizeMemoryCache(): Promise<{ itemsRemoved: number, sizeFreed: number }> {
    const targetSize = this.options.memoryLimit * 0.7; // 목표 크기: 70%
    let currentSize = this.currentMemoryUsage;
    let itemsRemoved = 0;
    let sizeFreed = 0;
    
    // 항목 우선순위 계산
    const items = Array.from(this.memoryCache.entries())
      .map(([key, item]) => {
        const access = this.accessStats.get(key) || { count: 0, lastAccess: 0 };
        const timeFactor = Math.max(0, 1 - (Date.now() - access.lastAccess) / this.options.defaultTTL);
        const accessFactor = Math.log1p(access.count) / 10;
        const priority = item.metadata?.priority || 0;
        const score = timeFactor * 0.4 + accessFactor * 0.4 + (priority / 10) * 0.2;
        
        return {
          key,
          item,
          score
        };
      })
      .sort((a, b) => a.score - b.score); // 낮은 점수부터 제거
    
    // 목표 크기에 도달할 때까지 항목 제거
    for (const { key, item } of items) {
      if (currentSize <= targetSize) break;
      
      // git 데이터 보호 (제거하지 않음)
      if (this.options.gitDataPriority && key.includes('git')) {
        continue;
      }
      
      // 스토리지로 강등할지 결정
      if (this.shouldDemoteToStorage(key, item)) {
        await this.demoteToStorage(key, item);
      } else {
        // 그냥 제거
        this.memoryCache.delete(key);
      }
      
      currentSize -= item.size;
      sizeFreed += item.size;
      itemsRemoved++;
    }
    
    this.currentMemoryUsage = currentSize;
    return { itemsRemoved, sizeFreed };
  }
  
  // 스토리지 캐시 최적화
  private async optimizeStorageCache(): Promise<{ itemsRemoved: number, sizeFreed: number }> {
    const targetSize = this.options.storageLimit * 0.7; // 목표 크기: 70%
    let currentSize = this.currentStorageUsage;
    let itemsRemoved = 0;
    let sizeFreed = 0;
    
    try {
      // 스토리지 키 가져오기
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.storagePrefixKey));
      
      // 캐시 항목 로드
      const items: Array<{ key: string, item: CacheItem, score: number }> = [];
      for (const fullKey of cacheKeys) {
        const key = fullKey.slice(this.storagePrefixKey.length);
        try {
          const jsonValue = await AsyncStorage.getItem(fullKey);
          if (jsonValue) {
            const item: CacheItem = JSON.parse(jsonValue);
            const access = this.accessStats.get(key) || { count: 0, lastAccess: 0 };
            const timeFactor = Math.max(0, 1 - (Date.now() - access.lastAccess) / this.options.defaultTTL);
            const accessFactor = Math.log1p(access.count) / 10;
            const priority = item.metadata?.priority || 0;
            const score = timeFactor * 0.3 + accessFactor * 0.5 + (priority / 10) * 0.2;
            
            items.push({ key, item, score });
          }
        } catch (err) {
          console.error(`Error loading item ${key}:`, err);
        }
      }
      
      // 점수 기준 정렬
      items.sort((a, b) => a.score - b.score);
      
      // 목표 크기에 도달할 때까지 항목 제거
      for (const { key, item } of items) {
        if (currentSize <= targetSize) break;
        
        // git 데이터 보호 (제거하지 않음)
        if (this.options.gitDataPriority && key.includes('git')) {
          continue;
        }
        
        try {
          await AsyncStorage.removeItem(`${this.storagePrefixKey}${key}`);
          currentSize -= item.size;
          sizeFreed += item.size;
          itemsRemoved++;
        } catch (err) {
          console.error(`Error removing item ${key}:`, err);
        }
      }
      
      this.currentStorageUsage = currentSize;
      return { itemsRemoved, sizeFreed };
    } catch (err) {
      console.error('Error optimizing storage cache:', err);
      return { itemsRemoved: 0, sizeFreed: 0 };
    }
  }
  
  // 항목 메모리에서 스토리지로 강등
  private async demoteToStorage(key: string, item: CacheItem): Promise<void> {
    // 항목을 스토리지에 저장
    const itemForStorage = { ...item, tier: CacheTier.STORAGE };
    
    // 압축이 필요한 경우
    if (!item.compressed && item.size > this.options.compressionThreshold) {
      const serializedValue = JSON.stringify(item.value);
      itemForStorage.value = LZString.compressToUTF16(serializedValue);
      itemForStorage.compressed = true;
    }
    
    await this.setToStorage(key, itemForStorage);
    
    // 메모리에서 제거
    this.memoryCache.delete(key);
  }
  
  // 스토리지에 항목 저장
  private async setToStorage(key: string, item: CacheItem): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.storagePrefixKey}${key}`,
        JSON.stringify(item)
      );
    } catch (err) {
      console.error('Error setting to storage:', err);
      throw err;
    }
  }
  
  // 스토리지에서 항목 조회
  private async getFromStorage(key: string): Promise<CacheItem | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(`${this.storagePrefixKey}${key}`);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (err) {
      console.error('Error getting from storage:', err);
      return null;
    }
  }
  
  // 스토리지에서 초기 로드
  private async loadFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.storagePrefixKey));
      
      let totalSize = 0;
      let highPriorityItems: { key: string, item: CacheItem }[] = [];
      
      for (const fullKey of cacheKeys) {
        const key = fullKey.slice(this.storagePrefixKey.length);
        try {
          const jsonValue = await AsyncStorage.getItem(fullKey);
          if (jsonValue) {
            const item: CacheItem = JSON.parse(jsonValue);
            totalSize += item.size;
            
            // git 데이터나 우선순위가 높은 항목은 메모리로 승격
            if ((this.options.gitDataPriority && key.includes('git')) ||
                (item.metadata?.priority && item.metadata.priority > 5)) {
              highPriorityItems.push({ key, item });
            }
          }
        } catch (err) {
          console.error(`Error loading item ${key}:`, err);
        }
      }
      
      this.currentStorageUsage = totalSize;
      
      // 우선순위 높은 항목은 메모리에 로드
      for (const { key, item } of highPriorityItems) {
        if (this.currentMemoryUsage + item.size <= this.options.memoryLimit) {
          let value = item.value;
          if (item.compressed) {
            value = JSON.parse(LZString.decompressFromUTF16(value));
          }
          
          this.memoryCache.set(key, {
            ...item,
            value,
            compressed: false,
            tier: CacheTier.MEMORY
          });
          this.currentMemoryUsage += item.size;
        }
      }
    } catch (err) {
      console.error('Error loading from storage:', err);
    }
  }
  
  // 스토리지에 영구 저장
  private async persistToStorage(): Promise<void> {
    // 메모리 캐시의 변경사항을 스토리지에 저장
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.tier === CacheTier.MEMORY) {
        const itemForStorage = { ...item, tier: CacheTier.STORAGE };
        
        // 압축이 필요한 경우
        if (!item.compressed && item.size > this.options.compressionThreshold) {
          const serializedValue = JSON.stringify(item.value);
          itemForStorage.value = LZString.compressToUTF16(serializedValue);
          itemForStorage.compressed = true;
        }
        
        await this.setToStorage(key, itemForStorage);
      }
    }
  }
  
  // 원격에서 필요시 동기화
  private async syncFromRemoteIfNeeded(): Promise<void> {
    // 원격 동기화 로직 (구현 필요)
  }
  
  // 자동 최적화 시작
  private startAutoOptimization(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }
    
    this.optimizationTimer = setInterval(
      () => this.optimize(),
      this.options.autoOptimizeInterval
    );
  }
  
  // 자원 해제
  public dispose(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }
    
    // 앱 상태 이벤트 리스너 해제
    AppState.removeEventListener('change', () => {});
    
    // 네트워크 상태 이벤트 리스너 해제
    NetInfo.removeEventListener(state => {});
  }
  
  // TTL 만료 여부 확인
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.timestamp + item.ttl;
  }
  
  // 캐시 미스 처리
  private async handleCacheMiss<T>(
    key: string, 
    options?: { 
      fetchIfMissing?: boolean, 
      fetchFn?: () => Promise<T>,
      metadata?: Record<string, any>
    }
  ): Promise<T | null> {
    if (options?.fetchIfMissing && options.fetchFn) {
      try {
        const data = await options.fetchFn();
        if (data) {
          await this.set(key, data, { metadata: options.metadata });
          return data;
        }
      } catch (err) {
        console.error('Error fetching data on cache miss:', err);
      }
    }
    return null;
  }
  
  // 접근 통계 기록
  private recordAccess(key: string): void {
    const stats = this.accessStats.get(key) || { count: 0, lastAccess: 0 };
    stats.count += 1;
    stats.lastAccess = Date.now();
    this.accessStats.set(key, stats);
  }
  
  // 항목을 메모리로 승격할지 결정
  private shouldPromoteToMemory(key: string): boolean {
    const stats = this.accessStats.get(key);
    if (!stats) return false;
    
    // 접근 빈도가 높거나 git 데이터인 경우 승격
    return stats.count > 5 || 
           (this.options.gitDataPriority && key.includes('git'));
  }
  
  // 항목을 스토리지로 강등할지 결정
  private shouldDemoteToStorage(key: string, item: CacheItem): boolean {
    const stats = this.accessStats.get(key);
    if (!stats) return true; // 접근 통계가 없으면 강등
    
    // 접근 빈도가 낮거나 오래된 경우 강등
    const accessRecency = (Date.now() - stats.lastAccess) / this.options.defaultTTL;
    return stats.count < 3 || accessRecency > 0.5;
  }
  
  // 최적화 필요 여부 확인 및 실행
  private async checkAndOptimizeIfNeeded(): Promise<void> {
    if (
      this.currentMemoryUsage > this.options.memoryLimit ||
      this.currentStorageUsage > this.options.storageLimit
    ) {
      await this.optimize();
    }
  }
  
  // 메타데이터를 고려한 실제 키 가져오기
  private getActualKey(key: string, metadata?: Record<string, any>): string {
    if (!metadata) return key;
    
    // 특정 메타데이터를 키에 포함 (필요한 경우)
    if (metadata.userId || metadata.branch || metadata.repository) {
      const parts = [];
      if (metadata.repository) parts.push(metadata.repository);
      if (metadata.branch) parts.push(metadata.branch);
      if (metadata.userId) parts.push(metadata.userId);
      
      return `${key}_${parts.join('_')}`;
    }
    
    return key;
  }
  
  // 캐시 통계 가져오기
  public getCacheStats(): {
    memoryUsage: number,
    storageUsage: number,
    memoryItemCount: number,
    storageItemCount: number,
    accessStats: Record<string, { count: number, lastAccess: number }>
  } {
    return {
      memoryUsage: this.currentMemoryUsage,
      storageUsage: this.currentStorageUsage,
      memoryItemCount: this.memoryCache.size,
      storageItemCount: -1, // 구현 필요
      accessStats: Object.fromEntries(this.accessStats)
    };
  }
}

export default TieredCacheManager;