/**
 * 캐시 통합 유틸리티
 * 
 * 이 모듈은 SecureCacheIntegrator와 EnhancedCacheSecurityManager를 통합하는
 * 간소화된 인터페이스를 제공합니다.
 */

import { SecureCacheIntegrator, SecureCacheIntegratorOptions } from './SecureCacheIntegrator';
import { getSecurityManager, EnhancedCacheSecurityManager } from './EnhancedCacheSecurityUtils';
import { CacheOptimizationManager } from './CacheOptimizationStrategy';
import { getPerformanceMonitor, CachePerformanceMonitor, PerformanceMonitorOptions } from './CachePerformanceMonitor';

/**
 * 캐시 통합 옵션 인터페이스
 */
export interface CacheIntegrationOptions extends SecureCacheIntegratorOptions {
  // 추가 옵션
  autoInitialize?: boolean;
  disableConsoleLog?: boolean;
  performanceMonitoring?: boolean | PerformanceMonitorOptions;
}

/**
 * 안전한 캐시 통합 관리자 싱글톤
 */
class CacheIntegrationManager {
  private static instance: CacheIntegrationManager | null = null;
  private secureCache: SecureCacheIntegrator;
  private securityManager: EnhancedCacheSecurityManager;
  private optimizationManager: CacheOptimizationManager;
  private performanceMonitor: CachePerformanceMonitor | null = null;
  private initialized: boolean = false;
  private disableLogging: boolean = false;
  
  private constructor(options: CacheIntegrationOptions = {}) {
    this.disableLogging = options.disableConsoleLog || false;
    
    // 보안 관리자 초기화
    this.securityManager = getSecurityManager({
      enableEncryption: options.enableEncryption,
      enableIntegrityCheck: options.enableIntegrityCheck,
      customEncryptionKey: options.encryptionKey,
      sensitiveKeys: options.sensitiveKeyPatterns
    });
    
    // 보안 캐시 초기화
    this.secureCache = SecureCacheIntegrator.initialize(options);
    
    // 최적화 관리자는 SecureCacheIntegrator 내부에서 생성됨
    this.optimizationManager = this.secureCache.getOptimizationManager();
    
    // 성능 모니터링 초기화 (선택 사항)
    if (options.performanceMonitoring) {
      const monitorOptions = typeof options.performanceMonitoring === 'object' 
        ? options.performanceMonitoring 
        : {};
        
      this.performanceMonitor = getPerformanceMonitor({
        enableDetailedTracking: true,
        ...monitorOptions,
        reportingCallback: (metrics) => {
          if (!this.disableLogging) {
            console.log(`[캐시 성능] 히트율: ${(metrics.hitRate * 100).toFixed(1)}%, 메모리: ${(metrics.memoryUtilization * 100).toFixed(1)}%`);
          }
          
          // 자동 최적화 트리거 (높은 메모리 사용량)
          if (metrics.memoryUtilization > 0.8) {
            this.optimizeCache().catch(e => {
              this.log('자동 최적화 실패', e);
            });
          }
        }
      });
      
      // 모니터링 시작
      this.performanceMonitor.startMonitoring();
    }
    
    this.initialized = true;
    this.log('캐시 통합 관리자 초기화 완료');
  }
  
  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(options?: CacheIntegrationOptions): CacheIntegrationManager {
    if (!CacheIntegrationManager.instance) {
      CacheIntegrationManager.instance = new CacheIntegrationManager(options);
    } else if (options) {
      // 기존 인스턴스 설정 업데이트
      CacheIntegrationManager.instance.updateOptions(options);
    }
    return CacheIntegrationManager.instance;
  }
  
  /**
   * 옵션 업데이트
   */
  private updateOptions(options: CacheIntegrationOptions): void {
    if (options.disableConsoleLog !== undefined) {
      this.disableLogging = options.disableConsoleLog;
    }
    
    // 성능 모니터링 업데이트
    if (options.performanceMonitoring !== undefined) {
      if (options.performanceMonitoring && !this.performanceMonitor) {
        const monitorOptions = typeof options.performanceMonitoring === 'object' 
          ? options.performanceMonitoring 
          : {};
          
        this.performanceMonitor = getPerformanceMonitor(monitorOptions);
        this.performanceMonitor.startMonitoring();
      } else if (!options.performanceMonitoring && this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
        this.performanceMonitor = null;
      }
    }
  }
  
  /**
   * 초기화 상태 확인
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CacheIntegrationManager가 초기화되지 않았습니다');
    }
  }
  
  /**
   * 로깅 유틸리티
   */
  private log(message: string, error?: any): void {
    if (!this.disableLogging) {
      console.log(`[CacheIntegration] ${message}`);
      if (error) {
        console.error(error);
      }
    }
  }
  
