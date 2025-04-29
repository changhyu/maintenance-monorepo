import { getCache, setCache } from '../utils/cacheUtils';
import { errorLogger } from '../utils/errorLogger';
import { securityUtils } from '../utils/securityUtils';
const DEFAULT_OPTIONS = {
    cacheDuration: 3600000, // 1시간
    enableLogging: true,
    securityOptions: {
        validateInput: true,
        sanitizeOutput: true
    }
};
export class BaseService {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * 캐시된 데이터 조회
     */
    async getCached(key, fetchFn) {
        const cached = getCache(key);
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
    validateAndSanitize(data, schema) {
        const errors = [];
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            const rules = schema[key];
            if (!rules) {
                continue;
            }
            const validationResult = this.validateField(key, value, rules);
            if (validationResult.hasError) {
                errors.push(validationResult.errorMessage);
                continue;
            }
            sanitized[key] = this.sanitizeValue(key, value, rules);
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
    validateField(key, value, rules) {
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
    sanitizeValue(key, value, _rules) {
        if (typeof value === 'string' && this.options.securityOptions.sanitizeOutput) {
            return securityUtils.escapeHtml(value);
        }
        return value;
    }
    /**
     * 타입 검증 헬퍼
     */
    validateType(value, type) {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
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
    handleError(error, context) {
        if (!this.options.enableLogging) {
            return;
        }
        errorLogger.error(error.message, {
            ...context,
            stack: error.stack,
            service: this.constructor.name
        }, error);
    }
    /**
     * 서비스 작업 래핑
     */
    async executeOperation(operation, options = {}) {
        try {
            if (options.cacheKey) {
                return await this.getCached(options.cacheKey, operation);
            }
            return await operation();
        }
        catch (error) {
            this.handleError(error instanceof Error ? error : new Error(String(error)), options.context);
            throw new Error(options.errorMessage ?? 'Operation failed');
        }
    }
}
