/**
 * 앱에서 사용하는 모든 오류 코드 정의
 */
export enum ErrorCode {
  // 일반 오류
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // 인증 관련 오류
  AUTH_FAILED = 'AUTH_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // 데이터 관련 오류
  DATA_PARSE_ERROR = 'DATA_PARSE_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  
  // 안전 데이터 관련 오류
  SAFETY_DATA_LOAD_FAILED = 'SAFETY_DATA_LOAD_FAILED',
  SAFETY_DATA_PARSE_ERROR = 'SAFETY_DATA_PARSE_ERROR',
  SAFETY_API_KEY_MISSING = 'SAFETY_API_KEY_MISSING',
  
  // 교통 정보 관련 오류
  TRAFFIC_SERVICE_UNAVAILABLE = 'TRAFFIC_SERVICE_UNAVAILABLE',
  TRAFFIC_DATA_LOAD_FAILED = 'TRAFFIC_DATA_LOAD_FAILED',
  
  // 경로 관련 오류
  ROUTE_CALCULATION_FAILED = 'ROUTE_CALCULATION_FAILED',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  INVALID_LOCATION = 'INVALID_LOCATION',
  
  // 지오코딩 관련 오류
  GEOCODING_FAILED = 'GEOCODING_FAILED',
  
  // 위치 서비스 관련 오류
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  LOCATION_SERVICE_DISABLED = 'LOCATION_SERVICE_DISABLED',
  
  // 앱 설정 관련 오류
  SETTINGS_LOAD_FAILED = 'SETTINGS_LOAD_FAILED',
  SETTINGS_SAVE_FAILED = 'SETTINGS_SAVE_FAILED'
}

/**
 * 기본 앱 오류 클래스
 * 모든 앱 오류의 기본 클래스
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly isUserFacing: boolean;
  public readonly meta?: Record<string, any>;
  public readonly cause?: Error;
  
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code || ErrorCode.UNKNOWN;
    this.isUserFacing = options?.isUserFacing ?? false;
    this.meta = options?.meta;
    this.cause = options?.cause;
    
    // 스택 트레이스 유지
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * 오류의 상세 정보를 문자열로 반환 (로깅용)
   */
  getDetailedMessage(): string {
    let details = `${this.message} [${this.code}]`;
    
    if (this.meta) {
      try {
        details += ` Meta: ${JSON.stringify(this.meta)}`;
      } catch {
        details += ` Meta: [직렬화 불가능한 데이터]`;
      }
    }
    
    if (this.cause) {
      details += ` Caused by: ${this.cause.message}`;
    }
    
    return details;
  }
  
  /**
   * 사용자에게 표시할 메시지 반환
   */
  getUserMessage(): string {
    // 기본적으로 원본 메시지 반환, 하위 클래스에서 오버라이드 가능
    return this.message;
  }
}

/**
 * 안전 데이터 관련 오류 클래스
 */
export class SafetyDataError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message, {
      code: options?.code || ErrorCode.SAFETY_DATA_LOAD_FAILED,
      isUserFacing: options?.isUserFacing ?? true,
      meta: options?.meta,
      cause: options?.cause
    });
    this.name = 'SafetyDataError';
  }
  
  getUserMessage(): string {
    // 오류 코드별 사용자 친화적인 메시지 반환
    switch (this.code) {
      case ErrorCode.SAFETY_API_KEY_MISSING:
        return '교통안전 정보를 불러올 수 없습니다. API 키가 필요합니다.';
      case ErrorCode.SAFETY_DATA_LOAD_FAILED:
        return '교통안전 정보를 불러오는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.';
      case ErrorCode.SAFETY_DATA_PARSE_ERROR:
        return '교통안전 데이터 처리 중 오류가 발생했습니다.';
      default:
        return '교통안전 정보 처리 중 오류가 발생했습니다.';
    }
  }
}

/**
 * 교통 정보 관련 오류 클래스
 */
export class TrafficError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message, {
      code: options?.code || ErrorCode.TRAFFIC_DATA_LOAD_FAILED,
      isUserFacing: options?.isUserFacing ?? true,
      meta: options?.meta,
      cause: options?.cause
    });
    this.name = 'TrafficError';
  }
  
  getUserMessage(): string {
    // 오류 코드별 사용자 친화적인 메시지 반환
    switch (this.code) {
      case ErrorCode.TRAFFIC_SERVICE_UNAVAILABLE:
        return '교통 정보 서비스를 이용할 수 없습니다. 나중에 다시 시도해주세요.';
      case ErrorCode.TRAFFIC_DATA_LOAD_FAILED:
        return '실시간 교통 정보를 불러오는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.';
      default:
        return '교통 정보 처리 중 오류가 발생했습니다.';
    }
  }
}

/**
 * 경로 계산 관련 오류 클래스
 */
