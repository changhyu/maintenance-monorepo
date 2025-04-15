/**
 * 애플리케이션 전반의 보안 관련 유틸리티
 */
import crypto from 'crypto';

export interface SecurityOptions {
  saltRounds?: number;
  tokenExpiresIn?: string;
  minimumPasswordLength?: number;
}

const DEFAULT_SECURITY_OPTIONS: Required<SecurityOptions> = {
  saltRounds: 10,
  tokenExpiresIn: '1d',
  minimumPasswordLength: 8,
};

export class SecurityUtils {
  private options: Required<SecurityOptions>;

  constructor(options: SecurityOptions = {}) {
    this.options = { ...DEFAULT_SECURITY_OPTIONS, ...options };
  }

  /**
   * 문자열 해싱
   */
  async hash(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16);
      crypto.pbkdf2(data, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
      });
    });
  }

  /**
   * 해시 검증
   */
  async verify(data: string, hashedData: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hashedData.split(':');
      const saltBuffer = Buffer.from(salt, 'hex');
      crypto.pbkdf2(data, saltBuffer, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }

  /**
   * 안전한 랜덤 토큰 생성
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * XSS 방지를 위한 문자열 이스케이프
   */
  escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * SQL 인젝션 방지를 위한 이스케이프
   */
  escapeSql(unsafe: string): string {
    return unsafe.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
      switch (char) {
        case "\0":
          return "\\0";
        case "\x08":
          return "\\b";
        case "\x09":
          return "\\t";
        case "\x1a":
          return "\\z";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\"":
        case "'":
        case "\\":
        case "%":
          return "\\" + char;
        default:
          return char;
      }
    });
  }

  /**
   * 비밀번호 강도 검증
   */
  validatePasswordStrength(password: string): { isValid: boolean; message: string } {
    if (password.length < this.options.minimumPasswordLength) {
      return {
        isValid: false,
        message: `비밀번호는 최소 ${this.options.minimumPasswordLength}자 이상이어야 합니다.`
      };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChars) {
      return {
        isValid: false,
        message: '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.'
      };
    }

    return { isValid: true, message: '유효한 비밀번호입니다.' };
  }

  /**
   * 입력값 검증을 위한 정규식 패턴
   */
  static patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[\d\s-]{10,}$/,
    url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
  };
}

// 싱글톤 인스턴스 생성
export const securityUtils = new SecurityUtils();