import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { extractGitErrorInfo } from '../utils/git-helpers';
import { GlobalErrorHandler } from '../utils/GlobalErrorHandler';

// Git 에러 타입 정의
export type GitErrorType = 'AUTH' | 'NETWORK' | 'NOT_FOUND' | 'CONFLICT' | 'LOCK' | 'UNKNOWN';

// Git 에러 정보 인터페이스
export interface GitErrorInfo {
  type: GitErrorType;
  message: string;
  originalError: any;
  timestamp: Date;
}

// Git 에러 컨텍스트 인터페이스
interface GitErrorContextType {
  lastError: GitErrorInfo | null;
  errorHistory: GitErrorInfo[];
  handleGitError: (error: any, title?: string) => void;
  clearLastError: () => void;
  clearErrorHistory: () => void;
}

// 컨텍스트 생성
const GitErrorContext = createContext<GitErrorContextType | null>(null);

// 프로바이더 프롭스 인터페이스
interface GitErrorProviderProps {
  children: ReactNode;
  maxHistoryLength?: number;
}

/**
 * Git 에러 컨텍스트 프로바이더 컴포넌트
 */
export const GitErrorProvider: React.FC<GitErrorProviderProps> = ({ 
  children, 
  maxHistoryLength = 10 
}) => {
  // 마지막 에러 상태
  const [lastError, setLastError] = useState<GitErrorInfo | null>(null);
  // 에러 히스토리 상태
  const [errorHistory, setErrorHistory] = useState<GitErrorInfo[]>([]);

  /**
   * Git 에러 처리 함수
   * @param error 처리할 에러 객체
   * @param title 에러 알림 제목
   */
  const handleGitError = useCallback((error: any, title = 'Git 오류') => {
    // 에러 정보 추출
    const errorInfo = extractGitErrorInfo(error);
    
    // 에러 객체 생성
    const gitError: GitErrorInfo = {
      type: errorInfo.type,
      message: errorInfo.message,
      originalError: error,
      timestamp: new Date(),
    };

    // 에러 상태 업데이트
    setLastError(gitError);
    setErrorHistory(prev => {
      const newHistory = [gitError, ...prev];
      return newHistory.slice(0, maxHistoryLength);
    });

    // 글로벌 에러 로깅
    GlobalErrorHandler.logError(`Git 에러: ${errorInfo.message}`, error);

    // 사용자에게 에러 알림
    Alert.alert(
      title,
      errorInfo.userMessage || errorInfo.message,
      [{ text: '확인', style: 'default' }]
    );
  }, [maxHistoryLength]);

  /**
   * 마지막 에러 초기화 함수
   */
  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  /**
   * 에러 히스토리 초기화 함수
   */
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);

  // 컨텍스트 값 객체
  const contextValue: GitErrorContextType = {
    lastError,
    errorHistory,
    handleGitError,
    clearLastError,
    clearErrorHistory,
  };

  return (
    <GitErrorContext.Provider value={contextValue}>
      {children}
    </GitErrorContext.Provider>
  );
};

/**
 * Git 에러 컨텍스트 사용 훅
 */
export const useGitError = (): GitErrorContextType | null => {
  return useContext(GitErrorContext);
};

export default GitErrorContext; 