export class RouteError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message, {
      code: options?.code || ErrorCode.ROUTE_CALCULATION_FAILED,
      isUserFacing: options?.isUserFacing ?? true,
      meta: options?.meta,
      cause: options?.cause
    });
    this.name = 'RouteError';
  }
  
  getUserMessage(): string {
    // 오류 코드별 사용자 친화적인 메시지 반환
    switch (this.code) {
      case ErrorCode.ROUTE_CALCULATION_FAILED:
        return '경로를 계산하는 중 오류가 발생했습니다. 다시 시도해주세요.';
      case ErrorCode.ROUTE_NOT_FOUND:
        return '출발지와 목적지 사이의 경로를 찾을 수 없습니다. 다른 위치를 선택해주세요.';
      case ErrorCode.INVALID_LOCATION:
        return '유효하지 않은 위치입니다. 다시 확인해주세요.';
      default:
        return '경로 계산 중 오류가 발생했습니다.';
    }
  }
}

/**
 * 네트워크 관련 오류 클래스
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error,
      statusCode?: number
    }
  ) {
    super(message, {
      code: options?.code || ErrorCode.NETWORK_ERROR,
      isUserFacing: options?.isUserFacing ?? true,
      meta: { ...options?.meta, statusCode: options?.statusCode },
      cause: options?.cause
    });
    this.name = 'NetworkError';
  }
  
  getUserMessage(): string {
    // 상태 코드 또는 오류 코드별 사용자 친화적인 메시지 반환
    const statusCode = this.meta?.statusCode;
    
    if (statusCode) {
      if (statusCode === 401 || statusCode === 403) {
        return '인증에 실패했습니다. 다시 로그인해주세요.';
      }
      if (statusCode >= 500) {
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
    }
    
    switch (this.code) {
      case ErrorCode.NETWORK_ERROR:
        return '네트워크 연결을 확인해주세요.';
      case ErrorCode.TIMEOUT:
        return '서버 응답이 지연되고 있습니다. 나중에 다시 시도해주세요.';
      default:
        return '네트워크 오류가 발생했습니다.';
    }
  }
}

/**
 * 위치 서비스 관련 오류 클래스
 */
export class LocationError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message, {
      code: options?.code || ErrorCode.LOCATION_SERVICE_DISABLED,
      isUserFacing: options?.isUserFacing ?? true,
      meta: options?.meta,
      cause: options?.cause
    });
    this.name = 'LocationError';
  }
  
  getUserMessage(): string {
    // 오류 코드별 사용자 친화적인 메시지 반환
    switch (this.code) {
      case ErrorCode.LOCATION_PERMISSION_DENIED:
        return '위치 접근 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.';
      case ErrorCode.LOCATION_SERVICE_DISABLED:
        return '위치 서비스가 비활성화되어 있습니다. 설정에서 위치 서비스를 켜주세요.';
      default:
        return '위치 서비스 오류가 발생했습니다.';
    }
  }
}

/**
 * 데이터 관련 오류 클래스
 */
export class DataError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode,
      isUserFacing?: boolean,
      meta?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message, {
      code: options?.code || ErrorCode.DATA_PARSE_ERROR,
      isUserFacing: options?.isUserFacing ?? false, // 데이터 오류는 일반적으로 사용자에게 표시하지 않음
      meta: options?.meta,
      cause: options?.cause
    });
    this.name = 'DataError';
  }
}

/**
 * 오류 팩토리 함수들
 * 간편하게 오류 객체를 생성하는 유틸리티 함수
 */

/**
 * 네트워크 오류 생성
 */
export function createNetworkError(
  message: string,
  statusCode?: number,
  cause?: Error
): NetworkError {
  return new NetworkError(message, {
    statusCode,
    cause,
    isUserFacing: true
  });
}

/**
 * 타임아웃 오류 생성
 */
export function createTimeoutError(
  message: string = '요청 시간이 초과되었습니다',
  cause?: Error
): NetworkError {
  return new NetworkError(message, {
    code: ErrorCode.TIMEOUT,
    cause,
    isUserFacing: true
  });
}

/**
 * 안전 데이터 로드 오류 생성
 */
export function createSafetyDataLoadError(
  message: string = '교통안전 데이터를 로드할 수 없습니다',
  cause?: Error
): SafetyDataError {
  return new SafetyDataError(message, {
    code: ErrorCode.SAFETY_DATA_LOAD_FAILED,
    cause,
    isUserFacing: true
  });
}

/**
 * 교통 데이터 로드 오류 생성
 */
export function createTrafficDataLoadError(
  message: string = '교통 데이터를 로드할 수 없습니다',
  cause?: Error
): TrafficError {
  return new TrafficError(message, {
    code: ErrorCode.TRAFFIC_DATA_LOAD_FAILED,
    cause,
    isUserFacing: true
  });
}

/**
 * 경로 계산 오류 생성
 */
export function createRouteCalculationError(
  message: string = '경로를 계산할 수 없습니다',
  cause?: Error
): RouteError {
  return new RouteError(message, {
    code: ErrorCode.ROUTE_CALCULATION_FAILED,
    cause,
    isUserFacing: true
  });
}

/**
 * 위치 권한 오류 생성
 */
export function createLocationPermissionError(
  message: string = '위치 접근 권한이 필요합니다',
  cause?: Error
): LocationError {
  return new LocationError(message, {
    code: ErrorCode.LOCATION_PERMISSION_DENIED,
    cause,
    isUserFacing: true
  });
}