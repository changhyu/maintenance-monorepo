import { ApiClient } from '../client';

// 분석 추가 데이터 타입 정의
export type AnalyticsAdditionalData = Record<string, unknown>;
// 분석 메타데이터 타입 정의
export type AnalyticsMetadata = Record<string, unknown>;
// 분석 필터 타입 정의
export type AnalyticsFilter = Record<string, unknown>;

// SonarLint S4323 규칙을 위한 타입 별칭
export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';
export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type NotificationChannel = 'email' | 'push' | 'inApp';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ExportFormat = 'csv' | 'excel' | 'json';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ReportSchedule = {
  frequency: ReportScheduleFrequency;
  emails: string[];
  startDate?: string;
};

export type ReportFilter = {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
};

export type AnalyticsSettings = {
  defaultTimeFrame: AnalyticsTimeFrame;
  defaultChartType: AnalyticsChartType;
  notifications?: {
    enabled: boolean;
    events: string[];
    channels: NotificationChannel[];
  };
  autoRefresh?: boolean;
  customMetrics?: Record<string, {
    name: string;
    formula: string;
    description?: string;
  }>;
};

export enum AnalyticsTimeFrame {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

export enum AnalyticsMetricType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTAGE = 'percentage'
}

export enum AnalyticsChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  TABLE = 'table'
}

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
  date?: string;
  additionalData?: AnalyticsAdditionalData;
}

export interface AnalyticsDataSeries {
  name: string;
  data: AnalyticsDataPoint[];
  color?: string;
  type?: AnalyticsChartType;
}

export interface AnalyticsResult {
  title: string;
  description?: string;
  series: AnalyticsDataSeries[];
  timeFrame: AnalyticsTimeFrame;
  dateRange: AnalyticsDateRange;
  metricType: AnalyticsMetricType;
  totalValue?: number;
  compareValue?: number;
  comparePercentage?: number;
  compareLabel?: string;
  chartType: AnalyticsChartType;
  metadata?: AnalyticsMetadata;
}

export interface AnalyticsQuery {
  timeFrame: AnalyticsTimeFrame;
  dateRange?: AnalyticsDateRange;
  metricType?: AnalyticsMetricType;
  dimension?: string;
  filters?: AnalyticsFilter;
  groupBy?: string[];
  limit?: number;
  chartType?: AnalyticsChartType;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: AnalyticsChartType;
  query: AnalyticsQuery;
  width: 1 | 2 | 3 | 4; // 그리드 너비 (1=25%, 2=50%, 3=75%, 4=100%)
  height: 1 | 2 | 3; // 그리드 높이 (1=작음, 2=중간, 3=큼)
  position: number;
  isVisible: boolean;
  dateCreated: string;
  lastUpdated: string;
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  userId: string;
  dateCreated: string;
  lastUpdated: string;
}

export interface VehicleAnalyticsOverview {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesByMake: AnalyticsDataSeries;
  vehiclesByModel: AnalyticsDataSeries;
  vehiclesByYear: AnalyticsDataSeries;
  vehiclesByStatus: AnalyticsDataSeries;
  averageAge: number;
  averageMileage: number;
  newVehicles: {
    count: number;
    percentage: number;
    trend: number;
  };
}

export interface MaintenanceAnalyticsOverview {
  totalMaintenanceRecords: number;
  maintenanceByType: AnalyticsDataSeries;
  maintenanceByMonth: AnalyticsDataSeries;
  averageMaintenanceCost: number;
  averageTimeBetweenMaintenance: number;
  topMaintenanceShops: AnalyticsDataSeries;
  maintenanceCompletionRate: number;
  recurringIssues: AnalyticsDataSeries;
  costTrend: {
    data: AnalyticsDataSeries;
    percentage: number;
  };
}

export interface CostAnalyticsOverview {
  totalCost: number;
  costByCategory: AnalyticsDataSeries;
  costByMonth: AnalyticsDataSeries;
  costPerVehicle: AnalyticsDataSeries;
  averageCostPerKilometer: number;
  topExpenses: AnalyticsDataSeries;
  costTrend: {
    data: AnalyticsDataSeries;
    percentage: number;
  };
  savingsOpportunities?: {
    amount: number;
    recommendations: string[];
  };
}

export interface UserAnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  userGrowth: AnalyticsDataSeries;
  usersByRole: AnalyticsDataSeries;
  userEngagement: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topActiveUsers: AnalyticsDataSeries;
  userRetention: number;
  newUsers: {
    count: number;
    percentage: number;
    trend: number;
  };
}

export interface ShopAnalyticsOverview {
  totalShops: number;
  shopsByService: AnalyticsDataSeries;
  shopsByRating: AnalyticsDataSeries;
  averageRating: number;
  mostUsedShops: AnalyticsDataSeries;
  shopUsageTrend: AnalyticsDataSeries;
  serviceQualityTrend: AnalyticsDataSeries;
  costEfficiency: AnalyticsDataSeries;
}

