import { notificationService } from './notificationService';
import { ApiClient } from '../../../api-client/src/client';
import { NotificationCreate, NotificationType } from '../types/notification';

/**
 * 지도 이벤트 타입 열거형
 */
export enum MapEventType {
  VEHICLE_MOVED = 'vehicle_moved',
  GEOFENCE_ENTER = 'geofence_enter',
  GEOFENCE_EXIT = 'geofence_exit',
  GEOFENCE_DWELL = 'geofence_dwell',
  ROUTE_DEVIATION = 'route_deviation',
  BOUNDARY_EXIT = 'boundary_exit',
  BOUNDARY_ENTER = 'boundary_enter'
}

/**
 * 지도 이벤트 인터페이스
 */
export interface MapEvent {
  id: string;
  type: MapEventType;
  timestamp: Date;
  vehicleId?: string;
  location?: Coordinates;
  details?: Record<string, any>;
}

/**
 * 좌표 인터페이스
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * GoogleMaps 형태의 좌표 인터페이스
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * 위치 인터페이스
 */
export interface Location extends Coordinates {
  address: string;
  name?: string;
  placeId?: string;
}

/**
 * 정비소 위치 인터페이스
 */
export interface ShopLocation extends Location {
  shopId: string;
  rating: number;
  services: string[];
  openHours: string;
  contactNumber: string;
  website?: string;
}

/**
 * 차량 위치 인터페이스
 */
export interface VehicleLocation extends Location {
  vehicleId: string;
  lastUpdated: string;
  status: 'moving' | 'parked' | 'maintenance' | 'unknown';
  speed?: number;
  heading?: number;
  timestamp?: Date; // 모니터링에 사용
}

/**
 * 거리 단위 열거형
 */
export type DistanceUnit = 'km' | 'mi';

/**
 * 검색 반경 인터페이스
 */
export interface SearchRadius {
  center: Coordinates;
  radius: number;
  unit: DistanceUnit;
}

/**
 * 지도 경계 인터페이스
 */
export interface MapBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

/**
 * 경로 단계 인터페이스
 */
export interface RouteStep {
  startLocation: Coordinates;
  endLocation: Coordinates;
  distance: number;
  duration: number;
  instructions: string;
  maneuver?: string;
}

/**
 * 경로 인터페이스
 */
export interface Route {
  origin: Location;
  destination: Location;
  distance: number;
  duration: number;
  steps: RouteStep[];
  polyline: string; // 인코딩된 경로 라인
}

/**
 * 지오펜스 유형 열거형
 */
export enum GeofenceType {
  CIRCLE = 'circle',
  POLYGON = 'polygon',
  RECTANGLE = 'rectangle'
}

/**
 * 지오펜스 알림 유형 열거형
 */
export enum GeofenceAlertType {
  ENTRY = 'entry',
  EXIT = 'exit',
  DWELL = 'dwell'
}

/**
 * 지오펜스 인터페이스
 */
export interface Geofence {
  id: string;
  name: string;
  description?: string;
  type: GeofenceType;
  coordinates: Coordinates[] | Coordinates;
  radius?: number; // Circle 타입의 경우 필요
  alerts: GeofenceAlertType[];
  color?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  vehicleIds?: string[]; // 적용할 차량 ID 목록
  userId?: string; // 지오펜스 소유자/생성자 ID
}

/**
 * 지오펜스 이벤트 인터페이스
 */
export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  vehicleId: string;
  type: GeofenceAlertType;
  timestamp: string;
  location: Coordinates;
}

/**
 * 지오펜스 생성 인터페이스
 */
export interface GeofenceCreate {
  name: string;
  description?: string;
  type: GeofenceType;
  coordinates: Coordinates[] | Coordinates;
  radius?: number;
  alerts: GeofenceAlertType[];
  color?: string;
  vehicleIds?: string[];
}

/**
 * 지오펜스 이벤트 관련 개선된 타입 정의
 */
export interface GeofenceEventDetails {
  vehicleId: string;
  geofenceId: string;
  timestamp: Date;
  eventType: 'ENTER' | 'EXIT' | 'DWELL';
  location: LatLng;
  speed?: number;
  direction?: number;
}

export interface GeofenceEventFilter {
  vehicleIds?: string[];
  geofenceIds?: string[];
  startDate?: Date;
  endDate?: Date;
  eventTypes?: Array<'ENTER' | 'EXIT' | 'DWELL'>;
  limit?: number;
  offset?: number;
}

export interface GeofenceMonitoringOptions {
  refreshInterval?: number; // 밀리초 단위
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
  alertOnDwell?: boolean;
  dwellThreshold?: number; // 밀리초 단위, 특정 시간 이상 체류 시 알림
  notificationChannels?: Array<'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEM'>;
}

export interface GeofenceOptions {
  notifyOnEntry?: boolean;
  notifyOnExit?: boolean;
  notifyOnDwell?: boolean;
  dwellTime?: number; // 머무는 시간 (밀리초)
  includeSpeedAlerts?: boolean; // 속도 알림 포함 여부
  maxSpeed?: number; // 최대 속도 제한 (km/h)
}

export interface MapBoundary {
  id: string;
  name: string;
  description?: string;
  bounds: {
    north: number; // 북쪽 위도
    south: number; // 남쪽 위도
    east: number; // 동쪽 경도
    west: number; // 서쪽 경도
  };
  userId: string;
  createdAt: Date;
  active: boolean;
  options: MapBoundaryOptions;
}

export interface MapBoundaryOptions {
  notifyOnExit?: boolean;
  reentryDelay?: number; // 재진입 지연시간 (분)
  notifyContacts?: string[]; // 알림을 받을 연락처 ID 목록
}

export interface MapBoundaryEventDetails {
  boundaryId: string;
  boundaryName: string;
  vehicleId: string;
  vehicleName: string;
  timestamp: Date;
  eventType: 'exit' | 'reentry';
  location: Coordinates;
}

