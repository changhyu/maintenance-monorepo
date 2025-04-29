/**
 * 애플리케이션 오류 타입 정의
 */

/**
 * 기본 애플리케이션 오류 클래스
 * 모든 애플리케이션 오류의 기본 클래스입니다.
 */
export class ApplicationError extends Error {
  /**
   * @param message - 오류 메시지
   */
  constructor(message = '알 수 없는 오류가 발생했습니다.') {
    super(message);
    this.name = 'ApplicationError';
    
    // prototype 설정 (ES5 환경에서 상속 작동을 위해)
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

/**
 * 네트워크 오류 클래스
 * 네트워크 연결 문제로 인한 오류를 나타냅니다.
 */
export class NetworkError extends ApplicationError {
  /**
   * @param message - 오류 메시지
   */
  constructor(message = '네트워크 연결 오류가 발생했습니다.') {
    super(message);
    this.name = 'NetworkError';
    
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * API 오류 기본 클래스
 * API 요청 관련 오류들의 기본 클래스입니다.
 */
export class ApiError extends ApplicationError {
  /** HTTP 상태 코드 */
  public statusCode: number;
  
  /** 원본 API 응답 데이터 */
  public responseData?: unknown;
  
  /**
   * @param message - 오류 메시지
   * @param statusCode - HTTP 상태 코드
   * @param responseData - 원본 API 응답 데이터
   */
  constructor(message = 'API 요청 처리 중 오류가 발생했습니다.', statusCode = 500, responseData?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
    
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 인증 오류 클래스
 * 인증 실패(401) 관련 오류를 나타냅니다.
 */
export class UnauthorizedError extends ApiError {
  /**
   * @param message - 오류 메시지
   */
  constructor(message = '인증이 필요하거나 제공된 인증 정보가 유효하지 않습니다.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
    
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 권한 부족 오류 클래스
 * 권한 부족(403) 관련 오류를 나타냅니다.
 */
export class ForbiddenError extends ApiError {
  /**
   * @param message - 오류 메시지
   * @param responseData - 원본 API 응답 데이터
   */
  constructor(message = '이 작업을 수행할 권한이 없습니다.', responseData?: unknown) {
    super(message, 403, responseData);
    this.name = 'ForbiddenError';
    
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 리소스 없음 오류 클래스
 * 리소스 없음(404) 관련 오류를 나타냅니다.
 */
export class NotFoundError extends ApiError {
  /**
   * @param message - 오류 메시지
   * @param responseData - 원본 API 응답 데이터
   */
  constructor(message = '요청한 리소스를 찾을 수 없습니다.', responseData?: unknown) {
    super(message, 404, responseData);
    this.name = 'NotFoundError';
    
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 유효성 검사 에러 클래스
 * 유효성 검사 실패(400, 422) 관련 에러를 나타냅니다.
 */
export class ValidationError extends ApiError {
  /** 유효성 검사 오류 세부 정보 */
  public errors: Record<string, string[]>;
  
  /**
   * @param message - 에러 메시지
   * @param errors - 유효성 검사 오류 세부 정보
   * @param statusCode - HTTP 상태 코드 (기본값: 422)
   * @param responseData - 원본 API 응답 데이터
   */
  constructor(
    message = '입력 값이 유효하지 않습니다.',
    errors: Record<string, string[]> = {},
    statusCode = 422,
    responseData?: unknown
  ) {
    super(message, statusCode, responseData);
    this.name = 'ValidationError';
    this.errors = errors;
    
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 중복 에러 클래스
 * 리소스 중복(409) 관련 에러를 나타냅니다.
 */
export class DuplicateError extends ApiError {
  /**
   * @param message - 에러 메시지
   * @param responseData - 원본 API 응답 데이터
   */
  constructor(message = '이미 존재하는 리소스입니다.', responseData?: unknown) {
    super(message, 409, responseData);
    this.name = 'DuplicateError';
    
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}

/**
 * 서버 에러 클래스
 * 서버 오류(500) 관련 에러를 나타냅니다.
 */
export class ServerError extends ApiError {
  /**
   * @param message - 에러 메시지
   * @param responseData - 원본 API 응답 데이터
   */
  constructor(message = '서버 내부 오류가 발생했습니다.', responseData?: unknown) {
    super(message, 500, responseData);
    this.name = 'ServerError';
    
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * 시간 초과 에러 클래스
 * 요청 시간 초과 관련 에러를 나타냅니다.
 */
export class TimeoutError extends NetworkError {
  /**
   * @param message - 에러 메시지
   */
  constructor(message = '요청 시간이 초과되었습니다.') {
    super(message);
    this.name = 'TimeoutError';
    
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * 오프라인 에러 클래스
 * 오프라인 상태 관련 에러를 나타냅니다.
 */
export class OfflineError extends NetworkError {
  /**
   * @param message - 에러 메시지
   */
  constructor(message = '오프라인 상태에서 이 작업을 수행할 수 없습니다.') {
    super(message);
    this.name = 'OfflineError';
    
    Object.setPrototypeOf(this, OfflineError.prototype);
  }
}

/**
 * 취소된 요청 에러 클래스
 * 사용자 또는 시스템에 의해 취소된 요청 관련 에러를 나타냅니다.
 */
export class CancelledError extends ApplicationError {
  /**
   * @param message - 에러 메시지
   */
  constructor(message = '요청이 취소되었습니다.') {
    super(message);
    this.name = 'CancelledError';
    
    Object.setPrototypeOf(this, CancelledError.prototype);
  }
}

// API 응답 데이터 인터페이스
interface ApiResponseData {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
  [key: string]: any;
}

/**
 * 에러 팩토리 함수
 * HTTP 상태 코드 기반으로 적절한 에러 객체를 생성합니다.
 * 
 * @param message - 에러 메시지
 * @param statusCode - HTTP 상태 코드
 * @param responseData - API 응답 데이터
 * @returns 적절한 에러 객체
 */
export function createErrorFromResponse(
  message: string,
  statusCode: number,
  responseData?: ApiResponseData
): ApplicationError {
  const errors = responseData?.errors || {};
  
  switch (statusCode) {
    case 400:
      return new ValidationError(message, errors, statusCode, responseData);
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message, responseData);
    case 404:
      return new NotFoundError(message, responseData);
    case 409:
      return new DuplicateError(message, responseData);
    case 422:
      return new ValidationError(message, errors, statusCode, responseData);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message, responseData);
    default:
      return new ApiError(message, statusCode, responseData);
  }
}

/**
 * 에러 메시지 파싱 함수
 * API 응답 데이터에서 사용자 친화적인 에러 메시지를 추출합니다.
 * 
 * @param error - 에러 객체
 * @returns 사용자 친화적인 에러 메시지
 */
export function parseErrorMessage(error: unknown): string {
  // ApiError인 경우
  if (error instanceof ApiError) {
    if (error instanceof ValidationError && Object.keys(error.errors).length > 0) {
      // 첫 번째 검증 오류 메시지 반환
      const firstField = Object.keys(error.errors)[0];
      return error.errors[firstField][0] || error.message;
    }
    return error.message;
  }
  
  // NetworkError인 경우
  if (error instanceof NetworkError) {
    return error.message;
  }
  
  // Axios 오류 응답이 있는 경우 (타입 단언으로 타입 안전성 보장)
  const axiosError = error as { response?: { data?: { message?: string } } };
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }
  
  // 일반 오류 객체인 경우
  if (error instanceof Error) {
    return error.message;
  }
  
  // 기본 오류 메시지
  return typeof error === 'string' ? error : '알 수 없는 오류가 발생했습니다.';
}

/**
 * 에러 코드 파싱 함수
 * API 응답 데이터에서 에러 코드를 추출합니다.
 * 
 * @param error - 에러 객체
 * @returns 에러 코드 또는 undefined
 */
export function parseErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiError && typeof error.responseData === 'object' && error.responseData !== null) {
    const typedData = error.responseData as ApiResponseData;
    return typedData.code;
  }
  
  // Axios 오류 응답이 있는 경우
  const axiosError = error as { response?: { data?: { code?: string } } };
  if (axiosError.response?.data?.code) {
    return axiosError.response.data.code;
  }
  
  return undefined;
}

// 에러 타입 모음
export const errorTypes = {
  ApplicationError,
  NetworkError,
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  DuplicateError,
  ServerError,
  TimeoutError,
  OfflineError,
  CancelledError
};

export default {
  ApplicationError,
  NetworkError,
  UnauthorizedError,
  ApiError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  DuplicateError,
  ServerError,
  TimeoutError,
  OfflineError,
  CancelledError,
  createErrorFromResponse,
  parseErrorMessage,
  parseErrorCode,
  errorTypes
};
