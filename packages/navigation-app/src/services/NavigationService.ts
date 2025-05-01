// Mobile 패키지의 NavigationService에서 필요한 타입과 함수를 가져온 통합 버전입니다.
import { GeoPoint, Route, TransportMode, RouteCalculationOptions } from '../types';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  name?: string;
}

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
  origin: GeoPoint | LocationPoint,
  destination: GeoPoint | LocationPoint,
  options: RouteCalculationOptions = {}
): Promise<Route> => {
  // 여기서는 실제 API 호출 대신 간단한 더미 데이터 생성
  
  // 출발지와 목적지 사이의 보간된 점들 생성
  const steps = 10; // 경로 포인트 수
  const coordinates: GeoPoint[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    coordinates.push({
      latitude: origin.latitude + (destination.latitude - origin.latitude) * ratio,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * ratio,
    });
  }
  
  // 두 지점 간 직선 거리 계산 (Haversine 공식)
  const distance = calculateDistance(origin, destination);
  
  // 평균 속도 계산 (옵션에 따라 다름)
  let averageSpeed = 60; // km/h
  
  if (options.preferShorterRoute) {
    averageSpeed = 50;
  } else if (options.preferFasterRoute) {
    averageSpeed = 70;
  } else if (options.preferMainRoads) {
    averageSpeed = 65;
  }
  
  if (options.considerTraffic) {
    // 교통 상황 반영 (실제로는 API에서 계산)
    averageSpeed *= 0.8;
  }
  
  // 총 시간 계산 (초 단위)
  const duration = (distance / 1000 / averageSpeed) * 3600;
  
  // 더미 경로 단계 생성
  const routeSteps: any[] = [
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
      startLocation: coordinates[2],
      endLocation: coordinates[4],
    },
    {
      instruction: '우회전',
      distance: distance * 0.3,
      duration: duration * 0.3,
      maneuver: 'turn-right',
      startLocation: coordinates[4],
      endLocation: coordinates[7],
    },
    {
      instruction: '목적지 도착',
      distance: distance * 0.3,
      duration: duration * 0.3,
      maneuver: 'arrive',
      startLocation: coordinates[7],
      endLocation: destination,
    },
  ];
  
  // Route 타입으로 변환
  const route: Route = {
    id: `route-${Date.now()}`,
    origin: {
      latitude: origin.latitude,
      longitude: origin.longitude,
    },
    destination: {
      latitude: destination.latitude,
      longitude: destination.longitude,
    },
    coordinates,
    steps: routeSteps,
    totalDistance: distance,
    totalDuration: duration,
    roadSegmentIds: [], // 실제로는 API에서 반환된 도로 세그먼트 ID
    pathPoints: coordinates, // 경로를 그리기 위한 좌표 배열 (RouteRecalculationService에서 필요)
  };
  
  return route;
};

// 두 지점 간 거리 계산 함수 (Haversine 공식)
export const calculateDistance = (
  point1: LocationPoint | GeoPoint,
  point2: LocationPoint | GeoPoint
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

// 네비게이션 음성 안내 메시지 생성
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

// Mock 내비게이션 진행 상태
export interface NavigationStatus {
  isNavigating: boolean;
  currentStep: RouteStep | null;
  currentRoute: RouteInfo | null;
  remainingDistance: number;
  remainingTime: number;
  nextManeuver: string | null;
  nextManeuverDistance: number;
}

// Mock 내비게이션 상태 초기값
export const initialNavigationStatus: NavigationStatus = {
  isNavigating: false,
  currentStep: null,
  currentRoute: null,
  remainingDistance: 0,
  remainingTime: 0,
  nextManeuver: null,
  nextManeuverDistance: 0,
};