/**
 * 차량 상태 정보 인터페이스
 */
export interface VehicleStatus {
  vehicleId: string;
  status: 'operational' | 'maintenance' | 'broken' | 'inactive';
  healthScore: number; // 0-100 사이의 값
  fuelLevel?: number; // 백분율
  batteryLevel?: number; // 백분율 (전기 차량의 경우)
  mileage: number;
  nextServiceDate?: string;
  alerts?: string[];
  maintenanceItems?: Array<{
    id: string;
    name: string;
    status: 'good' | 'warning' | 'critical';
    dueDate?: string;
  }>;
  lastUpdated: string;
}

/**
 * 지도 서비스 클래스
 */
export class MapService {
  private apiClient: ApiClient;
  private readonly basePath: string = '/maps';
  private readonly geofences: Geofence[] = [];
  private readonly activeGeofences: Geofence[] = [];
  private monitoringIntervals: Record<string, number> = {};
  private activeVehicleLocations: Record<string, { lat: number; lng: number; timestamp: Date }> =
    {};
  private lastGeofenceEvents: Record<string, Record<string, GeofenceEventDetails>> = {};
  private activeBoundaries: MapBoundary[] = [];
  private lastBoundaryEvents: Record<string, Record<string, MapBoundaryEventDetails>> = {};
  private readonly notificationService = notificationService;

  // 지오펜스 모니터링 활성화 상태
  private monitoringActive: boolean = false;

