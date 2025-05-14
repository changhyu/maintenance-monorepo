import axios, { AxiosError } from 'axios';

/**
 * API 에러 타입 정의
 */
export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

/**
 * API 에러 응답에서 사용자 친화적인 메시지를 추출합니다.
 * @param error Axios 에러 객체
 * @returns 사용자에게 표시할 메시지
 */
export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; details?: string }>;
    
    // API 응답 에러 메시지 처리
    if (axiosError.response?.data) {
      const { message, error: errorMsg, details } = axiosError.response.data;
      return message || errorMsg || details || '서버에서 오류가 발생했습니다.';
    }
    
    // 네트워크 오류
    if (axiosError.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
    }
    
    if (axiosError.code === 'ERR_NETWORK') {
      return '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
    }
    
    // HTTP 상태 코드 기반 메시지
    if (axiosError.response) {
      switch (axiosError.response.status) {
        case 400:
          return '잘못된 요청입니다. 입력 값을 확인해주세요.';
        case 401:
          return '인증이 필요합니다. 다시 로그인해주세요.';
        case 403:
          return '접근 권한이 없습니다.';
        case 404:
          return '요청한 리소스를 찾을 수 없습니다.';
        case 422:
          return '유효하지 않은 데이터입니다. 입력 값을 확인해주세요.';
        case 500:
          return '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        default:
          return `오류가 발생했습니다. (${axiosError.response.status})`;
      }
    }
  }
  
  // 기타 에러
  if (error instanceof Error) {
    return error.message || '알 수 없는 오류가 발생했습니다.';
  }
  
  return '알 수 없는 오류가 발생했습니다.';
};

/**
 * API 호출을 비동기적으로 처리하고 에러를 포착합니다.
 * @param apiCall API 호출 프로미스 함수
 * @returns [데이터, 에러, 로딩 상태] 튜플
 */
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>
): Promise<[T | null, string | null, boolean]> => {
  try {
    const data = await apiCall();
    return [data, null, false];
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    console.error('API 호출 오류:', error);
    return [null, errorMessage, false];
  }
};

/**
 * 개발 환경 확인
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 개발 환경에서만 콘솔 로그를 출력합니다.
 */
export const devLog = (...args: any[]): void => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * 성능 메트릭 측정 유틸리티
 */
export const measurePerformance = <T>(
  operation: string,
  fn: () => T,
  callback?: (duration: number) => void
): T => {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const end = performance.now();
    const duration = end - start;
    
    if (isDevelopment) {
      console.info(`[성능] ${operation}: ${duration.toFixed(2)}ms`);
    }
    
    if (callback) {
      callback(duration);
    }
  }
}; 