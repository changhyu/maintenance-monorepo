/**
 * 차량 타입 정의
 */

/**
 * 차량 상태
 */
export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive'
}

/**
 * 차량 유형
 */
export enum VehicleType {
  TRUCK = 'TRUCK',
  BUS = 'BUS',
  VAN = 'VAN',
  TAXI = 'TAXI'
}

/**
 * 연료 유형
 */
export type FuelType =
  | 'gasoline' // 가솔린
  | 'diesel' // 경유
  | 'lpg' // LPG
  | 'hybrid' // 하이브리드
  | 'electric' // 전기
  | 'hydrogen'; // 수소

/**
 * 차량 인터페이스
 */
export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  healthScore: number;
  licensePlate?: string;
  model?: string;
  year?: number;
  mileage?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * 차량 필터 인터페이스
 */
export interface VehicleFilter {
  type?: VehicleType;
  status?: VehicleStatus;
  fuelType?: FuelType;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * 차량 생성/수정을 위한 DTO 인터페이스
 */
export interface VehicleDTO {
  name: string;
  model: string;
  manufacturer: string;
  year: number;
  licensePlate: string;
  vin?: string;
  type: VehicleType;
  status: VehicleStatus;
  fuelType: FuelType;
  purchaseDate?: string;
  purchasePrice?: number;
  currentMileage?: number;
  notes?: string;
  department?: string;
  responsiblePerson?: string;
  imageUrl?: string;
}

export interface VehicleMapViewProps {
  apiClient: any;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  showRepairShops?: boolean;
  distanceUnit?: string;
  mapTheme?: string;
}
