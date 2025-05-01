import { GlobalErrorHandler } from './GlobalErrorHandler';
import fs from 'expo-file-system';
import { Alert } from 'react-native';
import { GitErrorType } from '../contexts/GitErrorContext';

// git 메시지 파싱을 위한 정규표현식
const ERROR_PATTERNS = {
  AUTH: /(authentication|permission denied|access denied|권한 거부|인증 실패)/i,
  NETWORK: /(network|connection|timeout|연결|시간 초과)/i,
  NOT_FOUND: /(not found|not a git repository|찾을 수 없음|존재하지 않음)/i,
  CONFLICT: /(conflict|충돌|병합 충돌)/i,
  LOCK: /(lock|is locked|잠금|잠겨 있음)/i,
};

/**
 * Git 에러 정보 인터페이스
 */
export interface GitErrorInfo {
  type: GitErrorType;
  message: string;
  userMessage?: string;
}

/**
 * Git 저장소 상태 인터페이스
 */
export interface RepositoryStatus {
  isValid: boolean;
  hasChanges: boolean;
  branchName: string | null;
  uncommittedChanges: number;
  unstagedChanges: number;
}

/**
 * Git 저장소 상태를 확인하는 함수
 * @param repoPath 저장소 경로
 * @returns 저장소 상태 정보
 */
export async function checkRepositoryStatus(repoPath: string) {
  try {
    // 폴더 존재 여부 확인
    const dirInfo = await fs.getInfoAsync(repoPath);
    if (!dirInfo.exists || !dirInfo.isDirectory) {
      return { exists: false, isValid: false, error: '저장소 폴더가 존재하지 않습니다.' };
    }

    // .git 폴더 존재 여부 확인
    const gitDirInfo = await fs.getInfoAsync(`${repoPath}/.git`);
    if (!gitDirInfo.exists || !gitDirInfo.isDirectory) {
      return { exists: true, isValid: false, error: '유효한 Git 저장소가 아닙니다.' };
    }

    return { exists: true, isValid: true, error: null };
  } catch (error) {
    GlobalErrorHandler.logError('Git 저장소 상태 확인 중 오류 발생', error);
    return { exists: false, isValid: false, error: error.message };
  }
}

/**
 * Git 에러에서 정보 추출
 * @param error 발생한 에러
 * @returns 에러 정보 객체
 */
export function extractGitErrorInfo(error: any): GitErrorInfo {
  // 기본 에러 정보
  let result: GitErrorInfo = {
    type: 'UNKNOWN',
    message: '알 수 없는 Git 오류가 발생했습니다.',
    userMessage: '알 수 없는 Git 오류가 발생했습니다. 다시 시도해주세요.'
  };

  if (!error) {
    return result;
  }

  const errorMessage = error.message || error.toString();

  // 인증 관련 에러
  if (errorMessage.includes('authentication') || 
      errorMessage.includes('Auth') || 
      errorMessage.includes('permission') || 
      errorMessage.includes('권한') ||
      errorMessage.includes('403')) {
    result = {
      type: 'AUTH',
      message: `인증 오류: ${errorMessage}`,
      userMessage: '인증에 실패했습니다. 계정 정보를 확인해주세요.'
    };
  }
  // 네트워크 관련 에러
  else if (errorMessage.includes('network') || 
           errorMessage.includes('timeout') || 
           errorMessage.includes('connection') ||
           errorMessage.includes('연결') ||
           errorMessage.includes('네트워크')) {
    result = {
      type: 'NETWORK',
      message: `네트워크 오류: ${errorMessage}`,
      userMessage: '네트워크 연결 문제가 발생했습니다. 연결 상태를 확인해주세요.'
    };
  }
  // 리포지토리 찾을 수 없음 에러
  else if (errorMessage.includes('not found') || 
           errorMessage.includes('찾을 수 없') || 
           errorMessage.includes('존재하지 않')) {
    result = {
      type: 'NOT_FOUND',
      message: `경로 오류: ${errorMessage}`,
      userMessage: '저장소를 찾을 수 없습니다. 경로를 확인해주세요.'
    };
  }
  // 충돌 관련 에러
  else if (errorMessage.includes('conflict') || 
           errorMessage.includes('merge') || 
           errorMessage.includes('충돌')) {
    result = {
      type: 'CONFLICT',
      message: `충돌 오류: ${errorMessage}`,
      userMessage: '병합 충돌이 발생했습니다. 충돌을 해결한 후 다시 시도해주세요.'
    };
  }
  // 잠금 관련 에러
  else if (errorMessage.includes('lock') || 
           errorMessage.includes('index.lock') || 
           errorMessage.includes('잠금')) {
    result = {
      type: 'LOCK',
      message: `잠금 오류: ${errorMessage}`,
      userMessage: 'Git 잠금 파일이 존재합니다. 잠시 후 다시 시도해주세요.'
    };
  }

  return result;
}