  /**
   * 데이터 캐싱
   */
  public async cacheData<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: number;
      forceEncrypt?: boolean;
      skipIntegrityCheck?: boolean;
    } = {}
  ): Promise<boolean> {
    this.ensureInitialized();
    
    // 성능 모니터링 (시작)
    const startTime = Date.now();
    let success = false;
    
    try {
      success = await this.secureCache.setSecureItem(key, data, options);
      
      // 성능 모니터링 (완료)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'set',
          key,
          startTime,
          endTime: Date.now(),
          success,
          dataSize: this.estimateSize(data),
          encrypted: options.forceEncrypt || this.securityManager.shouldEncrypt(key, data)
        });
      }
      
      return success;
    } catch (error) {
      this.log(`데이터 캐싱 실패: ${key}`, error);
      
      // 성능 모니터링 (실패)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'set',
          key,
          startTime,
          endTime: Date.now(),
          success: false
        });
      }
      
      return false;
    }
  }
  
  /**
   * 캐시에서 데이터 가져오기
   */
  public async getData<T>(key: string): Promise<T | null> {
    this.ensureInitialized();
    
    // 성능 모니터링 (시작)
    const startTime = Date.now();
    
    try {
      const result = await this.secureCache.getSecureItem<T>(key);
      
      // 성능 모니터링 (완료)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'get',
          key,
          startTime,
          endTime: Date.now(),
          success: true,
          cacheHit: result.isHit,
          encrypted: result.isEncrypted,
          dataSize: result.data ? this.estimateSize(result.data) : 0
        });
      }
      
      return result.isHit ? result.data : null;
    } catch (error) {
      this.log(`데이터 조회 실패: ${key}`, error);
      
      // 성능 모니터링 (실패)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'get',
          key,
          startTime,
          endTime: Date.now(),
          success: false,
          cacheHit: false
        });
      }
      
      return null;
    }
  }
  
  /**
   * 캐시 항목 삭제
   */
  public async removeItem(key: string): Promise<boolean> {
    this.ensureInitialized();
    
    // 성능 모니터링 (시작)
    const startTime = Date.now();
    let success = false;
    
    try {
      success = await this.secureCache.removeSecureItem(key);
      
      // 성능 모니터링 (완료)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'remove',
          key,
          startTime,
          endTime: Date.now(),
          success
        });
      }
      
      return success;
    } catch (error) {
      this.log(`항목 삭제 실패: ${key}`, error);
      
      // 성능 모니터링 (실패)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'remove',
          key,
          startTime,
          endTime: Date.now(),
          success: false
        });
      }
      
      return false;
    }
  }
  
  /**
   * 캐시 최적화 실행
   */
  public async optimizeCache(): Promise<void> {
    this.ensureInitialized();
    
    // 성능 모니터링 (시작)
    const startTime = Date.now();
    let success = false;
    
    try {
      await this.secureCache.optimizeCache();
      success = true;
      this.log('캐시 최적화 완료');
      
      // 캐시 상태 업데이트
      const stats = await this.secureCache.getCacheStats();
      
      // 성능 모니터링 업데이트
      if (this.performanceMonitor) {
        this.performanceMonitor.updateCacheState({
          totalItems: stats.itemCount,
          totalSize: stats.totalSize,
          memoryUsage: stats.totalSize,
          maxMemory: this.secureCache.getMaxCacheSize(),
          encryptedItems: stats.encryptedCount,
          compressedSize: stats.totalSize,
          rawSize: stats.totalSize * 1.3, // 압축 추정치
          evictedItems: stats.expirationStats?.expired || 0
        });
      }
    } catch (error) {
      this.log('캐시 최적화 실패', error);
      success = false;
    }
    
    // 성능 모니터링 (완료)
    if (this.performanceMonitor) {
      this.performanceMonitor.recordOperation({
        operationType: 'optimize',
        startTime,
        endTime: Date.now(),
        success
      });
    }
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  public async cleanExpiredItems(): Promise<number> {
    this.ensureInitialized();
    try {
      const removedCount = await this.secureCache.cleanExpiredItems();
      this.log(`만료된 항목 ${removedCount}개 정리 완료`);
      
      // 성능 모니터 업데이트
      if (this.performanceMonitor) {
        this.performanceMonitor.updateCacheState({
          totalItems: (await this.secureCache.getCacheStats()).itemCount,
          totalSize: (await this.secureCache.getCacheStats()).totalSize,
          memoryUsage: (await this.secureCache.getCacheStats()).totalSize,
          maxMemory: this.secureCache.getMaxCacheSize(),
          encryptedItems: (await this.secureCache.getCacheStats()).encryptedCount,
          compressedSize: (await this.secureCache.getCacheStats()).totalSize,
          rawSize: (await this.secureCache.getCacheStats()).totalSize * 1.3,
          evictedItems: removedCount
        });
      }
      
      return removedCount;
    } catch (error) {
      this.log('만료 항목 정리 실패', error);
      return 0;
    }
  }
  
  /**
   * 캐시 통계 가져오기
   */
  public async getCacheStats(): Promise<any> {
    this.ensureInitialized();
    try {
      const stats = await this.secureCache.getCacheStats();
      
      // 성능 메트릭 추가
      if (this.performanceMonitor) {
        const performanceMetrics = this.performanceMonitor.getMetrics();
        return {
          ...stats,
          performance: {
            hitRate: performanceMetrics.hitRate,
            averageAccessTime: performanceMetrics.averageAccessTime,
            accessTimePercentiles: performanceMetrics.accessTimePercentiles,
            optimizationCount: performanceMetrics.optimizationCount,
            lastOptimized: performanceMetrics.lastOptimizationTime
          }
        };
      }
      
      return stats;
    } catch (error) {
      this.log('캐시 통계 조회 실패', error);
      return null;
    }
  }
  
  /**
   * 캐시 전체 삭제
   */
  public async clearAll(): Promise<boolean> {
    this.ensureInitialized();
    
    // 성능 모니터링 (시작)
    const startTime = Date.now();
    let success = false;
    
    try {
      success = await this.secureCache.clearAll();
      
      // 성능 모니터링 (완료)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'clear',
          startTime,
          endTime: Date.now(),
          success
        });
        
        // 상태 리셋
        this.performanceMonitor.reset();
      }
      
      return success;
    } catch (error) {
      this.log('캐시 전체 삭제 실패', error);
      
      // 성능 모니터링 (실패)
      if (this.performanceMonitor) {
        this.performanceMonitor.recordOperation({
          operationType: 'clear',
          startTime,
          endTime: Date.now(),
          success: false
        });
      }
      
      return false;
    }
  }
  
  /**
   * 암호화 키 순환
   */
  public async rotateEncryptionKey(newKey: string): Promise<boolean> {
    this.ensureInitialized();
    try {
      return await this.secureCache.rotateEncryptionKey(newKey);
    } catch (error) {
      this.log('암호화 키 순환 실패', error);
      return false;
    }
  }
  
  /**
   * 성능 모니터 인스턴스 가져오기
   */
  public getPerformanceMonitor(): CachePerformanceMonitor | null {
    return this.performanceMonitor;
  }
  
  /**
   * 데이터 크기 추정
   */
  private estimateSize(data: any): number {
    if (data === null || data === undefined) return 0;
    
    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      return jsonString.length * 2; // UTF-16 문자는 2바이트 사용
    } catch (e) {
      return 1024; // 변환 불가능한 객체의 경우 1KB로 추정
    }
  }
}

