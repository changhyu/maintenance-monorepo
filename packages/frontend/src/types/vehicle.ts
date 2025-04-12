/**
 * 차량 관련 타입 정의
 */

/**
 * 차량 상태 열거형
 */
export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive'
}

/**
 * 차량 유형 열거형
 */
export enum VehicleType {
  TRUCK = '화물트럭',
  BUS = '버스',
  VAN = '밴',
  TAXI = '택시',
  SEDAN = '승용차',
  SUV = 'SUV',
  PICKUP = '픽업트럭',
  SPECIAL = '특수차량'
}

/**
 * 차량 인터페이스
 */
export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType | string;
  status: VehicleStatus | string;
  healthScore: number;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  manufacturer?: string;
  fuelType?: FuelType;
  fuelLevel?: number;
  mileage?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  purchaseDate?: Date;
  assignedDriverId?: string;
  departmentId?: string;
  fleetId?: string;
  insuranceExpiration?: Date;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  telemetryEnabled?: boolean;
  maintenanceHistory?: {
    id: string;
    date: Date;
    type: string;
    description: string;
    cost: number;
    shopId?: string;
  }[];
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
  types?: VehicleType[];
  status?: VehicleStatus[];
  searchTerm?: string;
  minHealthScore?: number;
  maxHealthScore?: number;
  departmentId?: string;
  fleetId?: string;
  needsMaintenance?: boolean;
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

export enum FuelType {
  GASOLINE = '가솔린',
  DIESEL = '디젤',
  LPG = 'LPG',
  ELECTRIC = '전기',
  HYBRID = '하이브리드',
  HYDROGEN = '수소'
}

export interface VehicleStats {
  total: number;
  active: number;
  maintenance: number;
  inactive: number;
  averageHealthScore: number;
  fleetUtilization: number; // 백분율 (0-100)
  maintenanceCost: number; // 지난 달 유지보수 비용
  fuelCost: number; // 지난 달 연료 비용
}

/**
 * 차량 변환 유틸리티 함수
 * 다양한 소스의 Vehicle 객체를 통합 타입으로 변환
 */

/**
 * API 클라이언트에서 사용하는 Vehicle 타입을 Frontend Vehicle 타입으로 변환
 */
export function convertApiVehicleToFrontend(apiVehicle: any): Vehicle {
  return {
    id: apiVehicle.id,
    name: apiVehicle.model || apiVehicle.make || '차량',
    type: apiVehicle.type || '기타',
    status: apiVehicle.status || 'inactive',
    healthScore: apiVehicle.healthScore || 80,
    model: apiVehicle.model,
    year: apiVehicle.year,
    licensePlate: apiVehicle.licensePlate,
    vin: apiVehicle.vin,
    manufacturer: apiVehicle.make,
    fuelType: apiVehicle.fuelType as FuelType,
    fuelLevel: apiVehicle.fuelLevel,
    mileage: apiVehicle.currentMileage || apiVehicle.mileage,
    lastMaintenanceDate: apiVehicle.lastServiceDate
      ? new Date(apiVehicle.lastServiceDate)
      : undefined,
    nextMaintenanceDate: apiVehicle.nextServiceDate
      ? new Date(apiVehicle.nextServiceDate)
      : undefined,
    assignedDriverId: apiVehicle.assignedDriverId,
    location: apiVehicle.location
      ? {
          latitude: apiVehicle.location.latitude,
          longitude: apiVehicle.location.longitude,
          lastUpdated: new Date(apiVehicle.location.lastUpdated || new Date())
        }
      : undefined
  };
}

/**
 * Frontend Vehicle 타입을 API 요청 형식으로 변환
 */
export function convertFrontendVehicleToApi(vehicle: Vehicle): any {
  return {
    id: vehicle.id,
    make: vehicle.manufacturer,
    model: vehicle.model,
    year: vehicle.year,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    status: vehicle.status,
    fuelType: vehicle.fuelType,
    fuelLevel: vehicle.fuelLevel,
    currentMileage: vehicle.mileage,
    lastServiceDate: vehicle.lastMaintenanceDate
      ? vehicle.lastMaintenanceDate.toISOString()
      : undefined,
    nextServiceDate: vehicle.nextMaintenanceDate
      ? vehicle.nextMaintenanceDate.toISOString()
      : undefined,
    assignedDriverId: vehicle.assignedDriverId
  };
}

/**
 * 서비스 Vehicle을 Frontend Vehicle로 변환하는 유틸리티 함수
 */
export function convertServiceVehicleToFrontend(serviceVehicle: any): Vehicle | null {
  if (!serviceVehicle) return null;

  return {
    id: serviceVehicle.id || '',
    name: serviceVehicle.name || serviceVehicle.model || '미확인 차량',
    type: serviceVehicle.type || VehicleType.SEDAN,
    status: serviceVehicle.status || VehicleStatus.INACTIVE,
    healthScore: serviceVehicle.healthScore || 0,
    model: serviceVehicle.model,
    year: serviceVehicle.year,
    licensePlate: serviceVehicle.licensePlate,
    vin: serviceVehicle.vin,
    manufacturer: serviceVehicle.manufacturer,
    fuelType: serviceVehicle.fuelType,
    fuelLevel: serviceVehicle.fuelLevel,
    mileage: serviceVehicle.mileage || serviceVehicle.totalMileage,
    lastMaintenanceDate: serviceVehicle.lastMaintenanceDate
      ? new Date(serviceVehicle.lastMaintenanceDate)
      : undefined,
    nextMaintenanceDate: serviceVehicle.nextMaintenanceDate
      ? new Date(serviceVehicle.nextMaintenanceDate)
      : undefined,
    purchaseDate: serviceVehicle.purchaseDate ? new Date(serviceVehicle.purchaseDate) : undefined,
    assignedDriverId: serviceVehicle.assignedDriverId || serviceVehicle.driverId,
    departmentId: serviceVehicle.departmentId,
    fleetId: serviceVehicle.fleetId,
    insuranceExpiration: serviceVehicle.insuranceExpiration
      ? new Date(serviceVehicle.insuranceExpiration)
      : undefined,
    location: serviceVehicle.location
      ? {
          latitude: serviceVehicle.location.latitude,
          longitude: serviceVehicle.location.longitude,
          lastUpdated: new Date(serviceVehicle.location.lastUpdated || new Date())
        }
      : undefined,
    telemetryEnabled: serviceVehicle.telemetryEnabled || false,
    maintenanceHistory: Array.isArray(serviceVehicle.maintenanceHistory)
      ? serviceVehicle.maintenanceHistory.map((item: any) => ({
          id: item.id || '',
          date: new Date(item.date || new Date()),
          type: item.type || '',
          description: item.description || '',
          cost: Number(item.cost) || 0,
          shopId: item.shopId
        }))
      : undefined
  };
}
