/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 날짜 포맷 열거형
 */
export enum DateFormat {
  ISO = 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE = 'YYYY-MM-DD',
  TIME = 'HH:mm:ss',
  DATETIME = 'YYYY-MM-DD HH:mm:ss',
  DISPLAY = 'YYYY년 MM월 DD일',
  DISPLAY_WITH_TIME = 'YYYY년 MM월 DD일 HH:mm',
  DAY_MONTH = 'MM월 DD일',
  MONTH_YEAR = 'YYYY년 MM월',
  TIME_ONLY = 'HH:mm'
}

/**
 * 날짜 입력 타입 - 날짜 함수에 전달될 수 있는 다양한 형식의 날짜 입력을 정의
 */
export type DateInput = Date | string | number | null | undefined;

/**
 * 현재 날짜/시간을 가져옵니다.
 * @param format 반환할 날짜 포맷 (기본값: ISO 포맷)
 * @returns 포맷된 현재 날짜 문자열 또는 Date 객체
 */
export function getCurrentDate(format?: DateFormat | string): string | Date {
  const now = new Date();
  
  if (!format) {
    return now;
  }
  
  return formatDate(now, format);
}

/**
 * 날짜를 특정 형식으로 포맷합니다.
 * @param date 포맷할 날짜
 * @param format 날짜 포맷 (기본값: YYYY-MM-DD)
 * @returns 포맷된 날짜 문자열
 */
export function formatDate(date: DateInput, format: DateFormat | string = DateFormat.DATE): string {
  // 유효하지 않은 입력 처리
  if (!date) {
    return '';
  }
  
  const dateObj = toDateObject(date);
  
  if (!isValidDate(dateObj)) {
    return '';
  }
  
  // 포맷팅을 위한 날짜 구성 요소 추출
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // getMonth()는 0부터 시작하므로 1을 더함
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  const milliseconds = dateObj.getMilliseconds();
  
  // 포맷 문자열 치환
  return format
    .replace(/YYYY/g, String(year).padStart(4, '0'))
    .replace(/MM/g, String(month).padStart(2, '0'))
    .replace(/DD/g, String(day).padStart(2, '0'))
    .replace(/HH/g, String(hours).padStart(2, '0'))
    .replace(/mm/g, String(minutes).padStart(2, '0'))
    .replace(/ss/g, String(seconds).padStart(2, '0'))
    .replace(/SSS/g, String(milliseconds).padStart(3, '0'))
    .replace(/Z/g, getTimezoneOffsetString(dateObj));
}

/**
 * 날짜의 타임존 오프셋 문자열을 반환합니다.
 * @param date 날짜 객체
 * @returns 타임존 오프셋 문자열 (예: +09:00)
 */
function getTimezoneOffsetString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  
  const sign = offset <= 0 ? '+' : '-';
  
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 지역화된 날짜 형식으로 포맷합니다.
 * @param date 포맷할 날짜
 * @param locale 사용할 로케일 (기본값: 'ko-KR')
 * @param options 날짜 포맷팅 옵션
 * @returns 지역화된 날짜 문자열
 */
export function formatLocalizedDate(
  date: DateInput,
  locale = 'ko-KR',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }
): string {
  if (!date) {
    return '';
  }
  
  const dateObj = toDateObject(date);
  
  if (!isValidDate(dateObj)) {
    return '';
  }
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * 날짜가 유효한 Date 객체인지 확인합니다.
 * @param date 확인할 날짜
 * @returns 유효하면 true, 그렇지 않으면 false
 */
export function isValidDate(date: DateInput): boolean {
  if (!date) {
    return false;
  }
  
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * 날짜 문자열이 지정된 형식에 맞는지 확인합니다.
 * @param dateStr 확인할 날짜 문자열
 * @param format 예상 날짜 형식 (기본값: YYYY-MM-DD)
 * @returns 형식에 맞으면 true, 그렇지 않으면 false
 */
export function isValidDateString(dateStr: string, format = DateFormat.DATE): boolean {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  
  // 기본 형식에 대한 정규식 검사
  if (format === DateFormat.DATE) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
  } else if (format === DateFormat.DATETIME) {
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
  } else if (format === DateFormat.ISO) {
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}[+-]\d{2}:\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
  }
  
  // 날짜 유효성 확인 (예: 2월 30일 같은 유효하지 않은 날짜)
  return isValidDate(dateStr);
}

