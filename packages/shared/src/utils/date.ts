/**
 * 날짜 관련 유틸리티 함수 모음
 */

import { errorLogger } from './errorLogger';

/**
 * 날짜 형식 설정
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * ISO 날짜 문자열을 'YYYY년 MM월 DD일' 형식으로 변환
 */
export function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일`;
  } catch (error) {
    errorLogger.error('날짜 형식 변환 오류', { dateString }, error);
    return '';
  }
}

/**
 * ISO 날짜 문자열을 'YYYY년 MM월 DD일 HH:MM' 형식으로 변환
 */
export function formatDateTime(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  } catch (error) {
    errorLogger.error('날짜 시간 형식 변환 오류', { dateString }, error);
    return '';
  }
}

/**
 * 현재 시간 기준으로 상대적인 시간을 문자열로 변환
 */
export function getRelativeTime(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSecs < 60) return `방금 전`;
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    if (diffMonths < 12) return `${diffMonths}개월 전`;
    return `${diffYears}년 전`;
  } catch (error) {
    errorLogger.error('상대 시간 계산 오류', { dateString }, error);
    return '';
  }
}

/**
 * 두 날짜 사이의 일수 계산
 */
export function getDaysBetween(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined
): number {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    // 시간, 분, 초, 밀리초 제외하고 일자만 비교하기 위해 날짜 초기화
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    errorLogger.error('날짜 간격 계산 오류', { startDate, endDate }, error);
    return 0;
  }
}

/**
 * 특정 날짜에 일수 추가
 */
export function addDays(
  dateString: string | Date | undefined,
  days: number
): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  } catch (error) {
    errorLogger.error('날짜 추가 오류', { dateString, days }, error);
    return '';
  }
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayString(): string {
  const date = new Date();
  return date.toISOString().split('T')[0];
}

/**
 * 날짜가 지났는지 확인
 */
export function isDatePassed(dateString: string | Date | undefined): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const now = new Date();
    // 시간을 0시 0분 0초로 설정하여 날짜만 비교
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date.getTime() < now.getTime();
  } catch (error) {
    errorLogger.error('날짜 경과 확인 오류', { dateString }, error);
    return false;
  }
}

/**
 * 두 날짜 중 더 최근 날짜 반환
 */
export function getMoreRecentDate(
  date1: string | Date | undefined,
  date2: string | Date | undefined
): string {
  if (!date1) return date2 ? new Date(date2).toISOString() : '';
  if (!date2) return date1 ? new Date(date1).toISOString() : '';
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime())) return date2 ? new Date(date2).toISOString() : '';
    if (isNaN(d2.getTime())) return date1 ? new Date(date1).toISOString() : '';
    
    return d1.getTime() > d2.getTime() 
      ? d1.toISOString() 
      : d2.toISOString();
  } catch (error) {
    errorLogger.error('최근 날짜 비교 오류', { date1, date2 }, error);
    return '';
  }
} 