/**
 * Git 에러를 처리하고 사용자에게 알림을 표시
 * @param error 발생한 Git 에러
 * @param title 알림 제목 (옵션)
 */
export function handleGitOperationError(error: any, title = 'Git 오류') {
  const errorInfo = extractGitErrorInfo(error);
  
  // 에러 로깅
  GlobalErrorHandler.logError(`Git 오류 (${errorInfo.type}): ${errorInfo.message}`, error);
  
  // 사용자에게 알림
  Alert.alert(
    title,
    errorInfo.userMessage || errorInfo.message,
    [{ text: '확인', style: 'default' }]
  );
  
  return errorInfo;
}

/**
 * Git 작업을 안전하게 수행
 * @param operation 수행할 Git 작업 함수
 * @param onError 에러 발생 시 처리할 함수 (선택적)
 * @returns 작업 결과 또는 null (에러 발생 시)
 */
export async function safeGitOperation<T>(
  operation: () => Promise<T>,
  onError?: (error: any) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    // 에러 정보 추출
    const errorInfo = extractGitErrorInfo(error);
    
    // 글로벌 에러 로그 기록
    GlobalErrorHandler.logError(`Git 작업 실패: ${errorInfo.message}`, error);
    
    // 에러 핸들러가 제공된 경우 호출
    if (onError) {
      onError(error);
    }
    
    return null;
  }
}

/**
 * 저장소 상태 확인
 * @param getRepoStatus 저장소 상태를 가져오는 함수
 * @returns 저장소 상태 정보
 */
export async function checkRepositoryStatus(
  getRepoStatus: () => Promise<any>
): Promise<RepositoryStatus> {
  const defaultStatus: RepositoryStatus = {
    isValid: false,
    hasChanges: false,
    branchName: null,
    uncommittedChanges: 0,
    unstagedChanges: 0
  };

  try {
    const status = await safeGitOperation(getRepoStatus);
    
    if (!status) {
      return defaultStatus;
    }
    
    return {
      isValid: true,
      hasChanges: status.modified?.length > 0 || status.added?.length > 0 || status.deleted?.length > 0,
      branchName: status.current || null,
      uncommittedChanges: (status.modified?.length || 0) + (status.added?.length || 0) + (status.deleted?.length || 0),
      unstagedChanges: status.not_added?.length || 0
    };
  } catch (error) {
    GlobalErrorHandler.logError('저장소 상태 확인 중 오류 발생', error);
    return defaultStatus;
  }
}

/**
 * Git 에러 메시지에서 주요 정보 추출
 * @param errorMessage 에러 메시지
 * @returns 간결한 에러 메시지
 */
export function simplifyGitErrorMessage(errorMessage: string): string {
  // 에러 메시지에서 경로나 불필요한 세부 정보 제거
  let simplified = errorMessage;
  
  // 경로 정보 정리
  simplified = simplified.replace(/in (\/|\\|\.\.\/)+[a-zA-Z0-9\/\._-]+/g, 'in repository');
  
  // 해시 값 정리
  simplified = simplified.replace(/[a-f0-9]{40}/g, '[commit hash]');
  
  // 긴 에러 스택 제거
  if (simplified.includes('\n')) {
    simplified = simplified.split('\n')[0];
  }
  
  return simplified;
} 