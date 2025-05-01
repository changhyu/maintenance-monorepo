/**
 * 보안 입력 유효성 검사기
 * 
 * 이 모듈은 다양한 보안 관련 입력 검증 기능을 제공합니다.
 * XSS, SQL 인젝션 및 기타 일반적인 공격 벡터를 방지하기 위한 도구를 포함합니다.
 */

import * as ipaddr from 'ipaddr.js';
import { isPrivate } from '../network/safeIp';

/**
 * 안전한 IP 주소 검증
 * @param ip 검사할 IP 주소 문자열
 * @returns 유효한 IP 주소인지 여부
 */
export function isValidIpAddress(ip: string): boolean {
  try {
    // ipaddr.js 라이브러리를 사용하여 IP 주소 유효성 검사
    ipaddr.parse(ip);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * XSS 공격 가능성이 있는 문자열 검사
 * @param input 검사할 입력 문자열
 * @returns XSS 공격 패턴이 포함되어 있는지 여부
 */
export function containsXssAttack(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /src[\r\n]*=[\r\n]*\\?['"]?data:/i,
    /data:text\/html/i
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * SQL 인젝션 공격 가능성이 있는 문자열 검사
 * @param input 검사할 입력 문자열
 * @returns SQL 인젝션 공격 패턴이 포함되어 있는지 여부
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  const sqlInjectionPatterns = [
    /'\s*or\s*['"]\s*[=1].*?['"]/i, // 'or '='
    /'\s*or\s*[\d]+=[\d]+/i,         // 'or 1=1
    /'\s*and\s*['"]\s*[=1]/i,        // 'and '='
    /--\s/,                          // SQL 주석
    /;\s*drop\s+/i,                  // drop 문
    /;\s*delete\s+/i,                // delete 문
    /union\s+select/i,               // union select
    /exec\s*\(/i,                    // exec(
    /xp_/i                          // xp_ 프로시저
  ];
  
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * 안전하게 HTML 이스케이프 처리
 * @param text HTML 이스케이프 처리할 텍스트
 * @returns 이스케이프 처리된 안전한 텍스트
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 서버 사이드 요청 위조(SSRF) 공격 시도 확인
 * @param url 검사할 URL 문자열
 * @returns SSRF 공격 가능성 여부
 */
export function checkSsrfAttempt(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // 로컬 IP 주소 확인
    if (parsedUrl.hostname === 'localhost' || 
        parsedUrl.hostname === '127.0.0.1' || 
        parsedUrl.hostname === '::1') {
      return true;
    }
    
    // 내부 IP 주소 확인
    if (isValidIpAddress(parsedUrl.hostname) && isPrivate(parsedUrl.hostname)) {
      return true;
    }
    
    // 위험한 포트 확인 (민감한 서비스 포트)
    const dangerousPorts = [
      '22',    // SSH
      '25',    // SMTP
      '3306',  // MySQL
      '5432',  // PostgreSQL
      '6379',  // Redis
      '27017', // MongoDB
      '11211', // Memcached
      '9200',  // Elasticsearch
    ];
    
    if (parsedUrl.port && dangerousPorts.includes(parsedUrl.port)) {
      return true;
    }
    
    // 내부 호스트 이름 패턴 확인
    const internalHostPatterns = [
      /internal/i,
      /intranet/i,
      /admin/i,
      /localhost/i,
      /corp/i,
      /private/i,
      /service/i,
    ];
    
    if (internalHostPatterns.some(pattern => pattern.test(parsedUrl.hostname))) {
      return true;
    }
    
    return false;
  } catch (e) {
    // URL 파싱 오류
    return false;
  }
}

/**
 * 명령어 인젝션 공격 가능성 검사
 * @param input 검사할 입력 문자열
 * @returns 명령어 인젝션 공격 패턴이 포함되어 있는지 여부
 */
export function containsCommandInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  const commandInjectionPatterns = [
    /[&|;`$()><!]/,           // 쉘 특수 문자
    /\bnohup\b/i,             // 백그라운드 실행
    /\bping\b/i,              // 네트워크 명령어
    /\bnc\b/i,                // netcat
    /\bcurl\b/i,              // curl
    /\bwget\b/i,              // wget
    /\bbash\b/i,              // 쉘
    /\bsh\b/i,                // 쉘
    /\bcmd\b/i,               // Windows 명령어
  ];
  
  return commandInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * 통합 보안 검사 - 모든 일반적인 공격 벡터 검사
 * @param input 검사할 입력 문자열
 * @returns 탐지된 보안 위협 목록 (없으면 빈 배열)
 */
export function securityCheck(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  const threats = [];
  
  if (containsXssAttack(input)) {
    threats.push('XSS');
  }
  
  if (containsSqlInjection(input)) {
    threats.push('SQL Injection');
  }
  
  if (containsCommandInjection(input)) {
    threats.push('Command Injection');
  }
  
  // URL인 경우 SSRF 검사
  if (input.match(/^https?:\/\//i)) {
    if (checkSsrfAttempt(input)) {
      threats.push('SSRF');
    }
  }
  
  return threats;
}

/**
 * 입력 문자열 정제 - 위험한 문자 제거
 * @param input 정제할 입력 문자열
 * @returns 정제된 안전한 문자열
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // HTML 태그 제거
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // 위험한 JavaScript 관련 문자열 제거
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:\s*text\/html/gi, '');
  
  // SQL 인젝션 관련 문자열 변환
  sanitized = sanitized.replace(/'/g, '\'');
  sanitized = sanitized.replace(/--/g, '‐‐');
  
  // 명령어 인젝션 관련 특수 문자 제거
  sanitized = sanitized.replace(/[&|;`$()><!]/g, '');
  
  return sanitized;
}

export default {
  isValidIpAddress,
  containsXssAttack,
  containsSqlInjection,
  containsCommandInjection,
  checkSsrfAttempt,
  escapeHtml,
  securityCheck,
  sanitizeInput
};