import axios from 'axios';
/**
 * API 요청을 위한 기본 설정된 axios 인스턴스
 */
export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001', // 기본 API URL
    timeout: 10000, // 10초 타임아웃
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});
/**
 * 요청 인터셉터 - 인증 토큰 추가
 */
api.interceptors.request.use(config => {
    // 브라우저 환경에서만 실행
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, error => {
    return Promise.reject(error);
});
/**
 * 응답 인터셉터 - 에러 핸들링
 */
api.interceptors.response.use(response => {
    return response;
}, error => {
    // 인증 오류 처리 (401)
    if (error.response && error.response.status === 401) {
        // 토큰 만료 처리
        if (typeof window !== 'undefined') {
            // localStorage에서 토큰 제거
            localStorage.removeItem('auth_token');
            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
export default api;
