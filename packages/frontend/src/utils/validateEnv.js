/**
 * 환경 변수 검증 오류 클래스
 */
export class EnvValidationError extends Error {
    /**
     * @param message - 오류 메시지
     * @param variables - 누락된 환경 변수 목록
     */
    constructor(message, variables = []) {
        super(message);
        this.variables = variables;
        this.name = 'EnvValidationError';
    }
}
/**
 * 환경 변수가 존재하는지 검증합니다.
 * @param vars - 검증할 환경 변수 이름 배열
 * @throws {EnvValidationError} 환경 변수가 존재하지 않거나 값이 비어있는 경우 발생
 */
export function validateEnv(vars) {
    const missing = [];
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
 * 환경 변수 값을 반환합니다. 값이 없을 경우 기본값을 반환합니다.
 * @param name - 환경 변수 이름
 * @param defaultValue - 기본값 (선택적)
 * @returns 환경 변수 값 또는 기본값
 */
export function getEnv(name, defaultValue = '') {
    // Vite 환경 변수 접두사가 있는지 확인
    const fullVarName = name.startsWith('VITE_') ? name : name;
    try {
        // @ts-ignore - 환경 변수에 대한 동적 접근
        const value = import.meta.env[fullVarName];
        return value !== undefined && value !== null && value !== ''
            ? value
            : defaultValue;
    }
    catch (error) {
        console.warn(`환경 변수 '${fullVarName}' 접근 중 오류 발생:`, error);
        return defaultValue;
    }
}
/**
 * 애플리케이션 실행에 필요한 모든 필수 환경 변수를 검증합니다.
 * @throws {EnvValidationError} 필수 환경 변수가 누락된 경우 발생
 */
export function validateRequiredEnv() {
    const requiredVars = [
        'VITE_API_URL',
        'VITE_SOCKET_URL'
    ];
    validateEnv(requiredVars);
    // 선택적 환경 변수에 대한 기본값 설정
    const mode = getEnv('MODE', 'development');
    console.log(`애플리케이션 환경: ${mode}`);
}
