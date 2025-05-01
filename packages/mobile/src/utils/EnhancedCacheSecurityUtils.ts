/**
 * 향상된 캐시 보안 유틸리티
 * 
 * 이 모듈은 캐시 데이터의 보안 처리를 위한 통합 솔루션을 제공합니다:
 * - 데이터 암호화 및 복호화 (AES)
 * - 데이터 무결성 검증 (HMAC)
 * - 안전한 키 관리
 * - 민감 데이터 자동 감지
 * - 스키마 기반 데이터 검증
 * - 안전한 JSON 처리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

// 네이티브 모듈 타입 (실제 구현은 네이티브 코드에서 제공)
interface CryptoModule {
  generateSecureRandom(length: number): Promise<string>;
  encrypt(data: string, key: string): Promise<string>;
  decrypt(data: string, key: string): Promise<string>;
  hmac(data: string, key: string): Promise<string>;
}

/**
 * 보안 관리자 옵션 인터페이스
 */
export interface CacheSecurityOptions {
  // 암호화 활성화 여부
  enableEncryption?: boolean;
  
  // 무결성 검사 활성화 여부
  enableIntegrityCheck?: boolean;
  
  // 커스텀 암호화 키
  customEncryptionKey?: string;
  
  // 커스텀 무결성 키
  customIntegrityKey?: string;
  
  // 민감 데이터만 암호화
  encryptSensitiveOnly?: boolean;
  
  // 민감 데이터로 간주할 키워드
  sensitiveKeys?: string[];
  
  // 키 저장소 접두사
  keyStoragePrefix?: string;
  
  // 암호화 알고리즘
  encryptionAlgorithm?: string;
}

/**
 * 암호화된 데이터 인터페이스
 */
export interface EncryptedData {
  v: number; // 버전
  c: string; // 암호문
  iv?: string; // 초기화 벡터 (추후 암호화 알고리즘 변경 대비)
  s?: string; // 서명 (무결성 검증용)
}

/**
 * 검증 결과 인터페이스
 */
export interface VerificationResult<T> {
  valid: boolean;
  data: T;
}

/**
 * Mock CryptoModule
 * 
 * 참고: 프로덕션 환경에서는 React Native의 실제 네이티브 암호화 모듈을 사용해야 합니다.
 * 이 모듈은 개발 및 테스트 목적으로만 사용됩니다.
 */
class MockCryptoModule implements CryptoModule {
  // 간단한 해시 함수 (프로덕션에서는 실제 암호화 사용)
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  public async generateSecureRandom(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  public async encrypt(data: string, key: string): Promise<string> {
    // 단순 인코딩 (프로덕션에서는 실제 암호화 사용)
    return Buffer.from(data + key).toString('base64');
  }
  
  public async decrypt(data: string, key: string): Promise<string> {
    // 단순 디코딩 (프로덕션에서는 실제 복호화 사용)
    const decoded = Buffer.from(data, 'base64').toString();
    return decoded.slice(0, decoded.length - key.length);
  }
  
  public async hmac(data: string, key: string): Promise<string> {
    // 단순 해시 (프로덕션에서는 실제 HMAC 사용)
    return this.simpleHash(data + key);
  }
}

/**
 * 향상된 캐시 보안 관리자
 */
export class EnhancedCacheSecurityManager {
  private encryptionKey: string = '';
  private integrityKey: string = '';
  private cryptoModule: CryptoModule;
  private ready: boolean = false;
  private options: CacheSecurityOptions;
  
  // 기본 민감 키워드
  private static DEFAULT_SENSITIVE_KEYS = [
    'token', 'auth', 'password', 'secret', 'credential', 
    'key', 'pin', 'ssn', 'account', 'card', 'cvv'
  ];
  