  /**
   * 생성자
   * @param apiClient API 클라이언트
   */
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 주소로 위치 검색
   * @param address 주소 또는 장소명
   * @returns 위치 목록
   */
  async searchLocation(address: string): Promise<Location[]> {
    try {
      const response = await this.apiClient.get<Location[]>(`${this.basePath}/geocode`, {
        params: { address }
      });
      return response;
    } catch (error) {
      console.error('[mapService] 위치 검색 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 좌표로 주소 검색 (역지오코딩)
   * @param coordinates 좌표
   * @returns 주소 정보
   */
  async reverseGeocode(coordinates: Coordinates): Promise<Location | null> {
    try {
      const response = await this.apiClient.get<Location>(`${this.basePath}/reverse-geocode`, {
        params: coordinates
      });
      return response;
    } catch (error) {
      console.error('[mapService] 역지오코딩 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 특정 반경 내 정비소 검색
   * @param search 검색 반경 정보
   * @returns 정비소 위치 목록
   */
  async findShopsNearby(search: SearchRadius): Promise<ShopLocation[]> {
    try {
      const response = await this.apiClient.post<ShopLocation[]>(`${this.basePath}/shops/search/nearby`, search);
      return response;
    } catch (error) {
      console.error('[mapService] 주변 정비소 검색 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 경계 영역 내 정비소 검색
   * @param bounds 지도 경계
   * @returns 정비소 위치 목록
   */
  async findShopsInBounds(bounds: MapBounds): Promise<ShopLocation[]> {
    try {
      const response = await this.apiClient.post<ShopLocation[]>('/api/shops/search/bounds', bounds);
      return response;
    } catch (error) {
      console.error('범위 내 정비소 검색 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 차량 현재 위치 조회
   * @param vehicleId 차량 ID
   * @returns 차량 위치
   */
  async getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null> {
    try {
      const response = await this.apiClient.get<VehicleLocation>(`${this.basePath}/vehicles/${vehicleId}/location`);
      return response;
    } catch (error) {
      console.error(`차량 ID ${vehicleId} 위치 조회 중 오류 발생:`, error);
      return null;
    }
  }

  /**
   * 사용자의 차량 목록 위치 조회
   * @param userId 사용자 ID
   * @returns 차량 위치 목록
   */
  async getUserVehiclesLocations(userId: string): Promise<VehicleLocation[]> {
    try {
      const response = await this.apiClient.get<VehicleLocation[]>(`/api/users/${userId}/vehicles/locations`);
      return response;
    } catch (error) {
      console.error(`사용자 ID ${userId}의 차량 위치 조회 중 오류 발생:`, error);
      return [];
    }
  }

  /**
   * 위치 간 경로 계산
   * @param origin 출발지 좌표
   * @param destination 목적지 좌표
   * @param waypoints 경유지 좌표 목록 (선택)
   * @returns 경로 정보
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[]
  ): Promise<Route | null> {
    try {
      const response = await this.apiClient.post<Route>('/api/routes/calculate', {
        origin,
        destination,
        waypoints
      });
      return response;
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 두 위치 간 거리 계산
   * @param origin 출발지 좌표
   * @param destination 목적지 좌표
   * @param unit 거리 단위 (기본값: 킬로미터)
   * @returns 거리 (단위에 따라 km 또는 miles)
   */
  async calculateDistance(
    origin: Coordinates,
    destination: Coordinates,
    unit: DistanceUnit = 'km'
  ): Promise<number> {
    try {
      const response = await this.apiClient.post<{ distance: number }>(`${this.basePath}/distance`, {
        origin,
        destination,
        unit
      });
      return response.distance;
    } catch (error) {
      console.error('[mapService] 거리 계산 중 오류 발생:', error);
      // Fallback: 직선 거리 계산
      return this.calculateHaversineDistance(origin, destination, unit);
    }
  }

  /**
   * 정비소 상세 정보 조회
   * @param shopId 정비소 ID
   * @returns 정비소 위치 및 상세 정보
   */
  async getShopDetails(shopId: string): Promise<ShopLocation | null> {
    try {
      const response = await this.apiClient.get<ShopLocation>(`/api/shops/${shopId}`);
      return response;
    } catch (error) {
      console.error(`정비소 ID ${shopId} 상세 정보 조회 중 오류 발생:`, error);
      return null;
    }
  }

  /**
   * 차량에서 가장 가까운 정비소 검색
   * @param vehicleId 차량 ID
   * @param limit 결과 제한 수 (기본값: 5)
   * @returns 가까운 정비소 목록
   */
  async findNearestShopsToVehicle(vehicleId: string, limit: number = 5): Promise<ShopLocation[]> {
    try {
      const response = await this.apiClient.get<ShopLocation[]>(
        `${this.basePath}/vehicles/${vehicleId}/nearest-shops`,
        {
          params: { limit }
        }
      );
      return response;
    } catch (error) {
      console.error(
        `[mapService] 차량 ID ${vehicleId}에서 가까운 정비소 검색 중 오류 발생:`,
        error
      );
      return [];
    }
  }

  /**
   * 특정 서비스를 제공하는 주변 정비소 검색
   * @param search 검색 반경 정보
   * @param services 필요한 서비스 목록
   * @returns 정비소 위치 목록
   */
  async findShopsByServices(search: SearchRadius, services: string[]): Promise<ShopLocation[]> {
    try {
      const response = await this.apiClient.post<ShopLocation[]>(`${this.basePath}/shops/by-services`, {
        ...search,
        services
      });
      return response;
    } catch (error) {
      console.error('[mapService] 서비스별 정비소 검색 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 정비소 검색 및 정렬
   * @param location 현재 위치
   * @param query 검색어
   * @param filters 필터 (서비스, 평점 등)
   * @param sortBy 정렬 기준 ('distance', 'rating', 'name')
   * @returns 정비소 목록
   */
  async searchShops(
    location: Coordinates,
    query?: string,
    filters?: { services?: string[]; minRating?: number },
    sortBy: 'distance' | 'rating' | 'name' = 'distance'
  ): Promise<ShopLocation[]> {
    try {
      const response = await this.apiClient.post<ShopLocation[]>(`${this.basePath}/shops/search`, {
        location,
        query,
        filters,
        sortBy
      });
      return response;
    } catch (error) {
      console.error('[mapService] 정비소 검색 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 지오펜스 생성
   * @param geofence 지오펜스 생성 데이터
   * @returns 생성된 지오펜스
   */
  async createGeofence(geofence: GeofenceCreate): Promise<Geofence | null> {
    try {
      const response = await this.apiClient.post<Geofence>(`${this.basePath}/geofences`, geofence);
      return response;
    } catch (error) {
      console.error('[mapService] 지오펜스 생성 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 지오펜스 목록 조회
   * @param active 활성 상태 필터 (선택)
   * @returns 지오펜스 목록
   */
  async getGeofences(active?: boolean): Promise<Geofence[]> {
    try {
      const response = await this.apiClient.get<Geofence[]>(`${this.basePath}/geofences`, {
        params: { active }
      });
      return response;
    } catch (error) {
      console.error('[mapService] 지오펜스 목록 조회 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 지오펜스 상세 조회
   * @param geofenceId 지오펜스 ID
   * @returns 지오펜스 상세 정보
   */
  async getGeofence(geofenceId: string): Promise<Geofence | null> {
    try {
      const response = await this.apiClient.get<Geofence>(`${this.basePath}/geofences/${geofenceId}`);
      return response;
    } catch (error) {
      console.error(`[mapService] 지오펜스 ID ${geofenceId} 조회 중 오류 발생:`, error);
      return null;
    }
  }

  /**
   * 지오펜스 업데이트
   * @param geofenceId 지오펜스 ID
   * @param updates 업데이트할 데이터
   * @returns 업데이트된 지오펜스
   */
  async updateGeofence(
    geofenceId: string,
    updates: Partial<GeofenceCreate>
  ): Promise<Geofence | null> {
    try {
      const response = await this.apiClient.put<Geofence>(
        `${this.basePath}/geofences/${geofenceId}`,
        updates
      );
      return response;
    } catch (error) {
      console.error(`[mapService] 지오펜스 ID ${geofenceId} 업데이트 중 오류 발생:`, error);
      return null;
    }
  }

  /**
   * 지오펜스 삭제
   * @param geofenceId 지오펜스 ID
   * @returns 성공 여부
   */
  async deleteGeofence(geofenceId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`${this.basePath}/geofences/${geofenceId}`);
      return true;
    } catch (error) {
      console.error(`[mapService] 지오펜스 ID ${geofenceId} 삭제 중 오류 발생:`, error);
      return false;
    }
  }

  /**
   * 차량에 지오펜스 할당
   * @param geofenceId 지오펜스 ID
   * @param vehicleIds 차량 ID 목록
   * @returns 성공 여부
   */
  async assignGeofenceToVehicles(geofenceId: string, vehicleIds: string[]): Promise<boolean> {
    try {
      await this.apiClient.post(`${this.basePath}/geofences/${geofenceId}/assign`, { vehicleIds });
      return true;
    } catch (error) {
      console.error(`[mapService] 지오펜스 ID ${geofenceId} 차량 할당 중 오류 발생:`, error);
      return false;
    }
  }

  /**
   * 차량에서 지오펜스 해제
   * @param geofenceId 지오펜스 ID
   * @param vehicleIds 차량 ID 목록
   * @returns 성공 여부
   */
  async unassignGeofenceFromVehicles(geofenceId: string, vehicleIds: string[]): Promise<boolean> {
    try {
      await this.apiClient.post(`${this.basePath}/geofences/${geofenceId}/unassign`, {
        vehicleIds
      });
      return true;
    } catch (error) {
      console.error(`[mapService] 지오펜스 ID ${geofenceId} 차량 해제 중 오류 발생:`, error);
      return false;
    }
  }

  /**
   * 차량 지오펜스 이벤트 조회
   * @param vehicleId 차량 ID
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   * @returns 지오펜스 이벤트 목록
   */
  async getVehicleGeofenceEvents(
    vehicleId: string,
    startDate: string,
    endDate: string
  ): Promise<GeofenceEvent[]> {
    try {
      const response = await this.apiClient.get<GeofenceEvent[]>(
        `${this.basePath}/vehicles/${vehicleId}/geofence-events`,
        {
          params: { startDate, endDate }
        }
      );
      return response;
    } catch (error) {
      console.error(`[mapService] 차량 ID ${vehicleId} 지오펜스 이벤트 조회 중 오류 발생:`, error);
      return [];
    }
  }

  /**
   * 특정 지오펜스의 이벤트 조회
   * @param geofenceId 지오펜스 ID
   * @param startDate 시작 날짜 (선택)
   * @param endDate 종료 날짜 (선택)
   * @returns 지오펜스 이벤트 목록
   */
  async getGeofenceEvents(
    geofenceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<GeofenceEventDetails[]> {
    try {
      // 실제 구현에서는 API 호출
      return []; // 임시 빈 배열 반환
    } catch (error) {
      console.error('지오펜스 이벤트 목록 조회 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 좌표가 지오펜스 내에 있는지 확인
   * @param coordinates 확인할 좌표
   * @param geofence 지오펜스 객체 또는 ID
   * @returns 포함 여부
   */
  async isPointInGeofence(coordinates: Coordinates, geofence: Geofence | string): Promise<boolean> {
    try {
      if (typeof geofence === 'string') {
        // ID가 전달된 경우 API로 확인
        const response = await this.apiClient.post<{ isInside: boolean }>(
          `${this.basePath}/geofences/${geofence}/check`,
          coordinates
        );
        return response.isInside;
      } else {
        // 객체가 전달된 경우 클라이언트에서 계산
        switch (geofence.type) {
          case GeofenceType.CIRCLE: {
            // 원형 지오펜스
            const center = Array.isArray(geofence.coordinates)
              ? geofence.coordinates[0]
              : geofence.coordinates;
            const distance = this.calculateHaversineDistance(
              center,
              coordinates,
              'km'
            );
            return distance <= (geofence.radius || 0) / 1000; // radius를 km로 변환
          }
          case GeofenceType.POLYGON: {
            // 다각형 지오펜스
            if (!Array.isArray(geofence.coordinates)) {
              return false;
            }
            return this.isPointInPolygon(coordinates, geofence.coordinates);
          }
          default:
            return false;
        }
      }
    } catch (error) {
      console.error('[mapService] 지오펜스 포함 여부 확인 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 두 좌표 간 거리 계산 (Haversine 공식)
   * @param point1 좌표 1
   * @param point2 좌표 2
   * @param unit 거리 단위
   * @returns 거리
   */
  private calculateHaversineDistance(
    point1: Coordinates,
    point2: Coordinates,
    unit: DistanceUnit = 'km'
  ): number {
    const R = unit === 'km' ? 6371 : 3959; // 지구 반경 (km 또는 마일)
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 각도를 라디안으로 변환
   * @param degrees 각도
   * @returns 라디안
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 좌표가 다각형 내에 있는지 확인 (Ray Casting 알고리즘)
   * @param point 좌표
   * @param polygon 다각형 좌표 배열
   * @returns 포함 여부
   */
  private isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > point.latitude !== yj > point.latitude &&
        point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * 지오펜스 실시간 모니터링 시작
   * @param options 모니터링 옵션
   * @returns 모니터링 성공 여부
   */
  startGeofenceMonitoring(options: GeofenceMonitoringOptions = {}): boolean {
    if (this.monitoringActive) {
      console.warn('[mapService] 지오펜스 모니터링이 이미 활성화되어 있습니다.');
      return false;
    }

    const interval = options.refreshInterval || 30000; // 기본 30초

    try {
      // 모든 활성 차량 모니터링 시작
      this.monitoringIntervals['global'] = window.setInterval(async () => {
        try {
          // 활성 차량 위치 가져오기
          const vehicles = await this.apiClient.get<Array<{
            id: string;
            latitude: number;
            longitude: number;
            speed?: number;
            heading?: number;
          }>>('/vehicles/active-locations');
          const activeGeofences = await this.getGeofences(true);

          // 각 차량에 대해 지오펜스 검사
          for (const vehicle of vehicles) {
            const vehicleId = vehicle.id;
            const currentLocation: LatLng = {
              lat: vehicle.latitude,
              lng: vehicle.longitude
            };
            const timestamp = new Date();

            // 이전 위치 기록 가져오기
            const previousLocation = this.activeVehicleLocations[vehicleId];
            this.activeVehicleLocations[vehicleId] = {
              ...currentLocation,
              timestamp
            };

            // 모든 지오펜스에 대해 검사
            for (const geofence of activeGeofences) {
              const geofenceId = geofence.id;
              // 이전 위치 존재 시 해당 위치가 지오펜스 내부에 있었는지 확인
              const wasInside = previousLocation
                ? await this.isPointInGeofence(
                    this.latLngToCoordinates({
                      lat: previousLocation.lat,
                      lng: previousLocation.lng
                    }),
                    geofence
                  )
                : false;
              const isInside = await this.isPointInGeofence(
                this.latLngToCoordinates(currentLocation),
                geofence
              );

              // 지오펜스 출입 이벤트 생성
              if (!wasInside && isInside) {
                // 진입 이벤트
                const eventDetails: GeofenceEventDetails = {
                  vehicleId,
                  geofenceId,
                  timestamp,
                  eventType: 'ENTER',
                  location: currentLocation,
                  speed: vehicle.speed,
                  direction: vehicle.heading
                };

                this.lastGeofenceEvents[vehicleId] = this.lastGeofenceEvents[vehicleId] || {};
                this.lastGeofenceEvents[vehicleId][geofenceId] = eventDetails;

                // 이벤트 저장 및 알림
                this.recordGeofenceEvent(eventDetails);
                if (options.alertOnEnter) {
                  this.sendGeofenceAlert(eventDetails, options.notificationChannels).catch(err => {
                    console.error('[mapService] 지오펜스 알림 전송 실패:', err);
                  });
                }
              } else if (wasInside && !isInside) {
                // 이탈 이벤트
                const eventDetails: GeofenceEventDetails = {
                  vehicleId,
                  geofenceId,
                  timestamp,
                  eventType: 'EXIT',
                  location: currentLocation,
                  speed: vehicle.speed,
                  direction: vehicle.heading
                };

                this.lastGeofenceEvents[vehicleId] = this.lastGeofenceEvents[vehicleId] || {};
                delete this.lastGeofenceEvents[vehicleId][geofenceId];

                // 이벤트 저장 및 알림
                this.recordGeofenceEvent(eventDetails);
                if (options.alertOnExit) {
                  this.sendGeofenceAlert(eventDetails, options.notificationChannels).catch(err => {
                    console.error('[mapService] 지오펜스 알림 전송 실패:', err);
                  });
                }
              } else if (isInside && options.dwellThreshold) {
                // 체류 이벤트 검사
                const lastEvent = this.lastGeofenceEvents[vehicleId]?.[geofenceId];
                if (lastEvent && lastEvent.eventType === 'ENTER') {
                  const dwellTime = timestamp.getTime() - lastEvent.timestamp.getTime();
                  if (dwellTime >= options.dwellThreshold) {
                    // 체류 임계값 초과
                    const eventDetails: GeofenceEventDetails = {
                      vehicleId,
                      geofenceId,
                      timestamp,
                      eventType: 'DWELL',
                      location: currentLocation,
                      speed: vehicle.speed,
                      direction: vehicle.heading
                    };

                    // 체류 이벤트로 업데이트
                    this.lastGeofenceEvents[vehicleId][geofenceId] = eventDetails;

                    // 이벤트 저장 및 알림
                    this.recordGeofenceEvent(eventDetails);
                    if (options.alertOnDwell) {
                      this.sendGeofenceAlert(eventDetails, options.notificationChannels).catch(
                        err => {
                          console.error('[mapService] 지오펜스 알림 전송 실패:', err);
                        }
                      );
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('[mapService] 지오펜스 모니터링 중 오류 발생:', error);
        }
      }, interval);

      this.monitoringActive = true;
      return true;
    } catch (error) {
      console.error('[mapService] 지오펜스 모니터링 시작 실패:', error);
      return false;
    }
  }

  /**
   * 지오펜스 실시간 모니터링 중지
   * @returns 중지 성공 여부
   */
  stopGeofenceMonitoring(): boolean {
    if (!this.monitoringActive) {
      console.warn('[mapService] 지오펜스 모니터링이 이미 비활성화되어 있습니다.');
      return false;
    }

    try {
      // 모든 모니터링 간격 정리
      Object.values(this.monitoringIntervals).forEach(intervalId => {
        window.clearInterval(intervalId);
      });

      this.monitoringIntervals = {};
      this.monitoringActive = false;
      return true;
    } catch (error) {
      console.error('[mapService] 지오펜스 모니터링 중지 실패:', error);
      return false;
    }
  }

  /**
   * 지오펜스 출입 이벤트 기록
   * @param eventDetails 이벤트 상세 정보
   * @returns 저장 성공 여부
   */
  private async recordGeofenceEvent(eventDetails: GeofenceEventDetails): Promise<boolean> {
    try {
      await this.apiClient.post('/geofence-events', eventDetails);
      return true;
    } catch (error) {
      console.error('[mapService] 지오펜스 이벤트 기록 실패:', error);
      return false;
    }
  }

  /**
   * 지오펜스 알림 전송
   * @param eventDetails 이벤트 상세 정보
   * @param channels 알림 채널 목록
   * @returns 알림 전송 성공 여부
   */
  private async sendGeofenceAlert(
    eventDetails: GeofenceEventDetails,
    channels: Array<'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEM'> = ['SYSTEM']
  ): Promise<boolean> {
    try {
      // 지오펜스 및 차량 정보 가져오기
      const geofence = await this.getGeofence(eventDetails.geofenceId);
      const vehicleResponse = await this.apiClient.get<{ id: string; name?: string }>(`/vehicles/${eventDetails.vehicleId}`);
      const vehicle = vehicleResponse;

      if (!geofence || !vehicle) {
        console.error(
          '[mapService] 지오펜스 알림 전송 실패: 지오펜스 또는 차량 정보를 찾을 수 없습니다.'
        );
        return false;
      }

      // 이벤트 타입에 따른 메시지 생성
      let message = '';
      switch (eventDetails.eventType) {
        case 'ENTER':
          message = `차량 ${vehicle.name || vehicle.id}이(가) 지오펜스 ${geofence.name}에 진입했습니다.`;
          break;
        case 'EXIT':
          message = `차량 ${vehicle.name || vehicle.id}이(가) 지오펜스 ${geofence.name}에서 이탈했습니다.`;
          break;
        case 'DWELL':
          message = `차량 ${vehicle.name || vehicle.id}이(가) 지오펜스 ${geofence.name}에 장기간 체류 중입니다.`;
          break;
      }

      // 각 채널별 알림 전송
      const notificationPromises = channels.map(channel => {
        const notificationData = {
          type: 'GEOFENCE_ALERT',
          title: `지오펜스 알림: ${geofence.name}`,
          message,
          data: eventDetails,
          channel,
          priority: 'HIGH',
          userId: geofence.userId || 'system' // 지오펜스 소유자에게 알림
        };

        return this.apiClient.post('/notifications', notificationData);
      });

      await Promise.all(notificationPromises);
      return true;
    } catch (error) {
      console.error('[mapService] 지오펜스 알림 전송 실패:', error);
      return false;
    }
  }

  /**
   * 특정 차량의 지오펜스 출입 이벤트 구독하기
   * @param vehicleId 차량 ID
   * @param callback 이벤트 발생 시 호출될 콜백 함수
   * @returns 구독 해제 함수
   */
  subscribeToGeofenceEvents(
    vehicleId: string,
    callback: (event: GeofenceEventDetails) => void
  ): () => void {
    // 웹소켓 연결 또는 폴링을 통한 이벤트 구독 로직
    // 여기서는 간단한 폴링으로 구현
    const intervalId = window.setInterval(async () => {
      try {
        const lastEvents = await this.getGeofenceEvents(vehicleId, undefined, undefined);

        // 마지막 이벤트 전달
        if (lastEvents.length > 0) {
          callback(lastEvents[0]);
        }
      } catch (error) {
        console.error(`[mapService] 지오펜스 이벤트 구독 중 오류 (차량 ID: ${vehicleId}):`, error);
      }
    }, 10000); // 10초마다 확인

    // 구독 해제 함수 반환
    return () => {
      window.clearInterval(intervalId);
    };
  }

  /**
   * 지오펜스 대량 가져오기 및 배치 처리
   * @param geofences 지오펜스 배열
   * @returns 생성된 지오펜스 ID 배열
   */
  async bulkImportGeofences(geofences: Omit<Geofence, 'id'>[]): Promise<string[]> {
    try {
      const response = await this.apiClient.post<{ ids: string[] }>('/geofences/bulk', { geofences });
      return response.ids;
    } catch (error) {
      console.error('[mapService] 지오펜스 대량 가져오기 실패:', error);
      return [];
    }
  }

  /**
   * 지오펜스 내보내기 (GeoJSON 형식)
   * @param geofenceIds 내보낼 지오펜스 ID 배열
   * @returns GeoJSON 형식의 지오펜스 데이터
   */
  async exportGeofencesToGeoJSON(geofenceIds?: string[]): Promise<any> {
    try {
      const allGeofences = geofenceIds
        ? await Promise.all(geofenceIds.map(id => this.getGeofence(id)))
        : await this.getGeofences(true);

      // GeoJSON FeatureCollection 형식으로 변환
      const features = allGeofences
        .map(geofence => {
          if (!geofence) return null;

          // 지오펜스 타입에 따라 다른 geometry 생성
          let geometry;
          if (geofence.type === GeofenceType.CIRCLE) {
            const center = Array.isArray(geofence.coordinates)
              ? geofence.coordinates[0]
              : geofence.coordinates;

            geometry = {
              type: 'Point',
              coordinates: [center.longitude, center.latitude]
            };
          } else if (geofence.type === GeofenceType.POLYGON) {
            // 폴리곤의 경우 첫 번째와 마지막 좌표가 동일해야 함
            if (!Array.isArray(geofence.coordinates)) {
              return null;
            }

            const geoCoords = [...geofence.coordinates];
            if (
              geoCoords.length > 0 &&
              (geoCoords[0].latitude !== geoCoords[geoCoords.length - 1].latitude ||
                geoCoords[0].longitude !== geoCoords[geoCoords.length - 1].longitude)
            ) {
              geoCoords.push(geoCoords[0]);
            }

            geometry = {
              type: 'Polygon',
              coordinates: [geoCoords.map(v => [v.longitude, v.latitude])]
            };
          } else {
            return null;
          }

          return {
            type: 'Feature',
            geometry,
            properties: {
              id: geofence.id,
              name: geofence.name,
              description: geofence.description,
              type: geofence.type,
              radius: geofence.radius,
              color: geofence.color,
              alertSettings: geofence.alerts,
              createdAt: geofence.createdAt,
              userId: geofence.userId || 'unknown' // 생성자 ID 필드
            }
          };
        })
        .filter(Boolean);

      return {
        type: 'FeatureCollection',
        features
      };
    } catch (error) {
      console.error('[mapService] 지오펜스 GeoJSON 내보내기 실패:', error);
      return { type: 'FeatureCollection', features: [] };
    }
  }

  /**
   * 지오펜스 분석 - 차량 방문 빈도
   * @param geofenceId 지오펜스 ID
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   * @returns 차량별 방문 횟수
   */
  async analyzeGeofenceVisits(
    geofenceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ vehicleId: string; vehicleName: string; visitCount: number }>> {
    try {
      const events = await this.getGeofenceEvents(geofenceId, startDate, endDate);

      // 차량별 방문 횟수 집계
      const visitCountMap: Record<string, number> = {};
      events.forEach(event => {
        visitCountMap[event.vehicleId] = (visitCountMap[event.vehicleId] || 0) + 1;
      });

      // 차량 정보 가져오기
      const vehicleInfoPromises = Object.keys(visitCountMap).map(async vehicleId => {
        try {
          const response = await this.apiClient.get<{ name?: string }>(`/vehicles/${vehicleId}`);
          return {
            vehicleId,
            vehicleName: response.name || vehicleId,
            visitCount: visitCountMap[vehicleId]
          };
        } catch (error) {
          return {
            vehicleId,
            vehicleName: vehicleId,
            visitCount: visitCountMap[vehicleId]
          };
        }
      });

      const results = await Promise.all(vehicleInfoPromises);
      return results.sort((a, b) => b.visitCount - a.visitCount); // 방문 횟수 내림차순 정렬
    } catch (error) {
      console.error(`[mapService] 지오펜스 ID ${geofenceId} 방문 분석 실패:`, error);
      return [];
    }
  }

  /**
   * 차량의 특정 지역 체류 시간 분석
   * @param vehicleId 차량 ID
   * @param geofenceId 지오펜스 ID
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   * @returns 체류 시간 분석 결과
   */
  async analyzeVehicleDwellTime(
    vehicleId: string,
    geofenceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDwellTimeMs: number;
    averageDwellTimeMs: number;
    dwellSessions: Array<{
      enterTime: Date;
      exitTime: Date;
      durationMs: number;
    }>;
  }> {
    try {
      // 모든 출입 이벤트 가져오기
      const events = await this.getGeofenceEvents(geofenceId, startDate, endDate);

      // 시간순 정렬
      events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const dwellSessions: Array<{
        enterTime: Date;
        exitTime: Date;
        durationMs: number;
      }> = [];

      let enterTime: Date | null = null;

      // 체류 시간 계산
      for (const event of events) {
        if (event.eventType === 'ENTER') {
          if (enterTime === null) {
            enterTime = event.timestamp;
          }
        } else if (event.eventType === 'EXIT' && enterTime !== null) {
          const exitTime = event.timestamp;
          const durationMs = exitTime.getTime() - enterTime.getTime();

          dwellSessions.push({
            enterTime,
            exitTime,
            durationMs
          });

          enterTime = null;
        }
      }

      // 마지막 ENTER 이벤트가 있고 EXIT이 없는 경우 현재 시간까지 계산
      if (enterTime !== null) {
        const exitTime = new Date();
        const durationMs = exitTime.getTime() - enterTime.getTime();

        dwellSessions.push({
          enterTime,
          exitTime,
          durationMs
        });
      }

      // 집계
      const totalDwellTimeMs = dwellSessions.reduce((sum, session) => sum + session.durationMs, 0);
      const averageDwellTimeMs =
        dwellSessions.length > 0 ? totalDwellTimeMs / dwellSessions.length : 0;

      return {
        totalDwellTimeMs,
        averageDwellTimeMs,
        dwellSessions
      };
    } catch (error) {
      console.error(
        `[mapService] 차량 ID ${vehicleId}의 지오펜스 ID ${geofenceId} 체류 시간 분석 실패:`,
        error
      );
      return {
        totalDwellTimeMs: 0,
        averageDwellTimeMs: 0,
        dwellSessions: []
      };
    }
  }

  /**
   * 좌표 변환 유틸리티: LatLng → Coordinates
   * @param latLng LatLng 형식 좌표
   * @returns Coordinates 형식 좌표
   */
  private latLngToCoordinates(latLng: LatLng): Coordinates {
    return {
      latitude: latLng.lat,
      longitude: latLng.lng
    };
  }

  /**
   * 좌표 변환 유틸리티: Coordinates → LatLng
   * @param coordinates Coordinates 형식 좌표
   * @returns LatLng 형식 좌표
   */
  private coordinatesToLatLng(coordinates: Coordinates): LatLng {
    return {
      lat: coordinates.latitude,
      lng: coordinates.longitude
    };
  }

  /**
   * 지도 경계 생성
   * @param boundary 생성할 경계 정보
   * @returns 생성된 경계 ID
   */
  async createMapBoundary(boundary: Omit<MapBoundary, 'id' | 'createdAt'>): Promise<string | null> {
    try {
      const response = await this.apiClient.post<{ id: string }>('/map/boundaries', boundary);
      return response.id;
    } catch (error) {
      console.error('[mapService] 지도 경계 생성 실패:', error);
      return null;
    }
  }

  /**
   * 지도 경계 업데이트
   * @param id 경계 ID
   * @param updates 업데이트할 내용
   * @returns 성공 여부
   */
  async updateMapBoundary(id: string, updates: Partial<MapBoundary>): Promise<boolean> {
    try {
      await this.apiClient.put(`${this.basePath}/map/boundaries/${id}`, updates);
      return true;
    } catch (error) {
      console.error(`[mapService] 지도 경계 ID ${id} 업데이트 실패:`, error);
      return false;
    }
  }

  /**
   * 지도 경계 삭제
   * @param id 삭제할 경계 ID
   * @returns 성공 여부
   */
  async deleteMapBoundary(id: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`${this.basePath}/map/boundaries/${id}`);
      return true;
    } catch (error) {
      console.error(`[mapService] 지도 경계 ID ${id} 삭제 실패:`, error);
      return false;
    }
  }

  /**
   * 사용자의 지도 경계 목록 조회
   * @param userId 사용자 ID
   * @returns 경계 목록
   */
  async getUserMapBoundaries(userId: string): Promise<MapBoundary[]> {
    try {
      const response = await this.apiClient.get<MapBoundary[]>(`${this.basePath}/map/boundaries?userId=${userId}`);
      return response;
    } catch (error) {
      console.error(`[mapService] 사용자 ID ${userId}의 지도 경계 목록 조회 실패:`, error);
      return [];
    }
  }

  /**
   * 좌표가 경계 내에 있는지 확인
   * @param coords 확인할 좌표
   * @param boundary 확인할 경계
   * @returns 경계 내 포함 여부
   */
  isPointInBoundary(coords: Coordinates, boundary: MapBoundary): boolean {
    const { bounds } = boundary;
    return (
      coords.latitude <= bounds.north &&
      coords.latitude >= bounds.south &&
      coords.longitude <= bounds.east &&
      coords.longitude >= bounds.west
    );
  }

  /**
   * 지도 경계 모니터링 시작
   * @param userId 사용자 ID
   * @param vehicleIds 모니터링할 차량 ID 목록
   * @param intervalMs 모니터링 간격 (밀리초)
   * @returns 성공 여부
   */
  async startBoundaryMonitoring(
    userId: string,
    vehicleIds: string[] = [],
    intervalMs: number = 30000
  ): Promise<boolean> {
    // 이미 활성화된 모니터링이 있으면 중지
    if (this.monitoringIntervals['boundary']) {
      this.stopBoundaryMonitoring();
    }

    // 사용자의 활성화된 지도 경계 로드
    try {
      const boundaries = await this.getUserMapBoundaries(userId);
      this.activeBoundaries = boundaries.filter(b => b.active);

      if (this.activeBoundaries.length === 0) {
        console.log('활성화된 지도 경계가 없습니다.');
        return false;
      }

      // 모니터링 인터벌 설정
      const intervalId = window.setInterval(async () => {
        // 모니터링할 차량이 지정되지 않은 경우 모든 활성 차량 사용
        const vehiclesToMonitor =
          vehicleIds.length > 0 ? vehicleIds : Object.keys(this.activeVehicleLocations);

        if (vehiclesToMonitor.length === 0) {
          console.log('모니터링할 차량이 없습니다.');
          return;
        }

        // 각 차량의 위치 업데이트 및 경계 확인
        for (const vehicleId of vehiclesToMonitor) {
          try {
            // 차량 정보 조회
            const vehicle = await this.getVehicleLocation(vehicleId);
            if (!vehicle) continue;

            const currentLocation: LatLng = {
              lat: vehicle.latitude,
              lng: vehicle.longitude
            };
            const currentCoords = this.latLngToCoordinates(currentLocation);

            // 각 경계에 대해 검사
            for (const boundary of this.activeBoundaries) {
              const boundaryId = boundary.id;

              // 이 차량에 대한 이전 이벤트 가져오기
              this.lastBoundaryEvents[vehicleId] = this.lastBoundaryEvents[vehicleId] || {};
              const lastEvent = this.lastBoundaryEvents[vehicleId][boundaryId];

              // 경계 내부에 있는지 확인
              const isInside = this.isPointInBoundary(currentCoords, boundary);

              // 이전 이벤트가 없고 현재 경계 밖에 있는 경우
              // 또는 이전에 경계 내부에 있었는데 현재 경계 밖으로 나간 경우
              if ((!lastEvent && !isInside) || (lastEvent?.eventType === 'reentry' && !isInside)) {
                // 경계 이탈 이벤트 생성
                if (boundary.options.notifyOnExit) {
                  const eventDetails: MapBoundaryEventDetails = {
                    boundaryId,
                    boundaryName: boundary.name,
                    vehicleId,
                    vehicleName: vehicle.name || `차량 ${vehicleId}`,
                    timestamp: new Date(),
                    eventType: 'exit',
                    location: currentCoords
                  };

                  // 이벤트 기록
                  this.lastBoundaryEvents[vehicleId][boundaryId] = eventDetails;

                  // 알림 생성
                  await this.createBoundaryAlert(eventDetails, boundary);
                }
              }
              // 이전에 경계 밖에 있었는데 현재 경계 안으로 들어온 경우
              else if (lastEvent?.eventType === 'exit' && isInside) {
                // 재진입 이벤트 생성
                const eventDetails: MapBoundaryEventDetails = {
                  boundaryId,
                  boundaryName: boundary.name,
                  vehicleId,
                  vehicleName: vehicle.name || `차량 ${vehicleId}`,
                  timestamp: new Date(),
                  eventType: 'reentry',
                  location: currentCoords
                };

                // 이벤트 기록
                this.lastBoundaryEvents[vehicleId][boundaryId] = eventDetails;

                // 알림 생성 (선택적)
                if (boundary.options.notifyOnExit) {
                  await this.createBoundaryAlert(eventDetails, boundary);
                }
              }
            }
          } catch (error) {
            console.error(`[mapService] 차량 ${vehicleId} 경계 모니터링 중 오류:`, error);
          }
        }
      }, intervalMs);

      // 인터벌 ID 저장
      this.monitoringIntervals['boundary'] = intervalId;
      console.log('지도 경계 모니터링이 시작되었습니다.');
      return true;
    } catch (error) {
      console.error('[mapService] 지도 경계 모니터링 시작 실패:', error);
      return false;
    }
  }

  /**
   * 지도 경계 모니터링 중지
   */
  stopBoundaryMonitoring(): void {
    if (this.monitoringIntervals['boundary']) {
      window.clearInterval(this.monitoringIntervals['boundary']);
      delete this.monitoringIntervals['boundary'];
      console.log('지도 경계 모니터링이 중지되었습니다.');
    }
  }

  /**
   * 경계 알림 생성
   * @param eventDetails 이벤트 상세 정보
   * @param boundary 관련 경계
   */
  private async createBoundaryAlert(
    eventDetails: MapBoundaryEventDetails,
    boundary: MapBoundary
  ): Promise<void> {
    try {
      // 알림 생성
      const notification: NotificationCreate = {
        userId: boundary.userId,
        title: `차량이 지정된 경계를 ${eventDetails.eventType === 'exit' ? '벗어났습니다' : '재진입했습니다'}`,
        message: `${eventDetails.vehicleName}이(가) ${boundary.name} 경계를 ${eventDetails.eventType === 'exit' ? '벗어났습니다' : '재진입했습니다'}.`,
        type: NotificationType.VEHICLE,
        metadata: {
          vehicleId: eventDetails.vehicleId,
          boundaryId: eventDetails.boundaryId,
          eventType: eventDetails.eventType,
          location: eventDetails.location
        }
      };

      await notificationService.createNotification(notification);

      // 추가 연락처에 알림을 보낼 경우 - sendToContacts 함수는 제거
      if (boundary.options.notifyContacts && boundary.options.notifyContacts.length > 0) {
        // 여기에 연락처에 알림 보내는 코드 추가
      }
    } catch (error) {
      console.error(`[mapService] 경계 ID ${eventDetails.boundaryId} 알림 생성 오류:`, error);
    }
  }

  async submitShopReview(shopId: string, rating: number, comment: string, vehicleId?: string): Promise<boolean> {
    try {
      const response = await this.apiClient.post<{ success: boolean }>(`${this.basePath}/shops/${shopId}/reviews`, {
        rating,
        comment,
        vehicleId
      });
      return response.success;
    } catch (error) {
      console.error(`정비소 ID ${shopId} 평가 제출 중 오류 발생:`, error);
      return false;
    }
  }

  async bookAppointment(
    shopId: string,
    date: string,
    time: string,
    vehicleId: string,
    services: string[]
  ): Promise<boolean> {
    try {
      const response = await this.apiClient.post<{ success: boolean }>(`${this.basePath}/appointments`, {
        shopId,
        date,
        time,
        vehicleId,
        services
      });
      return response.success;
    } catch (error) {
      console.error('정비소 예약 중 오류 발생:', error);
      return false;
    }
  }

  async getVehicleStatus(vehicleId: string): Promise<VehicleStatus | null> {
    try {
      const response = await this.apiClient.get<VehicleStatus>(`${this.basePath}/vehicles/${vehicleId}/status`);
      return response;
    } catch (error) {
      console.error(`차량 ID ${vehicleId} 상태 조회 중 오류 발생:`, error);
      return null;
    }
  }
}
