import { ApiClient } from '../client';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  status: 'active' | 'maintenance' | 'retired';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface VehicleCreateRequest {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
}

export interface VehicleUpdateRequest {
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  status?: 'active' | 'maintenance' | 'retired';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  description: string;
  cost: number;
  type: 'regular' | 'repair' | 'inspection';
  technician: string;
  notes?: string;
}

export interface MaintenanceRecordCreateRequest {
  vehicleId: string;
  date: string;
  description: string;
  cost: number;
  type: 'regular' | 'repair' | 'inspection';
  technician: string;
  notes?: string;
}

export class VehicleService {
  private client: ApiClient;
  private basePath = '/vehicles';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 모든 차량 목록 조회
  async getAllVehicles(): Promise<Vehicle[]> {
    return this.client.get<Vehicle[]>(this.basePath);
  }

  // 특정 차량 조회
  async getVehicleById(id: string): Promise<Vehicle> {
    return this.client.get<Vehicle>(`${this.basePath}/${id}`);
  }

  // 차량 생성
  async createVehicle(vehicleData: VehicleCreateRequest): Promise<Vehicle> {
    return this.client.post<Vehicle>(this.basePath, vehicleData);
  }

  // 차량 정보 업데이트
  async updateVehicle(id: string, vehicleData: VehicleUpdateRequest): Promise<Vehicle> {
    return this.client.put<Vehicle>(`${this.basePath}/${id}`, vehicleData);
  }

  // 차량 삭제
  async deleteVehicle(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 차량 정비 기록 조회
  async getVehicleMaintenanceRecords(vehicleId: string): Promise<MaintenanceRecord[]> {
    return this.client.get<MaintenanceRecord[]>(`${this.basePath}/${vehicleId}/maintenance`);
  }

  // 차량 정비 기록 추가
  async addMaintenanceRecord(data: MaintenanceRecordCreateRequest): Promise<MaintenanceRecord> {
    return this.client.post<MaintenanceRecord>(`${this.basePath}/${data.vehicleId}/maintenance`, data);
  }

  // 차량 상태 변경
  async changeVehicleStatus(id: string, status: 'active' | 'maintenance' | 'retired'): Promise<Vehicle> {
    return this.client.patch<Vehicle>(`${this.basePath}/${id}/status`, { status });
  }
} 