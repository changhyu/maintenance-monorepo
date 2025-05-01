import { LocationPoint } from './LocationService';

export interface RouteStep {
  instruction: string;
  distance: number; // 미터 단위
  duration: number; // 초 단위
  maneuver?: string; // 회전, 직진 등
  startLocation: LocationPoint;
  endLocation: LocationPoint;
}

export interface RouteInfo {
  totalDistance: number; // 미터 단위
  totalDuration: number; // 초 단위
  startAddress: string;
  endAddress: string;
  steps: RouteStep[];
  polyline: LocationPoint[]; // 경로를 그리기 위한 좌표 배열
}

// 두 지점 사이의 경로 계산 (실제 앱에서는 네이버/카카오/구글 등 지도 API 사용 필요)
export const calculateRoute = async (
  origin: LocationPoint,
  destination: LocationPoint
): Promise<RouteInfo> => {
  // 여기서는 실제 API 호출 대신 간단한 더미 데이터 생성
  
  // 출발지와 목적지 사이의 보간된 점들 생성
  const steps = 10; // 경로 포인트 수
  const polyline: LocationPoint[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    polyline.push({
      latitude: origin.latitude + (destination.latitude - origin.latitude) * ratio,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * ratio,
    });
  }
  
  // 두 지점 간 직선 거리 계산 (Haversine 공식)
  const distance = calculateDistance(origin, destination);
  
  // 평균 속도 60km/h로 가정한 시간 계산 (초 단위)
  const duration = (distance / 60) * 3600;
  
  // 더미 경로 단계 생성
  const routeSteps: RouteStep[] = [
    {
      instruction: '출발지에서 출발',
      distance: 0,
      duration: 0,
      maneuver: 'depart',
      startLocation: origin,
      endLocation: origin,
    },
    {
      instruction: '직진',
      distance: distance * 0.4,
      duration: duration * 0.4,
      maneuver: 'straight',
      startLocation: polyline[2],
      endLocation: polyline[4],
    },
    {
      instruction: '우회전',
      distance: distance * 0.3,
      duration: duration * 0.3,
      maneuver: 'turn-right',
      startLocation: polyline[4],
      endLocation: polyline[7],
    },
    {
      instruction: '목적지 도착',
      distance: distance * 0.3,
      duration: duration * 0.3,
      maneuver: 'arrive',
      startLocation: polyline[7],
      endLocation: destination,
    },
  ];
  
  return {
    totalDistance: distance,
    totalDuration: duration,
    startAddress: origin.name || '출발지',
    endAddress: destination.name || '목적지',
    steps: routeSteps,
    polyline,
  };
};

// 두 지점 간 거리 계산 함수 (Haversine 공식)
const calculateDistance = (
  point1: LocationPoint,
  point2: LocationPoint
): number => {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // 미터 단위
  return distance;
};

// 더미 네비게이션 음성 안내 메시지 생성
export const getVoiceGuidance = (step: RouteStep): string => {
  switch (step.maneuver) {
    case 'depart':
      return '경로 안내를 시작합니다.';
    case 'straight':
      return `${Math.round(step.distance)} 미터 직진하세요.`;
    case 'turn-right':
      return '우회전하세요.';
    case 'turn-left':
      return '좌회전하세요.';
    case 'arrive':
      return '목적지에 도착했습니다.';
    default:
      return `${Math.round(step.distance)} 미터 이동하세요.`;
  }
}; 