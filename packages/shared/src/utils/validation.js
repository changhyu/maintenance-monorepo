/**
 * 검증 관련 유틸리티 함수 모음
 */
/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email) {
    if (!email)
        return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
/**
 * 비밀번호 복잡도 검사
 * - 최소 8자 이상
 * - 알파벳 소문자, 대문자, 숫자, 특수문자 중 3가지 이상 포함
 */
export function isStrongPassword(password) {
    if (!password || password.length < 8)
        return false;
    let score = 0;
    // 알파벳 소문자 포함 여부
    if (/[a-z]/.test(password))
        score++;
    // 알파벳 대문자 포함 여부
    if (/[A-Z]/.test(password))
        score++;
    // 숫자 포함 여부
    if (/[0-9]/.test(password))
        score++;
    // 특수문자 포함 여부
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password))
        score++;
    return score >= 3;
}
/**
 * 전화번호 유효성 검사
 */
export function isValidPhoneNumber(phone) {
    if (!phone)
        return false;
    // 숫자만 추출
    const digits = phone.replace(/\D/g, '');
    // 국내 전화번호 (10-11자리)
    return /^01[016789]\d{7,8}$/.test(digits);
}
/**
 * 차량 VIN 유효성 검사 (간단한 검증)
 */
export function isValidVin(vin) {
    if (!vin)
        return false;
    // 숫자와 문자만 추출하고 대문자로 변환
    const cleaned = vin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // VIN은 일반적으로 17자리
    if (cleaned.length !== 17)
        return false;
    // I, O, Q 문자는 VIN에서 사용되지 않음
    if (/[IOQ]/.test(cleaned))
        return false;
    return true;
}
/**
 * 년도 유효성 검사 (1900년부터 현재까지)
 */
export function isValidYear(year) {
    if (year === undefined || year === null)
        return false;
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear + 1; // 다음 연도 모델까지 허용
}
/**
 * 차량 번호판 유효성 검사 (한국 기준)
 */
export function isValidLicensePlate(plate) {
    if (!plate)
        return false;
    // 공백 제거
    const cleaned = plate.replace(/\s/g, '');
    // 구형 번호판 (12가3456)
    if (/^\d{2}[가-힣]\d{4}$/.test(cleaned))
        return true;
    // 신형 번호판 (123가4567)
    if (/^\d{3}[가-힣]\d{4}$/.test(cleaned))
        return true;
    return false;
}
/**
 * 필수 필드 검사
 */
export function isRequiredFieldsFilled(obj, requiredFields) {
    if (!obj)
        return false;
    for (const field of requiredFields) {
        const value = obj[field];
        if (value === undefined || value === null || value === '') {
            return false;
        }
        // 문자열인 경우 공백만 있는지 확인
        if (typeof value === 'string' && value.trim() === '') {
            return false;
        }
    }
    return true;
}
/**
 * 숫자 범위 검사
 */
export function isNumberInRange(value, min, max) {
    if (value === undefined || value === null)
        return false;
    return value >= min && value <= max;
}
/**
 * URL 유효성 검사
 */
export function isValidUrl(url) {
    if (!url)
        return false;
    try {
        new URL(url);
        return true;
    }
    catch (error) {
        return false;
    }
}
