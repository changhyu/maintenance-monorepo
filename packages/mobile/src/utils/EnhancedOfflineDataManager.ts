import OfflineDataManager, { OfflineDataItem, CacheOptions, SyncOptions } from './OfflineDataManager';
import { CacheOptimizer, CacheOptimizerConfig } from './CacheOptimizer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CacheOptimizationStrategy, 
  CacheOptimizationOptions,
  CacheStrategyFactory
} from './CacheOptimizationStrategy';
import { 
  EnhancedCacheSecurityManager, 
  getSecurityManager,
  VerificationResult
} from './EnhancedCacheSecurityUtils';

/**
 * 향상된 오프라인 데이터 관리자
 * 
 * OfflineDataManager를 확장하여 고급 캐싱 기능, 최적화 전략 및
 * 성능 모니터링을 구현합니다.
 */

/**
 * 캐시 상태 인터페이스
 */
export interface CacheState {
  totalItems: number;
  totalSize: number;
  types: { [key: string]: number };
  avgAccessTime: number;
  hitRate: number;
  pendingItems: number;
  memoryUsage: number;
}

/**
 * 미리 가져오기 설정 인터페이스
 */
export interface PrefetchConfig {
  enabled: boolean;
  patterns: RegExp[];
  batchSize: number;
  lowPriorityDelay: number;
}

/**
 * 향상된 오프라인 데이터 관리자 옵션
 */
export interface EnhancedOfflineDataManagerOptions {
  prefix?: string;
  defaultTTL?: number;
  compressionThreshold?: number;
  encryptSensitiveData?: boolean;
  enablePrefetching?: boolean;
  maxPrefetchItems?: number;
  optimizationStrategy?: OptimizationStrategy;
  optimizationOptions?: OptimizationOptions;
  maxMemoryUsage?: number;
  performanceLogging?: boolean;
}

/**
 * 캐시 항목 유형
 */
export interface EnhancedCacheItem {
  data: any;
  timestamp: number;
  expirationTime: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  dataType?: string;
  priority?: number;
  compressed?: boolean;
  encrypted?: boolean;
}

/**
 * 향상된 캐시 통계
 */
export interface EnhancedCacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  itemsByType: Record<string, number>;
  sizeByType: Record<string, number>;
  optimizationCount: number;
  lastOptimization: number;
  evictedItems: number;
  ttlExtensions: number;
  memoryUtilization: number;
}

/**
 * 향상된 오프라인 데이터 관리자 클래스
 * 기존 OfflineDataManager에 CacheOptimizer를 통합하여 고급 캐시 최적화 기능 제공
 */
export class EnhancedOfflineDataManager extends OfflineDataManager {
  private static instance: EnhancedOfflineDataManager;
  private cacheOptimizer: CacheOptimizer;
  private itemSizeMap: Map<string, number> = new Map();
  private lastOptimizationTime: number = 0;
  
  // 향상된 통계
  private prefetchHitRate: number = 0;
  private adaptiveTTLAdjustments: number = 0;
  private predictionAccuracy: number = 0;
  
  private optimizationStrategy: CacheOptimizationStrategy;
  private prefetchConfig: PrefetchConfig;
  private accessStats: AccessStats[] = [];
  private memoryWatcherId?: number;
  private cacheState: CacheState = {
    totalItems: 0,
    totalSize: 0,
    types: {},
    avgAccessTime: 0,
    hitRate: 0,
    pendingItems: 0,
    memoryUsage: 0
  };
  private pendingPrefetchKeys: Set<string> = new Set();
  private securityManager?: EnhancedCacheSecurityManager;
  private relatedKeyMap: Map<string, string[]> = new Map();
  private debug: boolean;
  
  private optimizationManager: CacheOptimizationManager;
  private stats: EnhancedCacheStats;
  private metadataCache: Map<string, CacheItemMetadata>;
  private enablePrefetching: boolean;
  private maxPrefetchItems: number;
  private performanceLogging: boolean;
  private maxMemoryUsage: number;
  private compressionThreshold: number;
  private encryptSensitiveData: boolean;
  