/**
 * 날짜 범위가 유효한지 검사합니다.
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 유효한 범위이면 true, 그렇지 않으면 false
 */
export function isValidDateRange(startDate: DateInput, endDate: DateInput): boolean {
  // 둘 중 하나라도 유효하지 않은 경우
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  
  const start = toDateObject(startDate);
  const end = toDateObject(endDate);
  
  // 종료일이 시작일보다 같거나 이후인 경우 유효
  return start.getTime() <= end.getTime();
}

/**
 * 두 날짜가 같은 날인지 확인합니다.
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @returns 같은 날이면 true, 그렇지 않으면 false
 */
export function isSameDay(date1: DateInput, date2: DateInput): boolean {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    return false;
  }
  
  const d1 = toDateObject(date1);
  const d2 = toDateObject(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 주어진 날짜가 오늘인지 확인합니다.
 * @param date 확인할 날짜
 * @returns 오늘이면 true, 그렇지 않으면 false
 */
export function isToday(date: DateInput): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  
  return isSameDay(date, new Date());
}

/**
 * 주어진 날짜가 과거인지 확인합니다.
 * @param date 확인할 날짜
 * @returns 현재 시간보다 과거이면 true, 그렇지 않으면 false
 */
export function isPast(date: DateInput): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  
  const dateObj = toDateObject(date);
  const now = new Date();
  
  return dateObj.getTime() < now.getTime();
}

/**
 * 주어진 날짜가 미래인지 확인합니다.
 * @param date 확인할 날짜
 * @returns 현재 시간보다 미래이면 true, 그렇지 않으면 false
 */
export function isFuture(date: DateInput): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  
  const dateObj = toDateObject(date);
  const now = new Date();
  
  return dateObj.getTime() > now.getTime();
}

/**
 * 두 날짜 간의 차이를 계산합니다.
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @param unit 반환할 단위 ('milliseconds', 'seconds', 'minutes', 'hours', 'days', 'months', 'years')
 * @returns 지정된 단위의 차이값
 */
export function dateDiff(
  date1: DateInput,
  date2: DateInput,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years' = 'days'
): number {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    return NaN;
  }
  
  const d1 = toDateObject(date1);
  const d2 = toDateObject(date2);
  
  // 밀리초 단위 차이 계산
  let diff = d2.getTime() - d1.getTime();
  
  // 단위에 따른 변환
  switch (unit) {
    case 'seconds':
      return Math.round(diff / 1000);
    case 'minutes':
      return Math.round(diff / (1000 * 60));
    case 'hours':
      return Math.round(diff / (1000 * 60 * 60));
    case 'days':
      return Math.round(diff / (1000 * 60 * 60 * 24));
    case 'months': {
      const monthDiff = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      const dayDiff = d2.getDate() - d1.getDate();
      
      // 일(day) 차이가 크면 반올림 처리
      if (dayDiff > 15) {
        return monthDiff + 1;
      } else if (dayDiff < -15) {
        return monthDiff - 1;
      }
      
      return monthDiff;
    }
    case 'years': {
      const yearDiff = d2.getFullYear() - d1.getFullYear();
      const monthDiff = d2.getMonth() - d1.getMonth();
      
      // 월 차이가 크면 반올림 처리
      if (monthDiff > 6 || (monthDiff === 6 && d2.getDate() > d1.getDate())) {
        return yearDiff + 1;
      } else if (monthDiff < -6 || (monthDiff === -6 && d2.getDate() < d1.getDate())) {
        return yearDiff - 1;
      }
      
      return yearDiff;
    }
    case 'milliseconds':
    default:
      return diff;
  }
}

/**
 * 날짜에 지정된 기간을 더합니다.
 * @param date 기준 날짜
 * @param amount 더할 양
 * @param unit 단위 ('milliseconds', 'seconds', 'minutes', 'hours', 'days', 'months', 'years')
 * @returns 계산된 새 날짜
 */
