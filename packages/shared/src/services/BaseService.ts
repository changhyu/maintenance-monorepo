import { getCache, setCache } from '../utils/cacheUtils';
import { errorLogger } from '../utils/errorLogger';
import { securityUtils } from '../utils/securityUtils';

export interface ServiceOptions {
  cacheDuration?: number;
  enableLogging?: boolean;
  securityOptions?: {
    validateInput?: boolean;
    sanitizeOutput?: boolean;
  };
}

const DEFAULT_OPTIONS: Required<ServiceOptions> = {
  cacheDuration: 3600000, // 1시간
  enableLogging: true,
  securityOptions: {
    validateInput: true,
    sanitizeOutput: true
  }
};

export abstract class BaseService {
  protected options: Required<ServiceOptions>;

  constructor(options: ServiceOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 캐시된 데이터 조회
   */
  protected async getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = getCache(key) as T | null;
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    setCache(key, data);
    return data;
  }

  /**
   * 입력값 검증 및 정제
   */
  protected validateAndSanitize<T extends Record<string, unknown>>(
    data: T,
    schema: Record<keyof T, {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      pattern?: RegExp;
      validate?: (value: unknown) => boolean;
    }>
  ): { isValid: boolean; sanitized: Partial<T>; errors: string[] } {
    const errors: string[] = [];
    const sanitized: Partial<T> = {};

    for (const [key, value] of Object.entries(data)) {
      const rules = schema[key as keyof T];
      
      if (!rules) {
        continue;
      }

      const validationResult = this.validateField(key, value, rules);
      
      if (validationResult.hasError) {
        errors.push(validationResult.errorMessage);
        continue;
      }
      
      sanitized[key as keyof T] = this.sanitizeValue(key, value, rules) as T[keyof T];
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }

  /**
   * 단일 필드 검증
   */
  private validateField(
    key: string, 
    value: unknown, 
    rules: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      pattern?: RegExp;
      validate?: (value: unknown) => boolean;
    }
  ): { hasError: boolean; errorMessage: string } {
    // 필수값 검증
    if (rules.required && (value === undefined || value === null)) {
      return { hasError: true, errorMessage: `${key} is required` };
    }
    
    // 타입 검증
    const typeValid = this.validateType(value, rules.type);
    if (!typeValid) {
      return { hasError: true, errorMessage: `${key} must be of type ${rules.type}` };
    }
    
    // 패턴 검증
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return { hasError: true, errorMessage: `${key} does not match required pattern` };
    }
    
    // 커스텀 검증
    if (rules.validate && !rules.validate(value)) {
      return { hasError: true, errorMessage: `${key} failed custom validation` };
    }
    
    return { hasError: false, errorMessage: '' };
  }
  
  /**
   * 값 정제
   */
  private sanitizeValue(key: string, value: unknown, _rules: unknown): unknown {
    if (typeof value === 'string' && this.options.securityOptions.sanitizeOutput) {
      return securityUtils.escapeHtml(value);
    }
    return value;
  }

  /**
   * 타입 검증 헬퍼
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value as number);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * 에러 로깅 및 처리
   */
  protected handleError(error: Error, context?: Record<string, unknown>): void {
    if (!this.options.enableLogging) { return; }

    errorLogger.error(error.message, {
      ...context,
      stack: error.stack,
      service: this.constructor.name
    }, error);
  }

  /**
   * 서비스 작업 래핑
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    options: {
      cacheKey?: string;
      context?: Record<string, unknown>;
      errorMessage?: string;
    } = {}
  ): Promise<T> {
    try {
      if (options.cacheKey) {
        return await this.getCached(options.cacheKey, operation);
      }
      return await operation();
    } catch (error: unknown) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        options.context
      );
      throw new Error(options.errorMessage ?? 'Operation failed');
    }
  }
}