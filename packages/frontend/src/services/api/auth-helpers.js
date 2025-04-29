import apiClient, { ApiErrorType } from './apiClient';
/**
 * 로그인 요청 처리
 */
export async function login(email, password) {
    const response = await apiClient.post('/auth/login', {
        email,
        password
    });
    if (response.success && response.data) {
        // 토큰 저장
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        // 사용자 정보 저장
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
}
/**
 * 로그아웃 처리
 */
export async function logout() {
    try {
        // 서버에 로그아웃 알림 (필요한 경우)
        await apiClient.post('/auth/logout');
    }
    catch (error) {
        console.warn('로그아웃 API 호출 실패:', error);
    }
    finally {
        // 로컬 스토리지 정리
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
    return true;
}
/**
 * 현재 로그인 상태 확인
 */
export function isLoggedIn() {
    return localStorage.getItem('authToken') !== null;
}
/**
 * 사용자 정보 가져오기
 */
export function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    if (!userJson)
        return null;
    try {
        return JSON.parse(userJson);
    }
    catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        return null;
    }
}
/**
 * 토큰 갱신 요청
 */
export async function refreshToken() {
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
    const response = await apiClient.post('/auth/refresh', {
        refreshToken
    });
    if (response.success && response.data) {
        localStorage.setItem('authToken', response.data.token);
        // 새 리프레시 토큰이 있으면 교체
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        // 사용자 정보가 있으면 업데이트
        if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
    }
    return response;
}
/**
 * 사용자 등록 요청
 */
export async function register(user) {
    return apiClient.post('/auth/register', user);
}
/**
 * 비밀번호 재설정 요청
 */
export async function requestPasswordReset(email) {
    return apiClient.post('/auth/reset-password', { email });
}
/**
 * 비밀번호 변경
 */
export async function changePassword(oldPassword, newPassword) {
    return apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword
    });
}
/**
 * 사용자 프로필 업데이트
 */
export async function updateProfile(profileData) {
    return apiClient.patch('/auth/profile', profileData);
}
/**
 * 현재 사용자 역할 확인
 */
export function hasRole(requiredRole) {
    const user = getCurrentUser();
    if (!user)
        return false;
    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
}