export interface ReportOptions {
  title: string;
  description?: string;
  timeFrame: AnalyticsTimeFrame;
  dateRange: AnalyticsDateRange;
  sections: Array<{
    title: string;
    description?: string;
    charts: string[]; // 분석 쿼리 ID 목록
  }>;
  format?: ReportFormat;
  includeRawData?: boolean;
  scheduledDelivery?: {
    frequency: ReportScheduleFrequency;
    emails: string[];
    nextDelivery?: string;
  };
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  timeFrame: AnalyticsTimeFrame;
  dateRange: AnalyticsDateRange;
  createdBy: string;
  downloadUrl: string;
  status: ReportStatus;
  results?: Record<string, AnalyticsResult>;
  options: ReportOptions;
}

// 추가 타입 별칭 정의
export type CreateDashboardParams = Omit<AnalyticsDashboard, 'id' | 'dateCreated' | 'lastUpdated'>;
export type UpdateDashboardParams = Partial<Omit<AnalyticsDashboard, 'id' | 'dateCreated' | 'lastUpdated'>>;
export type AddWidgetParams = Omit<DashboardWidget, 'id' | 'dateCreated' | 'lastUpdated'>;
export type UpdateWidgetParams = Partial<Omit<DashboardWidget, 'id' | 'dateCreated' | 'lastUpdated'>>;

