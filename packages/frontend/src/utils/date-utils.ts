/**
 * 날짜 관련 유틸리티 함수들
 * 프로젝트 전체에서 일관된 날짜 처리를 위해 dayjs 라이브러리로 통일
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import logger from './logger';

// 플러그인 등록
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// 한국어 로케일 설정
dayjs.locale('ko');

/**
 * 날짜 포맷팅
 * @param date 포맷팅할 날짜
 * @param format 포맷 (기본: 'YYYY년 MM월 DD일')
 * @returns 포맷팅된 날짜 문자열
 */
export const formatDate = (
  date: string | Date | number,
  format: string = 'YYYY년 MM월 DD일'
): string => {
  try {
    return dayjs(date).format(format);
  } catch (error) {
    logger.error('날짜 포맷팅 오류:', error);
    return '날짜 오류';
  }
};

/**
 * 날짜와 시간 포맷팅
 * @param date 포맷팅할 날짜
 * @param format 포맷 (기본: 'YYYY년 MM월 DD일 HH:mm')
 * @returns 포맷팅된 날짜 및 시간 문자열
 */
export const formatDateTime = (
  date: string | Date | number,
  format: string = 'YYYY년 MM월 DD일 HH:mm'
): string => {
  try {
    return dayjs(date).format(format);
  } catch (error) {
    logger.error('날짜/시간 포맷팅 오류:', error);
    return '날짜 오류';
  }
};

/**
 * 날짜 상대적 표현 (예: '3일 전', '1시간 후')
 * @param date 상대적으로 표현할 날짜
 * @param baseDate 기준 날짜 (기본: 현재)
 * @returns 상대적 시간 표현 문자열
 */
export const formatRelativeTime = (
  date: string | Date | number,
  baseDate?: string | Date | number
): string => {
  try {
    return dayjs(date).from(baseDate || dayjs());
  } catch (error) {
    logger.error('상대 시간 계산 오류:', error);
    return '시간 계산 오류';
  }
};

/**
 * 날짜 간 차이 계산 (일 수)
 * @param dateA 첫번째 날짜
 * @param dateB 두번째 날짜 (기본: 현재)
 * @returns 날짜 간 차이 (일 수)
 */
export const getDaysDifference = (
  dateA: string | Date | number,
  dateB: string | Date | number = new Date()
): number => {
  try {
    return dayjs(dateA).diff(dayjs(dateB), 'day');
  } catch (error) {
    logger.error('날짜 차이 계산 오류:', error);
    return 0;
  }
};

/**
 * 두 날짜 사이의 기간 (일 수) 계산
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 기간 (일 수)
 */
export const getDuration = (
  startDate: string | Date | number,
  endDate: string | Date | number
): number => {
  try {
    return Math.abs(dayjs(endDate).diff(dayjs(startDate), 'day'));
  } catch (error) {
    logger.error('기간 계산 오류:', error);
    return 0;
  }
};

/**
 * 날짜가 지났는지 확인
 * @param date 확인할 날짜
 * @param baseDate 기준 날짜 (기본: 현재)
 * @returns 지났으면 true, 아니면 false
 */
export const isPastDate = (
  date: string | Date | number,
  baseDate: string | Date | number = new Date()
): boolean => {
  try {
    // 시간 정보 제거하고 날짜만 비교
    return dayjs(date).startOf('day').isBefore(dayjs(baseDate).startOf('day'));
  } catch (error) {
    logger.error('날짜 비교 오류:', error);
    return false;
  }
};

/**
 * 날짜가 오늘인지 확인
 * @param date 확인할 날짜
 * @returns 오늘이면 true, 아니면 false
 */
export const isToday = (date: string | Date | number): boolean => {
  try {
    return dayjs(date).isSame(dayjs(), 'day');
  } catch (error) {
    logger.error('날짜 비교 오류:', error);
    return false;
  }
};

/**
 * 날짜를 ISO 형식으로 변환
 * @param date 변환할 날짜
 * @returns ISO 형식 문자열
 */
export const toISOString = (date: string | Date | number): string => {
  try {
    return dayjs(date).toISOString();
  } catch (error) {
    logger.error('ISO 문자열 변환 오류:', error);
    return '';
  }
};

/**
 * 특정 날짜에 일, 월, 년 추가/감소
 * @param date 기준 날짜
 * @param amount 추가/감소할 양
 * @param unit 단위 (day, week, month, year 등)
 * @returns 계산된 새 날짜
 */
export const addToDate = (
  date: string | Date | number,
  amount: number,
  unit: 'day' | 'week' | 'month' | 'year'
): Date => {
  try {
    return dayjs(date).add(amount, unit).toDate();
  } catch (error) {
    logger.error('날짜 계산 오류:', error);
    return new Date();
  }
};

/**
 * 오늘 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환합니다.
 * @returns 오늘 날짜 문자열
 */
