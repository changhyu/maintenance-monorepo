import { ReportType } from './reportService';
import { DashboardFilters } from '../components/DashboardFilter';
import { formatDate } from '../utils/date-utils';

// API 인터페이스 정의
interface AnalyticsDataPoint {
  label: string;
  value: number;
  date?: string;
  color?: string;
}

interface AnalyticsDataSeries {
  name: string;
  data: AnalyticsDataPoint[];
}

enum ApiAnalyticsTimeFrame {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

interface ApiVehicleAnalyticsOverview {
  totalVehicles: number;
  activeVehicles: number;
  newVehicles?: { percentage: number };
  averageAge: number;
  averageMileage: number;
  vehiclesByMake?: AnalyticsDataSeries;
}

interface ApiMaintenanceAnalyticsOverview {
  totalMaintenanceRecords: number;
  maintenanceCompletionRate?: number;
  costTrend?: { percentage: number };
  averageTimeBetweenMaintenance: number;
  maintenanceByType?: AnalyticsDataSeries;
}

interface ApiCostAnalyticsOverview {
  totalCost: number;
  costTrend?: {
    percentage: number;
    data?: { data: AnalyticsDataPoint[] };
  };
  costByCategory?: AnalyticsDataSeries;
  costByMonth?: { data: AnalyticsDataPoint[] };
  costPerVehicle?: { data: AnalyticsDataPoint[] };
}

// 프론트엔드 인터페이스 정의
interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

interface AnalyticsCategoryItem {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsCategory {
  data: AnalyticsCategoryItem[];
  total: number;
}

enum AnalyticsTimeFrame {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

interface VehicleAnalyticsOverview {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  vehicleChange: number;
  vehiclesByCategory: AnalyticsCategory;
  vehicleHealthDistribution: AnalyticsCategory;
  averageAge: number;
  averageMileage: number;
}

interface MaintenanceAnalyticsOverview {
  totalMaintenances: number;
  completedMaintenances: number;
  pendingMaintenances: number;
  maintenanceChange: number;
  maintenancesByType: AnalyticsCategory;
  maintenancesByPriority: AnalyticsCategory;
  averageCompletionTime: number;
  upcomingMaintenances: number;
}

interface CostAnalyticsOverview {
  totalCost: number;
  costChange: number;
  costTrend: TimeSeriesDataPoint[];
  costByCategory: AnalyticsCategory;
  averageCostPerVehicle: number;
  monthlyCosts: TimeSeriesDataPoint[];
}

// 보고서 필터 인터페이스 정의
export interface ReportFilter {
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
  vehicleIds?: string[];
  maintenanceTypes?: string[];
}

export interface DashboardCardData {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  color?: string;
  id?: string;
  label?: string;
  changeLabel?: string;
}

/**
 * 차트 데이터 아이템 타입
 */
export interface ChartDataItem {
  [key: string]: string | number | null;
}

/**
 * 차트 속성 타입
 */
export interface ChartProps {
  [key: string]: string | number | boolean;
}

/**
 * 대시보드 차트 데이터 인터페이스
 */
export interface DashboardChartData {
  // Recharts 라이브러리용 속성
  data?: ChartDataItem[];
  xAxisKey?: string;
  yAxisFormat?: (value: number | string) => string;
  tooltipFormat?: (value: number | string, name: string, props: ChartProps) => string | number;
  tooltipLabelFormat?: (label: string) => string;
  labelFormat?: (value: number | string, name: string, props: ChartProps) => string | number;
  series?: {
    dataKey: string;
    name: string;
  }[];

  // 기존 차트 라이브러리용 속성
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string[] | string;
    borderWidth?: number;
  }[];

  // 차트 타입 및 추가 속성
  type?: string; // 차트 타입 (line, bar, pie 등)
  xKey?: string; // X축 데이터 키
  yKeys?: string[]; // Y축 데이터 키 배열
  nameKey?: string; // 이름 필드 키
  valueKey?: string; // 값 필드 키
  colors?: string[]; // 색상 배열
  stacked?: boolean; // 누적 차트 여부
}

export interface PredictiveMaintenanceCard {
  vehicleId: string;
  vehicleName: string;
  component: string;
  probability: number;
  suggestedDate: string;
  severity: 'high' | 'medium' | 'low';
}

// 임시 모의 AnalyticsService 클래스
class AnalyticsService {
  constructor() {
    // 초기화 코드
  }

  async getVehicleAnalytics(
    timeFrame: ApiAnalyticsTimeFrame
  ): Promise<ApiVehicleAnalyticsOverview> {
    // 모의 데이터 반환
    return {
      totalVehicles: 120,
      activeVehicles: 90,
      newVehicles: { percentage: 5 },
      averageAge: 3.5,
      averageMileage: 50000,
      vehiclesByMake: {
        name: 'Vehicle by Make',
        data: [
          { label: 'Toyota', value: 40 },
          { label: 'Hyundai', value: 30 },
          { label: 'KIA', value: 25 },
          { label: 'Others', value: 25 }
        ]
      }
    };
  }

  async getMaintenanceAnalytics(
    timeFrame: ApiAnalyticsTimeFrame
  ): Promise<ApiMaintenanceAnalyticsOverview> {
    // 모의 데이터 반환
    return {
      totalMaintenanceRecords: 250,
      maintenanceCompletionRate: 0.75,
      costTrend: { percentage: 2.5 },
      averageTimeBetweenMaintenance: 45,
      maintenanceByType: {
        name: 'Maintenance by Type',
        data: [
          { label: 'Regular', value: 150 },
          { label: 'Repair', value: 70 },
          { label: 'Inspection', value: 30 }
        ]
      }
    };
  }

