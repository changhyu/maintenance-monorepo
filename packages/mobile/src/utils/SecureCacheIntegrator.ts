import { EnhancedCacheSecurityManager } from './EnhancedCacheSecurityManager';
import { CacheOptimizationManager } from './CacheOptimizationStrategy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineDataManager } from './OfflineDataManager';
import CryptoJS from 'crypto-js';

/**
 * 캐시 보안 통합 인터페이스를 위한 구성 옵션
 */
export interface SecureCacheIntegratorOptions {
  // 보안 관련 설정
  encryptionKey?: string;
  enableEncryption?: boolean;
  enableIntegrityCheck?: boolean;
  sensitiveKeyPatterns?: string[];
  
  // 캐시 최적화 관련 설정
  optimizationStrategy?: 'LRU' | 'LFU' | 'FIFO' | 'SIZE_BASED' | 'PRIORITY' | 'ADAPTIVE';
  maxCacheSize?: number;
  maxItemCount?: number;
  autoOptimizeThreshold?: number; // 0 ~ 1 사이의 값 (예: 0.8은 최대 크기의 80%에 도달하면 최적화)
  
  // 기타 설정
  namespace?: string;
  defaultTTL?: number;
  debug?: boolean;
}

/**
 * 캐시 보안 통합 인터페이스를 위한 캐시 항목 메타데이터
 */
export interface SecureCacheItemMetadata {
  key: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
  created: number;
  ttl: number;
  dataType: string;
  priority: number;
  isEncrypted: boolean;
  hasIntegrityCheck: boolean;
}

/**
 * 캐시 조회 결과 인터페이스
 */
export interface CacheResult<T> {
  data: T | null;
  metadata: SecureCacheItemMetadata | null;
  isHit: boolean;
  isExpired: boolean;
  isEncrypted: boolean;
  integrityValid: boolean;
}

/**
 * SecureCacheUtils와 CacheSecurityUtils의 기능을 통합하는 클래스
 * 보안 관련 유틸리티와 캐시 최적화 기능을 함께 제공
 */
export class SecureCacheIntegrator {
  private static instance: SecureCacheIntegrator | null = null;
  private securityManager: typeof EnhancedCacheSecurityManager;
  private optimizationManager: CacheOptimizationManager;
  private offlineDataManager: OfflineDataManager;
  private namespace: string;
  private debugMode: boolean;
  private metadataPrefix: string = '_meta_';
  private dataPrefix: string = '_data_';
  private stats: {
    hits: number;
    misses: number;
    totalAccesses: number;
  };
  
  /**
   * 생성자 - 직접 인스턴스화하지 않고 initialize 메서드를 사용
   */
  private constructor(options: SecureCacheIntegratorOptions) {
    this.namespace = options.namespace || 'secure_cache';
    this.debugMode = options.debug || false;
    
    // 보안 관리자 초기화
    this.securityManager = EnhancedCacheSecurityManager.getInstance({
      encryptionKey: options.encryptionKey || 'default-key',
      enableEncryption: options.enableEncryption !== undefined ? options.enableEncryption : true,
      enableIntegrityCheck: options.enableIntegrityCheck !== undefined ? options.enableIntegrityCheck : true,
      autoDetectSensitiveData: true,
      sensitiveKeyPatterns: options.sensitiveKeyPatterns || []
    });
    
    // 최적화 관리자 초기화
    this.optimizationManager = new CacheOptimizationManager({
      strategy: options.optimizationStrategy || 'ADAPTIVE',
      maxSize: options.maxCacheSize || 50 * 1024 * 1024, // 기본 50MB
      maxCount: options.maxItemCount || 1000,
      reductionTarget: 0.7, // 70%로 감소
      ttlExtensionFactor: 1.5,
      priorityWeight: 1.0
    });
    
    // 오프라인 데이터 관리자 초기화
    this.offlineDataManager = OfflineDataManager.getInstance();
    
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccesses: 0
    };
    
