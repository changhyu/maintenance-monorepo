import { ErrorUtils, LogBox, Alert, AppState, AppStateStatus } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { extractGitErrorInfo } from './git-helpers';

/**
 * 에러 로그 인터페이스
 */
interface ErrorLog {
  timestamp: number;
  error: Error | string;
  componentStack?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * GlobalErrorHandler - 앱 전체 에러를 처리하는 유틸리티 클래스
 * 
 * React Native의 전역 에러를 캡처하고 처리하는 기능을 제공합니다.
 * 에러 로깅, 분석 및 보고 기능을 통합하여 앱 안정성을 향상시킵니다.
 */
class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private originalErrorHandler?: (error: Error, isFatal?: boolean) => void;
  private errorLogPath: string;
  private errorListeners: Array<(error: Error, isFatal: boolean) => void> = [];
  private isInitialized = false;
  private readonly maxLogFiles = 50; // 최대 저장할 로그 파일 수
  private readonly errorIndexFile = 'error_index.json';
  private readonly ignorePatterns: RegExp[] = [];
  private appState: AppStateStatus = 'active';
  private errorLogs: ErrorLog[] = [];
  private readonly MAX_LOGS = 100;
  private readonly LOG_DIR = `${FileSystem.documentDirectory}logs/`;
  private readonly ERROR_LOG_FILE = 'error_logs.json';
  private readonly GIT_ERROR_LOG_FILE = 'git_error_logs.json';