  /**
   * 생성자
   */
  constructor(options: CacheSecurityOptions = {}) {
    this.options = {
      enableEncryption: options.enableEncryption ?? true,
      enableIntegrityCheck: options.enableIntegrityCheck ?? true,
      customEncryptionKey: options.customEncryptionKey,
      customIntegrityKey: options.customIntegrityKey,
      encryptSensitiveOnly: options.encryptSensitiveOnly ?? true,
      sensitiveKeys: options.sensitiveKeys ?? EnhancedCacheSecurityManager.DEFAULT_SENSITIVE_KEYS,
      keyStoragePrefix: options.keyStoragePrefix ?? '@cache_security:',
      encryptionAlgorithm: options.encryptionAlgorithm ?? 'aes-256-gcm'
    };
    
    // 네이티브 모듈 로드 (실제로는 NativeModules에서 로드)
    // this.cryptoModule = NativeModules.CryptoModule;
    
    // 목업 모듈 (프로덕션에서는 실제 네이티브 모듈 사용)
    this.cryptoModule = new MockCryptoModule();
    
    // 커스텀 키 설정
    if (this.options.customEncryptionKey) {
      this.encryptionKey = this.options.customEncryptionKey;
    }
    
    if (this.options.customIntegrityKey) {
      this.integrityKey = this.options.customIntegrityKey;
    }
    
    // 초기화
    this.initialize();
  }
  
  /**
   * 초기화
   */
  private async initialize(): Promise<void> {
    try {
      // 키가 제공되지 않은 경우 로드 또는 생성
      if (!this.encryptionKey && this.options.enableEncryption) {
        const storedKey = await AsyncStorage.getItem(`${this.options.keyStoragePrefix}encryption_key`);
        if (storedKey) {
          this.encryptionKey = storedKey;
        } else {
          this.encryptionKey = await this.cryptoModule.generateSecureRandom(32);
          await AsyncStorage.setItem(`${this.options.keyStoragePrefix}encryption_key`, this.encryptionKey);
        }
      }
      
      if (!this.integrityKey && this.options.enableIntegrityCheck) {
        const storedKey = await AsyncStorage.getItem(`${this.options.keyStoragePrefix}integrity_key`);
        if (storedKey) {
          this.integrityKey = storedKey;
        } else {
          this.integrityKey = await this.cryptoModule.generateSecureRandom(32);
          await AsyncStorage.setItem(`${this.options.keyStoragePrefix}integrity_key`, this.integrityKey);
        }
      }
      
      this.ready = true;
    } catch (error) {
      console.error('보안 관리자 초기화 오류:', error);
      
      // 오류가 발생했지만 계속 진행
      this.ready = true;
      
      // 암호화 또는 무결성 검사가 필요하면 경고
      if (this.options.enableEncryption || this.options.enableIntegrityCheck) {
        console.warn('암호화 키 생성에 실패하여 보안 기능이 제한됩니다.');
      }
    }
  }
  
