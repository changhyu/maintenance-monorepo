import { GeoPoint } from '../../types';

// 도로 세그먼트 (내보내기 추가)
export interface RoadSegment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  path: GeoPoint[];
  length: number; // 미터 단위
  estimatedTime: number; // 초 단위
  speedLimit?: number; // km/h 단위
  scenicValue: number; // 0-1, 1이 가장 경치가 좋음
}

// 도로 노드 타입 (내보내기 추가)
export interface RoadNode {
  id: string;
  location: GeoPoint;
  connections: string[]; // 연결된 세그먼트 ID 목록
}

// 기본 경로 타입 (내보내기 추가)
export interface Route {
  id: string;
  path: GeoPoint[];
  segments: RoadSegment[];
  nodes: string[];
  distance: number;
  estimatedTime: number;
}

// 경로 우선순위 열거형
export enum RoutePriority {
  FASTEST = 'fastest',         // 가장 빠른 경로
  SHORTEST = 'shortest',       // 최단 거리 경로
  LEAST_TRAFFIC = 'least_traffic', // 교통량이 적은 경로
  SCENIC = 'scenic',           // 경관이 좋은 경로
  BALANCED = 'balanced'        // 균형 있는 경로
}

// 대체 경로 유형
export interface AlternativeRoute {
  id: string;            // 경로 ID
  name: string;          // 경로 이름 (예: "빠른 경로", "우회 경로" 등)
  path: GeoPoint[];      // 전체 경로 좌표
  segments: RoadSegment[]; // 경로를 구성하는 도로 세그먼트
  nodes: string[];       // 경로의 노드 ID 목록 (추가)
  distance: number;      // 총 거리 (미터)
  estimatedTime: number; // 예상 소요 시간 (초)
  trafficLevel: number;  // 교통량 수준 (0-1, 1이 가장 혼잡)
  priority: RoutePriority; // 경로 우선순위 (추가)
}

// 대체 경로 계산 결과
export interface RouteResult {
  mainRoute: AlternativeRoute;       // 메인 경로
  alternatives: AlternativeRoute[];  // 대체 경로들
}

// 경로 비교 결과
export interface RouteComparison {
  originalRoute: AlternativeRoute;      // 원본 경로
  alternativeRoute: AlternativeRoute;   // 대체 경로
  timeDifference: number;               // 시간 차이 (+ 길어짐, - 짧아짐, 분 단위)
  distanceDifference: number;           // 거리 차이 (+ 길어짐, - 짧아짐, 미터 단위)
  trafficImprovement: number;           // 교통 상황 개선도 (0-1, 1이 최대 개선)
}