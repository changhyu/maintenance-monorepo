/**
 * 환경 변수 검증 오류 클래스
 */
export class EnvValidationError extends Error {
  /**
   * @param message - 오류 메시지
   * @param variables - 누락된 환경 변수 목록
   */
  constructor(message: string, public variables: string[] = []) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * 환경 변수가 존재하는지 검증합니다.
 * @param vars - 검증할 환경 변수 이름 배열
 * @throws {EnvValidationError} 환경 변수가 존재하지 않거나 값이 비어있는 경우 발생
 */
export function validateEnv(vars: string[]): void {
  const missing: string[] = [];
  
  for (const varName of vars) {
    // Vite 환경 변수 접두사가 있는지 확인
    const fullVarName = varName.startsWith('VITE_') ? varName : varName;
    // @ts-ignore - 환경 변수에 대한 동적 접근
    const value = import.meta.env[fullVarName];
    
    if (value === undefined || value === null || value === '') {
      missing.push(fullVarName);
    }
  }
  
  if (missing.length > 0) {
    const errorMessage = `필수 환경 변수가 없거나 비어 있습니다: ${missing.join(', ')}`;
    console.error(`환경 변수 검증 오류: ${errorMessage}`);
    throw new EnvValidationError(errorMessage, missing);
  }
}

/**
 * 필수 환경 변수를 검증하는 유틸리티 함수
 * 
 * 애플리케이션 시작 시 필요한 환경 변수가 모두 설정되어 있는지 확인합니다.
 * 누락된 환경 변수가 있는 경우 오류를 발생시킵니다.
 * 
 * @throws {Error} 필수 환경 변수가 누락된 경우 오류를 발생시킵니다.
 */
export function validateRequiredEnv(): void {
  // 필수 환경 변수 목록
  const requiredEnvVars = [
    // 'VITE_API_URL', // API 서버 URL
    // 'VITE_AUTH_URL', // 인증 서버 URL
    // 기타 필수 환경 변수
  ];
  
  // 개발 환경에서는 필수 환경 변수 검증을 건너뛸 수 있음
  if (process.env.NODE_ENV === 'development' || import.meta.env.VITE_SKIP_ENV_VALIDATION === 'true') {
    console.warn('개발 환경에서 환경 변수 검증이 생략되었습니다.');
    return;
  }
  
  // 누락된 환경 변수 검사
  const missingEnvVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
  
  // 누락된 환경 변수가 있는 경우 오류 발생
  if (missingEnvVars.length > 0) {
    throw new Error(`다음 필수 환경 변수가 누락되었습니다: ${missingEnvVars.join(', ')}`);
  }
  
  console.log('환경 변수 검증 통과');
}

/**
 * 환경 변수 값을 반환합니다. 값이 없을 경우 기본값을 반환합니다.
 * @param name - 환경 변수 이름
 * @param defaultValue - 기본값 (선택적)
 * @returns 환경 변수 값 또는 기본값
 */
export function getEnv(name: string, defaultValue: string = ''): string {
  // Vite에서는 import.meta.env를 통해 환경 변수 접근
  if (import.meta.env && import.meta.env[name] !== undefined) {
    return import.meta.env[name] as string;
  }
  
  // process.env를 통한 환경 변수 접근 (Node.js 환경)
  if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
    return process.env[name] as string;
  }
  
  // 환경 변수가 없는 경우 기본값 반환
  return defaultValue;
}
