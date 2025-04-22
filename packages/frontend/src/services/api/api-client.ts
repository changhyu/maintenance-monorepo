import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthApiClient } from './auth-client';

/**
 * API 클라이언트 클래스
 * AuthApiClient를 확장하여 API 호출을 위한 편의 메소드 제공
 */
export class ApiClient extends AuthApiClient {
  /**
   * GET 요청 수행
   * @param url 요청 URL
   * @param config 요청 설정
   * @returns Promise 객체
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }
  
  /**
   * POST 요청 수행
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise 객체
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }
  
  /**
   * PUT 요청 수행
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise 객체
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }
  
  /**
   * DELETE 요청 수행
   * @param url 요청 URL
   * @param config 요청 설정
   * @returns Promise 객체
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }
  
  /**
   * PATCH 요청 수행
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise 객체
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }
  
  /**
   * 파일 업로드 요청 수행
   * @param url 요청 URL
   * @param formData 폼 데이터
   * @param config 요청 설정
   * @returns Promise 객체
   */
  public async upload<T = any>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const uploadConfig: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    };
    
    return this.instance.post<T>(url, formData, uploadConfig);
  }
}

// API 클라이언트 싱글톤 인스턴스
const baseURL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://api.car-goro.com/api' 
  : '/api';

// 싱글톤 인스턴스 생성
export const apiClient = new ApiClient(baseURL);

// 초기화
apiClient.initialize();

// 기본 내보내기
export default apiClient;