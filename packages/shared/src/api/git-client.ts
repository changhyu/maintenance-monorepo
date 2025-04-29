/**
 * Git API 클라이언트
 * 
 * 이 모듈은 Git API와 통신하기 위한 표준화된 클라이언트를 제공합니다.
 * 모든 프론트엔드 애플리케이션은 이 클라이언트를 통해 Git API에 접근해야 합니다.
 */
import axios from 'axios';
// @ts-ignore - axios 타입 호환성 이슈 회피
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Git API 응답 인터페이스
 */
export interface GitApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  }>;
  timestamp: string;
  version: string;
}

/**
 * Git 저장소 상태 인터페이스
 */
export interface GitStatus {
  branch: string;
  clean: boolean;
  modified_files: number;
  untracked_files: number;
  last_commit?: {
    hash: string;
    author: string;
    message: string;
    date: string;
  };
}

/**
 * Git 커밋 정보 인터페이스
 */
export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  message: string;
  date: string;
  changes?: {
    total: number;
    changes: Array<{
      path: string;
      status: string;
      diff?: string;
    }>;
  };
}

/**
 * Git 브랜치 정보 인터페이스
 */
export interface GitBranch {
  name: string;
  is_current: boolean;
  tracking?: string;
  is_remote: boolean;
  last_commit?: string;
}

/**
 * Git API 클라이언트 클래스
 */
export class GitApiClient {
  private axios: AxiosInstance;
  
  /**
   * Git API 클라이언트를 초기화합니다.
   * 
   * @param baseUrl API 기본 URL (기본값: '/api/v1/git-unified')
   * @param config Axios 설정 옵션
   */
  constructor(
    baseUrl = '/api/v1/git-unified',
    config: AxiosRequestConfig = {}
  ) {
    // @ts-ignore - axios 타입 호환성 이슈 무시
    this.axios = axios.create({
      baseURL: baseUrl,
      ...config,
    });
    
    // 응답 인터셉터 설정
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // 오류 응답 표준화
        if (error.response) {
          console.error('Git API 오류:', error.response.data);
        } else {
          console.error('Git API 요청 실패:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Git 서비스 상태를 조회합니다.
   * 
   * @returns Git 서비스 상태 정보
   */
  async getStatus(): Promise<GitApiResponse<GitStatus>> {
    try {
      const response = await this.axios.get<GitApiResponse<GitStatus>>('/repo-status');
      return response.data;
    } catch (error) {
      return this.handleError(error, 'Git 상태 조회 실패');
    }
  }
  
  /**
   * Git 커밋 이력을 조회합니다.
   * 
   * @param params 조회 파라미터 (limit, skip, path)
   * @returns 커밋 이력 정보
   */
  async getCommits(params: {
    limit?: number;
    skip?: number;
    path?: string;
  } = {}): Promise<GitApiResponse<GitCommit[]>> {
    try {
      const response = await this.axios.get<GitApiResponse<GitCommit[]>>('/commits', { params });
      return response.data;
    } catch (error) {
      return this.handleError(error, '커밋 이력 조회 실패');
    }
  }
  
  /**
   * Git 브랜치 목록을 조회합니다.
   * 
   * @returns 브랜치 목록 정보
   */
  async getBranches(): Promise<GitApiResponse<GitBranch[]>> {
    try {
      const response = await this.axios.get<GitApiResponse<GitBranch[]>>('/branches');
      return response.data;
    } catch (error) {
      return this.handleError(error, '브랜치 목록 조회 실패');
    }
  }
  
  /**
   * 변경사항을 커밋합니다.
   * 
   * @param message 커밋 메시지
   * @returns 커밋 결과
   */
  async commit(message: string): Promise<GitApiResponse<GitCommit>> {
    try {
      const response = await this.axios.post<GitApiResponse<GitCommit>>('/commit', { message });
      return response.data;
    } catch (error) {
      return this.handleError(error, '커밋 실패');
    }
  }
  
  /**
   * 파일을 스테이징합니다.
   * 
   * @param files 스테이징할 파일 경로 목록
   * @returns 스테이징 결과
   */
  async addFiles(files: string[]): Promise<GitApiResponse<unknown>> {
    try {
      const response = await this.axios.post<GitApiResponse<unknown>>('/add', { files });
      return response.data;
    } catch (error) {
      return this.handleError(error, '파일 스테이징 실패');
    }
  }
  
  /**
   * 원격 저장소에서 변경사항을 가져옵니다.
   * 
   * @param params 풀 파라미터 (remote, branch)
   * @returns 풀 결과
   */
  async pull(params: {
    remote?: string;
    branch?: string;
  } = {}): Promise<GitApiResponse<unknown>> {
    try {
      const response = await this.axios.post<GitApiResponse<unknown>>('/pull', params);
      return response.data;
    } catch (error) {
      return this.handleError(error, '풀 실패');
    }
  }
  
  /**
   * 원격 저장소로 변경사항을 푸시합니다.
   * 
   * @param params 푸시 파라미터 (remote, branch, force)
   * @returns 푸시 결과
   */
  async push(params: {
    remote?: string;
    branch?: string;
    force?: boolean;
  } = {}): Promise<GitApiResponse<unknown>> {
    try {
      const response = await this.axios.post<GitApiResponse<unknown>>('/push', params);
      return response.data;
    } catch (error) {
      return this.handleError(error, '푸시 실패');
    }
  }
  
  /**
   * 파일 변경 이력을 조회합니다.
   * 
   * @param filePath 파일 경로
   * @param limit 조회할 최대 커밋 수
   * @returns 파일 변경 이력
   */
  async getFileHistory(filePath: string, limit = 10): Promise<GitApiResponse<unknown>> {
    try {
      const response = await this.axios.get<GitApiResponse<unknown>>('/file-history', {
        params: { file_path: filePath, limit }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, '파일 이력 조회 실패');
    }
  }
  
  /**
   * API 오류를 처리합니다.
   * 
   * @param error 발생한 오류
   * @param defaultMessage 기본 오류 메시지
   * @returns 표준화된 오류 응답
   */
  private handleError(error: unknown, defaultMessage: string): GitApiResponse<never> {
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.data) {
      return axiosError.response.data as GitApiResponse<never>;
    }
    
    return {
      success: false,
      message: defaultMessage,
      errors: [{
        code: 'client_error',
        message: axiosError.message || defaultMessage
      }],
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

// 기본 인스턴스를 export
export const gitApiClient = new GitApiClient();

export default gitApiClient;