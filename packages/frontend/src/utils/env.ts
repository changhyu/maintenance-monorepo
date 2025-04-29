/**
 * 환경 변수 관리 유틸리티
 */

export const getEnvVar = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (value === undefined) {
    throw new Error(`환경 변수 ${key}가 정의되지 않았습니다.`);
  }
  return value;
};

export const config = {
  apiUrl: getEnvVar('VITE_APP_API_URL'),
  socketUrl: getEnvVar('VITE_APP_SOCKET_URL'),
  env: getEnvVar('VITE_APP_ENV'),
  title: getEnvVar('VITE_APP_TITLE'),
  version: getEnvVar('VITE_APP_VERSION'),
  debug: import.meta.env.VITE_APP_DEBUG === 'true',
  logLevel: import.meta.env.VITE_APP_LOG_LEVEL || 'info',
  isDevelopment: import.meta.env.VITE_APP_ENV === 'development',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
  isTest: import.meta.env.VITE_APP_ENV === 'test',
} as const;

export default config; 