export const getTodayString = (): string => {
  try {
    return dayjs().format('YYYY-MM-DD');
  } catch (error) {
    logger.error('오늘 날짜 문자열 생성 오류:', error);
    return '';
  }
};

/**
 * 두 날짜 중 더 최근 날짜를 반환합니다.
 * @param date1 첫 번째 날짜 문자열
 * @param date2 두 번째 날짜 문자열
 * @returns 더 최근 날짜 문자열
 */
export const getMoreRecentDate = (
  date1: string | Date | number, 
  date2: string | Date | number
): string => {
  try {
    if (!date1) return dayjs(date2).format('YYYY-MM-DD');
    if (!date2) return dayjs(date1).format('YYYY-MM-DD');
    
    const d1 = dayjs(date1);
    const d2 = dayjs(date2);
    
    if (!d1.isValid()) return dayjs(date2).format('YYYY-MM-DD');
    if (!d2.isValid()) return dayjs(date1).format('YYYY-MM-DD');
    
    return (d1.isAfter(d2) ? d1 : d2).format('YYYY-MM-DD');
  } catch (error) {
    logger.error('날짜 비교 오류:', error);
    return dayjs(date1).format('YYYY-MM-DD');
  }
};

/**
 * 날짜 문자열 파싱
 * @param dateString 날짜 문자열
 * @param format 파싱할 포맷
 * @returns 파싱된 Date 객체
 */
export const parseDate = (
  dateString: string,
  format?: string
): Date | null => {
  try {
    if (format) {
      const parsed = dayjs(dateString, format);
      return parsed.isValid() ? parsed.toDate() : null;
    }
    
    const parsed = dayjs(dateString);
    return parsed.isValid() ? parsed.toDate() : null;
  } catch (error) {
    logger.error('날짜 파싱 오류:', error);
    return null;
  }
};

/**
 * 날짜 문자열의 유효성을 종합적으로 검증합니다.
 * @param dateString 검증할 날짜 문자열
 * @param minDate 최소 날짜 제한 (선택)
 * @param maxDate 최대 날짜 제한 (선택)
 * @returns 유효하면 true, 아니면 false
 */
export const isValidDate = (
  dateString: string, 
  minDate?: string, 
  maxDate?: string
): boolean => {
  try {
    // 기본 날짜 형식 검증
    const date = dayjs(dateString);
    if (!date.isValid()) {
      return false;
    }

    // 날짜 범위 검증 (minDate가 있는 경우)
    if (minDate) {
      const min = dayjs(minDate);
      if (min.isValid() && date.isBefore(min, 'day')) {
        return false;
      }
    }

    // 날짜 범위 검증 (maxDate가 있는 경우)
    if (maxDate) {
      const max = dayjs(maxDate);
      if (max.isValid() && date.isAfter(max, 'day')) {
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('날짜 유효성 검증 오류:', error);
    return false;
  }
};

/**
 * 시간 문자열의 유효성을 검증합니다. ('HH:MM' 또는 'HH:MM:SS' 형식)
 * @param timeString 검증할 시간 문자열
 * @returns 유효하면 true, 아니면 false
 */
export const isValidTime = (timeString: string): boolean => {
  try {
    // 정규식으로 시간 형식 검증
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
    if (!timeRegex.test(timeString)) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('시간 유효성 검증 오류:', error);
    return false;
  }
};

/**
 * 날짜와 시간이 현재 시점으로부터 지정된 시간(분) 이후인지 확인합니다.
 * @param dateString 날짜 문자열 ('YYYY-MM-DD' 형식)
 * @param timeString 시간 문자열 ('HH:MM' 형식) 
 * @param minimumMinutesInFuture 현재로부터 최소 몇 분 이후여야 하는지 (기본값: 0)
 * @returns 유효하면 true, 아니면 false
 */
export const isFutureDateTime = (
  dateString: string, 
  timeString: string, 
  minimumMinutesInFuture: number = 0
): boolean => {
  try {
    if (!isValidDate(dateString) || !isValidTime(timeString)) {
      return false;
    }

    // 날짜와 시간 문자열 결합
    const dateTimeString = `${dateString} ${timeString}`;
    const dateTime = dayjs(dateTimeString);
    
    // 현재 시간에 최소 시간(분) 추가
    const minTime = dayjs().add(minimumMinutesInFuture, 'minute');
    
    // 지정된 날짜/시간이 최소 요구 시간 이후인지 확인
    return dateTime.isAfter(minTime);
  } catch (error) {
    logger.error('미래 날짜/시간 검증 오류:', error);
    return false;
  }
};

export default {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getDaysDifference,
  getDuration,
  isPastDate,
  isToday,
  toISOString,
  addToDate,
  parseDate,
  getTodayString,
  getMoreRecentDate,
  isValidDate,
  isValidTime,
  isFutureDateTime
}; 