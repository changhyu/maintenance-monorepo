import { ApiClient } from '../client';

export interface VehicleStats {
  total: number;
  active: number;
  maintenance: number;
  inactive: number;
  byType: Array<{
    type: string;
    count: number;
    color: string;
  }>;
}

export interface MaintenanceStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  byStatus: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
  }>;
}

export interface RecentMaintenance {
  id: string;
  title: string;
  date: string;
  status: string;
  vehicleId: string;
  vehicleName: string;
}

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface RecentVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  status: string;
}

export interface StatComparison {
  current: number;
  previous: number;
  percentChange: number;
  period: string;
}

export interface DashboardData {
  vehicleStats: VehicleStats;
  maintenanceStats: MaintenanceStats;
  recentMaintenance: RecentMaintenance[];
  alerts: Alert[];
  recentVehicles: RecentVehicle[];
  costStats: {
    total: StatComparison;
    average: StatComparison;
  };
  performanceStats: {
    completionTime: StatComparison;
    satisfaction: StatComparison;
  };
}

export interface DashboardFilter {
  userId?: string;
  shopId?: string;
  startDate?: string;
  endDate?: string;
}

export class DashboardService {
  private client: ApiClient;
  private basePath = '/dashboard';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 대시보드 데이터 조회
  async getDashboardData(filter?: DashboardFilter): Promise<DashboardData> {
    return this.client.get<DashboardData>(this.basePath, { params: filter });
  }

  // 차량 통계 조회
  async getVehicleStats(filter?: DashboardFilter): Promise<VehicleStats> {
    return this.client.get<VehicleStats>(`${this.basePath}/vehicle-stats`, { params: filter });
  }

  // 정비 통계 조회
  async getMaintenanceStats(filter?: DashboardFilter): Promise<MaintenanceStats> {
    return this.client.get<MaintenanceStats>(`${this.basePath}/maintenance-stats`, { params: filter });
  }

  // 최근 정비 일정 조회
  async getRecentMaintenance(filter?: DashboardFilter & { limit?: number }): Promise<RecentMaintenance[]> {
    return this.client.get<RecentMaintenance[]>(`${this.basePath}/recent-maintenance`, { params: filter });
  }

  // 알림 및 경고 조회
  async getAlerts(filter?: DashboardFilter & { limit?: number }): Promise<Alert[]> {
    return this.client.get<Alert[]>(`${this.basePath}/alerts`, { params: filter });
  }

  // 최근 등록된 차량 조회
  async getRecentVehicles(filter?: DashboardFilter & { limit?: number }): Promise<RecentVehicle[]> {
    return this.client.get<RecentVehicle[]>(`${this.basePath}/recent-vehicles`, { params: filter });
  }

  // 비용 통계 조회
  async getCostStats(filter?: DashboardFilter): Promise<{ total: StatComparison; average: StatComparison }> {
    return this.client.get<{ total: StatComparison; average: StatComparison }>(`${this.basePath}/cost-stats`, { params: filter });
  }

  // 성능 통계 조회
  async getPerformanceStats(filter?: DashboardFilter): Promise<{ completionTime: StatComparison; satisfaction: StatComparison }> {
    return this.client.get<{ completionTime: StatComparison; satisfaction: StatComparison }>(`${this.basePath}/performance-stats`, { params: filter });
  }

  // 특정 사용자의 대시보드 데이터 조회
  async getUserDashboard(userId: string, filter?: Omit<DashboardFilter, 'userId'>): Promise<DashboardData> {
    return this.client.get<DashboardData>(`/users/${userId}/dashboard`, { params: filter });
  }

  // 특정 정비소의 대시보드 데이터 조회
  async getShopDashboard(shopId: string, filter?: Omit<DashboardFilter, 'shopId'>): Promise<DashboardData> {
    return this.client.get<DashboardData>(`/shops/${shopId}/dashboard`, { params: filter });
  }
} 