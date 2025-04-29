/**
 * 모든 날짜 관련 유틸리티 함수를 재내보냅니다.
 * 통합된 하나의 파일을 통해 날짜 함수를 사용할 수 있도록 합니다.
 */
// 가장 일반적으로 사용되는 함수들을 기본 내보내기에도 포함
import { formatDate, formatDateTime, isPastDate, isToday, getDaysDifference } from './date-utils';
export * from './date-utils';
const dateUtils = {
    formatDate,
    formatDateTime,
    isPastDate,
    isToday,
    getDaysDifference
};
export default dateUtils;
