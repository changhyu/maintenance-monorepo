import { useState, useCallback } from 'react';
import { safeGitOperation, checkRepositoryStatus, extractGitErrorInfo } from '../utils/git-helpers';
import { useGitError } from '../contexts/GitErrorContext';
import { GlobalErrorHandler } from '../utils/GlobalErrorHandler';

// Git 작업 상태 타입 정의
type GitOperationStatus = 'idle' | 'loading' | 'success' | 'error';

// Git 작업 결과 인터페이스
interface GitOperationResult<T> {
  data: T | null;
  status: GitOperationStatus;
  error: any | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Git 작업 수행을 위한 커스텀 훅
 * 작업 상태 관리 및 에러 처리를 포함
 */
export function useGitOperations() {
  // Git 에러 컨텍스트 사용
  const gitErrorContext = useGitError();

  // 작업 상태 및 결과 관리
  const [operationResults, setOperationResults] = useState<{
    [key: string]: GitOperationResult<any>;
  }>({});

  /**
   * Git 작업을 실행하는 함수
   * @param operationKey 작업 식별자
   * @param operation 수행할 Git 작업 함수
   * @param errorTitle 에러 발생 시 표시할 제목
   */
  const executeGitOperation = useCallback(
    async <T>(operationKey: string, operation: () => Promise<T>, errorTitle?: string): Promise<GitOperationResult<T>> => {
      // 작업 시작 상태 설정
      setOperationResults((prev) => ({
        ...prev,
        [operationKey]: {
          data: null,
          status: 'loading',
          error: null,
          isLoading: true,
          isSuccess: false,
          isError: false,
        },
      }));

      try {
        // Git 작업 수행
        const result = await operation();

        // 성공 상태 설정
        const successResult = {
          data: result,
          status: 'success' as const,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        };

        setOperationResults((prev) => ({
          ...prev,
          [operationKey]: successResult,
        }));

        return successResult;
      } catch (error) {
        // 에러 정보 추출
        const errorInfo = extractGitErrorInfo(error);
        
        // 에러 로깅
        GlobalErrorHandler.logError(`Git 작업 오류 (${operationKey}): ${errorInfo.message}`, error);
        
        // Git 에러 컨텍스트에 에러 전달
        if (gitErrorContext) {
          gitErrorContext.handleGitError(error, errorTitle || `Git 작업 오류: ${operationKey}`);
        }

        // 에러 상태 설정
        const errorResult = {
          data: null,
          status: 'error' as const,
          error: error,
          isLoading: false,
          isSuccess: false,
          isError: true,
        };

        setOperationResults((prev) => ({
          ...prev,
          [operationKey]: errorResult,
        }));

        return errorResult;
      }
    },
    [gitErrorContext]
  );

  /**
   * 안전하게 Git 작업을 수행하는 함수
   * 에러 발생 시 자동으로 처리하고 null 반환
   */
  const executeSafeGitOperation = useCallback(
    async <T>(operationKey: string, operation: () => Promise<T>, errorTitle?: string): Promise<T | null> => {
      const result = await safeGitOperation(operation, errorTitle);
      
      // 작업 결과 상태 업데이트
      setOperationResults((prev) => ({
        ...prev,
        [operationKey]: {
          data: result,
          status: result !== null ? 'success' : 'error',
          error: result !== null ? null : new Error('작업 실패'),
          isLoading: false,
          isSuccess: result !== null,
          isError: result === null,
        },
      }));
      
      return result;
    },
    []
  );

  /**
   * Git 저장소 상태 확인 함수
   */
  const checkRepoStatus = useCallback(
    async (repoPath: string) => {
      return await executeGitOperation('checkRepoStatus', () => checkRepositoryStatus(repoPath), '저장소 상태 확인');
    },
    [executeGitOperation]
  );

  /**
   * 작업 상태 초기화 함수
   */
  const resetOperation = useCallback((operationKey: string) => {
    setOperationResults((prev) => {
      const newResults = { ...prev };
      delete newResults[operationKey];
      return newResults;
    });
  }, []);

  /**
   * 특정 작업의 결과 상태 가져오기
   */
  const getOperationResult = useCallback(
    <T>(operationKey: string): GitOperationResult<T> => {
      return (
        operationResults[operationKey] || {
          data: null,
          status: 'idle',
          error: null,
          isLoading: false,
          isSuccess: false,
          isError: false,
        }
      );
    },
    [operationResults]
  );

  return {
    executeGitOperation,
    executeSafeGitOperation,
    checkRepoStatus,
    resetOperation,
    getOperationResult,
    operationResults,
  };
} 