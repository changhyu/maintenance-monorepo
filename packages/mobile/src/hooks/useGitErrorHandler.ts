import { useCallback } from 'react';
import { Alert } from 'react-native';
import GlobalErrorHandler from '../utils/GlobalErrorHandler';

// Git 오류 타입 정의
export enum GitErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  REPOSITORY = 'REPOSITORY', 
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  COMMIT_ERROR = 'COMMIT_ERROR',
  BRANCH_ERROR = 'BRANCH_ERROR',
  TAG_ERROR = 'TAG_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Git 오류 분류 함수
const classifyGitError = (error: any): GitErrorType => {
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';
  
  // 인증 관련 오류
  if (
    errorMessage.includes('authentication') || 
    errorMessage.includes('권한이 없습니다') ||
    errorMessage.includes('permission denied') ||
    errorMessage.includes('credentials') ||
    errorCode.includes('auth')
  ) {
    return GitErrorType.AUTHENTICATION;
  }
  
  // 네트워크 관련 오류
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('연결이 끊겼습니다') ||
    errorCode.includes('ENOTFOUND') ||
    errorCode.includes('ETIMEDOUT')
  ) {
    return GitErrorType.NETWORK;
  }
  
  // 병합 충돌 오류
  if (
    errorMessage.includes('conflict') ||
    errorMessage.includes('충돌') ||
    errorMessage.includes('CONFLICT')
  ) {
    return GitErrorType.MERGE_CONFLICT;
  }
  
  // 저장소 관련 오류
  if (
    errorMessage.includes('repository') ||
    errorMessage.includes('저장소') ||
    errorMessage.includes('not a git repository') ||
    errorMessage.includes('does not exist')
  ) {
    return GitErrorType.REPOSITORY;
  }
  
  // 커밋 관련 오류
  if (
    errorMessage.includes('commit') ||
    errorMessage.includes('nothing to commit') ||
    errorMessage.includes('커밋')
  ) {
    return GitErrorType.COMMIT_ERROR;
  }
  
  // 브랜치 관련 오류
  if (
    errorMessage.includes('branch') ||
    errorMessage.includes('브랜치') ||
    errorMessage.includes('not found')
  ) {
    return GitErrorType.BRANCH_ERROR;
  }
  
  // 태그 관련 오류
  if (
    errorMessage.includes('tag') ||
    errorMessage.includes('태그')
  ) {
    return GitErrorType.TAG_ERROR;
  }
  
  // 기타 알 수 없는 오류
  return GitErrorType.UNKNOWN;
};

// Git 오류 메시지 및 대응 방법
const getErrorMessageAndAction = (errorType: GitErrorType): { title: string, message: string, action?: () => void } => {
  switch (errorType) {
    case GitErrorType.AUTHENTICATION:
      return {
        title: 'Git 인증 오류',
        message: '사용자 인증에 실패했습니다. 자격 증명을 확인하고 다시 시도하세요.'
      };
      
    case GitErrorType.NETWORK:
      return {
        title: '네트워크 연결 오류',
        message: '네트워크 연결을 확인한 후 다시 시도하세요. 오프라인 모드가 가능할 수 있습니다.'
      };
      
    case GitErrorType.MERGE_CONFLICT:
      return {
        title: '병합 충돌 발생',
        message: '파일 병합 중 충돌이 발생했습니다. 충돌을 해결한 후 다시 시도하세요.'
      };
      
    case GitErrorType.REPOSITORY:
      return {
        title: '저장소 오류',
        message: '저장소를 찾을 수 없거나 접근할 수 없습니다. 저장소 설정을 확인하세요.'
      };
      
    case GitErrorType.COMMIT_ERROR:
      return {
        title: '커밋 오류',
        message: '커밋 생성 중 오류가 발생했습니다. 변경 사항이 있는지 확인하세요.'
      };
      
    case GitErrorType.BRANCH_ERROR:
      return {
        title: '브랜치 오류',
        message: '브랜치 작업 중 오류가 발생했습니다. 브랜치 이름이 올바른지 확인하세요.'
      };
      
    case GitErrorType.TAG_ERROR:
      return {
        title: '태그 오류',
        message: '태그 작업 중 오류가 발생했습니다. 태그 이름이 올바른지 확인하세요.'
      };
      
    case GitErrorType.UNKNOWN:
    default:
      return {
        title: 'Git 오류',
        message: '알 수 없는 Git 오류가 발생했습니다. 자세한 내용은 로그를 확인하세요.'
      };
  }
};

/**
 * Git 관련 오류를 처리하는 커스텀 훅
 */
const useGitErrorHandler = () => {
  /**
   * Git 오류 처리 함수
   */
  const handleGitError = useCallback((error: any) => {
    // 에러 유형 분류
    const errorType = classifyGitError(error);
    
    // 전역 에러 핸들러에 오류 로깅
    GlobalErrorHandler.handleError(
      error instanceof Error ? error : new Error(JSON.stringify(error)),
      { errorType, isGitError: true }
    );
    
    // 오류 유형에 따른 메시지 및 대응 방법 가져오기
    const { title, message, action } = getErrorMessageAndAction(errorType);
    
    // 사용자에게 오류 알림
    Alert.alert(
      title,
      message,
      [
        { text: '확인', onPress: action },
      ],
      { cancelable: false }
    );
    
    return errorType;
  }, []);
  
  /**
   * Git 작업 래핑 함수 - 오류 처리 포함
   */
  const withGitErrorHandling = useCallback(async <T,>(
    gitOperation: () => Promise<T>,
    onSuccess?: (result: T) => void
  ): Promise<T | null> => {
    try {
      const result = await gitOperation();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      handleGitError(error);
      return null;
    }
  }, [handleGitError]);
  
  return {
    handleGitError,
    withGitErrorHandling,
    GitErrorType
  };
};

export default useGitErrorHandler; 