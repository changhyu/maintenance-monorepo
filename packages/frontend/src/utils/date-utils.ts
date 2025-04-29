import dayjs from 'dayjs';
import 'dayjs/locale/ko';

/**
 * 날짜 포맷 유틸리티
 * 다양한 날짜 형식을 지원합니다.
 */

// 기본 포맷
export const formatDate = (date: string | Date | number, format: string = 'YYYY. MM. DD'): string => {
  if (!date) return '-';
  return dayjs(date).locale('ko').format(format);
};

// 날짜 및 시간 포맷
export const formatDateTime = (date: string | Date | number): string => {
  if (!date) return '-';
  return dayjs(date).locale('ko').format('YYYY. MM. DD HH:mm');
};

// 상대적 시간 표시 (예: '3시간 전', '어제')
export const formatRelativeTime = (date: string | Date | number): string => {
  if (!date) return '-';
  
  const now = dayjs();
  const targetDate = dayjs(date);
  const diffMinutes = now.diff(targetDate, 'minute');
  
  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  
  const diffHours = now.diff(targetDate, 'hour');
  if (diffHours < 24) return `${diffHours}시간 전`;
  
  const diffDays = now.diff(targetDate, 'day');
  if (diffDays < 2) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  
  const diffWeeks = now.diff(targetDate, 'week');
  if (diffWeeks < 5) return `${diffWeeks}주 전`;
  
  const diffMonths = now.diff(targetDate, 'month');
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  
  const diffYears = now.diff(targetDate, 'year');
  return `${diffYears}년 전`;
};

// 요일 포함 포맷
export const formatDateWithDay = (date: string | Date | number): string => {
  if (!date) return '-';
  return dayjs(date).locale('ko').format('YYYY. MM. DD (ddd)');
};

// 시작일과 종료일 범위 포맷
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  if (!startDate || !endDate) return '-';
  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
};

export default {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDateWithDay,
  formatDateRange
};