export function addToDate(
  date: DateInput,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years' = 'days'
): Date {
  if (!isValidDate(date) || typeof amount !== 'number') {
    throw new Error('유효한 날짜와 숫자를 입력하세요.');
  }
  
  const dateObj = toDateObject(date);
  const newDate = new Date(dateObj);
  
  switch (unit) {
    case 'milliseconds':
      newDate.setTime(newDate.getTime() + amount);
      break;
    case 'seconds':
      newDate.setTime(newDate.getTime() + amount * 1000);
      break;
    case 'minutes':
      newDate.setTime(newDate.getTime() + amount * 60 * 1000);
      break;
    case 'hours':
      newDate.setTime(newDate.getTime() + amount * 60 * 60 * 1000);
      break;
    case 'days':
      newDate.setDate(newDate.getDate() + amount);
      break;
    case 'months':
      // 월을 더할 때는 현재 날짜 유지 (예: 1월 31일 + 1개월 = 2월 28일 또는 29일)
      const currentDate = newDate.getDate();
      
      // 먼저 1일로 설정하여 월 계산에서 오버플로우 방지
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + amount);
      
      // 해당 월의 마지막 날짜 계산
      const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      
      // 원래 날짜와 해당 월의 마지막 날짜 중 작은 값 사용
      newDate.setDate(Math.min(currentDate, lastDayOfMonth));
      break;
    case 'years':
      newDate.setFullYear(newDate.getFullYear() + amount);
      break;
    default:
      throw new Error('지원하지 않는 단위입니다.');
  }
  
  return newDate;
}

/**
 * 날짜에서 지정된 기간을 뺍니다.
 * @param date 기준 날짜
 * @param amount 뺄 양
 * @param unit 단위 ('milliseconds', 'seconds', 'minutes', 'hours', 'days', 'months', 'years')
 * @returns 계산된 새 날짜
 */
export function subtractFromDate(
  date: DateInput,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years' = 'days'
): Date {
  return addToDate(date, -amount, unit);
}

/**
 * 상대적 시간을 표시합니다. (예: '3시간 전', '5일 후')
 * @param date 기준 날짜
 * @param referenceDate 비교 기준 날짜 (기본값: 현재 시간)
 * @returns 상대적 시간 표시 문자열
 */
export function relativeTimeFromNow(date: DateInput, referenceDate: DateInput = new Date()): string {
  if (!isValidDate(date)) {
    return '';
  }
  
  const dateObj = toDateObject(date);
  const reference = toDateObject(referenceDate);
  
  const diff = dateObj.getTime() - reference.getTime();
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);
  
  // 1분 미만
  if (absDiff < 60 * 1000) {
    return isPast ? '방금 전' : '곧';
  }
  
  // 1시간 미만
  if (absDiff < 60 * 60 * 1000) {
    const minutes = Math.round(absDiff / (60 * 1000));
    return isPast ? `${minutes}분 전` : `${minutes}분 후`;
  }
  
  // 24시간 미만
  if (absDiff < 24 * 60 * 60 * 1000) {
    const hours = Math.round(absDiff / (60 * 60 * 1000));
    return isPast ? `${hours}시간 전` : `${hours}시간 후`;
  }
  
  // 30일 미만
  if (absDiff < 30 * 24 * 60 * 60 * 1000) {
    const days = Math.round(absDiff / (24 * 60 * 60 * 1000));
    return isPast ? `${days}일 전` : `${days}일 후`;
  }
  
  // 12개월 미만
  if (absDiff < 365 * 24 * 60 * 60 * 1000) {
    const months = Math.round(absDiff / (30 * 24 * 60 * 60 * 1000));
    return isPast ? `${months}개월 전` : `${months}개월 후`;
  }
  
  // 1년 이상
  const years = Math.round(absDiff / (365 * 24 * 60 * 60 * 1000));
  return isPast ? `${years}년 전` : `${years}년 후`;
}

/**
 * 월 이름을 가져옵니다.
 * @param month 월 (0-11) 또는 날짜 객체
 * @param locale 사용할 로케일 (기본값: 'ko-KR')
 * @param format 형식 ('long' 또는 'short')
 * @returns 월 이름
 */
export function getMonthName(
  month: number | DateInput,
  locale = 'ko-KR',
  format: 'long' | 'short' = 'long'
): string {
  let monthNumber: number;
  
  if (typeof month === 'number') {
    // 0-11 범위 확인
    if (month < 0 || month > 11) {
      throw new Error('월은 0에서 11 사이의 숫자여야 합니다.');
    }
    
    monthNumber = month;
  } else {
    if (!isValidDate(month)) {
      return '';
    }
    
    monthNumber = toDateObject(month).getMonth();
  }
  
  // Date 객체를 생성하여 해당 월의 첫날로 설정
  const date = new Date(2000, monthNumber, 1);
  
  return date.toLocaleDateString(locale, {
    month: format === 'long' ? 'long' : 'short'
  }).replace(/[0-9]/g, '').trim();
}

