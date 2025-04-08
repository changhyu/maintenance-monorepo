/**
 * 날짜 문자열을 한국어 형식으로 변환합니다. ('YYYY-MM-DD' → 'YYYY년 MM월 DD일')
 * @param dateString 'YYYY-MM-DD' 형식의 날짜 문자열
 * @returns 포맷팅된 날짜 문자열
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}년 ${month}월 ${day}일`;
  } catch (err) {
    console.error('날짜 포맷 변환 오류:', err);
    return '날짜 오류';
  }
};

/**
 * 날짜와 시간 문자열을 한국어 형식으로 변환합니다. ('YYYY-MM-DD HH:MM:SS' → 'YYYY년 MM월 DD일 HH:MM')
 * @param dateString 'YYYY-MM-DD HH:MM:SS' 형식의 날짜 문자열
 * @returns 포맷팅된 날짜 및 시간 문자열
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  } catch (err) {
    console.error('날짜 포맷 변환 오류:', err);
    return '날짜 오류';
  }
};

/**
 * 현재 시간과 주어진 날짜 사이의 상대적 시간을 반환합니다.
 * @param dateString 비교할 날짜 문자열
 * @returns 상대적 시간 문자열 (예: '3일 전', '방금 전')
 */
export const getRelativeTime = (dateString: string): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSec = Math.floor(diffInMs / 1000);
    const diffInMin = Math.floor(diffInSec / 60);
    const diffInHour = Math.floor(diffInMin / 60);
    const diffInDay = Math.floor(diffInHour / 24);
    const diffInMonth = Math.floor(diffInDay / 30);
    const diffInYear = Math.floor(diffInMonth / 12);
    
    if (diffInSec < 60) return '방금 전';
    if (diffInMin < 60) return `${diffInMin}분 전`;
    if (diffInHour < 24) return `${diffInHour}시간 전`;
    if (diffInDay < 30) return `${diffInDay}일 전`;
    if (diffInMonth < 12) return `${diffInMonth}개월 전`;
    return `${diffInYear}년 전`;
  } catch (err) {
    console.error('상대 시간 계산 오류:', err);
    return '시간 계산 오류';
  }
};

/**
 * 두 날짜 사이의 일수를 계산합니다.
 * @param startDate 시작 날짜 문자열 ('YYYY-MM-DD' 형식)
 * @param endDate 종료 날짜 문자열 ('YYYY-MM-DD' 형식)
 * @returns 일수 차이 (양수: endDate가 미래, 음수: endDate가 과거)
 */
export const getDaysBetween = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }
    
    // 시간, 분, 초 제거하고 일수만 계산
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    const diffInMs = endDay.getTime() - startDay.getTime();
    return Math.round(diffInMs / (1000 * 60 * 60 * 24));
  } catch (err) {
    console.error('날짜 차이 계산 오류:', err);
    return 0;
  }
};

/**
 * 주어진 날짜에 지정된 일수를 더합니다.
 * @param dateString 기준 날짜 문자열 ('YYYY-MM-DD' 형식)
 * @param days 더할 일수 (음수인 경우 과거로 이동)
 * @returns 계산된 날짜의 문자열 ('YYYY-MM-DD' 형식)
 */
export const addDays = (dateString: string, days: number): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }
    
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  } catch (err) {
    console.error('날짜 계산 오류:', err);
    return '';
  }
};

/**
 * 오늘 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환합니다.
 * @returns 오늘 날짜 문자열
 */
export const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * 날짜가 오늘 이전인지 확인합니다.
 * @param dateString 확인할 날짜 문자열 ('YYYY-MM-DD' 형식)
 * @returns 오늘보다 이전이면 true, 아니면 false
 */
export const isDatePassed = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }
    
    // 현재 날짜 (시간은 00:00:00으로 설정)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date < today;
  } catch (err) {
    console.error('날짜 비교 오류:', err);
    return false;
  }
};

/**
 * 두 날짜 중 더 최근 날짜를 반환합니다.
 * @param date1 첫 번째 날짜 문자열
 * @param date2 두 번째 날짜 문자열
 * @returns 더 최근 날짜 문자열
 */
export const getMoreRecentDate = (date1: string, date2: string): string => {
  if (!date1) return date2;
  if (!date2) return date1;
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime())) return date2;
    if (isNaN(d2.getTime())) return date1;
    
    return d1 > d2 ? date1 : date2;
  } catch (err) {
    console.error('날짜 비교 오류:', err);
    return date1;
  }
}; 