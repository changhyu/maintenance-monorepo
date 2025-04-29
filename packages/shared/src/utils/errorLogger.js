import { getCache, setCache } from './cacheUtils';
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["FATAL"] = "fatal";
})(LogLevel || (LogLevel = {}));
const DEFAULT_OPTIONS = {
    logPath: './logs',
    maxLogAge: 30,
    enableNotifications: true,
    sentryDsn: ''
};
class ErrorLogger {
    constructor(options = {}) {
        this.logBuffer = [];
        this.FLUSH_INTERVAL = 5000; // 5초마다 로그 플러시
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.initializeLogger();
    }
    initializeLogger() {
        // 주기적으로 로그 버퍼 플러시
        setInterval(() => this.flushLogs(), this.FLUSH_INTERVAL);
        // 프로세스 종료 시 남은 로그 플러시
        const onBeforeExit = () => {
            this.flushLogs();
        };
        process.on('beforeExit', onBeforeExit);
        if (this.options.sentryDsn) {
            // Sentry 초기화 로직 (필요시 구현)
        }
    }
    async flushLogs() {
        if (this.logBuffer.length === 0) {
            return;
        }
        try {
            const logsToFlush = [...this.logBuffer];
            this.logBuffer = [];
            // 로그 저장 로직
            // 실제 구현에서는 파일 시스템이나 외부 서비스에 저장
            console.log('Flushing logs:', logsToFlush);
            // 캐시에 최근 에러 통계 저장
            this.updateErrorStats(logsToFlush);
        }
        catch (error) {
            console.error('로그 플러시 실패:', error instanceof Error ? error.message : String(error));
            // 실패한 로그는 다음 플러시 시도 시 재처리
            this.logBuffer.unshift(...this.logBuffer);
        }
    }
    updateErrorStats(logs) {
        const now = new Date();
        const key = 'error_stats';
        const currentStats = getCache(key) || {};
        logs.forEach(log => {
            if (log.level === LogLevel.ERROR || log.level === LogLevel.FATAL) {
                const dateKey = now.toISOString().split('T')[0];
                currentStats[dateKey] = (currentStats[dateKey] || 0) + 1;
            }
        });
        setCache(key, currentStats);
    }
    log(level, message, context, error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            stack: error instanceof Error ? error.stack : undefined
        };
        this.logBuffer.push(logEntry);
        // 즉시 콘솔에도 출력
        let consoleMethod;
        if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
            consoleMethod = 'error';
        }
        else if (level === LogLevel.WARN) {
            consoleMethod = 'warn';
        }
        else {
            consoleMethod = 'log';
        }
        console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '');
        // ERROR나 FATAL 레벨인 경우 즉시 플러시
        if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
            this.flushLogs();
        }
    }
    debug(message, context, error) {
        this.log(LogLevel.DEBUG, message, context, error);
    }
    info(message, context, error) {
        this.log(LogLevel.INFO, message, context, error);
    }
    warn(message, context, error) {
        this.log(LogLevel.WARN, message, context, error);
    }
    error(message, context, error) {
        this.log(LogLevel.ERROR, message, context, error);
    }
    fatal(message, context, error) {
        this.log(LogLevel.FATAL, message, context, error);
    }
    async getErrorStats(days = 7) {
        const key = 'error_stats';
        const stats = getCache(key) || {};
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return Object.entries(stats).reduce((acc, [date, count]) => {
            if (new Date(date) >= cutoff) {
                acc[date] = Number(count);
            }
            return acc;
        }, {});
    }
}
// 싱글톤 인스턴스 생성
export const errorLogger = new ErrorLogger();
