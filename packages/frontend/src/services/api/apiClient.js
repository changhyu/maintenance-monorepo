import axios from 'axios';
import { validateEnv } from '../../utils/validateEnv';
// API 오류 유형 정의
export var ApiErrorType;
(function (ApiErrorType) {
    ApiErrorType["NETWORK"] = "NETWORK_ERROR";
    ApiErrorType["SERVER"] = "SERVER_ERROR";
    ApiErrorType["UNAUTHORIZED"] = "UNAUTHORIZED";
    ApiErrorType["FORBIDDEN"] = "FORBIDDEN";
    ApiErrorType["NOT_FOUND"] = "NOT_FOUND";
    ApiErrorType["VALIDATION"] = "VALIDATION_ERROR";
    ApiErrorType["TIMEOUT"] = "TIMEOUT_ERROR";
    ApiErrorType["CONFLICT"] = "CONFLICT_ERROR";
    ApiErrorType["UNKNOWN"] = "UNKNOWN_ERROR";
})(ApiErrorType || (ApiErrorType = {}));
// API 클라이언트 클래스
class ApiClient {
    constructor() {
        this.refreshAttempt = false;
        // 필수 환경 변수 확인
        try {
            validateEnv(['VITE_API_URL']);
        }
        catch (error) {
            console.error('API 클라이언트 초기화 실패:', error);
            throw error;
        }
        // Axios 클라이언트 생성
        this.client = axios.create({
            baseURL: import.meta.env.VITE_API_URL,
            timeout: 15000, // 15초 타임아웃
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // 요청 인터셉터 설정
        this.client.interceptors.request.use((config) => {
            // 인증 토큰이 있으면 헤더에 추가
            const token = localStorage.getItem('authToken');
            if (token && config.headers) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        }, (error) => {
            return Promise.reject(this.handleError(error));
        });
        // 응답 인터셉터 설정
        this.client.interceptors.response.use((response) => response, async (error) => {
            // 401 오류(인증 실패)이고 refresh 토큰이 있으면 토큰 갱신 시도
            if (error.response?.status === 401 &&
                !this.refreshAttempt &&
                localStorage.getItem('refreshToken')) {
                this.refreshAttempt = true;
                try {
                    // 토큰 갱신 요청
                    const response = await this.refreshToken();
                    if (response.success && response.data) {
                        // 새 토큰 저장
                        localStorage.setItem('authToken', response.data.token);
                        // 실패한 요청 재시도
                        const originalRequest = error.config;
                        originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
                        this.refreshAttempt = false;
                        return this.client(originalRequest);
                    }
                }
                catch (refreshError) {
                    // 토큰 갱신 실패
                    this.refreshAttempt = false;
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('refreshToken');
                    // 로그인 페이지로 이동
                    window.location.href = '/login';
                    return Promise.reject(this.handleError(refreshError));
                }
            }
            // 다른 오류 처리
            return Promise.reject(this.handleError(error));
        });
    }
    // 토큰 갱신 요청
    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            return {
                success: false,
                error: {
                    type: ApiErrorType.UNAUTHORIZED,
                    message: '리프레시 토큰이 없습니다.'
                }
            };
        }
        try {
            const response = await this.client.post('/auth/refresh', {
                refreshToken
            });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            return {
                success: false,
                error: this.handleError(error)
            };
        }
    }
    // 오류 처리 및 변환
    handleError(error) {
        let apiError = {
            type: ApiErrorType.UNKNOWN,
            message: '알 수 없는 오류가 발생했습니다.',
            originalError: error
        };
        // Axios 오류인 경우
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            // 네트워크 오류
            if (!axiosError.response) {
                apiError = {
                    type: ApiErrorType.NETWORK,
                    message: '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
                    originalError: error
                };
            }
            // 서버 응답이 있는 경우
            else {
                const status = axiosError.response.status;
                const data = axiosError.response.data;
                // 상태 코드에 따른 오류 처리
                switch (status) {
                    case 400:
                        apiError = {
                            type: ApiErrorType.VALIDATION,
                            status,
                            message: data?.message || '요청이 유효하지 않습니다.',
                            data: data?.errors || data,
                            originalError: error
                        };
                        break;
                    case 401:
                        apiError = {
                            type: ApiErrorType.UNAUTHORIZED,
                            status,
                            message: data?.message || '인증이 필요합니다. 다시 로그인해주세요.',
                            originalError: error
                        };
                        break;
                    case 403:
                        apiError = {
                            type: ApiErrorType.FORBIDDEN,
                            status,
                            message: data?.message || '접근 권한이 없습니다.',
                            originalError: error
                        };
                        break;
                    case 404:
                        apiError = {
                            type: ApiErrorType.NOT_FOUND,
                            status,
                            message: data?.message || '요청한 리소스를 찾을 수 없습니다.',
                            originalError: error
                        };
                        break;
                    case 409:
                        apiError = {
                            type: ApiErrorType.CONFLICT,
                            status,
                            message: data?.message || '리소스 충돌이 발생했습니다.',
                            originalError: error
                        };
                        break;
                    case 408:
                    case 504:
                        apiError = {
                            type: ApiErrorType.TIMEOUT,
                            status,
                            message: data?.message || '요청 시간이 초과되었습니다.',
                            originalError: error
                        };
                        break;
                    case 500:
                    case 502:
                    case 503:
                        apiError = {
                            type: ApiErrorType.SERVER,
                            status,
                            message: data?.message || '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.',
                            originalError: error
                        };
                        break;
                    default:
                        apiError = {
                            type: ApiErrorType.UNKNOWN,
                            status,
                            message: data?.message || '알 수 없는 오류가 발생했습니다.',
                            data,
                            originalError: error
                        };
                }
            }
        }
        return apiError;
    }
    // GET 요청
    async get(url, config) {
        try {
            const response = await this.client.get(url, config);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    // POST 요청
    async post(url, data, config) {
        try {
            const response = await this.client.post(url, data, config);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    // PUT 요청
    async put(url, data, config) {
        try {
            const response = await this.client.put(url, data, config);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    // PATCH 요청
    async patch(url, data, config) {
        try {
            const response = await this.client.patch(url, data, config);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    // DELETE 요청
    async delete(url, config) {
        try {
            const response = await this.client.delete(url, config);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
}
// API 클라이언트 싱글톤 인스턴스
export const apiClient = new ApiClient();
// 도우미 함수: API 응답에서 데이터 추출 또는 오류 처리
export async function unwrapResponse(apiPromise) {
    const response = await apiPromise;
    if (!response.success || !response.data) {
        throw response.error || {
            type: ApiErrorType.UNKNOWN,
            message: '요청 처리 중 오류가 발생했습니다.'
        };
    }
    return response.data;
}
// API 인증 헬퍼 함수
export function isLoggedIn() {
    return localStorage.getItem('authToken') !== null;
}
export function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
}
export default apiClient;