export class AnalyticsService {
  private readonly client: ApiClient;
  private readonly basePath = '/analytics';
  private readonly dashboardsPath = '/dashboards';
  private readonly reportsPath = '/reports';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 기본 분석 쿼리 실행
  async runAnalyticsQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    return this.client.post<AnalyticsResult>(`${this.basePath}/query`, query);
  }

  // 여러 분석 쿼리 실행
  async runMultipleQueries(queries: Record<string, AnalyticsQuery>): Promise<Record<string, AnalyticsResult>> {
    return this.client.post<Record<string, AnalyticsResult>>(`${this.basePath}/multi-query`, queries);
  }

  // 차량 관련 분석
  async getVehicleAnalytics(timeFrame: AnalyticsTimeFrame, dateRange?: AnalyticsDateRange): Promise<VehicleAnalyticsOverview> {
    return this.client.get<VehicleAnalyticsOverview>(`${this.basePath}/vehicles/overview`, {
      params: {
        timeFrame,
        ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
      }
    });
  }

  // 특정 차량의 분석 데이터 조회
  async getVehicleDetails(vehicleId: string, timeFrame: AnalyticsTimeFrame, dateRange?: AnalyticsDateRange): Promise<{
    maintenanceHistory: AnalyticsDataSeries;
    costBreakdown: AnalyticsDataSeries;
    issuesFrequency: AnalyticsDataSeries;
    performanceMetrics?: AnalyticsDataSeries;
    usagePatterns?: AnalyticsDataSeries;
    comparisonToFleet?: AnalyticsDataSeries;
  }> {
    return this.client.get(`${this.basePath}/vehicles/${vehicleId}/details`, {
      params: {
        timeFrame,
        ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
      }
    });
  }

  // 정비 관련 분석
  async getMaintenanceAnalytics(timeFrame: AnalyticsTimeFrame, dateRange?: AnalyticsDateRange): Promise<MaintenanceAnalyticsOverview> {
    return this.client.get<MaintenanceAnalyticsOverview>(`${this.basePath}/maintenance/overview`, {
      params: {
        timeFrame,
        ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
      }
    });
  }

  // 비용 관련 분석
  async getCostAnalytics(timeFrame: AnalyticsTimeFrame, dateRange?: AnalyticsDateRange): Promise<CostAnalyticsOverview> {
    return this.client.get<CostAnalyticsOverview>(`${this.basePath}/costs/overview`, {
      params: {
        timeFrame,
        ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
      }
    });
  }

  // 예측 정비 분석
  async getPredictiveMaintenanceAnalytics(vehicleId?: string): Promise<{
    upcomingMaintenance: Array<{
      vehicleId: string;
      vehicleName: string;
      maintenanceType: string;
      dueDate: string;
      estimatedCost: number;
      confidence: number;
      recommendation: string;
    }>;
    healthScores: Record<string, number>;
    warnings: Array<{
      vehicleId: string;
      vehicleName: string;
      issue: string;
      severity: SeverityLevel;
      recommendation: string;
    }>;
  }> {
    return this.client.get(`${this.basePath}/predictive-maintenance`, {
      params: { vehicleId }
    });
  }

  // 사용자 관련 분석
  async getUserAnalytics(timeFrame: AnalyticsTimeFrame, dateRange?: AnalyticsDateRange): Promise<UserAnalyticsOverview> {
    return this.client.get<UserAnalyticsOverview>(`${this.basePath}/users/overview`, {
      params: {
        timeFrame,
        ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
      }
    });
  }

  // 정비소 관련 분석
  async getShopAnalytics(timeFrame: AnalyticsTimeFrame, dateRange?: AnalyticsDateRange): Promise<ShopAnalyticsOverview> {
    return this.client.get<ShopAnalyticsOverview>(`${this.basePath}/shops/overview`, {
      params: {
        timeFrame,
        ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
      }
    });
  }

  // 대시보드 관련 메서드
  
  // 대시보드 목록 조회
  async getDashboards(): Promise<AnalyticsDashboard[]> {
    return this.client.get<AnalyticsDashboard[]>(this.dashboardsPath);
  }

  // 특정 대시보드 조회
  async getDashboard(dashboardId: string): Promise<AnalyticsDashboard> {
    return this.client.get<AnalyticsDashboard>(`${this.dashboardsPath}/${dashboardId}`);
  }

  // 새 대시보드 생성
  async createDashboard(dashboard: CreateDashboardParams): Promise<AnalyticsDashboard> {
    return this.client.post<AnalyticsDashboard>(this.dashboardsPath, dashboard);
  }

  // 대시보드 업데이트
  async updateDashboard(dashboardId: string, updates: UpdateDashboardParams): Promise<AnalyticsDashboard> {
    return this.client.put<AnalyticsDashboard>(`${this.dashboardsPath}/${dashboardId}`, updates);
  }

  // 대시보드 삭제
  async deleteDashboard(dashboardId: string): Promise<void> {
    return this.client.delete(`${this.dashboardsPath}/${dashboardId}`);
  }

  // 위젯 관련 메서드
  
  // 대시보드에 위젯 추가
  async addWidgetToDashboard(dashboardId: string, widget: AddWidgetParams): Promise<DashboardWidget> {
    return this.client.post<DashboardWidget>(`${this.dashboardsPath}/${dashboardId}/widgets`, widget);
  }

  // 위젯 업데이트
  async updateWidget(dashboardId: string, widgetId: string, updates: UpdateWidgetParams): Promise<DashboardWidget> {
    return this.client.put<DashboardWidget>(`${this.dashboardsPath}/${dashboardId}/widgets/${widgetId}`, updates);
  }

  // 위젯 데이터 조회
  async getWidgetData(dashboardId: string, widgetId: string): Promise<AnalyticsResult> {
    return this.client.get<AnalyticsResult>(`${this.dashboardsPath}/${dashboardId}/widgets/${widgetId}/data`);
  }

  // 위젯 삭제
  async deleteWidget(dashboardId: string, widgetId: string): Promise<void> {
    return this.client.delete(`${this.dashboardsPath}/${dashboardId}/widgets/${widgetId}`);
  }

  // 리포트 관련 메서드
  
  // 리포트 생성
  async createReport(options: ReportOptions): Promise<AnalyticsReport> {
    return this.client.post<AnalyticsReport>(this.reportsPath, options);
  }

  // 리포트 목록 조회
  async getReports(filter?: ReportFilter): Promise<AnalyticsReport[]> {
    return this.client.get<AnalyticsReport[]>(this.reportsPath, { params: filter });
  }

  // 특정 리포트 조회
  async getReport(reportId: string): Promise<AnalyticsReport> {
    return this.client.get<AnalyticsReport>(`${this.reportsPath}/${reportId}`);
  }

  // 리포트 다운로드
  async downloadReport(reportId: string, format: ReportFormat = 'pdf'): Promise<Blob> {
    return this.client.get<Blob>(`${this.reportsPath}/${reportId}/download`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // 리포트 삭제
  async deleteReport(reportId: string): Promise<void> {
    return this.client.delete(`${this.reportsPath}/${reportId}`);
  }

  // 리포트 예약 설정
  async scheduleReport(reportId: string, schedule: ReportSchedule): Promise<AnalyticsReport> {
    return this.client.post<AnalyticsReport>(`${this.reportsPath}/${reportId}/schedule`, schedule);
  }

  // 데이터 내보내기
  async exportData(query: AnalyticsQuery, format: ExportFormat): Promise<Blob> {
    return this.client.post<Blob>(`${this.basePath}/export`, { query, format }, {
      responseType: 'blob'
    });
  }

  // 분석 설정 저장
  async saveAnalyticsSettings(settings: AnalyticsSettings): Promise<void> {
    return this.client.post(`${this.basePath}/settings`, settings);
  }

  // 최적화 제안 조회
  async getOptimizationSuggestions(): Promise<{
    costSavings: Array<{
      title: string;
      description: string;
      potentialSavings: number;
      confidence: number;
      implementationSteps: string[];
    }>;
    maintenanceOptimizations: Array<{
      title: string;
      description: string;
      benefit: string;
      vehicles: string[];
    }>;
    fleetOptimizations: Array<{
      title: string;
      description: string;
      impact: SeverityLevel;
      recommendation: string;
    }>;
  }> {
    return this.client.get(`${this.basePath}/optimization-suggestions`);
  }
} 