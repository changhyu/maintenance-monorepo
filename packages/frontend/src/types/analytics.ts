/**
 * 분석 데이터 관련 타입 정의
 */

/**
 * 분석 시간 프레임 열거형
 */
export enum AnalyticsTimeFrame {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

/**
 * 분석 카테고리 데이터 항목 인터페이스
 */
export interface AnalyticsCategoryItem {
  label: string;
  value: number;
}

/**
 * 분석 카테고리 데이터 인터페이스
 */
export interface AnalyticsCategory {
  data: AnalyticsCategoryItem[];
  total: number;
}

/**
 * 시계열 데이터 포인트 인터페이스
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

/**
 * 비용 분석 개요 인터페이스
 */
export interface CostAnalyticsOverview {
  totalCost: number;
  costChange: number;
  costTrend: TimeSeriesDataPoint[];
  costByCategory: AnalyticsCategory;
  averageCostPerVehicle: number;
  monthlyCosts: TimeSeriesDataPoint[];
}

/**
 * 차량 분석 개요 인터페이스
 */
export interface VehicleAnalyticsOverview {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  vehicleChange: number;
  vehiclesByCategory: AnalyticsCategory;
  vehicleHealthDistribution: AnalyticsCategory;
  averageAge: number;
  averageMileage: number;
}

/**
 * 정비 분석 개요 인터페이스
 */
export interface MaintenanceAnalyticsOverview {
  totalMaintenances: number;
  completedMaintenances: number;
  pendingMaintenances: number;
  maintenanceChange: number;
  maintenancesByType: AnalyticsCategory;
  maintenancesByPriority: AnalyticsCategory;
  averageCompletionTime: number;
  upcomingMaintenances: number;
} 