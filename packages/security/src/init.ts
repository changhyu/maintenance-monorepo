/**
 * 보안 모듈 초기화 스크립트
 * 
 * 이 파일은 애플리케이션 시작 시 중앙 집중식 보안 시스템을 초기화합니다.
 * 취약점 자동 패치, 감사 일정 설정 및 보안 로깅 설정을 담당합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { applyAllPatches } from './patches/patchManager';
import { scheduleRegularAudits, auditAllDependencies, generateAuditReport } from './audit/securityAuditor';

// 보안 로그 디렉토리
const SECURITY_LOG_DIR = path.join(process.cwd(), 'logs', 'security');

/**
 * 보안 로그 설정
 */
function setupSecurityLogging() {
  try {
    // 로그 디렉토리 생성
    if (!fs.existsSync(SECURITY_LOG_DIR)) {
      fs.mkdirSync(SECURITY_LOG_DIR, { recursive: true });
    }
    
    // 보안 로그 파일 경로
    const date = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(SECURITY_LOG_DIR, `security-${date}.log`);
    
    // 로그 스트림 생성
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    // 콘솔 출력을 로그 파일로도 리디렉션
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = function(...args) {
      const message = `[${new Date().toISOString()}] [INFO] ${args.join(' ')}`;
      logStream.write(message + '\n');
      originalConsoleLog.apply(console, args);
    };
    
    console.error = function(...args) {
      const message = `[${new Date().toISOString()}] [ERROR] ${args.join(' ')}`;
      logStream.write(message + '\n');
      originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
      const message = `[${new Date().toISOString()}] [WARN] ${args.join(' ')}`;
      logStream.write(message + '\n');
      originalConsoleWarn.apply(console, args);
    };
    
    // 애플리케이션 종료 시 로그 스트림 정리
    process.on('exit', () => {
      logStream.end();
    });
    
    console.log('✅ 보안 로깅이 설정되었습니다.');
    return true;
  } catch (err) {
    console.error('❌ 보안 로깅 설정 실패:', err);
    return false;
  }
}

/**
 * 개발 모드에서 취약점 보고서 생성
 */
async function generateDevReport() {
  try {
    console.log('🔍 개발 모드에서 취약점 보고서 생성 중...');
    const auditResult = await auditAllDependencies();
    const reportPath = generateAuditReport(auditResult);
    console.log(`✅ 취약점 보고서가 성공적으로 생성되었습니다: ${reportPath}`);
  } catch (err) {
    console.error('❌ 취약점 보고서 생성 실패:', err);
  }
}

/**
 * 보안 헤더 설정 (Express 애플리케이션용)
 */
export function setupSecurityHeaders(app: any) {
  if (!app || typeof app.use !== 'function') {
    console.error('❌ 유효한 Express 앱이 제공되지 않았습니다.');
    return;
  }
  
  console.log('🔒 보안 헤더 설정 중...');
  
  // 보안 헤더 미들웨어
  app.use((req: any, res: any, next: any) => {
    // XSS 보호
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // 클릭재킹 방지
    res.setHeader('X-Frame-Options', 'DENY');
    
    // MIME 타입 스니핑 방지
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // 엄격한 전송 보안
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // 컨텐츠 보안 정책
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; object-src 'none'");
    
    // 리퍼러 정책
    res.setHeader('Referrer-Policy', 'same-origin');
    
    // 권한 정책
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
  });
  
  console.log('✅ 보안 헤더가 설정되었습니다.');
}

/**
 * 초기 보안 설정 실행
 */
export function initSecurity(options: {
  enableAudit?: boolean,
  auditInterval?: number,
  generateReport?: boolean
} = {}) {
  console.log('🛡️ 보안 모듈 초기화 중...');
  
  // 기본 옵션 설정
  const defaultOptions = {
    enableAudit: true,
    auditInterval: 24, // 시간 단위
    generateReport: process.env.NODE_ENV === 'development'
  };
  
  const config = { ...defaultOptions, ...options };
  
  // 보안 로그 설정
  setupSecurityLogging();
  
  // 모든 알려진 취약점 패치 적용
  const patchResult = applyAllPatches();
  
  // 정기적인 감사 설정 (옵션에 따라)
  if (config.enableAudit) {
    scheduleRegularAudits(config.auditInterval);
  }
  
  // 개발 모드에서 취약점 보고서 생성 (옵션에 따라)
  if (config.generateReport) {
    generateDevReport();
  }
  
  console.log('✅ 보안 모듈이 성공적으로 초기화되었습니다.');
  return patchResult;
}

export default {
  initSecurity,
  setupSecurityHeaders
};