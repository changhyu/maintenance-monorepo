/**
 * 차량 관련 타입 정의
 */

/**
 * 차량 상태 열거형
 */
export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
  RECALLED = 'RECALLED'
}

/**
 * 차량 유형 열거형
 */
export enum VehicleType {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID'
}

/**
 * 차량 인터페이스
 */
export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  status: VehicleStatus;
  plate: string;
  color: string;
  mileage: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  features?: VehicleFeature[];
  ownerInfo?: OwnerInfo;
  insuranceInfo?: InsuranceInfo;
  documents?: VehicleDocument[];
  telemetryStatus?: TelemetryStatus;
  softwareVersion?: string;
  purchaseDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 차량 생성 인터페이스
 */
export type VehicleCreate = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 차량 업데이트 인터페이스
 */
export type VehicleUpdate = Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * 차량 필터 인터페이스
 */
export interface VehicleFilter {
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  status?: VehicleStatus;
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * 차량 기능 인터페이스
 */
export interface VehicleFeature {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

/**
 * 소유자 정보 인터페이스
 */
export interface OwnerInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  licenseNumber?: string;
  company?: string;
  isCompanyVehicle: boolean;
}

/**
 * 보험 정보 인터페이스
 */
export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  coverage: string;
  startDate: string;
  endDate: string;
  premium?: number;
  contactInfo?: string;
}

/**
 * 차량 문서 인터페이스
 */
export interface VehicleDocument {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  uploadDate: string;
  expiryDate?: string;
  size: number;
}

/**
 * 원격 측정 상태 인터페이스
 */
export interface TelemetryStatus {
  isConnected: boolean;
  lastPing?: string;
  batteryLevel?: number;
  fuelLevel?: number;
  engineTemp?: number;
  oilLevel?: number;
  tirePressure?: {
    frontLeft?: number;
    frontRight?: number;
    rearLeft?: number;
    rearRight?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
  diagnosticCodes?: string[];
} 