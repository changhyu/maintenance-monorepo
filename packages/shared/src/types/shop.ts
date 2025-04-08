/**
 * 정비소 관련 공통 타입 정의
 */

/**
 * 정비소 상태 열거형
 */
export enum ShopStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

/**
 * 정비소 타입 열거형
 */
export enum ShopType {
  GENERAL = 'general',           // 종합 정비소
  SPECIALIZED = 'specialized',   // 전문 정비소
  DEALER = 'dealer',             // 딜러 서비스 센터
  FRANCHISE = 'franchise',       // 프랜차이즈
  MOBILE = 'mobile',             // 이동식 정비소
  TIRE = 'tire',                 // 타이어 전문점
  BODY = 'body',                 // 바디 샵
  OIL = 'oil'                    // 오일 교환 전문점
}

/**
 * 정비소 서비스 유형 열거형
 */
export enum ServiceType {
  OIL_CHANGE = 'oil_change',             // 오일 교환
  TIRE_SERVICE = 'tire_service',         // 타이어 서비스
  BRAKE_SERVICE = 'brake_service',       // 브레이크 서비스
  ENGINE_REPAIR = 'engine_repair',       // 엔진 수리
  TRANSMISSION = 'transmission',         // 변속기 수리
  ELECTRICAL = 'electrical',             // 전기 시스템
  AC_SERVICE = 'ac_service',             // 에어컨 서비스
  BODY_REPAIR = 'body_repair',           // 바디 수리
  PAINTING = 'painting',                 // 도장
  INSPECTION = 'inspection',             // 정기 검사
  DIAGNOSTICS = 'diagnostics',           // 진단
  SUSPENSION = 'suspension',             // 서스펜션
  EXHAUST = 'exhaust',                   // 배기 시스템
  GLASS = 'glass',                       // 유리 교체/수리
  WHEEL_ALIGNMENT = 'wheel_alignment'    // 휠 얼라인먼트
}

/**
 * 정비소 인터페이스
 */
export interface Shop {
  id: string;
  name: string;
  type: ShopType;
  status: ShopStatus;
  description?: string;
  address: Address;
  contact: {
    phone: string;
    email?: string;
    website?: string;
  };
  businessHours: BusinessHours;
  services: ServiceType[];
  specialties?: string[];
  certifications?: string[];
  rating?: number;
  reviewCount?: number;
  images?: string[];
  coverImage?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  staffCount?: number;
  bayCount?: number;
  established?: number;
  owner?: {
    id: string;
    name: string;
  };
  amenities?: string[];
  paymentMethods?: string[];
  brands?: string[];
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 주소 인터페이스
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress?: string;
}

/**
 * 영업 시간 인터페이스
 */
export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  holidays?: HolidayHours[];
}

/**
 * 일일 영업 시간 인터페이스
 */
export interface DayHours {
  open: boolean;
  openTime?: string;  // HH:MM 형식
  closeTime?: string; // HH:MM 형식
  breakStart?: string; // HH:MM 형식
  breakEnd?: string;   // HH:MM 형식
}

/**
 * 공휴일 영업 시간 인터페이스
 */
export interface HolidayHours {
  date: string;      // YYYY-MM-DD 형식
  name: string;
  open: boolean;
  openTime?: string;  // HH:MM 형식
  closeTime?: string; // HH:MM 형식
}

/**
 * 정비소 리뷰 인터페이스
 */
export interface ShopReview {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  serviceDate?: string;
  serviceType?: ServiceType[];
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
  };
  likes?: number;
  response?: {
    text: string;
    date: string;
    name: string;
  };
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 정비소 생성 인터페이스
 */
export interface ShopCreate {
  name: string;
  type: ShopType;
  description?: string;
  address: Address;
  contact: {
    phone: string;
    email?: string;
    website?: string;
  };
  businessHours: BusinessHours;
  services: ServiceType[];
  specialties?: string[];
  certifications?: string[];
  images?: string[];
  coverImage?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  staffCount?: number;
  bayCount?: number;
  established?: number;
  amenities?: string[];
  paymentMethods?: string[];
  brands?: string[];
}

/**
 * 정비소 업데이트 인터페이스
 */
export interface ShopUpdate {
  name?: string;
  type?: ShopType;
  status?: ShopStatus;
  description?: string;
  address?: Partial<Address>;
  contact?: Partial<{
    phone: string;
    email?: string;
    website?: string;
  }>;
  businessHours?: Partial<BusinessHours>;
  services?: ServiceType[];
  specialties?: string[];
  certifications?: string[];
  images?: string[];
  coverImage?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  staffCount?: number;
  bayCount?: number;
  established?: number;
  amenities?: string[];
  paymentMethods?: string[];
  brands?: string[];
  featured?: boolean;
}

/**
 * 정비소 필터 인터페이스
 */
export interface ShopFilter {
  search?: string;
  type?: ShopType | ShopType[];
  services?: ServiceType | ServiceType[];
  rating?: number;
  distance?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  brands?: string[];
  open?: boolean;
  featured?: boolean;
  sortBy?: 'rating' | 'distance' | 'reviewCount' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
} 