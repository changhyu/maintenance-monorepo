/**
 * 시간 형식 변환 함수 - 초를 시간과 분으로 변환
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
};

/**
 * 거리 형식 변환 함수 - 미터를 km 또는 m 단위로 변환
 */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
};

/**
 * 경로 안내 단계별 아이콘 선택 함수
 */
export const getStepIcon = (maneuver?: string): string => {
  switch (maneuver) {
    case 'depart':
      return 'play-arrow';
    case 'turn-right':
      return 'turn-right';
    case 'turn-left':
      return 'turn-left';
    case 'straight':
      return 'arrow-upward';
    case 'arrive':
      return 'place';
    default:
      return 'arrow-forward';
  }
};

/**
 * 각도를 라디안으로 변환
 */
export const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * 두 지점의 거리 계산 함수
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // 지구 반경 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Directly return the calculated distance
};

export default {
  formatDuration,
  formatDistance,
  getStepIcon,
  deg2rad,
  calculateDistance,
};