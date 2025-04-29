/**
 * 애플리케이션 에러 로깅 유틸리티
 * 
 * 다양한 환경(브라우저, 서버)에서 일관되게 에러를 기록하기 위한 유틸리티입니다.
 */

// 로그 레벨 타입
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 로그 컨텍스트 타입
export interface LogContext {
  [key: string]: any;
}

/**
 * 로그 기록 인터페이스
 */
export interface Logger {
  debug(message: string, context?: LogContext, error?: Error): void;
  info(message: string, context?: LogContext, error?: Error): void;
  warn(message: string, context?: LogContext, error?: Error): void;
  error(message: string, context?: LogContext, error?: Error): void;
  setLevel(level: LogLevel): void;
}

/**
 * 기본 로그 설정
 */
const defaultConfig = {
  level: 'info' as LogLevel,
  enableConsole: true,
  serviceName: 'maintenance-app'
};

/**
 * 기본 로거 구현
 */
class DefaultLogger implements Logger {
  private level: LogLevel;
  private enableConsole: boolean;
  private serviceName: string;

  constructor(config = defaultConfig) {
    this.level = config.level;
    this.enableConsole = config.enableConsole;
    this.serviceName = config.serviceName;
  }

  /**
   * 로그 레벨 설정
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 디버그 레벨 로그 기록
   */
  debug(message: string, context?: LogContext, error?: Error): void {
    this.log('debug', message, context, error);
  }

  /**
   * 정보 레벨 로그 기록
   */
  info(message: string, context?: LogContext, error?: Error): void {
    this.log('info', message, context, error);
  }

  /**
   * 경고 레벨 로그 기록
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  /**
   * 오류 레벨 로그 기록
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * 로그 기록 처리
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    // 설정된 레벨보다 낮은 로그는 무시
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      context: context || {},
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    // 콘솔 출력
    if (this.enableConsole) {
      this.logToConsole(level, logEntry);
    }

    // 여기에 추가적인 로그 저장 방법을 구현할 수 있음
    // - 서버로 전송
    // - 파일에 저장
    // - 외부 모니터링 서비스에 전송
  }

  /**
   * 현재 로그 레벨에서 기록해야 하는지 확인
   */
  private shouldLog(level: LogLevel): boolean {
    const levelPriority: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levelPriority[level] >= levelPriority[this.level];
  }

  /**
   * 콘솔에 로그 출력
   */
  private logToConsole(level: LogLevel, logEntry: any): void {
    const { timestamp, service, message, context, error } = logEntry;
    
    const prefix = `[${timestamp}] [${service}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, context, error || '');
        break;
      case 'info':
        console.info(prefix, message, context, error || '');
        break;
      case 'warn':
        console.warn(prefix, message, context, error || '');
        break;
      case 'error':
        console.error(prefix, message, context, error || '');
        if (error && error.stack) {
          console.error(error.stack);
        }
        break;
    }
  }
}

/**
 * 에러 로거 인스턴스
 * 
 * 애플리케이션 전체에서 이 인스턴스를 가져와 사용합니다.
 * 설정을 변경하려면 configure 메서드를 사용하세요.
 */
export const errorLogger: Logger = new DefaultLogger();

/**
 * 로거 설정 변경
 */
export function configureLogger(config: Partial<typeof defaultConfig>): void {
  const logger = errorLogger as DefaultLogger;
  
  if (config.level) {
    logger.setLevel(config.level);
  }
  
  // 기타 설정 옵션은 필요에 따라 추가
}

export default errorLogger;