import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * API 클라이언트 클래스
 * 프론트엔드에서 API 요청을 처리하기 위한 래퍼 클래스
 */
export class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  /**
   * API 클라이언트 생성자
   * @param baseURL API 기본 URL
   * @param config Axios 설정
   */
  constructor(baseURL: string = '/api', config: AxiosRequestConfig = {}) {
    this.baseURL = baseURL;
    this.instance = axios.create({
      baseURL,
      timeout: 30000, // 30초
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      ...config
    });

    // 요청 인터셉터 설정
    this.instance.interceptors.request.use(
      (config) => {
        // 토큰 추가 또는 기타 요청 변환
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터 설정
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        // 에러 처리 로직 (예: 401 응답 시 로그아웃)
        if (error.response && error.response.status === 401) {
          // 인증 토큰 만료 처리
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET 요청 수행
   * @param url 엔드포인트 URL
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  /**
   * POST 요청 수행
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  /**
   * PUT 요청 수행
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  /**
   * DELETE 요청 수행
   * @param url 엔드포인트 URL
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  /**
   * PATCH 요청 수행
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  /**
   * 파일 업로드 요청
   * @param url 엔드포인트 URL
   * @param formData FormData 객체
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    });
  }

  /**
   * 기본 URL 설정
   * @param baseURL 새 기본 URL
   */
  public setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
  }

  /**
   * 헤더 설정
   * @param headers 헤더 객체
   */
  public setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.instance.defaults.headers.common[key] = value;
    });
  }
}

// 기본 API 클라이언트 인스턴스 생성
const defaultApiClient = new ApiClient();

export default defaultApiClient; 