  async getCostAnalytics(timeFrame: ApiAnalyticsTimeFrame): Promise<ApiCostAnalyticsOverview> {
    // 모의 데이터 반환
    return {
      totalCost: 2500000,
      costTrend: {
        percentage: -1.5,
        data: {
          data: [
            { label: 'Jan', value: 180000, date: '2023-01-01' },
            { label: 'Feb', value: 210000, date: '2023-02-01' },
            { label: 'Mar', value: 195000, date: '2023-03-01' }
          ]
        }
      },
      costByCategory: {
        name: 'Cost by Category',
        data: [
          { label: 'Parts', value: 1200000 },
          { label: 'Labor', value: 800000 },
          { label: 'Misc', value: 500000 }
        ]
      },
      costByMonth: {
        data: [
          { label: 'Jan', value: 180000, date: '2023-01-01' },
          { label: 'Feb', value: 210000, date: '2023-02-01' },
          { label: 'Mar', value: 195000, date: '2023-03-01' }
        ]
      },
      costPerVehicle: {
        data: [{ label: 'Average', value: 20833 }]
      }
    };
  }
}

export class DashboardDataService {
  public analyticsService: AnalyticsService;
  public timeFrames = ApiAnalyticsTimeFrame;

  constructor() {
    // apiClient 없이 AnalyticsService 초기화
    this.analyticsService = new AnalyticsService();
  }

  // API 응답 데이터를 프론트엔드 타입으로 변환하는 메서드들
  public transformVehicleAnalytics(apiData: ApiVehicleAnalyticsOverview): VehicleAnalyticsOverview {
    // API 응답 데이터에서 필요한 정보 추출 및 변환
    const vehiclesByCategory: AnalyticsCategory = {
      data: this.transformDataSeriesToCategoryItems(apiData.vehiclesByMake),
      total: apiData.totalVehicles
    };

    const healthData = this.createHealthDistributionData(apiData);

    return {
      totalVehicles: apiData.totalVehicles,
      activeVehicles: apiData.activeVehicles,
      inactiveVehicles: apiData.totalVehicles - apiData.activeVehicles,
      vehicleChange: apiData.newVehicles?.percentage ?? 0,
      vehiclesByCategory: vehiclesByCategory,
      vehicleHealthDistribution: healthData,
      averageAge: apiData.averageAge,
      averageMileage: apiData.averageMileage
    };
  }

  public transformMaintenanceAnalytics(
    apiData: ApiMaintenanceAnalyticsOverview
  ): MaintenanceAnalyticsOverview {
    const maintenancesByType: AnalyticsCategory = {
      data: this.transformDataSeriesToCategoryItems(apiData.maintenanceByType),
      total: apiData.totalMaintenanceRecords
    };

    const maintenancesByPriority: AnalyticsCategory = {
      data: [
        { label: '높음', value: Math.round(apiData.totalMaintenanceRecords * 0.3) },
        { label: '중간', value: Math.round(apiData.totalMaintenanceRecords * 0.5) },
        { label: '낮음', value: Math.round(apiData.totalMaintenanceRecords * 0.2) }
      ],
      total: apiData.totalMaintenanceRecords
    };

    const completedMaintenances = Math.round(
      apiData.totalMaintenanceRecords * (apiData.maintenanceCompletionRate ?? 0)
    );

    return {
      totalMaintenances: apiData.totalMaintenanceRecords,
      completedMaintenances,
      pendingMaintenances: apiData.totalMaintenanceRecords - completedMaintenances,
      maintenanceChange: apiData.costTrend?.percentage ?? 0,
      maintenancesByType: maintenancesByType,
      maintenancesByPriority: maintenancesByPriority,
      averageCompletionTime: apiData.averageTimeBetweenMaintenance,
      upcomingMaintenances: Math.round(apiData.totalMaintenanceRecords * 0.1) // 예상치
    };
  }

  public transformCostAnalytics(apiData: ApiCostAnalyticsOverview): CostAnalyticsOverview {
    const costByCategory: AnalyticsCategory = {
      data: this.transformDataSeriesToCategoryItems(apiData.costByCategory),
      total: apiData.totalCost
    };

    // data.data가 undefined일 수 있으므로 안전하게 처리
    const costTrend: TimeSeriesDataPoint[] = [];
    if (apiData.costTrend?.data?.data) {
      apiData.costTrend.data.data.forEach(point => {
        if (point.date !== undefined && point.value !== undefined) {
          costTrend.push({
            date: point.date,
            value: point.value
          });
        }
      });
    }

    // data가 undefined일 수 있으므로 안전하게 처리
    const monthlyCosts: TimeSeriesDataPoint[] = [];
    if (apiData.costByMonth?.data) {
      apiData.costByMonth.data.forEach(point => {
        if (point.date !== undefined && point.value !== undefined) {
          monthlyCosts.push({
            date: point.date,
            value: point.value
          });
        }
      });
    }

    let averageCostPerVehicle = 0;
    if (apiData.costPerVehicle?.data && apiData.costPerVehicle.data.length > 0) {
      averageCostPerVehicle = apiData.costPerVehicle.data[0].value;
    }

    return {
      totalCost: apiData.totalCost,
      costChange: apiData.costTrend?.percentage ?? 0,
      costTrend,
      costByCategory,
      averageCostPerVehicle,
      monthlyCosts
    };
  }

  // 유틸리티 메서드: AnalyticsDataSeries를 AnalyticsCategoryItem[]으로 변환
  private transformDataSeriesToCategoryItems(
    series: AnalyticsDataSeries | undefined
  ): AnalyticsCategoryItem[] {
    if (!series || !series.data) {
      return [];
    }

    return series.data.map(point => ({
      label: point.label,
      value: point.value
    }));
  }

