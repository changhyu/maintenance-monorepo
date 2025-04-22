/**
 * 형식 관련 유틸리티 함수 모음
 */

import { errorLogger } from './errorLogger';

/**
 * 숫자를 통화 형식으로 변환 (원화)
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '';
  
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  } catch (error) {
    errorLogger.error('통화 형식 변환 오류', { value }, error);
    return `${value.toLocaleString('ko-KR')}원`;
  }
}

/**
 * 숫자를 천 단위 구분 기호로 포맷팅
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '';
  
  try {
    return value.toLocaleString('ko-KR');
  } catch (error) {
    errorLogger.error('숫자 형식 변환 오류', { value }, error);
    return value.toString();
  }
}

/**
 * 주행거리를 포맷팅 (km 단위 추가)
 */
export function formatMileage(mileage: number | undefined | null): string {
  if (mileage === undefined || mileage === null) return '';
  
  return `${formatNumber(mileage)} km`;
}

/**
 * 전화번호 형식화 (010-1234-5678)
 */
export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
  } else if (digits.length === 11) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}`;
  } else {
    return phone;
  }
}

/**
 * 차량 판번호 포맷팅
 */
export function formatLicensePlate(plate: string | undefined | null): string {
  if (!plate) return '';
  
  // 이미 형식화된 번호판이면 그대로 반환
  if (plate.includes(' ')) return plate;
  
  // 기본 패턴 (12가 3456)으로 포맷팅 시도
  if (/^\d{2}[가-힣]\d{4}$/.test(plate)) {
    return `${plate.substring(0, 2)}${plate.substring(2, 3)} ${plate.substring(3)}`;
  }
  
  // 신형 패턴 (123가 4567)으로 포맷팅 시도
  if (/^\d{3}[가-힣]\d{4}$/.test(plate)) {
    return `${plate.substring(0, 3)}${plate.substring(3, 4)} ${plate.substring(4)}`;
  }
  
  return plate;
}

/**
 * 문자열 길이 제한 (말줄임표 추가)
 */
export function truncateString(
  str: string | undefined | null,
  maxLength: number = 20
): string {
  if (!str) return '';
  
  if (str.length <= maxLength) return str;
  
  return `${str.substring(0, maxLength)}...`;
}

/**
 * 차량 VIN 번호 포맷팅 (xxx-xxx-xxxx-xxx)
 */
export function formatVin(vin: string | undefined | null): string {
  if (!vin) return '';
  
  // 숫자와 문자만 추출하고 대문자로 변환
  const cleaned = vin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  if (cleaned.length !== 17) return vin;
  
  return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}-${cleaned.substring(10)}`;
}

/**
 * 차량 상태에 따른 한글 텍스트 변환
 */
export function getVehicleStatusText(status: string | undefined | null): string {
  if (!status) return '';
  
  switch (status) {
    case 'AVAILABLE':
      return '사용 가능';
    case 'MAINTENANCE':
      return '정비 중';
    case 'RESERVED':
      return '예약됨';
    case 'INACTIVE':
      return '비활성';
    case 'RECALLED':
      return '리콜됨';
    default:
      return status;
  }
}

/**
 * 정비 상태에 따른 한글 텍스트 변환
 */
export function getMaintenanceStatusText(status: string | undefined | null): string {
  if (!status) return '';
  
  switch (status) {
    case 'SCHEDULED':
      return '예약됨';
    case 'IN_PROGRESS':
      return '진행 중';
    case 'COMPLETED':
      return '완료됨';
    case 'CANCELLED':
      return '취소됨';
    default:
      return status;
  }
} 