import { getLogger } from './logger';
import { AppError, ErrorCode, SafetyDataError, TrafficError } from './errors';

const logger = getLogger('ErrorHandler');

/**
 * 컴포넌트의 상태 업데이트를 위한 타입 정의
 */
type ErrorStateUpdater = (error: string | null) => void;

/**
 * 업데이트할 상태가 없는 에러 핸들러
 * @param error 처리할 오류 객체
 * @param context 오류 발생 컨텍스트 설명
 * @param notifyUser 사용자에게 알림 표시 여부
 */
export function handleError(error: any, context: string, notifyUser: boolean = true): void {
  if (error instanceof AppError) {
    // 앱 전용 예외 처리
    logger.error(`${context}: ${error.getDetailedMessage()}`);
    
    if (notifyUser && error.isUserFacing) {
      // 사용자 피드백 표시 (Toast 또는 알림)
      showUserNotification(error.getUserMessage());
    }
  } else {
    // 일반 예외 처리
    logger.error(`${context}:`, error);
    
    if (notifyUser) {
      // 사용자 피드백 표시 (Toast 또는 알림)
      showUserNotification(`실행 중 오류가 발생했습니다: ${context}`);
    }
  }
}

/**
 * 상태 업데이트 포함하는 에러 핸들러
 * @param error 처리할 오류 객체
 * @param context 오류 발생 컨텍스트 설명
 * @param setError 에러 상태 업데이트 함수
 * @param notifyUser 사용자에게 알림 표시 여부
 */
export function handleErrorWithState(
  error: any, 
  context: string,
  setError: ErrorStateUpdater,
  notifyUser: boolean = true
): void {
  if (error instanceof AppError) {
    // 앱 전용 예외 처리
    logger.error(`${context}: ${error.getDetailedMessage()}`);
    
    // 상태 업데이트
    setError(error.getUserMessage());
    
    if (notifyUser && error.isUserFacing) {
      // 사용자 피드백 표시
      showUserNotification(error.getUserMessage());
    }
  } else {
    // 일반 예외 처리
    logger.error(`${context}:`, error);
    
    // 상태 업데이트
    setError(`오류: ${context}`);
    
    if (notifyUser) {
      // 사용자 피드백 표시
      showUserNotification(`실행 중 오류가 발생했습니다: ${context}`);
    }
  }
}

/**
 * 안전 데이터 관련 오류 처리
 * @param error 처리할 오류 객체
 * @param context 오류 발생 컨텍스트 설명
 */
export function handleSafetyDataError(
  error: any,
  context: string,
  setError?: ErrorStateUpdater,
  notifyUser: boolean = true
): void {
  // 안전 데이터 예외인 경우 적절한 처리
  if (error instanceof SafetyDataError) {
    logger.error(`안전 데이터 오류 (${context}): ${error.getDetailedMessage()}`);
    
    // 특정 오류 코드에 따른 처리
    if (error.code === ErrorCode.SAFETY_API_KEY_MISSING) {
      const message = '안전 데이터 API 키가 필요합니다. 설정에서 확인해주세요.';
      if (setError) setError(message);
      if (notifyUser) showUserNotification(message);
    } 
    else if (error.code === ErrorCode.SAFETY_DATA_LOAD_FAILED) {
      const message = '안전 데이터를 로드할 수 없습니다. 네트워크 연결을 확인하세요.';
      if (setError) setError(message);
      if (notifyUser) showUserNotification(message);
    }
    else {
      if (setError) setError(error.getUserMessage());
      if (notifyUser && error.isUserFacing) showUserNotification(error.getUserMessage());
    }
  } 
  // 다른 예외는 일반 핸들러로 위임
  else {
    if (setError) {
      handleErrorWithState(error, context, setError, notifyUser);
    } else {
      handleError(error, context, notifyUser);
    }
  }
}

/**
 * 비동기 함수 실행을 안전하게 래핑
 * @param asyncFn 실행할 비동기 함수
 * @param errorContext 오류 발생 시 컨텍스트 설명
 * @param fallbackValue 오류 발생 시 반환할 기본값
 */
export async function safeAsyncCall<T>(
  asyncFn: () => Promise<T>,
  errorContext: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, errorContext, false);
    return fallbackValue;
  }
}

/**
 * 동기 함수 실행을 안전하게 래핑
 * @param fn 실행할 함수
 * @param errorContext 오류 발생 시 컨텍스트 설명
 * @param fallbackValue 오류 발생 시 반환할 기본값
 */
export function safeCall<T>(
  fn: () => T,
  errorContext: string,
  fallbackValue: T
): T {
  try {
    return fn();
  } catch (error) {
    handleError(error, errorContext, false);
    return fallbackValue;
  }
}

/**
 * 사용자에게 알림 표시 (실제 구현은 UI 프레임워크에 따라 다름)
 * @param message 표시할 메시지
 */
function showUserNotification(message: string): void {
  // 실제 구현에서는 Toast, Alert 등 앱에 맞는 방식으로 구현
  // 현재는 콘솔에만 출력
  logger.info(`알림 표시: ${message}`);
  
  // 예시: React Native에서는 아래와 같이 Toast 표시 가능
  // import Toast from 'react-native-toast-message';
  // Toast.show({ type: 'error', text1: '오류', text2: message });
}

/**
 * 컴포넌트에서 try-catch 블록 없이 비동기 함수를 안전하게 실행하는 래퍼
 * @param asyncFn 실행할 비동기 함수
 * @param onError 오류 발생 시 호출할 콜백
 */
export function createSafeAsyncHandler<T extends any[]>(
  asyncFn: (...args: T) => Promise<void>,
  errorContext: string,
  setError?: ErrorStateUpdater
): (...args: T) => void {
  return (...args: T) => {
    asyncFn(...args).catch(error => {
      if (setError) {
        handleErrorWithState(error, errorContext, setError);
      } else {
        handleError(error, errorContext);
      }
    });
  };
}

/**
 * 비동기 API 호출 결과 처리를 위한 유틸리티
 * @param promise 호출할 API 프로미스
 * @param errorContext 오류 발생 시 컨텍스트 설명
 */
export async function handleApiResponse<T>(
  promise: Promise<T>,
  errorContext: string
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error: any) {
    handleError(error, errorContext, false);
    return [null, error];
  }
}

/**
 * 컴포넌트 언마운트 시 취소 가능한 비동기 호출 생성
 * @param asyncFn 실행할 비동기 함수
 * @param onSuccess 성공 시 호출할 콜백
 * @param onError 오류 발생 시 호출할 콜백
 */
export function createCancellableAsyncCall<T, U extends any[]>(
  asyncFn: (...args: U) => Promise<T>,
  onSuccess: (result: T) => void,
  onError: (error: any) => void
): [(...args: U) => Promise<void>, () => void] {
  let isCancelled = false;
  
  const execute = async (...args: U) => {
    try {
      const result = await asyncFn(...args);
      if (!isCancelled) {
        onSuccess(result);
      }
    } catch (error) {
      if (!isCancelled) {
        onError(error);
      }
    }
  };
  
  const cancel = () => {
    isCancelled = true;
  };
  
  return [execute, cancel];
}