  // 차량 건강 상태 분포 데이터 생성
  private createHealthDistributionData(apiData: ApiVehicleAnalyticsOverview): AnalyticsCategory {
    // 예시 데이터 생성 (실제로는 API 응답에서 추출해야 함)
    const total = apiData.totalVehicles;
    const healthData: AnalyticsCategoryItem[] = [
      { label: '양호', value: Math.round(total * 0.6) },
      { label: '주의', value: Math.round(total * 0.3) },
      { label: '위험', value: Math.round(total * 0.1) }
    ];

    return {
      data: healthData,
      total
    };
  }

  // 대시보드 개요 데이터 가져오기
  async getOverviewData(): Promise<DashboardCardData[]> {
    try {
      const apiVehicleData = await this.analyticsService.getVehicleAnalytics(
        ApiAnalyticsTimeFrame.MONTH
      );
      const apiMaintenanceData = await this.analyticsService.getMaintenanceAnalytics(
        ApiAnalyticsTimeFrame.MONTH
      );
      const apiCostData = await this.analyticsService.getCostAnalytics(ApiAnalyticsTimeFrame.MONTH);

      // API 응답 데이터를 프론트엔드 타입으로 변환
      const vehicleData = this.transformVehicleAnalytics(apiVehicleData);
      const maintenanceData = this.transformMaintenanceAnalytics(apiMaintenanceData);
      const costData = this.transformCostAnalytics(apiCostData);

      return this.transformOverviewData(vehicleData, maintenanceData, costData);
    } catch (error) {
      console.error('대시보드 데이터 조회 중 오류 발생:', error);
      return this.getFallbackOverviewData();
    }
  }

  // 대시보드 개요 데이터 변환
  private transformOverviewData(
    vehicleData: VehicleAnalyticsOverview,
    maintenanceData: MaintenanceAnalyticsOverview,
    costData: CostAnalyticsOverview
  ): DashboardCardData[] {
    return [
      {
        title: '전체 차량',
        value: vehicleData.totalVehicles,
        change: vehicleData.vehicleChange,
        trend:
          vehicleData.vehicleChange > 0 ? 'up' : vehicleData.vehicleChange < 0 ? 'down' : 'neutral',
        icon: 'car',
        color: 'blue'
      },
      {
        title: '정비 중인 차량',
        value: maintenanceData.pendingMaintenances,
        change: this.calculatePercentChange(
          maintenanceData.pendingMaintenances,
          maintenanceData.totalMaintenances - maintenanceData.pendingMaintenances
        ),
        trend: 'neutral',
        icon: 'tools',
        color: 'orange'
      },
      {
        title: '평균 차량 상태',
        value: this.calculateAverageHealthScore(vehicleData.vehicleHealthDistribution),
        change: 0, // 이전 데이터와 비교하려면 히스토리 데이터 필요
        trend: 'up',
        icon: 'heartbeat',
        color: 'green'
      },
      {
        title: '이번 달 비용',
        value: this.formatCurrency(costData.totalCost),
        change: costData.costChange,
        trend: costData.costChange > 0 ? 'up' : costData.costChange < 0 ? 'down' : 'neutral',
        icon: 'money-bill',
        color: 'red'
      }
    ];
  }

  // 차량 데이터 가져오기
  async getVehicleData(): Promise<{
    cards: DashboardCardData[];
    charts: { [key: string]: DashboardChartData };
  }> {
    try {
      const apiVehicleData = await this.analyticsService.getVehicleAnalytics(
        ApiAnalyticsTimeFrame.MONTH
      );
      const vehicleData = this.transformVehicleAnalytics(apiVehicleData);

      return {
        cards: this.transformVehicleCards(vehicleData),
        charts: {
          vehicleTypeDistribution: this.getVehicleTypeDistributionChart(vehicleData),
          vehicleHealthDistribution: this.getVehicleHealthDistributionChart(vehicleData),
          vehicleAgeDistribution: this.getVehicleAgeDistributionChart()
        }
      };
    } catch (error) {
      console.error('차량 데이터 조회 중 오류 발생:', error);
      return this.getFallbackVehicleData();
    }
  }

  private transformVehicleCards(vehicleData: VehicleAnalyticsOverview): DashboardCardData[] {
    return [
      {
        title: '활성 차량',
        value: vehicleData.activeVehicles,
        change: this.calculatePercentChange(vehicleData.activeVehicles, vehicleData.totalVehicles),
        trend: 'up',
        icon: 'check-circle',
        color: 'green'
      },
      {
        title: '비활성 차량',
        value: vehicleData.inactiveVehicles,
        change: this.calculatePercentChange(
          vehicleData.inactiveVehicles,
          vehicleData.totalVehicles
        ),
        trend: 'down',
        icon: 'times-circle',
        color: 'red'
      },
      {
        title: '평균 차량 연령',
        value: `${vehicleData.averageAge}년`,
        change: 0,
        trend: 'neutral',
        icon: 'calendar',
        color: 'blue'
      },
      {
        title: '평균 주행거리',
        value: this.formatNumber(vehicleData.averageMileage) + 'km',
        change: 0,
        trend: 'neutral',
        icon: 'road',
        color: 'purple'
      }
    ];
  }