    this.log('SecureCacheIntegrator 초기화됨');
  }
  
  /**
   * SecureCacheIntegrator 인스턴스 초기화 및 반환
   */
  public static initialize(options: SecureCacheIntegratorOptions = {}): SecureCacheIntegrator {
    if (!SecureCacheIntegrator.instance) {
      SecureCacheIntegrator.instance = new SecureCacheIntegrator(options);
    }
    return SecureCacheIntegrator.instance;
  }
  
  /**
   * 현재 인스턴스 반환
   */
  public static getInstance(): SecureCacheIntegrator {
    if (!SecureCacheIntegrator.instance) {
      throw new Error('SecureCacheIntegrator가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
    }
    return SecureCacheIntegrator.instance;
  }
  
  /**
   * 캐시에 데이터 저장 (보안 기능 적용)
   */
  public async setSecureItem<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: number;
      forceEncrypt?: boolean;
      dataType?: string;
      skipIntegrityCheck?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const normalizedKey = this.normalizeKey(key);
      const fullDataKey = `${this.dataPrefix}${normalizedKey}`;
      const fullMetaKey = `${this.metadataPrefix}${normalizedKey}`;
      
      // 데이터 크기 계산
      const dataSize = this.calculateSize(data);
      
      // 암호화 여부 결정
      const shouldEncrypt = options.forceEncrypt || 
        (!options.skipEncrypt && this.securityManager.shouldEncrypt(key, data));
      
      // 메타데이터 생성
      const metadata: SecureCacheItemMetadata = {
        key: normalizedKey,
        size: dataSize,
        accessCount: 0,
        lastAccessed: Date.now(),
        created: Date.now(),
        ttl: options.ttl || this.securityManager.defaultTTL || 0,
        dataType: options.dataType || this.detectDataType(data),
        priority: options.priority || 1,
        isEncrypted: shouldEncrypt,
        hasIntegrityCheck: shouldEncrypt && this.securityManager.enableIntegrityCheck && !options.skipIntegrityCheck
      };
      
      // 필요시 데이터 암호화
      let processedData: any = data;
      if (shouldEncrypt) {
        processedData = this.securityManager.encrypt(data);
      } else {
        processedData = JSON.stringify(data);
      }
      
      // 무결성 체크 추가
      if (metadata.hasIntegrityCheck) {
        const hash = CryptoJS.SHA256(JSON.stringify(data)).toString();
        processedData = {
          data: processedData,
          hash
        };
      }
      
      // 오프라인 데이터 관리자를 통해 저장 (백그라운드에서 암호화 및 압축)
      await this.offlineDataManager.cacheData(fullDataKey, processedData, {
        compression: dataSize > 1024, // 1KB 이상이면 압축
        ttl: metadata.ttl
      });
      
      // 메타데이터 저장
      await AsyncStorage.setItem(fullMetaKey, JSON.stringify(metadata));
      
      this.log(`아이템 저장됨: ${key}, 암호화: ${shouldEncrypt}, 크기: ${dataSize} 바이트`);
      
      // 자동 최적화 체크
      await this.checkAutoOptimize();
      
      return true;
    } catch (error) {
      this.log(`아이템 저장 실패: ${key}`, error);
      return false;
    }
  }
  
  /**
   * 캐시에서 데이터 조회 (보안 기능 적용)
   */
  public async getSecureItem<T>(key: string): Promise<CacheResult<T>> {
    try {
      const normalizedKey = this.normalizeKey(key);
      const fullDataKey = `${this.dataPrefix}${normalizedKey}`;
      const fullMetaKey = `${this.metadataPrefix}${normalizedKey}`;
      
      this.stats.totalAccesses++;
      
      // 메타데이터 조회
      const metaStr = await AsyncStorage.getItem(fullMetaKey);
      if (!metaStr) {
        this.stats.misses++;
        this.log(`캐시 미스: ${key}`);
        return {
          data: null,
          metadata: null,
          isHit: false,
          isExpired: false,
          isEncrypted: false,
          integrityValid: true
        };
      }
      
      const metadata = JSON.parse(metaStr) as SecureCacheItemMetadata;
      
      // 만료 확인
      const now = Date.now();
      const isExpired = metadata.ttl > 0 && (now - metadata.created) > metadata.ttl;
      if (isExpired) {
        this.stats.misses++;
        this.log(`캐시 만료: ${key}`);
        return {
          data: null,
          metadata,
          isHit: false,
          isExpired: true,
          isEncrypted: metadata.isEncrypted,
          integrityValid: true
        };
      }
      
      // 데이터 조회
      const rawData = await this.offlineDataManager.getData(fullDataKey);
      
      if (!rawData) {
        return {
          data: null,
          metadata,
          isHit: false,
          isExpired,
          isEncrypted: metadata.isEncrypted,
          integrityValid: true
        };
      }
      
      // 데이터 처리
      let resultData: T | null = null;
      let integrityValid = true;
      
      if (metadata.isEncrypted) {
        // 암호화된 데이터 처리
        try {
          // 무결성 검증
          if (metadata.hasIntegrityCheck) {
            integrityValid = this.securityManager.validateIntegrity(rawData);
          }
          
          // 복호화
          resultData = this.securityManager.decrypt(rawData);
        } catch (error) {
          this.log(`복호화 오류: ${key}`, error);
          integrityValid = false;
        }
      } else {
        // 일반 데이터 처리
        try {
          resultData = JSON.parse(rawData) as T;
        } catch (error) {
          this.log(`JSON 파싱 오류: ${key}`, error);
        }
      }
      
      // 메타데이터 업데이트 (접근 횟수, 마지막 접근 시간)
      metadata.accessCount += 1;
      metadata.lastAccessed = now;
      await AsyncStorage.setItem(fullMetaKey, JSON.stringify(metadata));
      
      this.stats.hits++;
      this.log(`캐시 히트: ${key}, 접근 횟수: ${metadata.accessCount}`);
      
      return {
        data: resultData,
        metadata,
        isHit: resultData !== null,
        isExpired,
        isEncrypted: metadata.isEncrypted,
        integrityValid
      };
    } catch (error) {
      this.log(`아이템 조회 실패: ${key}`, error);
      return {
        data: null,
        metadata: null,
        isHit: false,
        isExpired: false,
        isEncrypted: false,
        integrityValid: false
      };
    }
  }
  
  /**
   * 캐시에서 데이터 삭제
   */
  public async removeSecureItem(key: string): Promise<boolean> {
    try {
      const normalizedKey = this.normalizeKey(key);
      const fullDataKey = `${this.dataPrefix}${normalizedKey}`;
      const fullMetaKey = `${this.metadataPrefix}${normalizedKey}`;
      
      // 데이터 및 메타데이터 삭제
      await Promise.all([
        this.offlineDataManager.removeItem(fullDataKey),
        AsyncStorage.removeItem(fullMetaKey)
      ]);
      
      this.log(`아이템 삭제됨: ${key}`);
      return true;
    } catch (error) {
      this.log(`아이템 삭제 실패: ${key}`, error);
      return false;
    }
  }
  
  /**
   * 캐시 최적화 실행
   */
  public async optimizeCache(): Promise<void> {
    try {
      this.log('캐시 최적화 시작');
      
      // 모든 메타데이터 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const metadataKeys = allKeys.filter(key => key.startsWith(this.metadataPrefix));
      
      // 메타데이터 로드
      const metadataValues = await AsyncStorage.multiGet(metadataKeys);
      const cacheItems: SecureCacheItemMetadata[] = metadataValues
        .map(([_, value]) => value && JSON.parse(value))
        .filter(Boolean);
      
      // 현재 캐시 사용량 계산
      const totalSize = cacheItems.reduce((sum, item) => sum + item.size, 0);
      const totalCount = cacheItems.length;
      
      this.log(`현재 캐시 상태: ${totalCount}개 항목, 총 ${totalSize} 바이트`);
      
      // 최적화 실행
      const optimizationResult = this.optimizationManager.optimize(cacheItems);
      
      // 삭제할 항목 처리
      if (optimizationResult.removedItems.length > 0) {
        const keysToRemove: string[] = [];
        const metadataKeysToRemove: string[] = [];
        
        optimizationResult.removedItems.forEach(item => {
          keysToRemove.push(item.key);
          metadataKeysToRemove.push(`${this.metadataPrefix}${item.key}`);
        });
        
        // 데이터 및 메타데이터 일괄 삭제
        await Promise.all([
          AsyncStorage.multiRemove(keysToRemove),
          AsyncStorage.multiRemove(metadataKeysToRemove)
        ]);
        
        this.log(`최적화: ${optimizationResult.removedItems.length}개 항목 제거됨`);
      }
      
      // TTL 조정 처리
      if (optimizationResult.ttlAdjustments && optimizationResult.ttlAdjustments.length > 0) {
        const updates = optimizationResult.ttlAdjustments.map(async adjustment => {
          const metadataKey = `${this.metadataPrefix}${adjustment.key}`;
          const metadataStr = await AsyncStorage.getItem(metadataKey);
          
          if (metadataStr) {
            const metadata = JSON.parse(metadataStr) as SecureCacheItemMetadata;
            metadata.ttl = adjustment.newTtl;
            return AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
          }
          return Promise.resolve();
        });
        
        await Promise.all(updates);
        this.log(`최적화: ${optimizationResult.ttlAdjustments.length}개 항목 TTL 조정됨`);
      }
      
      this.log('캐시 최적화 완료');
    } catch (error) {
      this.log('캐시 최적화 실패', error);
    }
  }
  
  /**
   * 캐시 통계 가져오기
   */
  public async getCacheStats(): Promise<{
    itemCount: number;
    totalSize: number;
    averageSize: number;
    encryptedCount: number;
    encryptedSize: number;
    oldestItem: Date;
    newestItem: Date;
    mostAccessed: { key: string; count: number };
    leastAccessed: { key: string; count: number };
    averageAccessCount: number;
    expirationStats: {
      expired: number;
      valid: number;
      nearExpiration: number;
    };
  }> {
    try {
      // 모든 메타데이터 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const metadataKeys = allKeys.filter(key => key.startsWith(this.metadataPrefix));
      
      // 메타데이터 로드
      const metadataValues = await AsyncStorage.multiGet(metadataKeys);
      const cacheItems: SecureCacheItemMetadata[] = metadataValues
        .map(([_, value]) => value && JSON.parse(value))
        .filter(Boolean);
      
      if (cacheItems.length === 0) {
        return {
          itemCount: 0,
          totalSize: 0,
          averageSize: 0,
          encryptedCount: 0,
          encryptedSize: 0,
          oldestItem: new Date(),
          newestItem: new Date(),
          mostAccessed: { key: '', count: 0 },
          leastAccessed: { key: '', count: 0 },
          averageAccessCount: 0,
          expirationStats: {
            expired: 0,
            valid: 0,
            nearExpiration: 0
          }
        };
      }
      
      // 현재 시간
      const now = Date.now();
      
      // 기본 통계 계산
      const totalSize = cacheItems.reduce((sum, item) => sum + item.size, 0);
      const encryptedItems = cacheItems.filter(item => item.isEncrypted);
      const encryptedSize = encryptedItems.reduce((sum, item) => sum + item.size, 0);
      
      // 생성 시간 기준 정렬
      const sortedByCreation = [...cacheItems].sort((a, b) => a.created - b.created);
      const oldestItem = new Date(sortedByCreation[0].created);
      const newestItem = new Date(sortedByCreation[sortedByCreation.length - 1].created);
      
      // 접근 횟수 기준 정렬
      const sortedByAccess = [...cacheItems].sort((a, b) => a.accessCount - b.accessCount);
      const leastAccessed = {
        key: sortedByAccess[0].key.replace(`${this.namespace}:`, ''),
        count: sortedByAccess[0].accessCount
      };
      const mostAccessed = {
        key: sortedByAccess[sortedByAccess.length - 1].key.replace(`${this.namespace}:`, ''),
        count: sortedByAccess[sortedByAccess.length - 1].accessCount
      };
      
      // 평균 접근 횟수
      const totalAccessCount = cacheItems.reduce((sum, item) => sum + item.accessCount, 0);
      const averageAccessCount = totalAccessCount / cacheItems.length;
      
      // 만료 통계
      const expirationStats = {
        expired: 0,
        valid: 0,
        nearExpiration: 0
      };
      
      cacheItems.forEach(item => {
        const expiration = item.created + item.ttl;
        if (now > expiration) {
          expirationStats.expired++;
        } else if (now > expiration - 86400000) { // 24시간 이내 만료
          expirationStats.nearExpiration++;
        } else {
          expirationStats.valid++;
        }
      });
      
      return {
        itemCount: cacheItems.length,
        totalSize,
        averageSize: totalSize / cacheItems.length,
        encryptedCount: encryptedItems.length,
        encryptedSize,
        oldestItem,
        newestItem,
        mostAccessed,
        leastAccessed,
        averageAccessCount,
        expirationStats
      };
    } catch (error) {
      this.log('캐시 통계 가져오기 실패', error);
      return {
        itemCount: 0,
        totalSize: 0,
        averageSize: 0,
        encryptedCount: 0,
        encryptedSize: 0,
        oldestItem: new Date(),
        newestItem: new Date(),
        mostAccessed: { key: '', count: 0 },
        leastAccessed: { key: '', count: 0 },
        averageAccessCount: 0,
        expirationStats: {
          expired: 0,
          valid: 0,
          nearExpiration: 0
        }
      };
    }
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  public async cleanExpiredItems(): Promise<number> {
    try {
      // 현재 시간
      const now = Date.now();
      
      // 모든 메타데이터 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const metadataKeys = allKeys.filter(key => key.startsWith(this.metadataPrefix));
      
      // 메타데이터 로드
      const metadataValues = await AsyncStorage.multiGet(metadataKeys);
      const expiredItems: string[] = [];
      const expiredMetadataKeys: string[] = [];
      
      metadataValues.forEach(([key, value]) => {
        if (!value) return;
        
        const metadata = JSON.parse(value) as SecureCacheItemMetadata;
        if (now > (metadata.created + metadata.ttl)) {
          expiredItems.push(metadata.key);
          expiredMetadataKeys.push(key);
        }
      });
      
      // 만료된 항목이 있는 경우 삭제
      if (expiredItems.length > 0) {
        await Promise.all([
          AsyncStorage.multiRemove(expiredItems),
          AsyncStorage.multiRemove(expiredMetadataKeys)
        ]);
      }
      
      this.log(`만료된 항목 정리: ${expiredItems.length}개 항목 제거됨`);
      return expiredItems.length;
    } catch (error) {
      this.log('만료된 항목 정리 실패', error);
      return 0;
    }
  }
  
  /**
   * 암호화 키 순환
   */
  public async rotateEncryptionKey(newKey: string): Promise<boolean> {
    try {
      this.log('암호화 키 순환 시작');
      
      // 보안 관리자에서 키 순환 실행
      const result = await this.securityManager.rotateEncryptionKey(newKey);
      
      this.log(`암호화 키 순환 ${result ? '성공' : '실패'}`);
      return result;
    } catch (error) {
      this.log('암호화 키 순환 실패', error);
      return false;
    }
  }
  
  /**
   * 모든 캐시 데이터 지우기
   */
  public async clearAll(): Promise<boolean> {
    try {
      // 네임스페이스에 해당하는 모든 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        key => key.startsWith(this.namespace) || key.startsWith(this.metadataPrefix)
      );
      
      // 모든 캐시 삭제
      await AsyncStorage.multiRemove(cacheKeys);
      
      this.log(`모든 캐시 데이터 지움: ${cacheKeys.length}개 항목`);
      return true;
    } catch (error) {
      this.log('캐시 데이터 지우기 실패', error);
      return false;
    }
  }
  
  /**
   * 데이터 크기 추정
   */
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // UTF-16 문자열 기준 (2바이트 문자)
    } catch (error) {
      return 100; // 추정 실패 시 기본값
    }
  }
  
  /**
   * 디버그 로그 출력
   */
  private log(message: string, error?: any): void {
    if (this.debugMode) {
      console.log(`[SecureCacheIntegrator] ${message}`);
      if (error) {
        console.error(error);
      }
    }
  }
  
  /**
   * 자동 최적화 필요성 확인 및 실행
   */
  private async checkAutoOptimize(): Promise<void> {
    if (!this.optimizationManager.autoOptimizeThreshold) return;
    
    try {
      // 현재 캐시 상태 확인
      const stats = await this.getCacheStats();
      const currentSizeRatio = this.optimizationManager.maxSize
        ? stats.totalSize / this.optimizationManager.maxSize
        : 0;
      
      const currentCountRatio = this.optimizationManager.maxCount
        ? stats.itemCount / this.optimizationManager.maxCount
        : 0;
      
      // 임계값 초과 시 최적화 실행
      if (currentSizeRatio > this.optimizationManager.autoOptimizeThreshold ||
          currentCountRatio > this.optimizationManager.autoOptimizeThreshold) {
        this.log(`자동 최적화 트리거됨 (크기 비율: ${currentSizeRatio.toFixed(2)}, 개수 비율: ${currentCountRatio.toFixed(2)})`);
        await this.optimizeCache();
      }
    } catch (error) {
      this.log('자동 최적화 체크 실패', error);
    }
  }
  
  /**
   * 데이터 타입 감지
   * @param data 데이터
   * @returns 추측된 데이터 타입
   */
  private detectDataType(data: any): string {
    if (data === null || data === undefined) return 'null';
    if (Array.isArray(data)) return 'array';
    
    const type = typeof data;
    if (type !== 'object') return type;
    
    // 객체 타입 세분화
    if (data instanceof Date) return 'date';
    if (data.constructor && data.constructor.name !== 'Object') {
      return data.constructor.name.toLowerCase();
    }
    
    // 특정 패턴이 있는 객체 감지
    if (data.id && data.name) return 'entity';
    if (data.token || data.accessToken) return 'auth';
    if (data.lat && data.lng) return 'location';
    if (data.width && data.height) return 'dimension';
    
    return 'object';
  }
  
  /**
   * 데이터 크기 계산 (대략적인 추정)
   * @param data 데이터
   * @returns 크기 (바이트)
   */
  private calculateSize(data: any): number {
    try {
      const jsonStr = JSON.stringify(data);
      return jsonStr.length * 2; // UTF-16 문자 가정
    } catch (e) {
      return 100; // 기본값
    }
  }
  
  /**
   * 캐시 키 정규화
   * @param key 키
   * @returns 정규화된 키
   */
  private normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_.-]/g, '_');
  }
}

// 내보낼 기본 인스턴스 및 유틸리티 함수
export const initializeSecureCache = SecureCacheIntegrator.initialize;
export const getSecureCacheInstance = SecureCacheIntegrator.getInstance; 