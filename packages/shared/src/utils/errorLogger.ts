import { getCache, setCache } from './cacheUtils';

export interface LogOptions {
  /** 로그 저장 경로 */
  logPath?: string;
  /** 최대 로그 보관 기간 (일) */
  maxLogAge?: number;
  /** 에러 알림 활성화 여부 */
  enableNotifications?: boolean;
  /** Sentry DSN (옵션) */
  sentryDsn?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

const DEFAULT_OPTIONS: Required<LogOptions> = {
  logPath: './logs',
  maxLogAge: 30,
  enableNotifications: true,
  sentryDsn: ''
};

class ErrorLogger {
  private readonly options: Required<LogOptions>;
  private logBuffer: LogEntry[] = [];
  private readonly FLUSH_INTERVAL = 5000; // 5초마다 로그 플러시

  constructor(options: LogOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeLogger();
  }

  private initializeLogger(): void {
    // 주기적으로 로그 버퍼 플러시
    setInterval(() => this.flushLogs(), this.FLUSH_INTERVAL);

    // 프로세스 종료 시 남은 로그 플러시
    process.on('beforeExit', () => {
      this.flushLogs();
    });

    if (this.options.sentryDsn) {
      // Sentry 초기화 로직 (필요시 구현)
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) { return; }

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // 로그 저장 로직
      // 실제 구현에서는 파일 시스템이나 외부 서비스에 저장
      console.log('Flushing logs:', logsToFlush);
      
      // 캐시에 최근 에러 통계 저장
      this.updateErrorStats(logsToFlush);
    } catch (error) {
      console.error('로그 플러시 실패:', error);
      // 실패한 로그는 다음 플러시 시도 시 재처리
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  private updateErrorStats(logs: LogEntry[]): void {
    const now = new Date();
    const key = 'error_stats';
    const currentStats = (getCache(key) as Record<string, number>) || {};

    logs.forEach(log => {
      if (log.level === LogLevel.ERROR || log.level === LogLevel.FATAL) {
        const dateKey = now.toISOString().split('T')[0];
        currentStats[dateKey] = (currentStats[dateKey] || 0) + 1;
      }
    });

    setCache(key, currentStats);
  }

  public log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stack: new Error().stack
    };

    this.logBuffer.push(logEntry);

    // 즉시 콘솔에도 출력
    let consoleMethod: string;
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      consoleMethod = 'error';
    } else if (level === LogLevel.WARN) {
      consoleMethod = 'warn';
    } else {
      consoleMethod = 'log';
    }
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '');

    // ERROR나 FATAL 레벨인 경우 즉시 플러시
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.flushLogs();
    }
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  public fatal(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context);
  }

  public async getErrorStats(days: number = 7): Promise<Record<string, number>> {
    const key = 'error_stats';
    const stats = getCache(key) as Record<string, number> || {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return Object.entries(stats).reduce((acc, [date, count]) => {
      if (new Date(date) >= cutoff) {
        acc[date] = Number(count);
      }
      return acc;
    }, {} as Record<string, number>);
  }
}

// 싱글톤 인스턴스 생성
export const errorLogger = new ErrorLogger();