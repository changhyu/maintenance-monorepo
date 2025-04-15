/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * 날짜를 YYYY-MM-DD 형식의 문자열로 변환
 * @param date 변환할 Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 형식의 문자열을 Date 객체로 파싱
 * @param dateString YYYY-MM-DD 형식의 문자열
 * @returns Date 객체
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * 날짜를 현지화된 형식으로 변환
 * @param date 변환할 Date 객체
 * @param locale 지역 설정 (기본값: 'ko-KR')
 * @returns 현지화된 날짜 문자열
 */
export function formatDateLocale(date: Date, locale: string = 'ko-KR'): string {
  return date.toLocaleDateString(locale);
}

/**
 * 두 날짜 사이의 일 수 계산
 * @param start 시작 날짜
 * @param end 종료 날짜
 * @returns 일 수
 */
export function daysBetween(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // 하루를 밀리초로 변환
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.round(diffTime / oneDay);
}

/**
 * 날짜에 일 수 추가
 * @param date 기준 날짜
 * @param days 추가할 일 수
 * @returns 일 수가 추가된 새 날짜
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 두 날짜가 같은지 비교 (시간 무시)
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @returns 같으면 true, 다르면 false
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 날짜가 오늘인지 확인
 * @param date 확인할 날짜
 * @returns 오늘이면 true, 아니면 false
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * 날짜가 과거인지 확인
 * @param date 확인할 날짜
 * @returns 과거면 true, 아니면 false
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * 날짜가 미래인지 확인
 * @param date 확인할 날짜
 * @returns 미래면 true, 아니면 false
 */
export function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * 날짜의 월 이름 반환
 * @param date 날짜
 * @param locale 지역 설정 (기본값: 'ko-KR')
 * @returns 월 이름
 */
export function getMonthName(date: Date, locale: string = 'ko-KR'): string {
  return date.toLocaleString(locale, { month: 'long' });
}

/**
 * 날짜의 요일 이름 반환
 * @param date 날짜
 * @param locale 지역 설정 (기본값: 'ko-KR')
 * @returns 요일 이름
 */
export function getDayName(date: Date, locale: string = 'ko-KR'): string {
  return date.toLocaleString(locale, { weekday: 'long' });
}