import { ApiClient } from '../client';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician' | 'driver';
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician' | 'driver';
}

export interface UserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'manager' | 'technician' | 'driver';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  private client: ApiClient;
  private basePath = '/users';
  private authPath = '/auth';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 사용자 로그인
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(`${this.authPath}/login`, credentials);
  }

  // 사용자 로그아웃
  async logout(): Promise<void> {
    return this.client.post<void>(`${this.authPath}/logout`);
  }

  // 모든 사용자 조회
  async getAllUsers(): Promise<User[]> {
    return this.client.get<User[]>(this.basePath);
  }

  // 특정 사용자 조회
  async getUserById(id: string): Promise<User> {
    return this.client.get<User>(`${this.basePath}/${id}`);
  }

  // 현재 로그인한 사용자 정보 조회
  async getCurrentUser(): Promise<User> {
    return this.client.get<User>(`${this.basePath}/me`);
  }

  // 사용자 생성
  async createUser(userData: UserCreateRequest): Promise<User> {
    return this.client.post<User>(this.basePath, userData);
  }

  // 사용자 정보 업데이트
  async updateUser(id: string, userData: UserUpdateRequest): Promise<User> {
    return this.client.put<User>(`${this.basePath}/${id}`, userData);
  }

  // 사용자 삭제
  async deleteUser(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 사용자 비밀번호 변경
  async changePassword(userId: string, data: PasswordChangeRequest): Promise<void> {
    return this.client.post<void>(`${this.basePath}/${userId}/password`, data);
  }

  // 본인 비밀번호 변경
  async changeOwnPassword(data: PasswordChangeRequest): Promise<void> {
    return this.client.post<void>(`${this.basePath}/me/password`, data);
  }

  // 특정 역할을 가진 사용자 조회
  async getUsersByRole(role: 'admin' | 'manager' | 'technician' | 'driver'): Promise<User[]> {
    return this.client.get<User[]>(`${this.basePath}/role/${role}`);
  }
} 