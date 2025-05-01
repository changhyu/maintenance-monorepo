/**
 * 향상된 캐시 관리자
 * 
 * 이 클래스는 기존 OfflineDataManager를 확장하여 다음과 같은 기능을 추가합니다:
 * - 캐시 성능 모니터링 및 분석
 * - 지능형 캐시 최적화 전략
 * - 적응형 TTL 조정
 * - 데이터 프리페칭
 * - 압축 및 보안 기능
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import OfflineDataManager, { OfflineDataItem, KeyValuePair } from './OfflineDataManager';
import CachePerformanceMonitor, { CacheEventType } from './CachePerformanceMonitor';
import CacheOptimizationStrategy, { 
  OptimizationStrategy, 
  OptimizationOptions, 
  CacheItemMetadata 
} from './CacheOptimizationStrategy';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import LZString from 'lz-string';
import { EnhancedCacheOptimizer } from './EnhancedCacheOptimizer';

// 향상된 캐시 옵션 인터페이스
export interface EnhancedCacheOptions {
  // 기본 캐시 설정
  prefix?: string;
  defaultExpirationTime?: number;
  autoCleanup?: boolean;
  
  // 성능 모니터링 설정
  enablePerformanceMonitoring?: boolean;
  performanceReportingInterval?: number;
  
  // 최적화 설정
  enableAutoOptimization?: boolean;
  optimizationStrategy?: OptimizationStrategy;
  maxCacheSize?: number; // 바이트 단위
  maxCacheCount?: number;
  
  // 압축 설정
  enableCompression?: boolean;
  compressionThreshold?: number; // 이 크기 이상 항목 압축
  
  // 프리페칭 설정
  enablePrefetching?: boolean;
  prefetchLimit?: number;
  
  // 보안 설정
  enableEncryption?: boolean;
  
  // 네트워크 설정
  maxRetryAttempts?: number;
  retryDelay?: number;
}

// 캐시 통계 인터페이스
export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUtilization: number;
  optimizationCount: number;
}

export class EnhancedCacheManager extends OfflineDataManager {
  // 내부 상태 변수
  private performanceMonitor: CachePerformanceMonitor;
  private optimizer: EnhancedCacheOptimizer;
  private options: Required<EnhancedCacheOptions>;
  private prefetchQueue: Array<string> = [];
  private lastOptimizationTime: number = 0;
  private optimizationCount: number = 0;
  private reportingInterval: NodeJS.Timeout | null = null;
  
  // 기본 옵션
  private static DEFAULT_OPTIONS: Required<EnhancedCacheOptions> = {
    prefix: '@cache:',
    defaultExpirationTime: 7 * 24 * 60 * 60 * 1000, // 일주일
    autoCleanup: true,
    
    enablePerformanceMonitoring: true,
    performanceReportingInterval: 3600000, // 1시간
    
    enableAutoOptimization: true,
    optimizationStrategy: OptimizationStrategy.ADAPTIVE,
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    maxCacheCount: 1000,
    
    enableCompression: true,
    compressionThreshold: 1024, // 1KB
    
    enablePrefetching: true,
    prefetchLimit: 10,
    
    enableEncryption: false,
    
    maxRetryAttempts: 3,
    retryDelay: 1000
  };
  
  /**
   * 생성자
   */
  constructor(options: EnhancedCacheOptions = {}) {
    // 상위 클래스 생성자 호출 (기본 OfflineDataManager 초기화)
    super({
      prefix: options.prefix ?? EnhancedCacheManager.DEFAULT_OPTIONS.prefix,
      defaultExpirationTime: options.defaultExpirationTime ?? EnhancedCacheManager.DEFAULT_OPTIONS.defaultExpirationTime,
      autoCleanup: options.autoCleanup ?? EnhancedCacheManager.DEFAULT_OPTIONS.autoCleanup
    });
    
    // 옵션 설정
    this.options = { ...EnhancedCacheManager.DEFAULT_OPTIONS, ...options };
    
    // 성능 모니터 초기화
    this.performanceMonitor = CachePerformanceMonitor.getInstance();
    this.performanceMonitor.setEnabled(this.options.enablePerformanceMonitoring);
    
    // 캐시 최적화 관리자 초기화
    this.optimizer = new EnhancedCacheOptimizer({
      strategy: this.options.optimizationStrategy,
      maxSize: this.options.maxCacheSize,
      maxCount: this.options.maxCacheCount
    });
    
    // 성능 보고 타이머 설정
    if (this.options.enablePerformanceMonitoring) {
      this.startPerformanceReporting();
    }
    
    // 자동 최적화 설정
    if (this.options.enableAutoOptimization) {
      this.setupAutoOptimization();
    }
  }
  
  /**
   * 데이터 캐싱
   * @override
   */
  public async cacheData<T>(
    key: string,
    data: T,
    options: {
      expirationTime?: number;
      priority?: 'low' | 'medium' | 'high';
      dataType?: string;
      encrypt?: boolean;
      compress?: boolean;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 데이터 크기 측정
      const dataString = JSON.stringify(data);
      const dataSize = dataString.length;
      
      // 압축 처리
      let processedData = dataString;
      let isCompressed = false;
      
      if (
        (options.compress ?? this.options.enableCompression) && 
        dataSize >= this.options.compressionThreshold
      ) {
        processedData = LZString.compressToUTF16(dataString);
        isCompressed = true;
      }
      
      // 기본 TTL 설정 및 우선순위
      const expirationTime = options.expirationTime ?? this.options.defaultExpirationTime;
      const priority = options.priority ?? 'medium';
      const dataType = options.dataType ?? this.inferDataType(data);
      
      // 아이템 메타데이터 생성
      const itemMetadata: CacheItemMetadata = {
        key,
        size: dataSize,
        accessCount: 0,
        lastAccessed: Date.now(),
        created: Date.now(),
        ttl: expirationTime,
        dataType,
        priority
      };
      
      // 오프라인 데이터 아이템 생성
      const offlineItem: OfflineDataItem = {
        data: processedData,
        timestamp: Date.now(),
        expirationTime,
        compressed: isCompressed,
        version: 2, // 향상된 캐시 관리자 버전
        metadata: {
          size: dataSize,
          type: dataType,
          priority,
          accessCount: 0
        }
      };
      
      // 상위 클래스의 캐싱 함수 호출
      await super.setCacheItem(key, offlineItem);
      
      // 최적화 관리자에 아이템 생성 기록
      this.optimizer.recordItemCreation(key, dataSize, dataType, priority);
      
      // 성능 모니터링 이벤트 기록
      this.performanceMonitor.recordEvent(CacheEventType.STORE, key, {
        size: dataSize,
        dataType,
        ttl: expirationTime
      });
      
      // 프리페치 대기열에서 제거 (이미 캐시했으므로)
      this.removeFromPrefetchQueue(key);
    } catch (error) {
      console.error(`[EnhancedCacheManager] cacheData 오류: ${error}`);
      throw error;
    }
  }
  
  /**
   * 데이터 조회
   * @override
   */
  public async getData<T>(
    key: string,
    options: {
      defaultValue?: T;
      prefetchRelated?: boolean;
      recordAccess?: boolean;
    } = {}
  ): Promise<T | undefined> {
    const startTime = Date.now();
    
    try {
      // 상위 클래스의 getData 함수 호출
      const result = await super.getData<T>(key, { defaultValue: options.defaultValue });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 결과 처리 및 분석
      if (result !== undefined && result !== options.defaultValue) {
        // 캐시 히트
        this.performanceMonitor.recordEvent(CacheEventType.HIT, key, { duration });
        
        // 옵티마이저에 접근 기록
        if (options.recordAccess !== false) {
          this.optimizer.recordItemAccess(key);
        }
        
        // 관련 데이터 프리페칭
        if (options.prefetchRelated && this.options.enablePrefetching) {
          this.prefetchRelatedData(key);
        }
        
        return result;
      } else {
        // 캐시 미스
        this.performanceMonitor.recordEvent(CacheEventType.MISS, key, { duration });
        
        // 프리페치 대기열에 추가
        if (this.options.enablePrefetching) {
          this.addToPrefetchQueue(key);
        }
        
        return options.defaultValue;
      }
    } catch (error) {
      console.error(`[EnhancedCacheManager] getData 오류: ${key}`, error);
      return options.defaultValue;
    }
  }
  
  /**
   * 캐시 항목 제거
   * @override
   */
  public async removeItem(key: string): Promise<void> {
    try {
      // 먼저 메타데이터 확인
      const item = await this.getCacheItem(key);
      
      // 상위 클래스의 removeItem 호출
      await super.removeItem(key);
      
      // 성능 이벤트 기록
      this.performanceMonitor.recordEvent(CacheEventType.REMOVE, key);
      
    } catch (error) {
      console.error(`[EnhancedCacheManager] removeItem 오류: ${key}`, error);
      throw error;
    }
  }
  
  /**
   * 캐시 최적화 실행
   */
  public async optimizeCache(force: boolean = false): Promise<{
    removedCount: number;
    freedSpace: number;
    newUsage: number;
  }> {
    // 시간 간격 확인 (강제 최적화가 아닌 경우)
    const now = Date.now();
    if (!force && now - this.lastOptimizationTime < 3600000) { // 1시간 간격
      return { removedCount: 0, freedSpace: 0, newUsage: 0 };
    }
    
    try {
      // 성능 이벤트 기록 시작
      this.performanceMonitor.recordEvent(CacheEventType.OPTIMIZE, 'all');
      
      // 현재 캐시된 모든 항목의 메타데이터 수집
      const allItems = await this.getAllCacheItemsMetadata();
      
      // 최적화 실행
      const result = this.optimizer.optimize(allItems);
      
      // 제거할 항목 제거
      if (result.removedItems.length > 0) {
        const keysToRemove = result.removedItems.map(item => item.key);
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // TTL 조정
      if (Object.keys(result.ttlAdjustments).length > 0) {
        await this.updateItemsTTL(result.ttlAdjustments);
      }
      
      // 최적화 상태 업데이트
      this.lastOptimizationTime = now;
      this.optimizationCount++;
      
      return {
        removedCount: result.removedItems.length,
        freedSpace: result.freedSpace,
        newUsage: result.newUsage
      };
    } catch (error) {
      console.error('[EnhancedCacheManager] 캐시 최적화 오류:', error);
      return { removedCount: 0, freedSpace: 0, newUsage: 0 };
    }
  }
  
  /**
   * 캐시 통계 가져오기
   */
  public async getCacheStats(): Promise<CacheStats> {
    const performanceStats = this.performanceMonitor.getPerformanceStats();
    
    return {
      totalItems: performanceStats.totalItems,
      totalSize: performanceStats.totalSize,
      hitRate: performanceStats.hitRate,
      averageAccessTime: performanceStats.avgAccessTime,
      memoryUtilization: performanceStats.memoryUtilization,
      optimizationCount: this.optimizationCount
    };
  }
  
  /**
   * 최적화 추천 가져오기
   */
  public getOptimizationRecommendations() {
    return this.performanceMonitor.generateOptimizationRecommendations();
  }
  
  /**
   * 모든 캐시 항목의 메타데이터 가져오기
   */
  private async getAllCacheItemsMetadata(): Promise<CacheItemMetadata[]> {
    try {
      // 모든 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.keyPrefix));
      
      // 메타데이터 배열 준비
      const metadataItems: CacheItemMetadata[] = [];
      
      // 각 항목의 메타데이터 수집
      for (const key of cacheKeys) {
        const rawItem = await AsyncStorage.getItem(key);
        if (rawItem) {
          try {
            const offlineItem: OfflineDataItem = JSON.parse(rawItem);
            const itemKey = key.replace(this.keyPrefix, '');
            
            // 데이터 크기 계산
            let size = offlineItem.data?.length || 0;
            if (offlineItem.metadata?.size) {
              size = offlineItem.metadata.size;
            }
            
            metadataItems.push({
              key: itemKey,
              size,
              accessCount: offlineItem.metadata?.accessCount || 1,
              lastAccessed: offlineItem.metadata?.lastAccessed || offlineItem.timestamp,
              created: offlineItem.timestamp,
              ttl: offlineItem.expirationTime,
              dataType: offlineItem.metadata?.type || 'unknown',
              priority: offlineItem.metadata?.priority || 'medium'
            });
          } catch (error) {
            console.warn(`[EnhancedCacheManager] 메타데이터 파싱 오류: ${key}`);
          }
        }
      }
      
      return metadataItems;
    } catch (error) {
      console.error('[EnhancedCacheManager] 메타데이터 수집 오류:', error);
      return [];
    }
  }
  
  /**
   * 여러 항목의 TTL 업데이트
   */
  private async updateItemsTTL(ttlAdjustments: Record<string, number>): Promise<void> {
    for (const [key, newTTL] of Object.entries(ttlAdjustments)) {
      try {
        // 캐시된 항목 가져오기
        const cacheItem = await this.getCacheItem(key);
        
        if (cacheItem) {
          // TTL 업데이트
          cacheItem.expirationTime = newTTL;
          
          // 수정된 항목 저장
          await this.setCacheItem(key, cacheItem);
        }
      } catch (error) {
        console.warn(`[EnhancedCacheManager] TTL 업데이트 실패: ${key}`);
      }
    }
  }
  
  /**
   * 자동 최적화 설정
   */
  private setupAutoOptimization(): void {
    // 1시간마다 자동 최적화 실행
    setInterval(() => {
      this.optimizeCache(false);
    }, 3600000);
    
    // 네트워크 상태 변경 시 최적화 실행
    NetInfo.addEventListener((state: NetInfoState) => {
      // Wi-Fi 연결 시에만 최적화
      if (state.type === 'wifi' && state.isConnected) {
        this.optimizeCache(false);
      }
    });
  }
  
  /**
   * 성능 보고 시작
   */
  private startPerformanceReporting(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    this.reportingInterval = setInterval(() => {
      this.getCacheStats().then(stats => {
        console.info('[EnhancedCacheManager] 캐시 성능 보고:', stats);
        
        // 히트율이 낮거나 메모리 사용량이 높으면 최적화 실행
        if (stats.hitRate < 0.5 || stats.memoryUtilization > 0.8) {
          this.optimizeCache(true);
        }
      });
    }, this.options.performanceReportingInterval);
  }
  
  /**
   * 프리페치 대기열에 항목 추가
   */
  private addToPrefetchQueue(key: string): void {
    if (!this.prefetchQueue.includes(key)) {
      this.prefetchQueue.push(key);
      
      // 대기열 크기 제한
      if (this.prefetchQueue.length > this.options.prefetchLimit) {
        this.prefetchQueue.shift();
      }
    }
  }
  
  /**
   * 프리페치 대기열에서 항목 제거
   */
  private removeFromPrefetchQueue(key: string): void {
    const index = this.prefetchQueue.indexOf(key);
    if (index !== -1) {
      this.prefetchQueue.splice(index, 1);
    }
  }
  
  /**
   * 관련 데이터 프리페칭
   */
  private async prefetchRelatedData(key: string): Promise<void> {
    // 구현 필요: 실제 애플리케이션에서는 키 패턴이나 메타데이터를 기반으로
    // 관련 항목을 찾아서 프리페칭하는 로직 구현
  }
  
  /**
   * 데이터 타입 추론
   */
  private inferDataType<T>(data: T): string {
    if (data === null || data === undefined) {
      return 'null';
    }
    
    if (Array.isArray(data)) {
      return 'array';
    }
    
    if (typeof data === 'object') {
      // 이미지 URL이나 이미지 객체 감지
      if (
        typeof data === 'object' && 
        data !== null && 
        'uri' in data && 
        typeof (data as any).uri === 'string'
      ) {
        return 'image';
      }
      
      return 'object';
    }
    
    return typeof data;
  }
  
  /**
   * 리소스 정리
   * @override
   */
  public dispose(): void {
    super.dispose();
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
  }
}

export default EnhancedCacheManager; 