/**
 * 애플리케이션 로깅 유틸리티
 * 개발 및 운영 환경에 따라 다른 로깅 동작을 제공합니다.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 개발 모드에서만 콘솔에 로그를 출력하는 함수
 * @param message 로그 메시지
 * @param args 추가 인자
 */
const devLog = (message: string, ...args: any[]): void => {
  if (isDevelopment) {
    console.log(`[LOG] ${message}`, ...args);
  }
};

/**
 * 정보 메시지 로깅
 * @param message 정보 메시지
 * @param args 추가 인자
 */
const info = (message: string, ...args: any[]): void => {
  if (isDevelopment) {
    console.info(`[INFO] ${message}`, ...args);
  }
};

/**
 * 경고 메시지 로깅
 * @param message 경고 메시지
 * @param args 추가 인자
 */
const warn = (message: string, ...args: any[]): void => {
  console.warn(`[WARN] ${message}`, ...args);
};

/**
 * 오류 메시지 로깅
 * @param message 오류 메시지
 * @param args 추가 인자
 */
const error = (message: string, ...args: any[]): void => {
  console.error(`[ERROR] ${message}`, ...args);
};

/**
 * 성능 측정 로깅 - 개발 모드에서만 활성화
 * @param label 성능 측정 라벨
 * @param callback 측정할 콜백 함수
 * @returns 콜백 함수의 결과
 */
const measurePerformance = <T>(label: string, callback: () => T): T => {
  if (!isDevelopment) {
    return callback();
  }
  
  console.time(`[PERF] ${label}`);
  try {
    return callback();
  } finally {
    console.timeEnd(`[PERF] ${label}`);
  }
};

/**
 * 로컬 스토리지에 로그 저장 (오프라인 디버깅용)
 * @param type 로그 유형
 * @param message 로그 메시지
 * @param data 추가 데이터
 */
const saveToLocalStorage = (type: 'info' | 'warn' | 'error', message: string, data?: any): void => {
  try {
    const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    });
    
    // 최대 100개 로그만 유지
    if (logs.length > 100) {
      logs.shift();
    }
    
    localStorage.setItem('app_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('로그 저장 실패:', e);
  }
};

// 로거 객체 내보내기
const logger = {
  log: devLog,
  info,
  warn,
  error,
  measurePerformance,
  saveToLocalStorage
};

export default logger;
