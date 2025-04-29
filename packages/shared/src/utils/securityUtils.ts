/**
 * 보안 관련 유틸리티 함수
 */

import { createHash } from 'crypto';

/**
 * 문자열의 해시를 생성합니다.
 * @param input 원본 문자열
 * @param algorithm 해시 알고리즘 (기본값: sha256)
 * @returns 해시된 문자열
 */
export function hashString(input: string, algorithm: string = 'sha256'): string {
  return createHash(algorithm).update(input).digest('hex');
}

/**
 * 문자열로 된 토큰을 안전하게 비교합니다. (타이밍 어택 방지)
 * @param a 첫 번째 토큰
 * @param b 두 번째 토큰
 * @returns 토큰이 일치하면 true, 아니면 false
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * 입력값이 안전한 문자열인지 확인합니다.
 * @param input 확인할 입력값
 * @returns 안전하면 true, 위험하면 false
 */
export function isSafeString(input: string): boolean {
  // XSS 공격에 사용될 수 있는 위험 패턴
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onerror=/gi,
    /onload=/gi,
    /onclick=/gi,
    /onmouseover=/gi,
    /alert\s*\(/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * HTML 이스케이프
 * @param input 이스케이프할 HTML 문자열
 * @returns 이스케이프된 문자열
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
}

/**
 * 사용자 입력 서니타이징 (XSS 방지)
 * @param input 사용자 입력 문자열
 * @returns 안전한 문자열
 */
export function sanitizeInput(input: string): string {
  return escapeHtml(input.trim());
}

/**
 * 객체의 속성값들을 재귀적으로 서니타이징
 * @param obj 서니타이징할 객체
 * @returns 서니타이징된 객체
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // 문자열이면 서니타이징
        result[key] = sanitizeInput(value) as any;
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // 중첩 객체면 재귀적으로 처리
        result[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        // 배열이면 각 요소 처리
        result[key] = value.map(item => {
          if (typeof item === 'string') {
            return sanitizeInput(item);
          } else if (item !== null && typeof item === 'object') {
            return sanitizeObject(item);
          }
          return item;
        }) as any;
      } else {
        // 그 외 타입은 그대로 복사
        result[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * SQL 인젝션 방지를 위한 이스케이프
 * @param input SQL에 사용될 문자열
 * @returns 이스케이프된 문자열
 */
export function escapeSql(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\');
}

/**
 * 파일명 안전성 확인
 * @param filename 확인할 파일명
 * @returns 안전하면 true, 위험하면 false
 */
export function isSafeFilename(filename: string): boolean {
  // 위험한 문자 패턴
  const dangerousPattern = /[\\/:*?"<>|]/;
  return !dangerousPattern.test(filename);
}

/**
 * 이메일 유효성 검사
 * @param email 검사할 이메일 주소
 * @returns 유효하면 true, 아니면 false
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * 안전한 URL 검증
 * @param url 검사할 URL
 * @returns 안전하면 true, 아니면 false
 */
export function isSafeUrl(url: string): boolean {
  // 허용된 프로토콜 검사
  const allowedProtocols = ['http:', 'https:'];
  
  try {
    const parsedUrl = new URL(url);
    return allowedProtocols.includes(parsedUrl.protocol);
  } catch (error) {
    return false; // URL 파싱 실패
  }
}

/**
 * 비밀번호 강도 체크
 * @param password 확인할 비밀번호
 * @returns 강도 점수 (0-4, 0: 매우 약함, 4: 매우 강함)
 */
export function checkPasswordStrength(password: string): number {
  if (!password) return 0;
  
  let score = 0;
  
  // 길이 체크
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // 다양한 문자 포함 체크
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // 최대 점수는 4
  return Math.min(4, Math.floor(score / 2));
}

/**
 * 난수 문자열 생성
 * @param length 문자열 길이
 * @returns 난수 문자열
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * CSRF 토큰 생성
 * @returns CSRF 토큰
 */
export function generateCsrfToken(): string {
  return generateRandomString(32);
}

export default {
  hashString,
  safeCompare,
  isSafeString,
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  escapeSql,
  isSafeFilename,
  isValidEmail,
  isSafeUrl,
  checkPasswordStrength,
  generateRandomString,
  generateCsrfToken
};