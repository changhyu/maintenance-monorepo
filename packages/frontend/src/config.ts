import { getEnv } from './utils/validateEnv';

/**
 * 애플리케이션 전역 설정
 */
interface AppConfig {
  // API 관련 설정
  apiUrl: string;
  apiTimeout: number;
  enableLogging: boolean;
  
  // 인증 관련 설정
  authUrl?: string;
  tokenStorageKey: string;
  refreshTokenStorageKey: string;
  
  // 지역화 설정
  defaultLanguage: string;
  supportedLanguages: string[];
  
  // 기타 설정
  appName: string;
  version: string;
  maxFileUploadSize: number; // MB 단위
}

/**
 * 설정값 정의
 */
const config: AppConfig = {
  // API 관련 설정
  apiUrl: getEnv('VITE_API_URL', 'http://localhost:3000/api'),
  apiTimeout: Number(getEnv('VITE_API_TIMEOUT', '30000')),
  enableLogging: getEnv('VITE_ENABLE_API_LOGGING', 'false') === 'true',
  
  // 인증 관련 설정
  authUrl: getEnv('VITE_AUTH_URL', ''),
  tokenStorageKey: 'accessToken',
  refreshTokenStorageKey: 'refreshToken',
  
  // 지역화 설정
  defaultLanguage: 'ko',
  supportedLanguages: ['ko', 'en'],
  
  // 기타 설정
  appName: '차량 정비 관리 시스템',
  version: import.meta.env.PACKAGE_VERSION || '1.0.0',
  maxFileUploadSize: Number(getEnv('VITE_MAX_FILE_UPLOAD_SIZE', '10')), // 기본 10MB
};

export default config;
