/**
 * 정비소 정보 인터페이스
 */
export interface RepairShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  specialties: string[];
  contactNumber?: string;
  operatingHours?: {
    open: string;
    close: string;
    days: string[];
  };
  website?: string;
  images?: string[];
}

/**
 * 정비소 필터 인터페이스
 */
export interface RepairShopFilter {
  searchTerm?: string;
  specialties?: string[];
  minRating?: number;
  maxDistance?: number;
  sortBy?: 'distance' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 정비소 서비스 유형
 */
export enum RepairServiceType {
  OIL_CHANGE = '오일 교환',
  BRAKE_SERVICE = '브레이크 서비스',
  TIRE_SERVICE = '타이어 서비스',
  ENGINE_REPAIR = '엔진 수리',
  TRANSMISSION = '트랜스미션',
  ELECTRICAL = '전기 시스템',
  SUSPENSION = '서스펜션',
  EXHAUST = '배기 시스템',
  DIAGNOSTICS = '차량 진단',
  GENERAL_MAINTENANCE = '일반 정비'
}
