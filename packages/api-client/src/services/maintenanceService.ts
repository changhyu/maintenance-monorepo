import { ApiClient } from '../client';

export interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  scheduledDate: string;
  type: 'regular' | 'repair' | 'inspection';
  description: string;
  estimatedCost?: number;
  status: 'scheduled' | 'completed' | 'canceled';
  assignedTechnician?: string;
  notes?: string;
}

export interface MaintenanceScheduleCreateRequest {
  vehicleId: string;
  scheduledDate: string;
  type: 'regular' | 'repair' | 'inspection';
  description: string;
  estimatedCost?: number;
  assignedTechnician?: string;
  notes?: string;
}

export interface MaintenanceScheduleUpdateRequest {
  scheduledDate?: string;
  type?: 'regular' | 'repair' | 'inspection';
  description?: string;
  estimatedCost?: number;
  status?: 'scheduled' | 'completed' | 'canceled';
  assignedTechnician?: string;
  notes?: string;
}

export interface MaintenanceReport {
  id: string;
  maintenanceId: string;
  vehicleId: string;
  completionDate: string;
  actualCost: number;
  partsReplaced?: string[];
  issuesFound?: string[];
  recommendedFutureWork?: string[];
  technicianComments?: string;
}

export interface MaintenanceReportCreateRequest {
  maintenanceId: string;
  vehicleId: string;
  completionDate: string;
  actualCost: number;
  partsReplaced?: string[];
  issuesFound?: string[];
  recommendedFutureWork?: string[];
  technicianComments?: string;
}

export class MaintenanceService {
  private client: ApiClient;
  private basePath = '/maintenance';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 모든 정비 일정 조회
  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return this.client.get<MaintenanceSchedule[]>(this.basePath);
  }

  // 특정 차량의 정비 일정 조회
  async getVehicleMaintenanceSchedules(vehicleId: string): Promise<MaintenanceSchedule[]> {
    return this.client.get<MaintenanceSchedule[]>(`${this.basePath}/vehicle/${vehicleId}`);
  }

  // 특정 정비 일정 조회
  async getMaintenanceScheduleById(id: string): Promise<MaintenanceSchedule> {
    return this.client.get<MaintenanceSchedule>(`${this.basePath}/${id}`);
  }

  // 정비 일정 생성
  async createMaintenanceSchedule(data: MaintenanceScheduleCreateRequest): Promise<MaintenanceSchedule> {
    return this.client.post<MaintenanceSchedule>(this.basePath, data);
  }

  // 정비 일정 업데이트
  async updateMaintenanceSchedule(id: string, data: MaintenanceScheduleUpdateRequest): Promise<MaintenanceSchedule> {
    return this.client.put<MaintenanceSchedule>(`${this.basePath}/${id}`, data);
  }

  // 정비 일정 삭제
  async deleteMaintenanceSchedule(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 정비 일정 상태 변경
  async changeMaintenanceStatus(id: string, status: 'scheduled' | 'completed' | 'canceled'): Promise<MaintenanceSchedule> {
    return this.client.patch<MaintenanceSchedule>(`${this.basePath}/${id}/status`, { status });
  }

  // 정비 보고서 생성
  async createMaintenanceReport(data: MaintenanceReportCreateRequest): Promise<MaintenanceReport> {
    return this.client.post<MaintenanceReport>(`${this.basePath}/${data.maintenanceId}/reports`, data);
  }

  // 정비 보고서 조회
  async getMaintenanceReport(maintenanceId: string): Promise<MaintenanceReport> {
    return this.client.get<MaintenanceReport>(`${this.basePath}/${maintenanceId}/reports`);
  }
} 