// 좌표 포인트 타입
export interface Point {
  x: number;
  y: number;
}

// GPS 좌표 타입
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// 노드(교차로, 분기점) 타입
export interface Node {
  id: string;
  position: GeoPoint;
  name?: string;
  type: 'intersection' | 'highway_entrance' | 'highway_exit' | 'poi' | 'other';
  connections: string[]; // 연결된 도로 ID 배열
  metadata?: Record<string, any>; // 추가 메타데이터 (이름, 속성 등)
}

// 도로 세그먼트 타입
export interface RoadSegment {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  path: GeoPoint[]; // 도로의 상세 경로 좌표들
  distance: number; // 미터 단위
  speedLimit: number; // km/h 단위
  roadType: 'highway' | 'major_road' | 'minor_road' | 'local_road';
  oneWay: boolean;
  trafficLevel?: number; // 0-5 스케일 (0: 원활, 5: 정체)
  metadata?: Record<string, any>; // 추가 메타데이터 (이름, 속성 등)
}

// 경로 안내 단계 타입
export interface RouteStep {
  instruction: string;
  distance: number; // 미터 단위
  duration: number; // 초 단위
  maneuver: 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'u-turn' | 'merge' | 'exit' | 'depart' | 'arrive';
  roadName: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  roadSegmentIds: string[];
}

// 확장된 경로 안내 단계 타입 (대중교통 정보 포함)
export interface ExtendedRouteStep extends RouteStep {
  transitInfo?: TransitInfo;
  elevationGain?: number; // 고도 상승 (미터)
  elevationLoss?: number; // 고도 하강 (미터)
  surface?: 'paved' | 'unpaved' | 'gravel' | 'dirt' | 'unknown';
  accessibility?: {
    wheelchair: boolean;
    stairs: boolean;
    elevator: boolean;
  };
}

// 경로 정보 타입
export interface Route {
  id: string;
  name?: string;
  origin: GeoPoint;
  destination: GeoPoint;
  totalDistance: number; // 미터 단위
  totalDuration: number; // 초 단위
  steps: RouteStep[];
  pathPoints: GeoPoint[]; // 경로 표시용 좌표 배열
  roadSegmentIds: string[]; // 경로에 포함된 도로 세그먼트 ID 배열
}

// 경로 요약 정보
export interface RouteSummary {
  distance: number;
  duration: number;
  transportMode: TransportMode;
  departureTime?: string;
  arrivalTime?: string;
  fareAmount?: number;
  fareCurrency?: string;
  trafficLevel?: number; // 0-5
}

// 여러 대안 경로
export interface RouteAlternatives {
  mainRoute: Route;
  alternatives: Route[];
}

// 장소 타입
export interface Place {
  id: string;
  name: string;
  position: GeoPoint;
  address?: string;
  category?: string;
  rating?: number;
}

// 검색 결과 타입
export interface SearchResult {
  places: Place[];
  routes?: Route[];
}

// 내비게이션 상태 타입
export interface NavigationState {
  currentPosition?: GeoPoint;
  currentRoute?: Route;
  currentStepIndex: number;
  navigationMode: 'idle' | 'navigating' | 'arrived' | 'rerouting';
  remainingDistance: number; // 미터 단위
  remainingDuration: number; // 초 단위
  userOffRoute: boolean;
}

// 지도 뷰 타입
export interface MapView {
  center: GeoPoint;
  zoom: number;
  bearing: number; // 방향 (도 단위, 0: 북쪽)
  tilt: number; // 기울기 (도 단위)
  followUser: boolean;
}

// 설정 타입
export interface Settings {
  voiceEnabled: boolean;
  units: 'metric' | 'imperial';
  trafficEnabled: boolean;
  nightMode: boolean;
  language: string;
  zoomLevel: number;
  highContrast: boolean;
}

// 노드 타입 열거형
export enum NodeType {
  INTERSECTION = 'intersection',
  ENDPOINT = 'endpoint',
  WAYPOINT = 'waypoint',
  POI = 'poi',
}

// 도로 타입 열거형
export enum RoadType {
  HIGHWAY = 'highway',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  RESIDENTIAL = 'residential',
  SERVICE = 'service',
  PEDESTRIAN = 'pedestrian',
  PATH = 'path',
  UNKNOWN = 'unknown',
}

// 내비게이션 모드
export type NavigationMode = 'idle' | 'planning' | 'navigating';

// 회전 방향 및 안내 타입
export enum Maneuver {
  START = 'start',
  CONTINUE = 'continue',
  TURN_LEFT = 'turn-left',
  TURN_RIGHT = 'turn-right',
  SLIGHT_LEFT = 'slight-left',
  SLIGHT_RIGHT = 'slight-right',
  SHARP_LEFT = 'sharp-left',
  SHARP_RIGHT = 'sharp-right',
  U_TURN = 'u-turn',
  MERGE = 'merge',
  EXIT = 'exit',
  ROUNDABOUT = 'roundabout',
  FINISH = 'finish',
}

// 경로 계산 옵션
export interface RouteCalculationOptions {
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  preferFasterRoute?: boolean;
  preferShorterRoute?: boolean;
  preferMainRoads?: boolean;
  maxWalkingDistance?: number; // 미터 단위
  considerTraffic?: boolean;
  transportMode?: TransportMode;
  departureTime?: Date;
  arrivalTime?: Date;
  alternatives?: boolean;
  wheelchair?: boolean;
  algorithm?: 'dijkstra' | 'astar' | 'bidirectional'; // 경로 계산 알고리즘
  routeType?: 'fastest' | 'shortest' | 'balanced'; // 경로 유형
}

// 이동 수단 타입
export enum TransportMode {
  CAR = 'car',
  WALKING = 'walking',
  BICYCLING = 'bicycling',
  TRANSIT = 'transit',
  MOTORCYCLE = 'motorcycle',
  TRUCK = 'truck',
}

// 대중교통 정보
export interface TransitInfo {
  type: 'bus' | 'subway' | 'train' | 'tram' | 'ferry';
  line: string;
  name?: string;
  color?: string;
  departureTime: string;
  arrivalTime: string;
  stops: number;
  headsign?: string;
}

// 경로 계산 상태
export enum RouteCalculationStatus {
  IDLE = 'idle',
  CALCULATING = 'calculating',
  SUCCESS = 'success',
  FAILED = 'failed',
}