/**
 * 요일 이름을 가져옵니다.
 * @param day 요일 (0-6, 0은 일요일) 또는 날짜 객체
 * @param locale 사용할 로케일 (기본값: 'ko-KR')
 * @param format 형식 ('long' 또는 'short')
 * @returns 요일 이름
 */
export function getDayName(
  day: number | DateInput,
  locale = 'ko-KR',
  format: 'long' | 'short' = 'long'
): string {
  let dayNumber: number;
  
  if (typeof day === 'number') {
    // 0-6 범위 확인
    if (day < 0 || day > 6) {
      throw new Error('요일은 0에서 6 사이의 숫자여야 합니다.');
    }
    
    dayNumber = day;
  } else {
    if (!isValidDate(day)) {
      return '';
    }
    
    dayNumber = toDateObject(day).getDay();
  }
  
  // Date 객체를 생성하여 해당 요일로 설정 (2000-01-02는 일요일)
  const date = new Date(2000, 0, 2 + dayNumber);
  
  return date.toLocaleDateString(locale, {
    weekday: format === 'long' ? 'long' : 'short'
  });
}

/**
 * 두 날짜 중 더 최근 날짜를 반환합니다.
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @returns 더 최근 날짜
 */
export function getMoreRecentDate(date1: DateInput, date2: DateInput): Date | null {
  if (!isValidDate(date1) && !isValidDate(date2)) {
    return null;
  }
  
  if (!isValidDate(date1)) {
    return toDateObject(date2);
  }
  
  if (!isValidDate(date2)) {
    return toDateObject(date1);
  }
  
  const d1 = toDateObject(date1);
  const d2 = toDateObject(date2);
  
  return d1.getTime() > d2.getTime() ? d1 : d2;
}

/**
 * 날짜의 시작 시간을 설정합니다. (00:00:00.000)
 * @param date 날짜
 * @returns 날짜의 시작 시간으로 설정된 새 Date 객체
 */
export function startOfDay(date: DateInput): Date {
  if (!isValidDate(date)) {
    throw new Error('유효한 날짜를 입력하세요.');
  }
  
  const dateObj = toDateObject(date);
  const result = new Date(dateObj);
  
  result.setHours(0, 0, 0, 0);
  
  return result;
}

/**
 * 날짜의 종료 시간을 설정합니다. (23:59:59.999)
 * @param date 날짜
 * @returns 날짜의 종료 시간으로 설정된 새 Date 객체
 */
export function endOfDay(date: DateInput): Date {
  if (!isValidDate(date)) {
    throw new Error('유효한 날짜를 입력하세요.');
  }
  
  const dateObj = toDateObject(date);
  const result = new Date(dateObj);
  
  result.setHours(23, 59, 59, 999);
  
  return result;
}

/**
 * 시작 날짜부터 종료 날짜까지의 날짜 범위 배열을 반환합니다.
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns Date 객체 배열
 */
export function getDateRange(startDate: DateInput, endDate: DateInput): Date[] {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error('유효한 시작 및 종료 날짜를 입력하세요.');
  }
  
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  
  if (start.getTime() > end.getTime()) {
    throw new Error('시작 날짜는 종료 날짜보다 이전이어야 합니다.');
  }
  
  const dates: Date[] = [];
  const currentDate = new Date(start);
  
  while (currentDate.getTime() <= end.getTime()) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * 다양한 형식의 날짜 입력을 Date 객체로 변환합니다.
 * @param date 날짜 입력 (Date, 문자열, 숫자 등)
 * @returns Date 객체
 */
export function toDateObject(date: DateInput): Date {
  if (date instanceof Date) {
    return date;
  }
  
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date);
  }
  
  return new Date(); // 기본값은 현재 시간
}

// dateUtils 객체로 내보내기
export const dateUtils = {
  getCurrentDate,
  formatDate,
  isValidDate,
  dateDiff,
  addToDate,
  subtractFromDate,
  relativeTimeFromNow,
  isValidDateRange,
  isValidDateString,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  getMonthName,
  getDayName,
  getMoreRecentDate,
  startOfDay,
  endOfDay,
  getDateRange,
  formatLocalizedDate,
  toDateObject,
  DateFormat
};

export default dateUtils;
