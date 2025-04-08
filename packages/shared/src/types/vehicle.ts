/**
 * 차량 관련 공통 타입 정의
 */

/**
 * 차량 상태 열거형
 */
export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
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
 * 차량 모델 인터페이스
 */
export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  color?: string;
  plate?: string;
  mileage?: number;
  status: VehicleStatus;
  ownerID?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 차량 생성 인터페이스
 */
export interface VehicleCreate {
  vin: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  color?: string;
  plate?: string;
  mileage?: number;
  status?: VehicleStatus;
  ownerID?: string;
}

/**
 * 차량 업데이트 인터페이스
 */
export interface VehicleUpdate {
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  color?: string;
  plate?: string;
  mileage?: number;
  status?: VehicleStatus;
  ownerID?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
}

/**
 * 차량 필터 인터페이스
 */
export interface VehicleFilter {
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  status?: VehicleStatus;
  ownerID?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * 차량 원격 측정 데이터 인터페이스
 */
export interface VehicleTelemetry {
  vehicleId: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  engineStatus: 'ON' | 'OFF' | 'STARTING' | 'STOPPING';
  fuelLevel?: number;
  batteryLevel?: number;
  engineTemperature?: number;
  oilLevel?: number;
  tirePressure?: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  mileage: number;
  speed?: number;
  diagnosticCodes?: string[];
  lastConnected: string;
}

/**
 * 차량 문서 인터페이스
 */
export interface VehicleDocument {
  id: string;
  vehicleId: string;
  name: string;
  type: 'REGISTRATION' | 'INSURANCE' | 'INSPECTION' | 'MAINTENANCE' | 'OTHER';
  fileUrl: string;
  uploadDate: string;
  expiryDate?: string;
  fileSize: number;
  uploadedBy?: string;
  notes?: string;
} 