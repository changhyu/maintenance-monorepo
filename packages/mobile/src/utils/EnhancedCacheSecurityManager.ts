import { AES, enc, HmacSHA256, lib } from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkErrorManager } from './NetworkErrorManager';

/**
 * 보안 관리자 초기화 옵션 인터페이스
 */
export interface SecurityManagerOptions {
  encryptionKey?: string;
  encryptionPrefix?: string;
  enableEncryption?: boolean;
  enableIntegrityCheck?: boolean;
  autoDetectSensitiveData?: boolean;
  sensitiveKeyPatterns?: string[];
  storageKeyPrefix?: string;
  keyRotationInterval?: number; // 밀리초 단위
}

/**
 * 암호화 옵션 인터페이스
 */
export interface EncryptionOptions {
  encrypt?: boolean;
  validateIntegrity?: boolean;
  iv?: string;
  additionalAuthData?: string;
}

/**
 * 보안 관련 통계 인터페이스
 */
export interface SecurityStats {
  encryptedItems: number;
  integrityVerifications: number;
  failedVerifications: number;
  keyRotations: number;
  lastKeyRotation: number | null;
}

/**
 * 캐시 보안 관리자 클래스
 * 캐시 데이터의 암호화, 복호화, 무결성 검증을 담당
 */
export class EnhancedCacheSecurityManager {
  private static instance: EnhancedCacheSecurityManager | null = null;
  private encryptionKey: string;
  private encryptionPrefix: string;
  private enableEncryption: boolean;
  private enableIntegrityCheck: boolean;
  private autoDetectSensitiveData: boolean;
  private sensitiveKeyPatterns: RegExp[];
  private storageKeyPrefix: string;
  private keyRotationInterval: number;
  private lastKeyRotation: number;
  private networkManager: NetworkErrorManager;
  private securityStats: SecurityStats;

  private constructor(options: SecurityManagerOptions = {}) {
    this.encryptionKey = options.encryptionKey || 'default_encryption_key';
    this.encryptionPrefix = options.encryptionPrefix || 'encrypted:';
    this.enableEncryption = options.enableEncryption !== undefined ? options.enableEncryption : true;
    this.enableIntegrityCheck = options.enableIntegrityCheck !== undefined ? options.enableIntegrityCheck : true;
    this.autoDetectSensitiveData = options.autoDetectSensitiveData !== undefined ? options.autoDetectSensitiveData : true;
    this.sensitiveKeyPatterns = (options.sensitiveKeyPatterns || [
      'password',
      'token',
      'secret',
      'credential',
      'payment',
      'card',
      'ssn',
      'creditcard',
      'auth'
    ]).map(pattern => new RegExp(pattern, 'i'));
    this.storageKeyPrefix = options.storageKeyPrefix || 'security_';
    this.keyRotationInterval = options.keyRotationInterval || 7 * 24 * 60 * 60 * 1000; // 기본 1주일
    this.lastKeyRotation = Date.now();
    this.networkManager = NetworkErrorManager.getInstance();
    this.securityStats = {
      encryptedItems: 0,
      integrityVerifications: 0,
      failedVerifications: 0,
      keyRotations: 0,
      lastKeyRotation: null
    };

    // 보안 통계 로드
    this.loadSecurityStats();
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): EnhancedCacheSecurityManager {
    if (!EnhancedCacheSecurityManager.instance) {
      throw new Error('EnhancedCacheSecurityManager not initialized. Call initializeSecurityManager first.');
    }
    return EnhancedCacheSecurityManager.instance;
  }

  /**
   * 보안 관리자 초기화
   */
  public static initialize(options: SecurityManagerOptions = {}): EnhancedCacheSecurityManager {
    if (!EnhancedCacheSecurityManager.instance) {
      EnhancedCacheSecurityManager.instance = new EnhancedCacheSecurityManager(options);
    }
    return EnhancedCacheSecurityManager.instance;
  }

  /**
   * 데이터 민감도 검사
   */
  public isSensitiveData(key: string, value?: any): boolean {
    // 키 기반 검사
    if (this.sensitiveKeyPatterns.some(pattern => pattern.test(key))) {
      return true;
    }

    // 값 기반 검사 (객체인 경우)
    if (value && typeof value === 'object') {
      // 객체 내 중첩된 키 검사
      const stringified = JSON.stringify(value);
      return this.sensitiveKeyPatterns.some(pattern => pattern.test(stringified));
    }

    return false;
  }

