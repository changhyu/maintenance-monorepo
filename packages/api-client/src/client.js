import axios from 'axios';

export class ApiClient {
    constructor(config) {
        this.tokenRefreshPromise = null;
        this.cache = new Map();
        this.cacheTTL = config.cacheTTL ?? 60000; // 기본값 1분
        this.maxRetries = config.maxRetries ?? 3; // 기본값 3회
        this.retryDelay = config.retryDelay ?? 1000; // 기본값 1초
        this.client = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout ?? 30000,
            headers: {
                'Content-Type': 'application/json',
                ...(config.apiKey && { 'X-API-Key': config.apiKey }),
                ...config.headers,
            },
        });
        // 요청 인터셉터 추가
        this.client.interceptors.request.use((config) => {
            // 요청 전 처리
            if (this.logger) {
                this.logger(`API 요청: ${config.method?.toUpperCase()} ${config.url}`, {
                    params: config.params,
                    data: config.data
                });
            }
            return config;
        }, (error) => {
            if (this.logger) {
                this.logger(`API 요청 오류: ${error.message}`, error);
            }
            return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        });
        // 응답 인터셉터 추가
        this.client.interceptors.response.use(this.handleSuccessResponse.bind(this), this.handleErrorResponse.bind(this));
        // 로깅 활성화 설정
        if (config.enableLogging) {
            this.setLogger((message, data) => {
                console.log(`[ApiClient] ${message}`, data);
            });
        }
    }

    // 성공 응답 처리
    handleSuccessResponse(response) {
        if (this.logger) {
            this.logger(`API 응답 성공: ${response.status} ${response.config.url}`, {
                data: response.data
            });
        }
        return response;
    }

    // 오류 응답 처리
    async handleErrorResponse(error) {
        // 오류가 AxiosError 타입인지 확인
        if (!axios.isAxiosError(error)) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            if (this.logger) {
                this.logger(`API 응답 오류: 알 수 없는 오류`, normalizedError);
            }
            return Promise.reject(normalizedError);
        }

        const axiosError = error;
        
        if (this.logger) {
            this.logger(`API 응답 오류: ${axiosError.message}`, {
                status: axiosError.response?.status,
                data: axiosError.response?.data,
                code: axiosError.code
            });
        }

        // 네트워크 오류 처리
        if (!axiosError.response) {
            return Promise.reject(new Error(`네트워크 오류: ${axiosError.message}`));
        }

        // 인증 관련 오류 처리
        if (this.isAuthError(axiosError)) {
            return this.handleAuthError(axiosError);
        }

        // 요청 제한 초과 오류 처리
        if (this.isRateLimitError(axiosError)) {
            return this.handleRateLimitError(axiosError);
        }

        // 상세한 오류 메시지 생성
        const errorMessage = this.createDetailedErrorMessage(axiosError);
        return Promise.reject(new Error(errorMessage));
    }

    // 상세한 오류 메시지 생성
    createDetailedErrorMessage(axiosError) {
        let message = `API 오류 (${axiosError.response.status}): ${axiosError.message}`;
        
        // 서버에서 보낸 오류 메시지가 있으면 추가
        if (axiosError.response.data) {
            if (typeof axiosError.response.data === 'string') {
                message += ` - ${axiosError.response.data}`;
            } else if (axiosError.response.data.message) {
                message += ` - ${axiosError.response.data.message}`;
            } else if (axiosError.response.data.error) {
                message += ` - ${axiosError.response.data.error}`;
            }
        }
        
        return message;
    }

    // 인증 오류 확인
    isAuthError(error) {
        return error.response?.status === 401 && !!error.config && !error.config.url?.includes('/auth/refresh');
    }

    // 요청 제한 초과 오류 확인
    isRateLimitError(error) {
        return error.response?.status === 429 && !!error.config;
    }

    // 인증 오류 처리
    async handleAuthError(error) {
        try {
            // 토큰 갱신 시도
            await this.refreshAuthToken();
            
            // 원래 요청 재시도
            if (!error.config) {
                throw new Error('요청 구성이 없습니다');
            }
            
            const originalRequest = error.config;
            return this.client(originalRequest);
        } catch (refreshError) {
            // 토큰 갱신 실패 시 원래 오류 반환
            const message = refreshError instanceof Error 
                ? `인증 갱신 실패: ${refreshError.message}` 
                : '인증 갱신 실패';
                
            return Promise.reject(new Error(message));
        }
    }

    // 요청 제한 초과 오류 처리
    async handleRateLimitError(error) {
        const retryAfter = error.response?.headers['retry-after'];
        const config = error.config;
        
        if (!config) {
            return Promise.reject(new Error('요청 제한 초과: 요청 구성이 없습니다'));
        }
        
        if (retryAfter && config._retryCount === undefined) {
            config._retryCount = 0;
            const parsedDelay = parseInt(retryAfter, 10);
            const delay = isNaN(parsedDelay) ? this.retryDelay : parsedDelay * 1000;
            
            if (this.logger) {
                this.logger(`요청 제한 초과: ${delay}ms 후 재시도`, { url: config.url });
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
        }
        
        return Promise.reject(new Error(`요청 제한 초과: ${error.message}`));
    }

    // 인증 토큰 설정 메서드
    setAuthToken(token) {
        const { headers } = this.client.defaults;
        if (headers) {
            // headers가 존재하는지 확인하고 안전하게 설정
            if (!headers.common) {
                headers.common = {};
            }
            headers.common['Authorization'] = `Bearer ${token}`;
        }
    }

    // 인증 토큰 제거 메서드
    removeAuthToken() {
        if (this.client.defaults.headers && this.client.defaults.headers.common && 'Authorization' in this.client.defaults.headers.common) {
            delete this.client.defaults.headers.common['Authorization'];
        }
    }

    // 캐시 초기화 메서드
    clearCache() {
        this.cache.clear();
    }

    // 특정 경로의 캐시 삭제 메서드
    invalidateCache(path) {
        if (path) {
            // 특정 경로로 시작하는 모든 캐시 항목 삭제
            for (const key of this.cache.keys()) {
                if (key.startsWith(path)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.clearCache();
        }
    }

    // 로거 설정 메서드
    setLogger(logger) {
        this.logger = logger;
    }

    // 기본 GET 요청 메서드
    async get(path, config) {
        return this.request({
            ...config,
            method: 'get',
            url: path,
            signal: config?.abortSignal
        });
    }

    // 캐싱을 지원하는 GET 요청 메서드
    async getCached(path, config) {
        const cacheKey = `${path}${JSON.stringify(config?.params ?? {})}`;
        const cachedItem = this.cache.get(cacheKey);
        
        // 캐시 사용하지 않거나 캐시에 없는 경우 또는 캐시가 만료된 경우
        if (config?.skipCache ||
            !cachedItem ||
            Date.now() - cachedItem.timestamp > (config?.cacheTTL ?? this.cacheTTL)) {
            
            const response = await this.get(path, config);
            this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
            return response;
        }
        
        return cachedItem.data;
    }

    // POST 요청 메서드
    async post(path, data, config) {
        return this.request({
            ...config,
            method: 'post',
            url: path,
            data,
            signal: config?.abortSignal
        });
    }

    // PUT 요청 메서드
    async put(path, data, config) {
        return this.request({
            ...config,
            method: 'put',
            url: path,
            data,
            signal: config?.abortSignal
        });
    }

    // PATCH 요청 메서드
    async patch(path, data, config) {
        return this.request({
            ...config,
            method: 'patch',
            url: path,
            data,
            signal: config?.abortSignal
        });
    }

    // DELETE 요청 메서드
    async delete(path, config) {
        return this.request({
            ...config,
            method: 'delete',
            url: path,
            signal: config?.abortSignal
        });
    }

    // 공통 요청 처리 메서드 (재시도 로직 포함)
    async request(config, retries = this.maxRetries) {
        try {
            const response = await this.client.request(config);
            return response.data;
        } catch (error) {
            // 재시도 가능한 오류인지 확인
            if (retries > 0 && this.shouldRetry(error) && !config._retryCount) {
                // 재시도 카운트 설정
                const retryConfig = { ...config, _retryCount: (config._retryCount ?? 0) + 1 };
                
                // 재시도 전 대기
                const delay = this.retryDelay * Math.pow(2, retryConfig._retryCount - 1); // 지수 백오프 추가
                
                if (this.logger) {
                    this.logger(`API 요청 재시도 (${retryConfig._retryCount}/${this.maxRetries}): ${config.method} ${config.url}`, {
                        delay: `${delay}ms`
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // 재귀적으로 재시도
                return this.request(retryConfig, retries - 1);
            }
            
            // 모든 오류를 Error 객체로 변환하여 일관성 유지
            if (error instanceof Error) {
                throw error;
            } else if (axios.isAxiosError(error)) {
                throw new Error(this.createDetailedErrorMessage(error));
            } else {
                throw new Error(String(error));
            }
        }
    }

    // 재시도 가능한 오류인지 확인하는 메서드
    shouldRetry(error) {
        if (!axios.isAxiosError(error)) {
            return false;
        }
        
        const { response, code } = error;
        
        // 네트워크 오류는 재시도
        if (!response || code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
            return true;
        }
        
        // 서버 오류(5xx)는 재시도
        const { status } = response;
        return status >= 500 && status < 600;
    }

    // 토큰 자동 갱신 메서드
    async refreshAuthToken() {
        // 이미 진행 중인 토큰 갱신 요청이 있다면 재사용
        if (!this.tokenRefreshPromise) {
            this.tokenRefreshPromise = this.client
                .post('/auth/refresh')
                .then(({ data }) => {
                    if (!data || typeof data.token !== 'string') {
                        throw new Error('유효하지 않은 토큰 응답 형식');
                    }
                    
                    const { token } = data;
                    this.setAuthToken(token);
                    return token;
                })
                .catch(error => {
                    const message = axios.isAxiosError(error)
                        ? this.createDetailedErrorMessage(error)
                        : (error instanceof Error ? error.message : String(error));
                    
                    throw new Error(`토큰 갱신 실패: ${message}`);
                })
                .finally(() => {
                    this.tokenRefreshPromise = null;
                });
        }
        
        return this.tokenRefreshPromise;
    }
}
