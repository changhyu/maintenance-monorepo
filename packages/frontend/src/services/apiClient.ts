/**
 * API 클라이언트 유틸리티
 * 
 * 모든 API 호출을 위한 공통 클라이언트와 유틸리티 함수를 제공합니다.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// 환경 변수에서 설정 가져오기
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * API 클라이언트 설정
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 설정
apiClient.interceptors.request.use(
  config => {
    // 요청 전 처리 (토큰 추가 등)
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 서버에서 설정한 CSRF 토큰 가져오기
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    // CSRF 토큰 헤더 추가
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  error => {
    // 요청 오류 처리
    console.error('API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
apiClient.interceptors.response.use(
  response => {
    // 응답 데이터 처리
    // 서버에서 새 CSRF 토큰을 받았을 경우 메타 태그 업데이트
    const newCsrfToken = response.headers['x-csrf-token'];
    if (newCsrfToken) {
      let metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta') as HTMLMetaElement;
        metaTag.name = 'csrf-token';
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', newCsrfToken);
    }

    return response;
  },
  error => {
    // 응답 오류 처리
    if (error.response) {
      // 서버가 응답을 반환한 경우

      // 401 Unauthorized - 인증 실패 또는 토큰 만료
      if (error.response.status === 401) {
        // 토큰 삭제 및 로그인 페이지로 리디렉션
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        
        // 로그인 페이지로 이동이 필요한 경우
        if (!window.location.pathname.includes('/login')) {
          // 현재 URL 저장 (로그인 성공 후 돌아오기 위해)
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/login';
        }
      }
      
      // 403 Forbidden - 권한 없음
      if (error.response.status === 403) {
        console.error('권한이 없습니다:', error.response.data);
      }
      
      // 500 서버 오류
      if (error.response.status >= 500) {
        console.error('서버 오류:', error.response.data);
      }
    } else if (error.request) {
      // 요청이 전송되었지만 응답이 없는 경우
      console.error('응답이 없습니다:', error.request);
    } else {
      // 요청 설정 중 오류가 발생한 경우
      console.error('요청 설정 오류:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * 개발 환경에서 폴백 데이터 사용 여부
 * @returns 폴백 데이터 사용 여부
 */
export const shouldUseFallbackData = (): boolean => {
  return (
    import.meta.env.DEV || 
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('vercel.app')
  );
};

/**
 * 타임아웃이 있는 요청 함수
 * @param config Axios 요청 설정
 * @param timeoutMs 타임아웃 (밀리초)
 * @returns Promise<any>
 */
export const apiRequestWithTimeout = async <T>(
  config: AxiosRequestConfig, 
  timeoutMs: number = 10000
): Promise<T> => {
  const source = axios.CancelToken.source();
  const timeoutId = setTimeout(() => {
    source.cancel(`요청 시간 초과: ${timeoutMs}ms`);
  }, timeoutMs);
  
  try {
    const response = await apiClient({
      ...config,
      cancelToken: source.token
    }) as AxiosResponse<T>;
    
    clearTimeout(timeoutId);
    return response.data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * 통합 API 요청 함수
 * @param config Axios 요청 설정
 * @returns 응답 데이터
 * @throws 요청 오류
 */
export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient(config);
    return response.data;
  } catch (error) {
    console.error('API 요청 오류:', error);
    throw error;
  }
};

/**
 * GET 요청 보내기
 * @param url API 경로
 * @param params URL 파라미터 (객체)
 * @returns Promise<T>
 */
export const apiGet = async <T>(url: string, params?: any): Promise<T> => {
  return apiRequest<T>({
    method: 'GET',
    url,
    params
  });
};

/**
 * POST 요청 보내기
 * @param url API 경로
 * @param data 요청 본문 데이터
 * @returns Promise<T>
 */
export const apiPost = async <T>(url: string, data?: any): Promise<T> => {
  return apiRequest<T>({
    method: 'POST',
    url,
    data
  });
};

/**
 * PUT 요청 보내기
 * @param url API 경로
 * @param data 요청 본문 데이터
 * @returns Promise<T>
 */
export const apiPut = async <T>(url: string, data?: any): Promise<T> => {
  return apiRequest<T>({
    method: 'PUT',
    url,
    data
  });
};

/**
 * DELETE 요청 보내기
 * @param url API 경로
 * @returns Promise<T>
 */
export const apiDelete = async <T>(url: string): Promise<T> => {
  return apiRequest<T>({
    method: 'DELETE',
    url
  });
};

/**
 * 파일 업로드 요청 보내기
 * @param url API 경로
 * @param file 업로드할 파일
 * @param additionalData 추가 요청 데이터
 * @returns Promise<T>
 */
export const apiUploadFile = async <T>(
  url: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // 추가 데이터가 있는 경우 FormData에 추가
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }
  
  return apiRequest<T>({
    method: 'POST',
    url,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// API 객체 내보내기
export default {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  upload: apiUploadFile,
  request: apiRequest,
  requestWithTimeout: apiRequestWithTimeout,
  client: apiClient,
  shouldUseFallbackData
};