  /**
   * 암호화가 필요한지 결정
   */
  public shouldEncrypt(key: string, value: any, options?: EncryptionOptions): boolean {
    if (!this.enableEncryption) {
      return false;
    }

    // 옵션에서 명시적으로 지정한 경우
    if (options && options.encrypt !== undefined) {
      return options.encrypt;
    }

    // 자동 감지 활성화된 경우
    if (this.autoDetectSensitiveData) {
      return this.isSensitiveData(key, value);
    }

    return false;
  }

  /**
   * 데이터 암호화
   */
  public encrypt(data: any, options: EncryptionOptions = {}): string {
    if (!this.enableEncryption) {
      return JSON.stringify(data);
    }

    const jsonData = JSON.stringify(data);
    
    // IV 생성 또는 제공된 값 사용
    const iv = options.iv 
      ? enc.Hex.parse(options.iv) 
      : lib.WordArray.random(16);
    
    // 암호화
    const encrypted = AES.encrypt(jsonData, this.encryptionKey, { 
      iv,
      mode: lib.mode.CBC,
      padding: lib.pad.Pkcs7
    });
    
    // 무결성 검사를 위한 HMAC
    let hmac = '';
    if (this.enableIntegrityCheck) {
      const authData = options.additionalAuthData || '';
      hmac = HmacSHA256(
        encrypted.toString() + iv.toString() + authData,
        this.encryptionKey
      ).toString();
    }
    
    // 암호화된 데이터, IV, HMAC을 함께 저장
    const result = {
      data: encrypted.toString(),
      iv: iv.toString(),
      hmac: hmac,
      timestamp: Date.now()
    };
    
    this.securityStats.encryptedItems++;
    this.saveSecurityStats();
    
    return this.encryptionPrefix + JSON.stringify(result);
  }

  /**
   * 데이터 복호화
   */
  public decrypt(encryptedData: string, options: EncryptionOptions = {}): any {
    if (!encryptedData.startsWith(this.encryptionPrefix)) {
      // 암호화되지 않은 데이터로 간주
      try {
        return JSON.parse(encryptedData);
      } catch (e) {
        return encryptedData; // JSON이 아닌 경우
      }
    }
    
    try {
      // 접두사 제거
      const jsonStr = encryptedData.substring(this.encryptionPrefix.length);
      const { data, iv, hmac, timestamp } = JSON.parse(jsonStr);
      
      // 무결성 검사
      if (this.enableIntegrityCheck && options.validateIntegrity !== false) {
        this.securityStats.integrityVerifications++;
        
        const authData = options.additionalAuthData || '';
        const expectedHmac = HmacSHA256(
          data + iv + authData,
          this.encryptionKey
        ).toString();
        
        if (hmac !== expectedHmac) {
          this.securityStats.failedVerifications++;
          this.saveSecurityStats();
          throw new Error('암호화된 데이터의 무결성 검증 실패');
        }
      }
      
      // 복호화
      const decrypted = AES.decrypt(data, this.encryptionKey, {
        iv: enc.Hex.parse(iv),
        mode: lib.mode.CBC,
        padding: lib.pad.Pkcs7
      });
      
      const decryptedStr = decrypted.toString(enc.Utf8);
      if (!decryptedStr) {
        throw new Error('데이터 복호화 실패');
      }
      
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.error('복호화 오류:', error);
      return null;
    }
  }

  /**
   * 데이터의 무결성 검증
   */
  public validateIntegrity(encryptedData: string, additionalAuthData?: string): boolean {
    if (!this.enableIntegrityCheck || !encryptedData.startsWith(this.encryptionPrefix)) {
      return true; // 검증 불필요 또는 암호화되지 않은 데이터
    }
    
    try {
      // 접두사 제거
      const jsonStr = encryptedData.substring(this.encryptionPrefix.length);
      const { data, iv, hmac } = JSON.parse(jsonStr);
      
      this.securityStats.integrityVerifications++;
      
      // HMAC 계산
      const expectedHmac = HmacSHA256(
        data + iv + (additionalAuthData || ''),
        this.encryptionKey
      ).toString();
      
      const isValid = hmac === expectedHmac;
      
      if (!isValid) {
        this.securityStats.failedVerifications++;
        this.saveSecurityStats();
      }
      
      return isValid;
    } catch (error) {
      this.securityStats.failedVerifications++;
      this.saveSecurityStats();
      console.error('무결성 검증 오류:', error);
      return false;
    }
  }

