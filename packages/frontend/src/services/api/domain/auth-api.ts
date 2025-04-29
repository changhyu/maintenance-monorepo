import apiClient from '../api-client';
import { LoginRequest, LoginResponse, UserInfo } from '../types';
import { saveToken, removeToken } from '../auth-helpers';

/**
 * 인증 관련 API 호출을 위한 객체
 */
export const authApi = {
  /**
   * 로그인 API
   * @param credentials 로그인 정보
   * @returns 로그인 응답 (토큰 포함)
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    
    // 토큰 및 사용자 정보 저장
    const { token, refreshToken, user } = response.data;
    saveToken(token, refreshToken, user);
    
    return response.data;
  },
  
  /**
   * 로그아웃 API
   * @returns 성공 여부
   */
  async logout(): Promise<boolean> {
    try {
      await apiClient.post('/auth/logout');
      // 토큰 제거
      removeToken();
      return true;
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 오류가 발생해도 로컬 토큰은 제거
      removeToken();
      return false;
    }
  },
  
  /**
   * 사용자 정보 조회 API
   * @returns 사용자 정보
   */
  async getCurrentUser(): Promise<UserInfo> {
    const response = await apiClient.get<UserInfo>('/auth/me');
    return response.data;
  },
  
  /**
   * 사용자 등록 API
   * @param userData 사용자 등록 정보
   * @returns 등록된 사용자 정보
   */
  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<UserInfo> {
    const response = await apiClient.post<UserInfo>('/auth/register', userData);
    return response.data;
  },
  
  /**
   * 비밀번호 변경 API
   * @param data 비밀번호 변경 정보
   * @returns 성공 여부
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<boolean> {
    const response = await apiClient.post<{ success: boolean }>(
      '/auth/change-password',
      data
    );
    return response.data.success;
  },
  
  /**
   * 비밀번호 재설정 요청 API
   * @param email 사용자 이메일
   * @returns 성공 여부
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    const response = await apiClient.post<{ success: boolean }>(
      '/auth/forgot-password',
      { email }
    );
    return response.data.success;
  },
  
  /**
   * 비밀번호 재설정 실행 API
   * @param data 비밀번호 재설정 정보
   * @returns 성공 여부
   */
  async resetPassword(data: {
    token: string;
    password: string;
  }): Promise<boolean> {
    const response = await apiClient.post<{ success: boolean }>(
      '/auth/reset-password',
      data
    );
    return response.data.success;
  }
};