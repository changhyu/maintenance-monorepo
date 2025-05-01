/**
 * 애플리케이션 로깅 시스템
 * 여러 환경(개발, 프로덕션)에서 일관된 로깅 인터페이스 제공
 */

// 로그 레벨 정의
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// 로그 레벨에 따른 콘솔 메서드
const LOG_METHODS: Record<LogLevel, keyof typeof console> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.FATAL]: 'error',
};

// 콘텍스트 정보를 포함한 로그 인터페이스
export interface StructuredLog {
  timestamp: string;
  level: string;
  message: string;
  module: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    name?: string;
    stack?: string;
    code?: string | number;
  };
}

// 로그 포맷터 타입 정의
type LogFormatter = (log: StructuredLog) => string;

// 환경에 따른 설정
interface LoggerConfig {
  minLevel: LogLevel;
  formatter?: LogFormatter;
  enableRemoteLogging?: boolean;
  maxErrorStackLength?: number;
}

/**
 * 전역 로거 설정
 */
const globalConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  maxErrorStackLength: 500,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
};

/**
 * 리모트 로깅 (개발 중)
 */
const sendRemoteLog = async (log: StructuredLog): Promise<void> => {
  // 프로덕션 환경에서만 활성화
  if (!globalConfig.enableRemoteLogging) return;
  
  try {
    // 실제 구현은 필요에 따라 추가 예정
    // 예: 로깅 서비스 API 호출, 분석 솔루션으로 전송 등
    
    // 에러 로그 이상만 원격 서버로 전송
    if (log.level === 'ERROR' || log.level === 'FATAL') {
      // fetch('/api/logs', {
      //   method: 'POST', 
      //   body: JSON.stringify(log)
      // });
    }
  } catch (e) {
    // 로깅 실패는 조용히 처리 (사이드 이펙트 방지)
    console.error('[Logger] Remote logging failed:', e);
  }
};

/**
 * 기본 로그 포맷터 
 */
const defaultFormatter: LogFormatter = (log: StructuredLog): string => {
  const { timestamp, level, module, message } = log;
  let formatted = `[${timestamp}] ${level} [${module}]: ${message}`;
  
  // 컨텍스트가 있으면 추가
  if (log.context && Object.keys(log.context).length > 0) {
    try {
      formatted += `\nContext: ${JSON.stringify(log.context)}`;
    } catch (e) {
      formatted += `\nContext: [Circular structure]`;
    }
  }
  
  // 에러 정보가 있으면 추가
  if (log.error) {
    formatted += `\nError: ${log.error.name || 'Error'}: ${log.error.message}`;
    if (log.error.code) {
      formatted += ` (code: ${log.error.code})`;
    }
    if (log.error.stack) {
      const stackLimit = globalConfig.maxErrorStackLength || 500;
      const stack = log.error.stack.length > stackLimit 
        ? log.error.stack.substring(0, stackLimit) + '...(truncated)'
        : log.error.stack;
      formatted += `\n${stack}`;
    }
  }
  
  return formatted;
};

// 현재 사용 중인 포맷터
let currentFormatter: LogFormatter = defaultFormatter;

/**
 * 로거 클래스
 * 모듈별 로깅 제공
 */
export class Logger {
  private module: string;
  private config: LoggerConfig;
  
  constructor(module: string, config?: Partial<LoggerConfig>) {
    this.module = module;
    this.config = { 
      ...globalConfig,
      ...(config || {})
    };
  }
  
  /**
   * 로그 메시지 생성 및 출력
   */
  private log(level: LogLevel, message: string, contextOrError?: any, error?: Error): void {
    // 최소 레벨보다 낮은 로그는 무시
    if (level < this.config.minLevel) {
      return;
    }
    
    // 컨텍스트와 에러 객체 분리
    let context: Record<string, any> | undefined;
    let errorObj: Error | undefined = error;
    
    if (contextOrError) {
      if (contextOrError instanceof Error) {
        errorObj = contextOrError;
      } else {
        context = contextOrError;
      }
    }
    
    // 구조화된 로그 생성
    const structuredLog: StructuredLog = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      module: this.module,
      context
    };
    
    // 에러 정보 추가
    if (errorObj) {
      structuredLog.error = {
        message: errorObj.message,
        name: errorObj.name,
        stack: errorObj.stack,
      };
      
      // 에러 코드 추가 (있는 경우)
      const anyError = errorObj as any;
      if (anyError.code !== undefined) {
        structuredLog.error.code = anyError.code;
      }
    }
    
    // 로그 포맷 및 출력
    const formattedLog = (this.config.formatter || currentFormatter)(structuredLog);
    
    // 콘솔에 출력
    const method = LOG_METHODS[level];
    console[method](formattedLog);
    
    // 리모트 로깅 (비동기)
    if (level >= LogLevel.ERROR) {
      sendRemoteLog(structuredLog).catch(() => {});
    }
    
    // FATAL 로그는 특별 처리
    if (level === LogLevel.FATAL) {
      // 운영 환경에서는 모니터링 시스템 알림 등의 추가 조치
      // 개발 환경에서는 더 자세한 디버그 정보 제공
      if (process.env.NODE_ENV !== 'production') {
        console.trace('Fatal error occurred, stack trace:');
      }
    }
  }
  
  // 로그 레벨별 메서드
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, errorOrContext?: any, error?: Error): void {
    this.log(LogLevel.ERROR, message, errorOrContext, error);
  }
  
  fatal(message: string, errorOrContext?: any, error?: Error): void {
    this.log(LogLevel.FATAL, message, errorOrContext, error);
  }
}

/**
 * 글로벌 로거 설정 업데이트
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  Object.assign(globalConfig, config);
  
  if (config.formatter) {
    currentFormatter = config.formatter;
  }
}

/**
 * 모듈별 로거 생성
 */
export function getLogger(module: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(module, config);
}

// 기본 로거 (모듈 이름 없음)
export const logger = new Logger('App');

// 성능 로거
export const perfLogger = new Logger('Performance', { minLevel: LogLevel.INFO });

// 기본 오류 로거
export const errorLogger = new Logger('ErrorHandler', { minLevel: LogLevel.ERROR });

/**
 * 오류 로깅 및 처리 도우미 함수
 * @param error 로깅할 에러 객체 
 * @param context 추가 컨텍스트 정보
 * @param fatal 치명적 오류 여부
 */
export function logError(error: Error, context?: Record<string, any>, fatal: boolean = false): void {
  const level = fatal ? LogLevel.FATAL : LogLevel.ERROR;
  const message = `${error.name}: ${error.message}`;
  
  errorLogger.log(level, message, context, error);
}

/**
 * 전역 에러 핸들러 설정
 * 애플리케이션 시작 시 호출하여 캐치되지 않은 에러 처리
 */
export function setupGlobalErrorHandlers(): void {
  const errorLogger = new Logger('GlobalError');
  
  // 캐치되지 않은 프로미스 에러
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    errorLogger.error('Unhandled Promise rejection', {
      reason,
      promise
    });
  });
  
  // 캐치되지 않은 에러
  process.on('uncaughtException', (error: Error) => {
    errorLogger.fatal('Uncaught Exception', error);
    
    // 프로세스를 안전하게 종료하기 전에 로그 출력 보장
    setTimeout(() => {
      process.exit(1);
    }, 500);
  });
}