  /**
   * 암호화 키 순환
   */
  public async rotateEncryptionKey(newKey?: string): Promise<boolean> {
    if (!newKey) {
      // 자동 생성된 키 사용
      newKey = lib.WordArray.random(32).toString();
    }
    
    try {
      // 모든 캐시 키 가져오기
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptedKeys = allKeys.filter(key => {
        const value = AsyncStorage.getItem(key)
          .then(val => val && val.startsWith(this.encryptionPrefix));
        return value;
      });
      
      // 모든 암호화된 항목 재암호화
      let success = true;
      for (const key of encryptedKeys) {
        try {
          const encryptedValue = await AsyncStorage.getItem(key);
          if (encryptedValue) {
            // 현재 키로 복호화
            const decrypted = this.decrypt(encryptedValue);
            
            // 새 키로 암호화
            const oldKey = this.encryptionKey;
            this.encryptionKey = newKey;
            const reEncrypted = this.encrypt(decrypted);
            
            // 저장
            await AsyncStorage.setItem(key, reEncrypted);
            
            // 실패 시 롤백을 위해 임시로 이전 키 유지
            this.encryptionKey = oldKey;
          }
        } catch (error) {
          success = false;
          console.error(`키 ${key}의 재암호화 실패:`, error);
        }
      }
      
      if (success) {
        // 모든 항목이 성공적으로 재암호화되면 새 키로 전환
        this.encryptionKey = newKey;
        this.lastKeyRotation = Date.now();
        
        this.securityStats.keyRotations++;
        this.securityStats.lastKeyRotation = this.lastKeyRotation;
        this.saveSecurityStats();
        
        // 마지막 키 순환 시간 기록
        await AsyncStorage.setItem(
          `${this.storageKeyPrefix}last_key_rotation`,
          this.lastKeyRotation.toString()
        );
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('암호화 키 순환 오류:', error);
      return false;
    }
  }

  /**
   * 키 순환이 필요한지 확인
   */
  public isKeyRotationNeeded(): boolean {
    return Date.now() - this.lastKeyRotation > this.keyRotationInterval;
  }

  /**
   * 보안 관련 통계 가져오기
   */
  public getSecurityStats(): SecurityStats {
    return { ...this.securityStats };
  }

  /**
   * 보안 통계 로드
   */
  private async loadSecurityStats(): Promise<void> {
    try {
      const statsJson = await AsyncStorage.getItem(`${this.storageKeyPrefix}security_stats`);
      if (statsJson) {
        this.securityStats = JSON.parse(statsJson);
      }
      
      const lastRotation = await AsyncStorage.getItem(`${this.storageKeyPrefix}last_key_rotation`);
      if (lastRotation) {
        this.lastKeyRotation = parseInt(lastRotation, 10);
        this.securityStats.lastKeyRotation = this.lastKeyRotation;
      }
    } catch (error) {
      console.error('보안 통계 로드 오류:', error);
    }
  }

  /**
   * 보안 통계 저장
   */
  private async saveSecurityStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.storageKeyPrefix}security_stats`,
        JSON.stringify(this.securityStats)
      );
    } catch (error) {
      console.error('보안 통계 저장 오류:', error);
    }
  }

  /**
   * 모든 보안 관련 데이터 정리
   */
  public async clearSecurityData(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const securityKeys = allKeys.filter(key => 
        key.startsWith(this.storageKeyPrefix)
      );
      
      if (securityKeys.length > 0) {
        await AsyncStorage.multiRemove(securityKeys);
      }
      
      // 통계 초기화
      this.securityStats = {
        encryptedItems: 0,
        integrityVerifications: 0,
        failedVerifications: 0,
        keyRotations: 0,
        lastKeyRotation: null
      };
    } catch (error) {
      console.error('보안 데이터 정리 오류:', error);
    }
  }
}

/**
 * 보안 관리자 초기화 함수
 */
export const initializeSecurityManager = (options: SecurityManagerOptions = {}): EnhancedCacheSecurityManager => {
  return EnhancedCacheSecurityManager.initialize(options);
};

/**
 * 보안 관리자 인스턴스 가져오기
 */
export const getSecurityManager = (): EnhancedCacheSecurityManager => {
  return EnhancedCacheSecurityManager.getInstance();
}; 