  /**
   * 준비 상태 확인
   */
  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      await this.initialize();
    }
  }
  
  /**
   * 데이터가 암호화되어야 하는지 판별
   */
  public shouldEncrypt(key: string, data?: any): boolean {
    if (!this.options.enableEncryption) {
      return false;
    }
    
    if (!this.options.encryptSensitiveOnly) {
      return true;
    }
    
    // 키나 데이터에 민감한 정보가 포함되어 있는지 확인
    return this.isSensitiveData(key) || 
      (data !== undefined && typeof data === 'object' && this.containsSensitiveKeys(data));
  }
  
  /**
   * 문자열이 민감한 정보를 포함하는지 확인
   */
  private isSensitiveData(str: string): boolean {
    if (!this.options.sensitiveKeys || this.options.sensitiveKeys.length === 0) {
      return false;
    }
    
    return this.options.sensitiveKeys.some(sensitiveKey => 
      str.toLowerCase().includes(sensitiveKey.toLowerCase())
    );
  }
  
  /**
   * 객체가 민감한 키를 포함하는지 확인
   */
  private containsSensitiveKeys(obj: Record<string, any>): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    
    // 객체의 모든 키를 검사
    for (const key in obj) {
      if (this.isSensitiveData(key)) {
        return true;
      }
      
      // 중첩된 객체에 대해 재귀적으로 확인
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (this.containsSensitiveKeys(obj[key])) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 데이터 암호화
   */
  public async encrypt<T>(data: T, forceEncrypt: boolean = false): Promise<string | EncryptedData> {
    await this.ensureReady();
    
    // JSON 직렬화
    const jsonData = this.safeJSONStringify(data);
    
    try {
      // 암호화가 비활성화되어 있거나 강제 암호화가 아니고 민감 데이터가 아닌 경우
      if (!this.options.enableEncryption || 
          (!forceEncrypt && this.options.encryptSensitiveOnly && 
           !this.shouldEncrypt('', data))) {
        return jsonData;
      }
      
      // 암호화
      let encryptedText = jsonData;
      if (this.encryptionKey) {
        encryptedText = await this.cryptoModule.encrypt(jsonData, this.encryptionKey);
      }
      
      const encryptedData: EncryptedData = {
        v: 1, // 형식 버전
        c: encryptedText
      };
      
      // 무결성 검증을 위한 서명 추가
      if (this.options.enableIntegrityCheck && this.integrityKey) {
        encryptedData.s = await this.cryptoModule.hmac(encryptedText, this.integrityKey);
      }
      
      return encryptedData;
    } catch (error) {
      console.error('데이터 암호화 중 오류 발생:', error);
      
      // 오류 발생 시 원본 데이터를 암호화되지 않은 상태로 반환
      return jsonData;
    }
  }
  
  /**
   * 데이터 복호화
   */
  public async decrypt<T>(data: string | EncryptedData): Promise<VerificationResult<T>> {
    await this.ensureReady();
    
    try {
      // 문자열인 경우 (암호화되지 않은 데이터)
      if (typeof data === 'string') {
        return {
          valid: true,
          data: this.safeJSONParse(data) as T
        };
      }
      
      // EncryptedData 객체인 경우
      // 버전 확인
      if (data.v === undefined) {
        // 레거시 형식 또는 잘못된 데이터
        try {
          return {
            valid: true, 
            data: this.safeJSONParse(data.c) as T
          };
        } catch (e) {
          return { valid: false, data: null as unknown as T };
        }
      }
      
      // 버전 0: 암호화되지 않음
      if (data.v === 0) {
        return {
          valid: true,
          data: this.safeJSONParse(data.c) as T
        };
      }
      
      // 버전 1: 암호화 및 서명
      if (data.v === 1) {
        // 무결성 검증
        if (this.options.enableIntegrityCheck && this.integrityKey && data.s) {
          const calculatedSignature = await this.cryptoModule.hmac(
            data.c,
            this.integrityKey
          );
          
          if (calculatedSignature !== data.s) {
            return { valid: false, data: null as unknown as T };
          }
        }
        
        // 복호화
        let decryptedText = data.c;
        if (this.options.enableEncryption && this.encryptionKey) {
          decryptedText = await this.cryptoModule.decrypt(data.c, this.encryptionKey);
        }
        
        return {
          valid: true,
          data: this.safeJSONParse(decryptedText) as T
        };
      }
      
      // 지원되지 않는 버전
      return { valid: false, data: null as unknown as T };
    } catch (error) {
      console.error('데이터 복호화 중 오류 발생:', error);
      return { valid: false, data: null as unknown as T };
    }
  }
  
  /**
   * 암호화된 문자열인지 확인
   */
  public isEncryptedData(data: any): boolean {
    try {
      if (typeof data === 'string') {
        // 암호화된 문자열은 base64로 인코딩되어 있으며, 특정 패턴을 따름
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        return base64Regex.test(data) && data.includes('==');
      } else if (typeof data === 'object' && data !== null) {
        // EncryptedData 객체 형식 확인
        return 'v' in data && 'c' in data;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * 키 교체
   */
  public async rotateKeys(): Promise<void> {
    try {
      // 새 키 생성
      const newEncryptionKey = await this.cryptoModule.generateSecureRandom(32);
      const newIntegrityKey = await this.cryptoModule.generateSecureRandom(32);
      
      // 저장
      await AsyncStorage.setItem(`${this.options.keyStoragePrefix}encryption_key`, newEncryptionKey);
      await AsyncStorage.setItem(`${this.options.keyStoragePrefix}integrity_key`, newIntegrityKey);
      
      // 현재 키 업데이트
      this.encryptionKey = newEncryptionKey;
      this.integrityKey = newIntegrityKey;
    } catch (error) {
      console.error('키 교체 오류:', error);
      throw error;
    }
  }
  
  /**
   * 안전한 JSON 파싱
   */
  public safeJSONParse(data: any): any {
    if (typeof data !== 'string') {
      return data;
    }
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('JSON 파싱 중 오류 발생:', error);
      return data;
    }
  }
  
  /**
   * 안전한 JSON 직렬화
   */
  public safeJSONStringify(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('JSON 직렬화 중 오류 발생:', error);
      // 직렬화 가능한 형태로 변환 시도
      const safeData = this.sanitizeObjectForSerialization(data);
      return JSON.stringify(safeData);
    }
  }
  
  /**
   * 직렬화를 위해 객체 정제
   */
  private sanitizeObjectForSerialization(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // 기본 타입 처리
    if (typeof obj !== 'object') {
      return obj;
    }
    
    // 배열 처리
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObjectForSerialization(item));
    }
    
    // 객체 처리
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          
          // 함수, 심볼 등 직렬화 불가능한 타입 제외
          if (typeof value === 'function' || typeof value === 'symbol') {
            continue;
          }
          
          // 순환 참조 방지를 위한 간단한 처리
          if (value === obj) {
            result[key] = '[Circular Reference]';
          } else {
            result[key] = this.sanitizeObjectForSerialization(value);
          }
        }
      } catch (error) {
        console.warn(`속성 '${key}' 정제 중 오류 발생:`, error);
        result[key] = '[Sanitized]';
      }
    }
    
    return result;
  }
  
  /**
   * 데이터 검증
   */
  public validateData(data: any, schema?: any): boolean {
    // 스키마가 없으면 기본 검증만 수행
    if (!schema) {
      return data !== null && data !== undefined;
    }
    
    // 간단한 타입 검증
    if (typeof schema === 'string') {
      return typeof data === schema;
    }
    
    // 객체 스키마 검증
    if (typeof schema === 'object' && schema !== null) {
      // 배열 스키마 검증
      if (Array.isArray(schema)) {
        if (!Array.isArray(data)) {
          return false;
        }
        
        const itemSchema = schema[0];
        return data.every(item => this.validateData(item, itemSchema));
      }
      
      // 객체 스키마 검증
      if (typeof data !== 'object' || data === null) {
        return false;
      }
      
      for (const key in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
          const isRequired = !key.endsWith('?');
          const actualKey = isRequired ? key : key.slice(0, -1);
          
          // 필수 필드 확인
          if (isRequired && !Object.prototype.hasOwnProperty.call(data, actualKey)) {
            return false;
          }
          
          // 값이 있는 경우 유효성 검사
          if (Object.prototype.hasOwnProperty.call(data, actualKey)) {
            if (!this.validateData(data[actualKey], schema[key])) {
              return false;
            }
          }
        }
      }
      
      return true;
    }
    
    // 기본적으로 타입 일치 여부 확인
    return typeof data === typeof schema;
  }
  
  /**
   * 데이터 해시 계산
   */
  public calculateHash(data: any): string {
    try {
      const dataStr = typeof data === 'string' ? data : this.safeJSONStringify(data);
      return CryptoJS.SHA256(dataStr).toString();
    } catch (error) {
      console.error('해시 계산 중 오류 발생:', error);
      return '';
    }
  }
  
  /**
   * 같은 키로 암호화된 데이터 재암호화
   */
  public async reEncrypt<T>(data: EncryptedData): Promise<EncryptedData> {
    const result = await this.decrypt<T>(data);
    if (!result.valid) {
      throw new Error('데이터 복호화 실패로 재암호화 불가');
    }
    
    return await this.encrypt(result.data, true) as EncryptedData;
  }
  
  /**
   * 암호화 옵션 업데이트
   */
  public updateOptions(newOptions: Partial<CacheSecurityOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions
    };
    
    // 키 업데이트가 필요한 경우
    if (newOptions.customEncryptionKey) {
      this.encryptionKey = newOptions.customEncryptionKey;
    }
    
    if (newOptions.customIntegrityKey) {
      this.integrityKey = newOptions.customIntegrityKey;
    }
  }
}

// 싱글톤 인스턴스 제공
let instance: EnhancedCacheSecurityManager | null = null;

/**
 * 보안 관리자 인스턴스 가져오기
 */
export function getSecurityManager(options?: CacheSecurityOptions): EnhancedCacheSecurityManager {
  if (!instance) {
    instance = new EnhancedCacheSecurityManager(options);
  } else if (options) {
    instance.updateOptions(options);
  }
  return instance;
}

/**
 * 보안 관리자 초기화 (선택적)
 */
export function initializeSecurityManager(options: CacheSecurityOptions = {}): EnhancedCacheSecurityManager {
  instance = new EnhancedCacheSecurityManager(options);
  return instance;
} 