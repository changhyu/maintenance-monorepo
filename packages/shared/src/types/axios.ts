/**
 * axios 타입 정의 (v1.8.4 호환)
 * 이 파일은 axios 1.8.4 버전과 호환되는 타입 정의를 제공합니다.
 */

// 기본 HTTP 메서드 타입
export type Method =
  | 'get' | 'GET'
  | 'delete' | 'DELETE'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'patch' | 'PATCH'
  | 'purge' | 'PURGE'
  | 'link' | 'LINK'
  | 'unlink' | 'UNLINK';

// HTTP 헤더 타입
export interface AxiosHeaders extends Record<string, string | undefined> {
  [key: string]: string | undefined;
  'Content-Type'?: string;
  Authorization?: string;
}

// Axios 요청 설정 인터페이스
export interface AxiosRequestConfig {
  url?: string;
  method?: Method | string;
  baseURL?: string;
  headers?: AxiosHeaders;
  params?: any;
  paramsSerializer?: (params: any) => string;
  data?: any;
  timeout?: number;
  timeoutErrorMessage?: string;
  withCredentials?: boolean;
  adapter?: any;
  auth?: any;
  responseType?: string;
  responseEncoding?: string;
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  onUploadProgress?: (progressEvent: any) => void;
  onDownloadProgress?: (progressEvent: any) => void;
  maxContentLength?: number;
  validateStatus?: ((status: number) => boolean) | null;
  maxBodyLength?: number;
  maxRedirects?: number;
  maxFiles?: number;
  beforeRedirect?: (options: any, responseDetails: any) => void;
  socketPath?: string | null;
  httpAgent?: any;
  httpsAgent?: any;
  decompress?: boolean;
  transitional?: any;
  signal?: AbortSignal;
  insecureHTTPParser?: boolean;
  transformRequest?: any;
  transformResponse?: any;
  env?: any;
  formSerializer?: any;
  family?: number;
  lookup?: any;
  [key: string]: any;
}

// 내부 Axios 요청 설정 인터페이스
export interface InternalAxiosRequestConfig extends AxiosRequestConfig {
  headers: AxiosHeaders;
}

// Axios 응답 인터페이스
export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: AxiosHeaders;
  config: AxiosRequestConfig;
  request?: any;
}

// Axios 에러 인터페이스
export interface AxiosError<T = any> extends Error {
  config?: AxiosRequestConfig;
  code?: string;
  request?: any;
  response?: AxiosResponse<T>;
  status?: number;
  isAxiosError: boolean;
  toJSON: () => object;
}

// Axios 인스턴스 인터페이스
export interface AxiosInstance {
  (config: AxiosRequestConfig): Promise<AxiosResponse>;
  (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
  defaults: AxiosRequestConfig;
  interceptors: {
    request: any;
    response: any;
  };
  getUri(config?: AxiosRequestConfig): string;
  request<T = any, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R>;
  get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
  delete<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
  head<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
  options<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
  post<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
  put<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
  patch<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
  create(config?: AxiosRequestConfig): AxiosInstance;
}

// axios 생성 함수
export interface AxiosStatic extends AxiosInstance {
  create(config?: AxiosRequestConfig): AxiosInstance;
  CancelToken: any;
  Cancel: any;
  isCancel: (value: any) => boolean;
  all: <T>(values: Array<T | Promise<T>>) => Promise<T[]>;
  spread: <T, R>(callback: (...args: T[]) => R) => (array: T[]) => R;
  isAxiosError: (payload: any) => payload is AxiosError;
  default: AxiosStatic;
}

// 헬퍼 함수 타입
export const isAxiosError = (error: any): error is AxiosError => {
  return error && error.isAxiosError === true;
};

export const isCancel = (value: any): boolean => {
  return value && value.__CANCEL__ === true;
};