  private constructor(optimizerConfig?: Partial<CacheOptimizerConfig>) {
    super(); // 부모 클래스 생성자 호출
    
    // 캐시 최적화 인스턴스 생성
    this.cacheOptimizer = new CacheOptimizer(optimizerConfig);
    
    // 향상된 주기적 최적화 초기화
    this.initializeEnhancedOptimization();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(optimizerConfig?: Partial<CacheOptimizerConfig>): EnhancedOfflineDataManager {
    if (!EnhancedOfflineDataManager.instance) {
      EnhancedOfflineDataManager.instance = new EnhancedOfflineDataManager(optimizerConfig);
    }
    return EnhancedOfflineDataManager.instance;
  }
  
  /**
   * 향상된 주기적 최적화 초기화
   * 기본 최적화보다 더 지능적인 주기 사용
   */
  private initializeEnhancedOptimization(): void {
    // 주기적 최적화는 사용 패턴에 따라 적응적으로 조정
    setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastOptimization = currentTime - this.lastOptimizationTime;
      const stats = this.getCacheStats();
      
      // 메모리 사용률이 높거나, 마지막 최적화 후 6시간이 지나면 최적화 실행
      if (stats.memoryUtilization && stats.memoryUtilization > 80 || 
          timeSinceLastOptimization > 6 * 60 * 60 * 1000) {
        this.enhancedOptimizeCache()
          .catch(error => console.error('고급 캐시 최적화 중 오류:', error));
      }
    }, 30 * 60 * 1000); // 30분마다 검사
  }
  
  /**
   * 생성자
   */
  constructor(options: EnhancedOfflineDataManagerOptions = {}) {
    const {
      prefix = '@enhanced_cache:', 
      compressionThreshold = 1024,
      defaultExpiration = 86400000, // 1일
      cleanupInterval = 3600000, // 1시간
      maxQueueSize = 100,
      optimizationStrategy,
      prefetchConfig,
      securityEnabled = false,
      monitoringEnabled = true,
      monitoringInterval = 60000, // 1분
      debug = false
    } = options;
    
    super({
      prefix,
      compressionThreshold,
      defaultExpiration,
      cleanupInterval,
      maxQueueSize
    });
    
    this.debug = debug;
    
    // 최적화 전략 설정
    const defaultStrategy: CacheOptimizationOptions = {
      strategy: 'ADAPTIVE',
      maxSize: 50 * 1024 * 1024, // 50MB
      maxItems: 1000,
      metadataStorageKey: `${prefix}metadata`
    };
    
    this.optimizationStrategy = CacheStrategyFactory.createStrategy(
      optimizationStrategy || defaultStrategy
    );
    
    // 미리 가져오기 설정
    this.prefetchConfig = {
      enabled: true,
      patterns: [/.*/], // 기본적으로 모든 키 패턴
      batchSize: 5,
      lowPriorityDelay: 500,
      ...prefetchConfig
    };
    
    // 보안 관리자 초기화
    if (securityEnabled) {
      this.securityManager = getSecurityManager();
    }
    
    // 모니터링 초기화
    if (monitoringEnabled) {
      this.startMonitoring(monitoringInterval);
    }
    
    this.initialize();
  }
  
  /**
   * 초기화
   */
  private async initialize(): Promise<void> {
    try {
      await this.optimizationStrategy.initialize();
      await this.loadRelatedKeys();
      this.logDebug('EnhancedOfflineDataManager 초기화 완료');
    } catch (error) {
      console.error('초기화 오류:', error);
    }
  }
  
  /**
   * 관련 키 로드
   */
  private async loadRelatedKeys(): Promise<void> {
    try {
      const relatedKeysJson = await AsyncStorage.getItem(`${this.prefix}related_keys`);
      if (relatedKeysJson) {
        const relatedKeysObj = JSON.parse(relatedKeysJson);
        this.relatedKeyMap = new Map(Object.entries(relatedKeysObj).map(
          ([key, value]) => [key, value as string[]]
        ));
      }
    } catch (error) {
      console.error('관련 키 로드 오류:', error);
    }
  }
  
  /**
   * 관련 키 저장
   */
  private async saveRelatedKeys(): Promise<void> {
    try {
      const relatedKeysObj = Object.fromEntries(this.relatedKeyMap.entries());
      await AsyncStorage.setItem(
        `${this.prefix}related_keys`,
        JSON.stringify(relatedKeysObj)
      );
    } catch (error) {
      console.error('관련 키 저장 오류:', error);
    }
  }
  
  /**
   * 관련 키 등록
   */
  public registerRelatedKeys(primaryKey: string, relatedKeys: string[]): void {
    this.relatedKeyMap.set(primaryKey, relatedKeys);
    // 성능 최적화: 비동기 저장을 큐에 넣기
    setTimeout(() => this.saveRelatedKeys(), 0);
  }
  
  /**
   * 데이터 캐싱
   */
  public async cacheData<T>(
    key: string, 
    data: T, 
    options: {
      expiration?: number;
      compress?: boolean;
      type?: string;
      priority?: boolean;
      relatedKeys?: string[];
      encrypt?: boolean;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 옵션 설정
      const {
        expiration = this.defaultExpiration,
        compress = false,
        type,
        priority = false,
        relatedKeys = [],
        encrypt = false
      } = options;
      
      // 보안 적용 (암호화 및 서명)
      let dataToStore: any = data;
      if (this.securityManager && (encrypt || this.encryptSensitiveData)) {
        // 암호화가 명시적으로 요청되었거나, 민감 데이터 자동 암호화가 활성화되고 데이터가 민감하다고 판단되는 경우
        const forceEncrypt = encrypt || this.securityManager.shouldEncrypt(key, data);
        dataToStore = await this.securityManager.encrypt(data, forceEncrypt);
      }
      
      // 부모 클래스의 cacheData 호출
      await super.cacheData(key, dataToStore, { expiration, compress });
      
      // 관련 키 등록
      if (relatedKeys.length > 0) {
        this.registerRelatedKeys(key, relatedKeys);
      }
      
      // 캐시 최적화 전략에 항목 추가
      const dataSize = JSON.stringify(data).length;
      await this.optimizationStrategy.addItem(
        key, 
        dataSize, 
        expiration, 
        type,
        priority
      );
      
      // 접근 통계 기록
      const endTime = Date.now();
      this.recordAccessStats({
        startTime,
        endTime,
        key,
        size: dataSize,
        hit: false,
        type
      });
      
      this.logDebug(`데이터 캐싱 완료: ${key}, 크기: ${dataSize}바이트, 유형: ${type || '알 수 없음'}`);
    } catch (error) {
      console.error(`데이터 캐싱 오류 (${key}):`, error);
      throw error;
    }
  }
  
  /**
   * 데이터 가져오기
   */
  public async getData<T>(
    key: string, 
    options: {
      defaultValue?: T;
      prefetchRelated?: boolean;
      validateIntegrity?: boolean;
    } = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    let hit = false;
    let size = 0;
    let type: string | undefined;
    
    try {
      const {
        defaultValue = null,
        prefetchRelated = true,
        validateIntegrity = true
      } = options;
      
      // 데이터 가져오기
      const cachedData = await super.getData<any>(key, { defaultValue });
      
      if (cachedData === null || cachedData === defaultValue) {
        this.logDebug(`캐시 미스: ${key}`);
        // 접근 통계 기록 (미스)
        this.recordAccessStats({
          startTime,
          endTime: Date.now(),
          key,
          size: 0,
          hit: false
        });
        return defaultValue;
      }
      
      hit = true;
      
      // 보안 검증 및 복호화
      let resultData: T;
      if (this.securityManager) {
        // 암호화된 데이터인지 확인하고 복호화
        const verificationResult = await this.securityManager.decrypt<T>(cachedData);
        
        if (!verificationResult.valid && validateIntegrity) {
          this.logDebug(`무결성 검증 실패: ${key}`);
          // 손상된 데이터 제거
          await this.removeItem(key);
          return defaultValue;
        }
        
        resultData = verificationResult.data;
      } else {
        resultData = cachedData as T;
      }
      
      // 크기 및 타입 정보 가져오기
      const metadata = this.optimizationStrategy.getMetadata().get(key);
      if (metadata) {
        size = metadata.size;
        type = metadata.type;
      } else {
        size = JSON.stringify(resultData).length;
      }
      
      // 접근 기록
      await this.optimizationStrategy.recordAccess(key);
      
      // 관련 데이터 미리 가져오기
      if (prefetchRelated && this.prefetchConfig.enabled) {
        this.prefetchRelatedData(key);
      }
      
      this.logDebug(`데이터 검색 완료: ${key}, 크기: ${size}바이트, 유형: ${type || '알 수 없음'}`);
      
      // 접근 통계 기록 (히트)
      this.recordAccessStats({
        startTime,
        endTime: Date.now(),
        key,
        size,
        hit: true,
        type
      });
      
      return resultData;
    } catch (error) {
      console.error(`데이터 검색 오류 (${key}):`, error);
      
      // 접근 통계 기록 (오류)
      this.recordAccessStats({
        startTime,
        endTime: Date.now(),
        key,
        size,
        hit: false,
        type
      });
      
      return options.defaultValue ?? null;
    }
  }
  
  /**
   * 관련 데이터 미리 가져오기
   */
  private prefetchRelatedData(key: string): void {
    // 이미 미리 가져오기 중인 키는 건너뛰기
    if (this.pendingPrefetchKeys.has(key)) {
      return;
    }
    
    // 관련 키 가져오기
    const relatedKeys = this.relatedKeyMap.get(key) || [];
    if (relatedKeys.length === 0) {
      return;
    }
    
    // 패턴 필터링
    const filteredKeys = relatedKeys.filter(relKey => 
      this.prefetchConfig.patterns.some(pattern => pattern.test(relKey))
    );
    
    // 미리 가져오기 큐에 추가
    if (filteredKeys.length === 0) {
      return;
    }
    
    this.logDebug(`관련 데이터 미리 가져오기 시작: ${key}, 관련 키: ${filteredKeys.length}개`);
    
    // 일괄 처리를 위한 분할
    const batches: string[][] = [];
    for (let i = 0; i < filteredKeys.length; i += this.prefetchConfig.batchSize) {
      batches.push(filteredKeys.slice(i, i + this.prefetchConfig.batchSize));
    }
    
    // 각 배치를 우선순위가 낮은 작업으로 처리
    batches.forEach((batch, index) => {
      // 우선순위가 낮은 작업은 지연 실행
      const delay = this.prefetchConfig.lowPriorityDelay * index;
      
      setTimeout(() => {
        batch.forEach(relKey => {
          // 미리 가져오기 상태 추적
          this.pendingPrefetchKeys.add(relKey);
          
          // 데이터 가져오기 (기본 옵션으로)
          this.getData(relKey, { prefetchRelated: false })
            .finally(() => {
              // 완료 후 상태 업데이트
              this.pendingPrefetchKeys.delete(relKey);
            });
        });
      }, delay);
    });
  }
  
  /**
   * 캐시 최적화
   */
  public async optimizeCache(): Promise<void> {
    try {
      this.logDebug('캐시 최적화 시작');
      
      // 최적화 전략 실행
      const removedKeys = await this.optimizationStrategy.optimizeCache();
      
      // 실제 캐시 항목 제거
      if (removedKeys.length > 0) {
        await AsyncStorage.multiRemove(
          removedKeys.map(key => `${this.prefix}${key}`)
        );
        
        this.logDebug(`캐시 최적화 완료: ${removedKeys.length}개 항목 제거됨`);
      } else {
        this.logDebug('캐시 최적화 완료: 제거된 항목 없음');
      }
      
      // 캐시 상태 업데이트
      await this.updateCacheState();
    } catch (error) {
      console.error('캐시 최적화 오류:', error);
    }
  }
  
  /**
   * 캐시 항목 제거
   */
  public async removeItem(key: string): Promise<void> {
    try {
      // 부모 클래스의 removeItem 호출
      await super.removeItem(key);
      
      // 최적화 전략에서 항목 제거
      await this.optimizationStrategy.removeItem(key);
      
      // 관련 키 맵에서 제거
      this.relatedKeyMap.delete(key);
      
      this.logDebug(`항목 제거됨: ${key}`);
    } catch (error) {
      console.error(`항목 제거 오류 (${key}):`, error);
      throw error;
    }
  }
  
  /**
   * 전체 캐시 비우기
   */
  public async clearCache(prefix?: string): Promise<void> {
    try {
      // 부모 클래스의 clearCache 호출
      await super.clearCache(prefix);
      
      // 최적화 전략 메타데이터 초기화
      await this.optimizationStrategy.initialize();
      
      // 관련 키 맵 초기화
      this.relatedKeyMap.clear();
      await this.saveRelatedKeys();
      
      this.logDebug(`캐시 비움${prefix ? ` (접두사: ${prefix})` : ''}`);
    } catch (error) {
      console.error('캐시 비우기 오류:', error);
      throw error;
    }
  }
  
  /**
   * 접근 통계 기록
   */
  private recordAccessStats(stats: AccessStats): void {
    this.accessStats.push(stats);
    
    // 최대 1000개 통계만 유지
    if (this.accessStats.length > 1000) {
      this.accessStats = this.accessStats.slice(-1000);
    }
  }
  
  /**
   * 캐시 상태 업데이트
   */
  private async updateCacheState(): Promise<void> {
    try {
      const metadata = this.optimizationStrategy.getMetadata();
      
      // 타입별 항목 수 계산
      const types: { [key: string]: number } = {};
      let totalSize = 0;
      
      metadata.forEach(item => {
        if (item.type) {
          types[item.type] = (types[item.type] || 0) + 1;
        }
        totalSize += item.size;
      });
      
      // 접근 시간 계산
      const accessTimes = this.accessStats
        .filter(stat => stat.hit)
        .map(stat => stat.endTime - stat.startTime);
      
      const avgAccessTime = accessTimes.length > 0
        ? accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length
        : 0;
      
      // 히트율 계산
      const hitRate = this.accessStats.length > 0
        ? this.accessStats.filter(stat => stat.hit).length / this.accessStats.length
        : 0;
      
      // 메모리 사용량 추정
      const memoryUsage = this.estimateMemoryUsage();
      
      // 캐시 상태 업데이트
      this.cacheState = {
        totalItems: metadata.size,
        totalSize,
        types,
        avgAccessTime,
        hitRate,
        pendingItems: await this.getPendingOperationsCount(),
        memoryUsage
      };
      
      this.logDebug(`캐시 상태 업데이트: ${this.cacheState.totalItems}개 항목, ${Math.round(this.cacheState.totalSize / 1024)}KB`);
    } catch (error) {
      console.error('캐시 상태 업데이트 오류:', error);
    }
  }
  
  /**
   * 메모리 사용량 추정
   */
  private estimateMemoryUsage(): number {
    // 단순 추정 (실제 환경에서는 더 정확한 계산 필요)
    return (
      // 메타데이터 크기
      JSON.stringify(Array.from(this.optimizationStrategy.getMetadata().values())).length +
      // 관련 키 맵 크기
      JSON.stringify(Object.fromEntries(this.relatedKeyMap.entries())).length +
      // 접근 통계 크기
      JSON.stringify(this.accessStats).length
    );
  }
  
  /**
   * 모니터링 시작
   */
  private startMonitoring(interval: number): void {
    // 이전 모니터링 정리
    if (this.memoryWatcherId) {
      clearInterval(this.memoryWatcherId);
    }
    
    // 주기적 모니터링 설정
    this.memoryWatcherId = setInterval(async () => {
      await this.updateCacheState();
    }, interval) as unknown as number;
  }
  
  /**
   * 캐시 성능 분석
   */
  public async analyzeCachePerformance(): Promise<{
    cacheState: CacheState;
    recommendations: string[];
    typeAnalysis: { [key: string]: { count: number; avgSize: number; hitRate: number } };
  }> {
    await this.updateCacheState();
    
    // 타입별 분석
    const typeAnalysis: { [key: string]: { count: number; avgSize: number; hitRate: number } } = {};
    const metadata = this.optimizationStrategy.getMetadata();
    
    // 타입별 크기 및 개수 계산
    metadata.forEach(item => {
      if (item.type) {
        if (!typeAnalysis[item.type]) {
          typeAnalysis[item.type] = { count: 0, avgSize: 0, hitRate: 0 };
        }
        typeAnalysis[item.type].count++;
        typeAnalysis[item.type].avgSize += item.size;
      }
    });
    
    // 평균 크기 계산
    Object.keys(typeAnalysis).forEach(type => {
      if (typeAnalysis[type].count > 0) {
        typeAnalysis[type].avgSize /= typeAnalysis[type].count;
      }
    });
    
    // 타입별 히트율 계산
    const typeHits: { [key: string]: { hits: number; total: number } } = {};
    this.accessStats.forEach(stat => {
      if (stat.type) {
        if (!typeHits[stat.type]) {
          typeHits[stat.type] = { hits: 0, total: 0 };
        }
        typeHits[stat.type].total++;
        if (stat.hit) {
          typeHits[stat.type].hits++;
        }
      }
    });
    
    // 히트율 할당
    Object.keys(typeHits).forEach(type => {
      if (typeHits[type].total > 0 && typeAnalysis[type]) {
        typeAnalysis[type].hitRate = typeHits[type].hits / typeHits[type].total;
      }
    });
    
    // 권장 사항 생성
    const recommendations: string[] = [];
    
    // 히트율 기반 권장 사항
    if (this.cacheState.hitRate < 0.5) {
      recommendations.push('캐시 히트율이 낮습니다. 캐싱 정책을 재검토하세요.');
    }
    
    // 크기 기반 권장 사항
    if (this.cacheState.totalSize > this.optimizationStrategy.options.maxSize! * 0.9) {
      recommendations.push('캐시 용량이 90%를 초과했습니다. 캐시 크기 증가를 고려하세요.');
    }
    
    // 타입별 권장 사항
    Object.keys(typeAnalysis).forEach(type => {
      const analysis = typeAnalysis[type];
      
      // 히트율 낮은 타입 식별
      if (analysis.hitRate < 0.3 && analysis.count > 10) {
        recommendations.push(`'${type}' 유형은 히트율이 낮습니다(${Math.round(analysis.hitRate * 100)}%). TTL 감소를 고려하세요.`);
      }
      
      // 크기가 큰 타입 식별
      if (analysis.avgSize > 100000 && analysis.count > 5) {
        recommendations.push(`'${type}' 유형의 평균 크기(${Math.round(analysis.avgSize / 1024)}KB)가 큽니다. 압축을 고려하세요.`);
      }
    });
    
    // 접근 시간 권장 사항
    if (this.cacheState.avgAccessTime > 50) {
      recommendations.push(`평균 접근 시간(${Math.round(this.cacheState.avgAccessTime)}ms)이 높습니다. 자주 사용하는 항목의 메모리 캐싱을 고려하세요.`);
    }
    
    return {
      cacheState: this.cacheState,
      recommendations,
      typeAnalysis
    };
  }
  
  /**
   * 캐시 항목의 TTL 업데이트
   */
  public async updateItemTTL(key: string, ttl: number): Promise<void> {
    try {
      // 아이템 존재 확인
      const data = await this.getData(key);
      
      if (data !== null) {
        // 최적화 전략에서 TTL 업데이트
        await this.optimizationStrategy.updateItemTTL(key, ttl);
        
        // 실제 캐시 항목 업데이트
        await this.cacheData(key, data, { expiration: ttl });
        
        this.logDebug(`항목 TTL 업데이트: ${key}, TTL: ${ttl}`);
      }
    } catch (error) {
      console.error(`TTL 업데이트 오류 (${key}):`, error);
    }
  }
  
  /**
   * 리소스 정리
   */
  public dispose(): void {
    super.dispose();
    
    // 모니터링 중지
    if (this.memoryWatcherId) {
      clearInterval(this.memoryWatcherId);
      this.memoryWatcherId = undefined;
    }
    
    this.logDebug('EnhancedOfflineDataManager 정리 완료');
  }
  
  /**
   * 디버그 로깅
   */
  private logDebug(message: string): void {
    if (this.debug) {
      console.log(`[EnhancedCache] ${message}`);
    }
  }
  
  /**
   * 현재 캐시 상태 가져오기
   */
  public getCacheState(): CacheState {
    return { ...this.cacheState };
  }
} 