// 싱글톤 인스턴스
let instance: CacheIntegrationManager | null = null;

/**
 * 캐시 통합 관리자 인스턴스 초기화
 */
export function initializeCacheIntegration(options: CacheIntegrationOptions = {}): CacheIntegrationManager {
  instance = CacheIntegrationManager.getInstance(options);
  return instance;
}

/**
 * 캐시 통합 관리자 인스턴스 가져오기
 */
export function getCacheIntegration(): CacheIntegrationManager {
  if (!instance) {
    throw new Error('캐시 통합 관리자가 초기화되지 않았습니다. initializeCacheIntegration()을 먼저 호출하세요.');
  }
  return instance;
}

/**
 * 편의를 위한 데이터 캐싱 함수
 */
export async function cacheData<T>(key: string, data: T, options = {}): Promise<boolean> {
  return getCacheIntegration().cacheData(key, data, options);
}

/**
 * 편의를 위한 데이터 조회 함수
 */
export async function getData<T>(key: string): Promise<T | null> {
  return getCacheIntegration().getData<T>(key);
}

/**
 * 편의를 위한 캐시 항목 삭제 함수
 */
export async function removeItem(key: string): Promise<boolean> {
  return getCacheIntegration().removeItem(key);
}

/**
 * 편의를 위한 캐시 최적화 함수
 */
export async function optimizeCache(): Promise<void> {
  return getCacheIntegration().optimizeCache();
}

/**
 * 캐시 성능 모니터 가져오기
 */
export function getCachePerformanceMonitor(): CachePerformanceMonitor | null {
  return getCacheIntegration().getPerformanceMonitor();
} 