  private getVehicleTypeDistributionChart(
    vehicleData: VehicleAnalyticsOverview
  ): DashboardChartData {
    const category = vehicleData.vehiclesByCategory;

    return {
      labels: category.data.map(item => item.label),
      datasets: [
        {
          label: '차량 유형 분포',
          data: category.data.map(item => item.value),
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  private getVehicleHealthDistributionChart(
    vehicleData: VehicleAnalyticsOverview
  ): DashboardChartData {
    const category = vehicleData.vehicleHealthDistribution;

    return {
      labels: category.data.map(item => item.label),
      datasets: [
        {
          label: '차량 상태 분포',
          data: category.data.map(item => item.value),
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 99, 132, 0.6)'
          ],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1
        }
      ]
    };
  }

  private getVehicleAgeDistributionChart(): DashboardChartData {
    // 이 메서드는 실제 데이터가 없는 경우에 대비한 가상의 데이터를 반환합니다
    // 실제 구현에서는 API에서 데이터를 가져와야 합니다
    return {
      labels: ['0-2년', '3-5년', '6-8년', '9년 이상'],
      datasets: [
        {
          label: '차량 연령 분포',
          data: [15, 25, 10, 5],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  // 정비 데이터 가져오기
  async getMaintenanceData(): Promise<{
    cards: DashboardCardData[];
    charts: { [key: string]: DashboardChartData };
  }> {
    try {
      const apiMaintenanceData = await this.analyticsService.getMaintenanceAnalytics(
        ApiAnalyticsTimeFrame.MONTH
      );
      const maintenanceData = this.transformMaintenanceAnalytics(apiMaintenanceData);

      return {
        cards: this.transformMaintenanceCards(maintenanceData),
        charts: {
          maintenanceTypeDistribution: this.getMaintenanceTypeDistributionChart(maintenanceData),
          maintenancePriorityDistribution:
            this.getMaintenancePriorityDistributionChart(maintenanceData),
          maintenanceTrend: this.getMaintenanceTrendChart()
        }
      };
    } catch (error) {
      console.error('정비 데이터 조회 중 오류 발생:', error);
      return this.getFallbackMaintenanceData();
    }
  }

  private transformMaintenanceCards(
    maintenanceData: MaintenanceAnalyticsOverview
  ): DashboardCardData[] {
    return [
      {
        title: '완료된 정비',
        value: maintenanceData.completedMaintenances,
        change: this.calculatePercentChange(
          maintenanceData.completedMaintenances,
          maintenanceData.totalMaintenances
        ),
        trend: 'up',
        icon: 'check',
        color: 'green'
      },
      {
        title: '대기 중인 정비',
        value: maintenanceData.pendingMaintenances,
        change: this.calculatePercentChange(
          maintenanceData.pendingMaintenances,
          maintenanceData.totalMaintenances
        ),
        trend: 'neutral',
        icon: 'clock',
        color: 'orange'
      },
      {
        title: '평균 완료 시간',
        value: `${maintenanceData.averageCompletionTime}일`,
        change: 0,
        trend: 'down',
        icon: 'hourglass',
        color: 'blue'
      },
      {
        title: '예정된 정비',
        value: maintenanceData.upcomingMaintenances,
        change: 0,
        trend: 'up',
        icon: 'calendar-check',
        color: 'purple'
      }
    ];
  }

  private getMaintenanceTypeDistributionChart(
    maintenanceData: MaintenanceAnalyticsOverview
  ): DashboardChartData {
    const category = maintenanceData.maintenancesByType;

    return {
      labels: category.data.map(item => item.label),
      datasets: [
        {
          label: '정비 유형 분포',
          data: category.data.map(item => item.value),
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  private getMaintenancePriorityDistributionChart(
    maintenanceData: MaintenanceAnalyticsOverview
  ): DashboardChartData {
    const category = maintenanceData.maintenancesByPriority;

    return {
      labels: category.data.map(item => item.label),
      datasets: [
        {
          label: '정비 우선순위 분포',
          data: category.data.map(item => item.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
          ],
          borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)'],
          borderWidth: 1
        }
      ]
    };
  }

  private getMaintenanceTrendChart(): DashboardChartData {
    // 이 메서드는 실제 데이터가 없는 경우에 대비한 가상의 데이터를 반환합니다
    // 실제 구현에서는 API에서 데이터를 가져와야 합니다
    return {
      labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
      datasets: [
        {
          label: '완료된 정비',
          data: [12, 19, 8, 15, 12, 8],
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: '대기 중인 정비',
          data: [7, 11, 5, 8, 3, 9],
          backgroundColor: 'rgba(255, 206, 86, 0.6)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  // 차량 관리 데이터 가져오기
  async getFleetData(): Promise<{
    cards: DashboardCardData[];
    charts: { [key: string]: DashboardChartData };
  }> {
    try {
      const apiVehicleData = await this.analyticsService.getVehicleAnalytics(
        ApiAnalyticsTimeFrame.MONTH
      );
      const apiCostData = await this.analyticsService.getCostAnalytics(ApiAnalyticsTimeFrame.MONTH);

      const vehicleData = this.transformVehicleAnalytics(apiVehicleData);
      const costData = this.transformCostAnalytics(apiCostData);

      return {
        cards: this.transformFleetCards(vehicleData, costData),
        charts: {
          costTrend: this.getCostTrendChart(costData),
          costByCategory: this.getCostByCategoryChart(costData),
          fleetUtilization: this.getFleetUtilizationChart()
        }
      };
    } catch (error) {
      console.error('차량 관리 데이터 조회 중 오류 발생:', error);
      return this.getFallbackFleetData();
    }
  }

  private transformFleetCards(
    vehicleData: VehicleAnalyticsOverview,
    costData: CostAnalyticsOverview
  ): DashboardCardData[] {
    return [
      {
        title: '총 차량 수',
        value: vehicleData.totalVehicles,
        change: vehicleData.vehicleChange,
        trend:
          vehicleData.vehicleChange > 0 ? 'up' : vehicleData.vehicleChange < 0 ? 'down' : 'neutral',
        icon: 'car',
        color: 'blue'
      },
      {
        title: '총 운영 비용',
        value: this.formatCurrency(costData.totalCost),
        change: costData.costChange,
        trend: costData.costChange > 0 ? 'up' : costData.costChange < 0 ? 'down' : 'neutral',
        icon: 'money-bill',
        color: 'red'
      },
      {
        title: '차량당 평균 비용',
        value: this.formatCurrency(costData.averageCostPerVehicle),
        change: 0,
        trend: 'neutral',
        icon: 'chart-line',
        color: 'purple'
      },
      {
        title: '평균 차량 상태',
        value: this.calculateAverageHealthScore(vehicleData.vehicleHealthDistribution),
        change: 0,
        trend: 'up',
        icon: 'heartbeat',
        color: 'green'
      }
    ];
  }

  private getCostTrendChart(costData: CostAnalyticsOverview): DashboardChartData {
    const data = costData.monthlyCosts;

    return {
      labels: data.map(item => item.date),
      datasets: [
        {
          label: '월별 비용 추이',
          data: data.map(item => item.value),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  private getCostByCategoryChart(costData: CostAnalyticsOverview): DashboardChartData {
    const category = costData.costByCategory;

    return {
      labels: category.data.map(item => item.label),
      datasets: [
        {
          label: '비용 카테고리별 분포',
          data: category.data.map(item => item.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  private getFleetUtilizationChart(): DashboardChartData {
    // 이 메서드는 실제 데이터가 없는 경우에 대비한 가상의 데이터를 반환합니다
    // 실제 구현에서는 API에서 데이터를 가져와야 합니다
    return {
      labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
      datasets: [
        {
          label: '차량 활용률 (%)',
          data: [75, 68, 82, 79, 85, 87],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  // 예측 정비 데이터 가져오기
  async getPredictiveMaintenanceData(): Promise<{
    cards: PredictiveMaintenanceCard[];
  }> {
    try {
      // 이 부분은 실제 API가 구현되면 그 데이터를 활용해야 합니다
      // 지금은 가상의 데이터를 반환합니다
      return {
        cards: this.getPredictiveMaintenanceCards()
      };
    } catch (error) {
      console.error('예측 정비 데이터 조회 중 오류 발생:', error);
      return { cards: [] };
    }
  }

  private getPredictiveMaintenanceCards(): PredictiveMaintenanceCard[] {
    return [
      {
        vehicleId: 'V001',
        vehicleName: '현대 투싼 #1432',
        component: '브레이크 패드',
        probability: 85,
        suggestedDate: '2023-06-15',
        severity: 'high'
      },
      {
        vehicleId: 'V002',
        vehicleName: '기아 스포티지 #2201',
        component: '배터리',
        probability: 72,
        suggestedDate: '2023-06-22',
        severity: 'medium'
      },
      {
        vehicleId: 'V003',
        vehicleName: '쉐보레 말리부 #3105',
        component: '연료 필터',
        probability: 65,
        suggestedDate: '2023-07-05',
        severity: 'medium'
      },
      {
        vehicleId: 'V004',
        vehicleName: '르노 SM6 #4256',
        component: '타이어',
        probability: 58,
        suggestedDate: '2023-07-12',
        severity: 'low'
      }
    ];
  }

  // 유틸리티 메서드
  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round((current / previous - 1) * 100);
  }

  private calculateAverageHealthScore(healthDistribution: AnalyticsCategory): string {
    const totalVehicles = healthDistribution.total;
    if (totalVehicles === 0) return '0%';

    let weightedSum = 0;
    healthDistribution.data.forEach(item => {
      let weight = 0;
      const label = item.label.toLowerCase();
      if (label === '좋음' || label === '양호') {
        weight = 100;
      } else if (label === '보통') {
        weight = 70;
      } else if (label === '주의') {
        weight = 40;
      } else if (label === '위험') {
        weight = 10;
      }
      weightedSum += item.value * weight;
    });

    return `${Math.round(weightedSum / totalVehicles)}%`;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private formatCurrency(num: number): string {
    return `₩${num.toLocaleString()}`;
  }

  // 폴백 데이터 메서드들 (API 호출 실패 시 사용)
  private getFallbackOverviewData(): DashboardCardData[] {
    return [
      { title: '전체 차량', value: 55, change: 10, trend: 'up', icon: 'car', color: 'blue' },
      {
        title: '정비 중인 차량',
        value: 8,
        change: -5,
        trend: 'down',
        icon: 'tools',
        color: 'orange'
      },
      {
        title: '평균 차량 상태',
        value: '85%',
        change: 2,
        trend: 'up',
        icon: 'heartbeat',
        color: 'green'
      },
      {
        title: '이번 달 비용',
        value: '₩32,450,000',
        change: 8,
        trend: 'up',
        icon: 'money-bill',
        color: 'red'
      }
    ];
  }

  private getFallbackVehicleData(): {
    cards: DashboardCardData[];
    charts: { [key: string]: DashboardChartData };
  } {
    return {
      cards: [
        {
          title: '활성 차량',
          value: 48,
          change: 5,
          trend: 'up',
          icon: 'check-circle',
          color: 'green'
        },
        {
          title: '비활성 차량',
          value: 7,
          change: -2,
          trend: 'down',
          icon: 'times-circle',
          color: 'red'
        },
        {
          title: '평균 차량 연령',
          value: '3.5년',
          change: 0,
          trend: 'neutral',
          icon: 'calendar',
          color: 'blue'
        },
        {
          title: '평균 주행거리',
          value: '45,000km',
          change: 0,
          trend: 'neutral',
          icon: 'road',
          color: 'purple'
        }
      ],
      charts: {
        vehicleTypeDistribution: {
          labels: ['승용차', 'SUV', '밴', '트럭', '기타'],
          datasets: [
            {
              label: '차량 유형 분포',
              data: [20, 15, 10, 8, 2],
              backgroundColor: [
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)'
              ],
              borderWidth: 1
            }
          ]
        },
        vehicleHealthDistribution: {
          labels: ['좋음', '보통', '주의'],
          datasets: [
            {
              label: '차량 상태 분포',
              data: [35, 15, 5],
              backgroundColor: [
                'rgba(75, 192, 192, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(255, 99, 132, 0.6)'
              ],
              borderWidth: 1
            }
          ]
        },
        vehicleAgeDistribution: {
          labels: ['0-2년', '3-5년', '6-8년', '9년 이상'],
          datasets: [
            {
              label: '차량 연령 분포',
              data: [15, 25, 10, 5],
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderWidth: 1
            }
          ]
        }
      }
    };
  }

  private getFallbackMaintenanceData(): {
    cards: DashboardCardData[];
    charts: { [key: string]: DashboardChartData };
  } {
    return {
      cards: [
        { title: '완료된 정비', value: 120, change: 8, trend: 'up', icon: 'check', color: 'green' },
        {
          title: '대기 중인 정비',
          value: 15,
          change: -10,
          trend: 'down',
          icon: 'clock',
          color: 'orange'
        },
        {
          title: '평균 완료 시간',
          value: '3.2일',
          change: -5,
          trend: 'down',
          icon: 'hourglass',
          color: 'blue'
        },
        {
          title: '예정된 정비',
          value: 22,
          change: 10,
          trend: 'up',
          icon: 'calendar-check',
          color: 'purple'
        }
      ],
      charts: {
        maintenanceTypeDistribution: {
          labels: ['정기 점검', '부품 교체', '고장 수리', '타이어', '기타'],
          datasets: [
            {
              label: '정비 유형 분포',
              data: [45, 30, 15, 20, 10],
              backgroundColor: [
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)'
              ],
              borderWidth: 1
            }
          ]
        },
        maintenancePriorityDistribution: {
          labels: ['높음', '중간', '낮음'],
          datasets: [
            {
              label: '정비 우선순위 분포',
              data: [25, 40, 55],
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)'
              ],
              borderWidth: 1
            }
          ]
        },
        maintenanceTrend: {
          labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
          datasets: [
            {
              label: '완료된 정비',
              data: [12, 19, 8, 15, 12, 8],
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderWidth: 1
            },
            {
              label: '대기 중인 정비',
              data: [7, 11, 5, 8, 3, 9],
              backgroundColor: 'rgba(255, 206, 86, 0.6)',
              borderWidth: 1
            }
          ]
        }
      }
    };
  }

  private getFallbackFleetData(): {
    cards: DashboardCardData[];
    charts: { [key: string]: DashboardChartData };
  } {
    return {
      cards: [
        { title: '총 차량 수', value: 55, change: 10, trend: 'up', icon: 'car', color: 'blue' },
        {
          title: '총 운영 비용',
          value: '₩152,350,000',
          change: 5,
          trend: 'up',
          icon: 'money-bill',
          color: 'red'
        },
        {
          title: '차량당 평균 비용',
          value: '₩2,770,000',
          change: -2,
          trend: 'down',
          icon: 'chart-line',
          color: 'purple'
        },
        {
          title: '평균 차량 상태',
          value: '85%',
          change: 2,
          trend: 'up',
          icon: 'heartbeat',
          color: 'green'
        }
      ],
      charts: {
        costTrend: {
          labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
          datasets: [
            {
              label: '월별 비용 추이',
              data: [25000000, 22000000, 28000000, 24000000, 30000000, 32000000],
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              borderWidth: 1
            }
          ]
        },
        costByCategory: {
          labels: ['연료', '정비', '보험', '감가상각', '기타'],
          datasets: [
            {
              label: '비용 카테고리별 분포',
              data: [45000000, 35000000, 30000000, 25000000, 15000000],
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)'
              ],
              borderWidth: 1
            }
          ]
        },
        fleetUtilization: {
          labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
          datasets: [
            {
              label: '차량 활용률 (%)',
              data: [75, 68, 82, 79, 85, 87],
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderWidth: 1
            }
          ]
        }
      }
    };
  }

  // 차량 유형별 분포 차트 데이터 포맷팅
  formatVehicleTypeChartData(vehicleData: VehicleAnalyticsOverview) {
    if (!vehicleData.vehiclesByCategory || !vehicleData.vehiclesByCategory.data) {
      return [];
    }

    return vehicleData.vehiclesByCategory.data.map(item => ({
      label: item.label,
      value: item.value
    }));
  }

  // 정비 상태별 분포 차트 데이터 포맷팅
  formatMaintenanceStatusChartData(maintenanceData: MaintenanceAnalyticsOverview) {
    if (!maintenanceData.maintenancesByType || !maintenanceData.maintenancesByType.data) {
      return [];
    }

    return maintenanceData.maintenancesByType.data.map(item => ({
      label: item.label,
      value: item.value
    }));
  }

  // 정비 우선순위별 분포 차트 데이터 포맷팅
  formatMaintenancePriorityChartData(maintenanceData: MaintenanceAnalyticsOverview) {
    if (!maintenanceData.maintenancesByPriority || !maintenanceData.maintenancesByPriority.data) {
      return [];
    }

    return maintenanceData.maintenancesByPriority.data.map(item => ({
      label: item.label,
      value: item.value
    }));
  }

  // 정비 추이 차트 데이터 포맷팅
  formatMaintenanceTrendChartData() {
    // 임시 데이터 반환
    return [
      { date: '1월', completed: 12, pending: 7 },
      { date: '2월', completed: 19, pending: 11 },
      { date: '3월', completed: 8, pending: 5 },
      { date: '4월', completed: 15, pending: 8 },
      { date: '5월', completed: 12, pending: 3 },
      { date: '6월', completed: 8, pending: 9 }
    ];
  }

  /**
   * 필터를 적용하여 대시보드 데이터를 가져오는 메서드
   */
  async getFilteredDashboardData(filters: DashboardFilters) {
    try {
      // 날짜 범위가 있는 경우만 처리
      let startDateStr = '';
      let endDateStr = '';

      if (filters.dateRange) {
        if (filters.dateRange.startDate) {
          startDateStr =
            typeof filters.dateRange.startDate === 'string'
              ? filters.dateRange.startDate
              : (filters.dateRange.startDate as Date).toISOString();
        }

        if (filters.dateRange.endDate) {
          endDateStr =
            typeof filters.dateRange.endDate === 'string'
              ? filters.dateRange.endDate
              : (filters.dateRange.endDate as Date).toISOString();
        }
      }

      // 나머지 필터링 로직...
    } catch (error) {
      console.error('필터링된 대시보드 데이터 가져오기 오류:', error);
    }
  }

  /**
   * 보고서 대시보드 카드 데이터 가져오기
   */
  async getReportOverviewData(): Promise<DashboardCardData[]> {
    try {
      // API 연동 시 실제 호출로 변경
      // const response = await this.analyticsService.getReportOverviewData();
      // return this.transformReportOverviewData(response);

      // 임시 데이터
      return this.generateRandomReportOverviewData();
    } catch (error) {
      console.error('보고서 개요 데이터 가져오기 오류:', error);
      return this.getFallbackReportOverviewData();
    }
  }

  /**
   * 보고서 차트 데이터 조회
   */
  public async getReportChartData(
    reportType: string,
    filters?: ReportFilter
  ): Promise<DashboardChartData> {
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 필터에서 날짜 범위 추출
      const { startDate, endDate } = filters?.dateRange || { startDate: null, endDate: null };

      let startDateObj: Date | null = null;
      let endDateObj: Date | null = null;

      try {
        // 날짜 문자열을 Date 객체로 변환 (오류 방지)
        if (startDate) startDateObj = new Date(startDate);
        if (endDate) endDateObj = new Date(endDate);
      } catch (error) {
        console.error('날짜 변환 오류:', error);
      }

      // 보고서 유형에 따라 차트 데이터 반환
      switch (reportType) {
        case 'completion-rate':
          return this.getCompletionRateChartData(startDateObj, endDateObj);
        case 'cost-analysis':
          return this.getCostAnalysisChartData(startDateObj, endDateObj);
        case 'maintenance-summary':
          return this.getMaintenanceSummaryChartData(startDateObj, endDateObj);
        case 'vehicle-history':
          // 차량 ID 확인 (배열의 첫 번째 항목 사용)
          const vehicleId =
            filters?.vehicleIds && filters.vehicleIds.length > 0 ? filters.vehicleIds[0] : '';
          return this.getVehicleHistoryChartData(vehicleId, startDateObj, endDateObj);
        case 'maintenance-forecast':
          return this.getMaintenanceForecastChartData(startDateObj, endDateObj);
        default:
          return this.getFallbackChartData();
      }
    } catch (error) {
      console.error('차트 데이터 조회 오류:', error);
      return this.getFallbackChartData();
    }
  }

  /**
   * 완료율 차트 데이터 생성
   */
  private getCompletionRateChartData(
    startDate: Date | null,
    endDate: Date | null
  ): DashboardChartData {
    // 데이터 생성 로직...
    const now = new Date();
    const monthsData = [];

    // 시작일과 종료일이 있는 경우만 계산
    if (startDate && endDate) {
      const months = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      for (let i = 0; i <= months; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);

        // 각 월별 임의 데이터 생성
        monthsData.push({
          month: formatDate(date, 'yyyy-MM'),
          완료율: Math.floor(Math.random() * 30) + 70,
          계획: Math.floor(Math.random() * 20) + 80
        });
      }
    } else {
      // 기본 데이터 (6개월)
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        monthsData.push({
          month: formatDate(date, 'yyyy-MM'),
          완료율: Math.floor(Math.random() * 30) + 70,
          계획: Math.floor(Math.random() * 20) + 80
        });
      }
    }

    return {
      type: 'line',
      data: monthsData,
      xAxisKey: 'month',
      yAxisFormat: value => `${value}%`,
      tooltipFormat: value => `${value}%`,
      colors: ['#52c41a', '#1890ff'],
      series: [
        { dataKey: '완료율', name: '완료율' },
        { dataKey: '계획', name: '계획' }
      ]
    };
  }

  /**
   * 비용 분석 차트 데이터 생성
   */
  private getCostAnalysisChartData(
    startDate: Date | null,
    endDate: Date | null
  ): DashboardChartData {
    // 비용 분석 차트 데이터
    const costData = [];

    // 시작일과 종료일이 있는 경우만 계산
    if (startDate && endDate) {
      const months = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      for (let i = 0; i <= months; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);

        costData.push({
          month: formatDate(date, 'yyyy-MM'),
          부품비: Math.floor(Math.random() * 500000) + 100000,
          인건비: Math.floor(Math.random() * 300000) + 200000,
          기타: Math.floor(Math.random() * 200000) + 50000
        });
      }
    } else {
      // 기본 데이터 (6개월)
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        costData.push({
          month: formatDate(date, 'yyyy-MM'),
          부품비: Math.floor(Math.random() * 500000) + 100000,
          인건비: Math.floor(Math.random() * 300000) + 200000,
          기타: Math.floor(Math.random() * 200000) + 50000
        });
      }
    }

    return {
      data: costData,
      type: 'bar',
      xAxisKey: 'month',
      yAxisFormat: value => `${value.toLocaleString()}원`,
      tooltipFormat: value => `${value.toLocaleString()}원`,
      colors: ['#1890ff', '#13c2c2', '#faad14'],
      stacked: true,
      series: [
        { dataKey: '부품비', name: '부품비' },
        { dataKey: '인건비', name: '인건비' },
        { dataKey: '기타', name: '기타' }
      ]
    };
  }

  /**
   * 정비 요약 차트 데이터 생성
   */
  private getMaintenanceSummaryChartData(
    startDate: Date | null,
    endDate: Date | null
  ): DashboardChartData {
    // 정비 유형별 데이터
    const pieData = [
      { type: '정기 점검', value: Math.floor(Math.random() * 30) + 40 },
      { type: '고장 수리', value: Math.floor(Math.random() * 20) + 20 },
      { type: '부품 교체', value: Math.floor(Math.random() * 15) + 15 },
      { type: '기타', value: Math.floor(Math.random() * 10) + 5 }
    ];

    return {
      type: 'pie',
      data: pieData,
      nameKey: 'type',
      valueKey: 'value',
      colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d'],
      labelFormat: (value, name) => `${name}: ${value}건`
    };
  }

  /**
   * 차량 정비 이력 차트 데이터 생성
   */
  private getVehicleHistoryChartData(
    vehicleId: string,
    startDate: Date | null,
    endDate: Date | null
  ): DashboardChartData {
    // 차량 ID가 없으면 빈 데이터 반환
    if (!vehicleId) {
      return {
        data: [],
        type: 'bar',
        xAxisKey: 'date',
        labelFormat: value => `${value}`,
        colors: ['#8884d8', '#82ca9d', '#ffc658'],
        series: [{ dataKey: 'cost', name: '비용' }]
      };
    }

    // 임의의 차트 데이터 생성
    const data = [];
    const now = new Date();
    const monthNames = [
      '1월',
      '2월',
      '3월',
      '4월',
      '5월',
      '6월',
      '7월',
      '8월',
      '9월',
      '10월',
      '11월',
      '12월'
    ];

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      data.push({
        date: monthNames[date.getMonth()],
        cost: Math.floor(Math.random() * 300000) + 50000,
        count: Math.floor(Math.random() * 5) + 1
      });
    }

    return {
      data,
      type: 'bar',
      xAxisKey: 'date',
      yAxisFormat: value => `${value.toLocaleString()}원`,
      tooltipFormat: value => `${value.toLocaleString()}원`,
      colors: ['#8884d8', '#82ca9d'],
      series: [
        { dataKey: 'cost', name: '비용' },
        { dataKey: 'count', name: '정비 건수' }
      ]
    };
  }

  /**
   * 정비 예측 차트 데이터 생성
   */
  private getMaintenanceForecastChartData(
    startDate: Date | null,
    endDate: Date | null
  ): DashboardChartData {
    const data = [];
    const components = ['엔진', '브레이크', '타이어', '배터리', '변속기', '에어컨'];

    for (const component of components) {
      data.push({
        name: component,
        probability: Math.random() * 100,
        urgency: Math.floor(Math.random() * 10) + 1
      });
    }

    return {
      data,
      type: 'bar',
      xAxisKey: 'name',
      yAxisFormat: (value: number | string) => {
        return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;
      },
      tooltipFormat: (value: number | string) => {
        return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;
      },
      labelFormat: (value: number | string) => {
        return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;
      },
      colors: ['#ff7300', '#0088FE'],
      series: [{ dataKey: 'probability', name: '고장 확률' }]
    };
  }

  /**
   * 랜덤 보고서 개요 데이터 생성
   */
  private generateRandomReportOverviewData(): Array<{
    title: string;
    value: string;
    id: string;
  }> {
    // 숫자 타입을 명확히 하여 toFixed 메서드 사용
    const totalVehicles = Math.floor(Math.random() * 500) + 100;
    const activeVehicles = Math.floor(totalVehicles * 0.8);
    const inactiveVehicles = totalVehicles - activeVehicles;
    const totalMaintenance = Math.floor(Math.random() * 200) + 50;
    const completedMaintenance = Math.floor(totalMaintenance * 0.7);
    const pendingMaintenance = totalMaintenance - completedMaintenance;
    const totalCost = Math.floor(Math.random() * 10000000) + 1000000;
    const vehicleUtilization = Math.random() * 30 + 60;
    const fuelEfficiency = Math.random() * 5 + 10;
    const healthScore = Math.random() * 30 + 65;

    return [
      {
        title: '차량 활용도',
        value: `${vehicleUtilization.toFixed(1)}%`,
        id: 'vehicle-utilization'
      },
      {
        title: '연료 효율',
        value: `${fuelEfficiency.toFixed(1)} km/L`,
        id: 'fuel-efficiency'
      },
      {
        title: '차량 건강 점수',
        value: `${healthScore.toFixed(0)}%`,
        id: 'health-score'
      }
    ];
  }

  /**
   * 기본 차트 데이터를 가져옵니다 (오류 시 사용)
   * @private
   */
  private getFallbackChartData(): DashboardChartData {
    return {
      type: 'line',
      data: [
        { month: '2023-06', 값: 10 },
        { month: '2023-07', 값: 15 },
        { month: '2023-08', 값: 12 },
        { month: '2023-09', 값: 18 },
        { month: '2023-10', 값: 20 },
        { month: '2023-11', 값: 22 }
      ],
      xKey: 'month',
      yKeys: ['값'],
      colors: ['#1890ff']
    };
  }

  /**
   * 임시 보고서 개요 데이터 (폴백)
   */
  private getFallbackReportOverviewData(): DashboardCardData[] {
    return [
      {
        title: '생성된 보고서',
        value: 25,
        change: 0,
        trend: 'neutral',
        icon: 'file',
        color: 'blue'
      },
      {
        title: '월간 완료율',
        value: '80%',
        change: 0,
        trend: 'neutral',
        icon: 'chart',
        color: 'green'
      },
      {
        title: '예정된 정비',
        value: 5,
        change: 0,
        trend: 'neutral',
        icon: 'calendar',
        color: 'orange'
      },
      {
        title: '월간 정비 비용',
        value: '₩1,000,000',
        change: 0,
        trend: 'neutral',
        icon: 'line-chart',
        color: 'red'
      }
    ];
  }
}
