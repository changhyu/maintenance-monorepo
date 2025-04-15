/**
 * 차량 정비 관리 시스템 공용 인터페이스
 */

/**
 * 차량 정보 인터페이스
 */
export interface Vehicle {
  id: string;
  registrationNumber: string; // 차량 번호판
  manufacturer: string; // 제조사
  model: string; // 모델명
  year: number; // 연식
  vin?: string; // 차대 번호 (선택 사항)
  engineNumber?: string; // 엔진 번호 (선택 사항)
  color?: string; // 색상 (선택 사항)
  ownerName: string; // 소유자 이름
  ownerContact: string; // 소유자 연락처
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 정비소 정보 인터페이스
 */
export interface Shop {
  id: string;
  name: string; // 정비소 이름
  address: string; // 정비소 주소
  contact: string; // 정비소 연락처
  businessLicense: string; // 사업자 등록 번호
  manager?: string; // 관리자 이름
  operatingHours?: string; // 운영 시간
  specialties?: string[]; // 전문 분야
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 정비 기록 인터페이스
 */
export interface MaintenanceRecord {
  id: string;
  vehicleId: string; // 차량 ID
  shopId: string; // 정비소 ID
  serviceDate: Date; // 정비 날짜
  serviceType: MaintenanceType; // 정비 유형
  description: string; // 정비 내용
  cost: number; // 비용
  mileage?: number; // 주행 거리
  parts?: MaintenancePart[]; // 사용된 부품 목록
  technician?: string; // 담당 기술자
  notes?: string; // 추가 메모
  images?: string[]; // 이미지 URL 배열
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 정비 유형 열거형
 */
export enum MaintenanceType {
  REGULAR_SERVICE = 'REGULAR_SERVICE', // 정기 점검
  REPAIR = 'REPAIR', // 수리
  OIL_CHANGE = 'OIL_CHANGE', // 오일 교체
  TIRE_CHANGE = 'TIRE_CHANGE', // 타이어 교체
  PARTS_REPLACEMENT = 'PARTS_REPLACEMENT', // 부품 교체
  INSPECTION = 'INSPECTION', // 검사
  ACCIDENT_REPAIR = 'ACCIDENT_REPAIR', // 사고 수리
  OTHER = 'OTHER' // 기타
}

/**
 * 정비 부품 인터페이스
 */
export interface MaintenancePart {
  id: string;
  name: string; // 부품 이름
  partNumber: string; // 부품 번호
  manufacturer?: string; // 제조사
  quantity: number; // 수량
  unitCost: number; // 단가
  totalCost: number; // 총 비용
}

/**
 * 사용자 정보 인터페이스
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 사용자 역할 열거형
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  SHOP_MANAGER = 'SHOP_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  VEHICLE_OWNER = 'VEHICLE_OWNER',
  GUEST = 'GUEST'
}

/**
 * 페이지네이션 결과 인터페이스
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 페이지네이션 요청 인터페이스
 */
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * API 응답 인터페이스
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
  timestamp: string;
}