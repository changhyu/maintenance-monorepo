/**
 * 위치 좌표 인터페이스
 */
export interface LocationPoint {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  type?: 'origin' | 'destination' | 'waypoint';
  placeId?: string;
}

/**
 * 위치 검색 결과 인터페이스
 */
export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  location: LocationPoint;
  type: 'address' | 'place' | 'business';
  distance?: number;
  rating?: number;
  openNow?: boolean;
}

/**
 * 위치 검색 필터 인터페이스
 */
export interface LocationSearchFilter {
  query: string;
  type?: 'address' | 'place' | 'business';
  radius?: number;
  center?: LocationPoint;
  limit?: number;
}

/**
 * 위치 서비스 인터페이스
 */
export interface LocationService {
  searchLocations(filter: LocationSearchFilter): Promise<LocationSearchResult[]>;
  getLocationDetails(placeId: string): Promise<LocationSearchResult>;
  getCurrentLocation(): Promise<LocationPoint>;
  geocode(address: string): Promise<LocationPoint>;
  reverseGeocode(location: Pick<LocationPoint, 'latitude' | 'longitude'>): Promise<LocationSearchResult>;
} 