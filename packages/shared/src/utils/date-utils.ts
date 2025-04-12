/**
 * 날짜 조작 및 포맷팅 유틸리티
 * 
 * dayjs 라이브러리를 사용하여 날짜 관련 작업을 처리합니다.
 * 모든 날짜 관련 작업은 이 유틸리티를 통해 일관되게 처리되어야 합니다.
 */

import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko'; // 한국어 로케일 추가

// 플러그인 등록
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

// 한국어 로케일 설정
dayjs.locale('ko');

// 날짜 포맷 타입
export enum DateFormat {
  API = 'YYYY-MM-DD',
  DISPLAY = 'YYYY년 MM월 DD일',
  DATETIME_DISPLAY = 'YYYY년 MM월 DD일 HH:mm',
  ISO = 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  TIME = 'HH:mm'
}

/**
 * 입력된 날짜값을 dayjs 객체로 변환합니다.
 * @param date - 변환할 날짜 (문자열, 날짜 객체, dayjs 객체, timestamp)
 * @returns dayjs 객체
 */
export function toDateObject(date?: string | Date | Dayjs | number | null): Dayjs {
  if (!date) {
    return dayjs();
  }
  return dayjs(date);
}

/**
 * 날짜를 지정된 형식의 문자열로 포맷합니다.
 * @param date - 포맷할 날짜 (문자열, 날짜 객체, dayjs 객체, timestamp)
 * @param format - 출력 형식 (DateFormat enum 또는 문자열)
 * @returns 포맷된 날짜 문자열
 */
export function formatDate(
  date?: string | Date | Dayjs | number | null, 
  format: DateFormat | string = DateFormat.DISPLAY
): string {
  return toDateObject(date).format(format);
}

/**
 * 현재 날짜와 시간을 지정된 형식의 문자열로 반환합니다.
 * @param format - 출력 형식 (DateFormat enum 또는 문자열)
 * @returns 포맷된 현재 날짜 문자열
 */
export function getCurrentDate(format: DateFormat | string = DateFormat.DISPLAY): string {
  return dayjs().format(format);
}

/**
 * 날짜가 유효한지 확인합니다.
 * @param date - 확인할 날짜 (문자열, 날짜 객체, dayjs 객체, timestamp)
 * @param format - 문자열 날짜의 형식 (선택적)
 * @returns 유효한 날짜인지 여부
 */
export function isValidDate(
  date: string | Date | Dayjs | number | null | undefined,
  format?: string
): boolean {
  if (!date) return false;
  return format ? dayjs(date, format).isValid() : dayjs(date).isValid();
}

/**
 * 두 날짜 사이의 차이를 계산합니다.
 * @param date1 - 첫 번째 날짜
 * @param date2 - 두 번째 날짜 (기본값: 현재 날짜)
 * @param unit - 반환할 차이 단위 ('days', 'months', 'years' 등)
 * @returns 두 날짜 사이의 차이
 */
export function dateDiff(
  date1: string | Date | Dayjs | number,
  date2: string | Date | Dayjs | number = new Date(),
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' = 'days'
): number {
  return toDateObject(date2).diff(toDateObject(date1), unit);
}

/**
 * 날짜에 지정된 기간을 더합니다.
 * @param date - 기준 날짜
 * @param amount - 더할 양
 * @param unit - 단위 ('days', 'months', 'years' 등)
 * @returns 계산된 날짜의 dayjs 객체
 */
export function addToDate(
  date: string | Date | Dayjs | number,
  amount: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' = 'days'
): Dayjs {
  return toDateObject(date).add(amount, unit);
}

/**
 * 상대적인 시간을 표시합니다 (예: "3일 전", "1시간 후")
 * @param date - 기준 날짜
 * @param referenceDate - 비교 기준 날짜 (기본값: 현재 날짜)
 * @returns 상대적 시간 문자열
 */
export function relativeTimeFromNow(
  date: string | Date | Dayjs | number,
  referenceDate: string | Date | Dayjs | number = new Date()
): string {
  return toDateObject(date).from(toDateObject(referenceDate));
}

/**
 * 날짜 범위가 유효한지 확인합니다.
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @returns 유효한 범위인지 여부 (종료일이 시작일보다 같거나 이후인지)
 */
export function isValidDateRange(
  startDate: string | Date | Dayjs | number,
  endDate: string | Date | Dayjs | number
): boolean {
  return toDateObject(startDate).isSameOrBefore(toDateObject(endDate));
}

/**
 * 날짜가 지정된 형식의 문자열인지 확인합니다.
 * @param dateStr - 확인할 날짜 문자열
 * @param format - 확인할 형식 (DateFormat enum 또는 문자열)
 * @returns 지정된 형식의 유효한 날짜 문자열인지 여부
 */
export function isValidDateString(
  dateStr: string, 
  format: DateFormat | string = DateFormat.API
): boolean {
  return dayjs(dateStr, format, true).isValid();
}

export default {
  formatDate,
  getCurrentDate,
  isValidDate,
  dateDiff,
  addToDate,
  relativeTimeFromNow,
  isValidDateRange,
  isValidDateString,
  toDateObject
}; 