  /**
   * 싱글톤 인스턴스 생성 및 반환
   */
  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  private constructor() {
    this.errorLogPath = `${FileSystem.documentDirectory}error_logs/`;
    this.setupAppStateListener();
    this.initializeLogDirectory();
    this.loadErrorLogs();

    // 전역 에러 핸들러 설정
    this.originalErrorHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.handleGlobalError(error, { isFatal });
      if (this.originalErrorHandler) {
        this.originalErrorHandler(error, isFatal);
      }
    });
  }

  /**
   * 에러 핸들러 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // 로그 디렉토리 생성
    await this.ensureLogDirectoryExists();
    
    // 특정 React Native 에러 무시 설정
    this.ignoreSpecificWarnings();
    
    this.isInitialized = true;
    console.log('GlobalErrorHandler가 초기화되었습니다.');
  }

  /**
   * 전역 에러 처리 함수
   */
  private handleGlobalError(error: Error, additionalInfo?: any): void {
    // 콘솔에 에러 로깅
    console.error(
      `GlobalErrorHandler: 치명적 에러 발생:`,
      error
    );
    
    // 에러 로그 파일에 저장
    this.logErrorToFile(error, additionalInfo).catch(e => {
      console.error('에러 로깅 실패:', e);
    });
    
    // 등록된 모든 리스너에게 에러 알림
    this.errorListeners.forEach(listener => {
      try {
        listener(error, true);
      } catch (listenerError) {
        console.error('에러 리스너 실행 중 오류:', listenerError);
      }
    });
  }

  /**
   * 에러 리스너 등록
   */
  public addErrorListener(
    listener: (error: Error, isFatal: boolean) => void
  ): () => void {
    this.errorListeners.push(listener);
    
    // 리스너 제거 함수 반환
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index !== -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * 특정 React Native 경고 무시
   */
  private ignoreSpecificWarnings(): void {
    LogBox.ignoreLogs([
      'Require cycle:',
      'Remote debugger',
      // 필요한 경우 여기에 더 많은 경고 패턴 추가
    ]);
  }

  /**
   * 로그 디렉터리 존재 확인 및 생성
   */
  private async ensureLogDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.errorLogPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.errorLogPath, { intermediates: true });
      }
    } catch (error) {
      console.error('로그 디렉터리 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 에러를 파일에 로깅
   */
  public async logErrorToFile(
    error: Error,
    additionalInfo?: Record<string, any>
  ): Promise<string> {
    try {
      await this.ensureLogDirectoryExists();
      
      const timestamp = new Date().toISOString();
      const fileName = `error_${timestamp.replace(/[:.]/g, '_')}.json`;
      const filePath = `${this.errorLogPath}${fileName}`;
      
      const errorLog: ErrorLog = {
        timestamp,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        additionalInfo
      };
      
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(errorLog, null, 2)
      );
      
      // 에러 인덱스 업데이트
      await this.updateErrorIndex(filePath);
      
      return filePath;
    } catch (error) {
      console.error('에러 로깅 실패:', error);
      throw error;
    }
  }

  /**
   * 에러 인덱스 파일 업데이트
   */
  private async updateErrorIndex(newLogPath: string): Promise<void> {
    try {
      const indexPath = `${this.errorLogPath}error_index.json`;
      let errorIndex: string[] = [];
      
      // 기존 인덱스 파일 읽기 시도
      try {
        const indexExists = await FileSystem.getInfoAsync(indexPath);
        if (indexExists.exists) {
          const indexContent = await FileSystem.readAsStringAsync(indexPath);
          errorIndex = JSON.parse(indexContent);
        }
      } catch (error) {
        // 인덱스 파일이 없거나 손상된 경우 새로 생성
        console.warn('에러 인덱스 파일 읽기 실패, 새로 생성합니다:', error);
      }
      
      // 새 로그 경로 추가 및 최대 20개로 제한
      errorIndex.unshift(newLogPath);
      errorIndex = errorIndex.slice(0, 20);
      
      // 인덱스 파일 업데이트
      await FileSystem.writeAsStringAsync(
        indexPath,
        JSON.stringify(errorIndex)
      );
    } catch (error) {
      console.error('에러 인덱스 업데이트 실패:', error);
    }
  }

  /**
   * 최근 에러 로그 가져오기
   */
  public async getRecentErrorLogs(limit: number = 10): Promise<ErrorLog[]> {
    try {
      const indexPath = `${this.errorLogPath}error_index.json`;
      const indexExists = await FileSystem.getInfoAsync(indexPath);
      
      if (!indexExists.exists) {
        return [];
      }
      
      const indexContent = await FileSystem.readAsStringAsync(indexPath);
      const logPaths = JSON.parse(indexContent) as string[];
      const logs: ErrorLog[] = [];
      
      // 최대 limit개의 로그만 로드
      for (const logPath of logPaths.slice(0, limit)) {
        try {
          const logContent = await FileSystem.readAsStringAsync(logPath);
          const logData = JSON.parse(logContent) as ErrorLog;
          logs.push(logData);
        } catch (error) {
          console.warn(`로그 파일 ${logPath} 읽기 실패:`, error);
        }
      }
      
      return logs;
    } catch (error) {
      console.error('최근 에러 로그 가져오기 실패:', error);
      return [];
    }
  }

  /**
   * 오래된 로그 파일 정리
   */
  public async cleanupOldLogs(maxAgeDays: number = 7): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.errorLogPath);
      const now = new Date();
      
      for (const file of files) {
        // error_index.json 파일은 건너뜁니다
        if (file === 'error_index.json') {
          continue;
        }
        
        // 파일 이름에서 타임스탬프 추출 시도
        try {
          // error_2023-01-01T12_34_56.789Z.json 형식에서 날짜 추출
          const dateMatch = file.match(/error_(.+)\.json/);
          if (dateMatch && dateMatch[1]) {
            const fileDate = new Date(dateMatch[1].replace(/_/g, ':'));
            const ageInDays = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // 지정된 일수보다 오래된 파일 삭제
            if (ageInDays > maxAgeDays) {
              await FileSystem.deleteAsync(`${this.errorLogPath}${file}`);
            }
          }
        } catch (error) {
          console.warn(`파일 날짜 파싱 실패: ${file}`, error);
        }
      }
      
      // 인덱스 파일 재생성
      await this.rebuildErrorIndex();
    } catch (error) {
      console.error('로그 정리 실패:', error);
    }
  }

  /**
   * 에러 인덱스 파일 재구성
   */
  private async rebuildErrorIndex(): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.errorLogPath);
      const errorLogs = files
        .filter(file => file !== 'error_index.json' && file.endsWith('.json'))
        .map(file => `${this.errorLogPath}${file}`);
      
      // 파일 생성 날짜순으로 정렬 (최신순)
      errorLogs.sort().reverse();
      
      // 인덱스 파일 업데이트
      const indexPath = `${this.errorLogPath}error_index.json`;
      await FileSystem.writeAsStringAsync(
        indexPath,
        JSON.stringify(errorLogs.slice(0, 20))
      );
    } catch (error) {
      console.error('에러 인덱스 재구성 실패:', error);
    }
  }

  /**
   * 리소스 정리
   */
  public dispose(): void {
    // 원래 에러 핸들러 복원
    if (this.originalErrorHandler) {
      ErrorUtils.setGlobalHandler(this.originalErrorHandler);
    }
    
    // 리스너 정리
    this.errorListeners = [];
    this.isInitialized = false;
    
    console.log('GlobalErrorHandler가 제거되었습니다.');
  }

  /**
   * 앱 상태 리스너 설정
   */
  private setupAppStateListener(): void {
    this.appState = AppState.currentState;
    
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState;
    });
  }

  /**
   * 로그 디렉토리 초기화
   */
  private async initializeLogDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.LOG_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.LOG_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('로그 디렉토리 생성 실패:', error);
    }
  }

  /**
   * 에러 로그 파일 로드
   */
  private async loadErrorLogs(): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(`${this.LOG_DIR}${this.ERROR_LOG_FILE}`);
      
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(`${this.LOG_DIR}${this.ERROR_LOG_FILE}`);
        this.errorLogs = JSON.parse(content);
      }
    } catch (error) {
      console.error('에러 로그 로드 실패:', error);
      this.errorLogs = [];
    }
  }

  /**
   * 에러 로그 저장
   */
  private async saveErrorLogs(): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(
        `${this.LOG_DIR}${this.ERROR_LOG_FILE}`,
        JSON.stringify(this.errorLogs.slice(-this.MAX_LOGS))
      );
    } catch (error) {
      console.error('에러 로그 저장 실패:', error);
    }
  }

  /**
   * Git 에러 로그 저장
   * @param gitErrorLogs Git 에러 로그 배열
   */
  private async saveGitErrorLogs(gitErrorLogs: any[]): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(
        `${this.LOG_DIR}${this.GIT_ERROR_LOG_FILE}`,
        JSON.stringify(gitErrorLogs.slice(-this.MAX_LOGS))
      );
    } catch (error) {
      console.error('Git 에러 로그 저장 실패:', error);
    }
  }

  /**
   * Git 에러 로그 로드
   * @returns Git 에러 로그 배열
   */
  public async loadGitErrorLogs(): Promise<any[]> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(`${this.LOG_DIR}${this.GIT_ERROR_LOG_FILE}`);
      
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(`${this.LOG_DIR}${this.GIT_ERROR_LOG_FILE}`);
        return JSON.parse(content);
      } else {
        return [];
      }
    } catch (error) {
      console.error('Git 에러 로그 로드 실패:', error);
      return [];
    }
  }

  /**
   * 에러 로깅
   * @param message 에러 메시지
   * @param error 에러 객체
   * @param additionalInfo 추가 정보
   */
  public logError(message: string, error?: any, additionalInfo?: any): void {
    const errorLog: ErrorLog = {
      timestamp: Date.now(),
      error: {
        name: error?.name,
        message: message,
        stack: error?.stack
      },
      additionalInfo
    };

    console.error(`[ERROR] ${message}`, error, additionalInfo);
    
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.MAX_LOGS) {
      this.errorLogs.shift();
    }
    
    this.saveErrorLogs();
  }

  /**
   * Git 에러 처리 및 로깅
   * @param error Git 작업 중 발생한 에러
   * @param operation 수행하던 작업 설명
   * @param repository 작업 중이던 저장소 정보
   */
  public async handleGitError(error: any, operation: string, repository?: string): Promise<void> {
    // Git 에러 정보 추출
    const errorInfo = extractGitErrorInfo(error);
    
    // 기본 에러 로깅
    this.logError(`Git 에러 (${operation}): ${errorInfo.message}`, error);
    
    // Git 전용 에러 로그 작성
    const gitErrorLogs = await this.loadGitErrorLogs();
    gitErrorLogs.push({
      timestamp: Date.now(),
      type: errorInfo.type,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      operation,
      repository,
      stack: error?.stack
    });
    
    await this.saveGitErrorLogs(gitErrorLogs);
    
    // 리스너에게 알림
    this.errorListeners.forEach(listener => {
      try {
        listener(error, true);
      } catch (listenerError) {
        console.error('에러 리스너 실행 중 오류:', listenerError);
      }
    });
  }

  /**
   * 에러 알림 표시
   * @param title 알림 제목
   * @param message 알림 메시지
   * @param fatal 심각한 오류 여부
   */
  public showErrorAlert(title: string, message: string, fatal = false): void {
    Alert.alert(
      title,
      message,
      fatal 
        ? [{ text: '앱 재시작', style: 'destructive', onPress: () => this.restartApp() }]
        : [{ text: '확인', style: 'default' }]
    );
  }

  /**
   * 앱 재시작 처리
   */
  private restartApp(): void {
    // RN 앱 재시작 로직
    // Expo 환경에서는 완전한 재시작이 제한적이므로 
    // 앱 상태를 초기화하는 방향으로 구현
    // (실제 구현은 앱 구조에 따라 달라질 수 있음)
  }

  /**
   * 에러 로그 지우기
   */
  public async clearErrorLogs(): Promise<void> {
    this.errorLogs = [];
    await this.saveErrorLogs();
  }
}

export default GlobalErrorHandler.getInstance();