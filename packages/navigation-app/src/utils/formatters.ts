/**
 * 시간을 형식화하는 유틸리티 함수
 * 
 * @param seconds 초 단위의 시간
 * @returns 형식화된 시간 문자열 (예: "1시간 30분")
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) {
    return '0분';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (hours > 0) {
    return `${hours}시간`;
  } else {
    return `${minutes}분`;
  }
}

/**
 * 거리를 형식화하는 유틸리티 함수
 * 
 * @param meters 미터 단위의 거리
 * @returns 형식화된 거리 문자열 (예: "1.5km" 또는 "500m")
 */
export function formatDistance(meters: number): string {
  if (meters <= 0) {
    return '0m';
  }
  
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  } else {
    const m = Math.round(meters);
    return `${m}m`;
  }
}