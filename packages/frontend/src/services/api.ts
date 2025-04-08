/**
 * API 클라이언트 설정
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * API 요청 옵션 인터페이스
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

/**
 * 오류 응답 타입
 */
interface ErrorResponse {
  status: number;
  detail?: string;
  message?: string;
}

/**
 * 인증 토큰을 로컬 스토리지에서 가져오기
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * API 요청 함수
 */
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    requiresAuth = true
  } = options;

  // 기본 헤더 설정
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // 인증 토큰이 필요한 경우 추가
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // URL 생성
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // 요청 설정
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  // GET 요청이 아닌 경우 body 추가
  if (method !== 'GET' && body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    // 응답이 JSON이 아닌 경우 처리
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
      const data = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        const error: ErrorResponse = {
          status: response.status,
          detail: data.detail || data.message || '알 수 없는 오류가 발생했습니다.',
        };
        throw error;
      }

      return data as T;
    } else {
      // JSON이 아닌 경우 (예: 204 No Content)
      if (!response.ok) {
        const error: ErrorResponse = {
          status: response.status,
          detail: '알 수 없는 오류가 발생했습니다.',
        };
        throw error;
      }

      return {} as T;
    }
  } catch (error) {
    // 네트워크 오류 또는 처리된 API 오류
    if ((error as ErrorResponse).status) {
      throw error;
    } else {
      // 네트워크 오류
      throw {
        status: 0,
        detail: '네트워크 연결에 문제가 있습니다.',
      };
    }
  }
}

/**
 * 편의성을 위한 HTTP 메서드별 래퍼 함수
 */
export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: any, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body: any, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body: any, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}; 