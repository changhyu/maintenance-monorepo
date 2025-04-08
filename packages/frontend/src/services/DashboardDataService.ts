import { ApiClient } from '../../../api-client/src/client';
import { AnalyticsService, AnalyticsTimeFrame as ApiAnalyticsTimeFrame, VehicleAnalyticsOverview as ApiVehicleAnalyticsOverview, MaintenanceAnalyticsOverview as ApiMaintenanceAnalyticsOverview, CostAnalyticsOverview as ApiCostAnalyticsOverview, AnalyticsDataPoint, AnalyticsDataSeries } from '../../../api-client/src/services/analyticsService';
import { 
  VehicleAnalyticsOverview, 
  MaintenanceAnalyticsOverview, 
  CostAnalyticsOverview,
  TimeSeriesDataPoint,
  AnalyticsCategory,
  AnalyticsCategoryItem,
  AnalyticsTimeFrame
} from '../types/analytics';
import { DashboardFilters } from '../components/DashboardFilter';
import { ReportType } from './reportService';

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

export interface DashboardChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string[] | string;
    borderWidth?: number;
  }[];
}

export interface PredictiveMaintenanceCard {
  vehicleId: string;
  vehicleName: string;
  component: string;
  probability: number;
  suggestedDate: string;
  severity: 'high' | 'medium' | 'low';
}

export class DashboardDataService {
  public analyticsService: AnalyticsService;
  public timeFrames = ApiAnalyticsTimeFrame;

  constructor() {
    const apiClient = new ApiClient({ baseURL: '/api' });
    this.analyticsService = new AnalyticsService(apiClient);
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

  public transformMaintenanceAnalytics(apiData: ApiMaintenanceAnalyticsOverview): MaintenanceAnalyticsOverview {
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

    const completedMaintenances = Math.round(apiData.totalMaintenanceRecords * (apiData.maintenanceCompletionRate ?? 0));

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
  private transformDataSeriesToCategoryItems(series: AnalyticsDataSeries | undefined): AnalyticsCategoryItem[] {
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
      const apiVehicleData = await this.analyticsService.getVehicleAnalytics(ApiAnalyticsTimeFrame.MONTH);
      const apiMaintenanceData = await this.analyticsService.getMaintenanceAnalytics(ApiAnalyticsTimeFrame.MONTH);
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
        trend: vehicleData.vehicleChange > 0 ? 'up' : vehicleData.vehicleChange < 0 ? 'down' : 'neutral',
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
    cards: DashboardCardData[],
    charts: { [key: string]: DashboardChartData }
  }> {
    try {
      const apiVehicleData = await this.analyticsService.getVehicleAnalytics(ApiAnalyticsTimeFrame.MONTH);
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
        change: this.calculatePercentChange(
          vehicleData.activeVehicles,
          vehicleData.totalVehicles
        ),
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

  private getVehicleTypeDistributionChart(vehicleData: VehicleAnalyticsOverview): DashboardChartData {
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

  private getVehicleHealthDistributionChart(vehicleData: VehicleAnalyticsOverview): DashboardChartData {
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
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)'
          ],
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
    cards: DashboardCardData[],
    charts: { [key: string]: DashboardChartData }
  }> {
    try {
      const apiMaintenanceData = await this.analyticsService.getMaintenanceAnalytics(ApiAnalyticsTimeFrame.MONTH);
      const maintenanceData = this.transformMaintenanceAnalytics(apiMaintenanceData);
      
      return {
        cards: this.transformMaintenanceCards(maintenanceData),
        charts: {
          maintenanceTypeDistribution: this.getMaintenanceTypeDistributionChart(maintenanceData),
          maintenancePriorityDistribution: this.getMaintenancePriorityDistributionChart(maintenanceData),
          maintenanceTrend: this.getMaintenanceTrendChart()
        }
      };
    } catch (error) {
      console.error('정비 데이터 조회 중 오류 발생:', error);
      return this.getFallbackMaintenanceData();
    }
  }

  private transformMaintenanceCards(maintenanceData: MaintenanceAnalyticsOverview): DashboardCardData[] {
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

  private getMaintenanceTypeDistributionChart(maintenanceData: MaintenanceAnalyticsOverview): DashboardChartData {
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

  private getMaintenancePriorityDistributionChart(maintenanceData: MaintenanceAnalyticsOverview): DashboardChartData {
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
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
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
    cards: DashboardCardData[],
    charts: { [key: string]: DashboardChartData }
  }> {
    try {
      const apiVehicleData = await this.analyticsService.getVehicleAnalytics(ApiAnalyticsTimeFrame.MONTH);
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
        trend: vehicleData.vehicleChange > 0 ? 'up' : vehicleData.vehicleChange < 0 ? 'down' : 'neutral',
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
    cards: PredictiveMaintenanceCard[]
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
        component: '타이밍 벨트',
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
      weightedSum += (item.value * weight);
    });
    
    return `${Math.round(weightedSum / totalVehicles)}%`;
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('ko-KR').format(num);
  }

  private formatCurrency(num: number): string {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(num);
  }

  // 폴백 데이터 메서드들 (API 호출 실패 시 사용)
  private getFallbackOverviewData(): DashboardCardData[] {
    return [
      { title: '전체 차량', value: 55, change: 10, trend: 'up', icon: 'car', color: 'blue' },
      { title: '정비 중인 차량', value: 8, change: -5, trend: 'down', icon: 'tools', color: 'orange' },
      { title: '평균 차량 상태', value: '85%', change: 2, trend: 'up', icon: 'heartbeat', color: 'green' },
      { title: '이번 달 비용', value: '₩32,450,000', change: 8, trend: 'up', icon: 'money-bill', color: 'red' }
    ];
  }

  private getFallbackVehicleData(): {
    cards: DashboardCardData[],
    charts: { [key: string]: DashboardChartData }
  } {
    return {
      cards: [
        { title: '활성 차량', value: 48, change: 5, trend: 'up', icon: 'check-circle', color: 'green' },
        { title: '비활성 차량', value: 7, change: -2, trend: 'down', icon: 'times-circle', color: 'red' },
        { title: '평균 차량 연령', value: '3.5년', change: 0, trend: 'neutral', icon: 'calendar', color: 'blue' },
        { title: '평균 주행거리', value: '45,000km', change: 0, trend: 'neutral', icon: 'road', color: 'purple' }
      ],
      charts: {
        vehicleTypeDistribution: {
          labels: ['승용차', 'SUV', '밴', '트럭', '기타'],
          datasets: [{
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
          }]
        },
        vehicleHealthDistribution: {
          labels: ['좋음', '보통', '주의'],
          datasets: [{
            label: '차량 상태 분포',
            data: [35, 15, 5],
            backgroundColor: [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(255, 99, 132, 0.6)'
            ],
            borderWidth: 1
          }]
        },
        vehicleAgeDistribution: {
          labels: ['0-2년', '3-5년', '6-8년', '9년 이상'],
          datasets: [{
            label: '차량 연령 분포',
            data: [15, 25, 10, 5],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderWidth: 1
          }]
        }
      }
    };
  }

  private getFallbackMaintenanceData(): {
    cards: DashboardCardData[],
    charts: { [key: string]: DashboardChartData }
  } {
    return {
      cards: [
        { title: '완료된 정비', value: 120, change: 8, trend: 'up', icon: 'check', color: 'green' },
        { title: '대기 중인 정비', value: 15, change: -10, trend: 'down', icon: 'clock', color: 'orange' },
        { title: '평균 완료 시간', value: '3.2일', change: -5, trend: 'down', icon: 'hourglass', color: 'blue' },
        { title: '예정된 정비', value: 22, change: 10, trend: 'up', icon: 'calendar-check', color: 'purple' }
      ],
      charts: {
        maintenanceTypeDistribution: {
          labels: ['정기 점검', '부품 교체', '고장 수리', '타이어', '기타'],
          datasets: [{
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
          }]
        },
        maintenancePriorityDistribution: {
          labels: ['높음', '중간', '낮음'],
          datasets: [{
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
          }]
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
    cards: DashboardCardData[],
    charts: { [key: string]: DashboardChartData }
  } {
    return {
      cards: [
        { title: '총 차량 수', value: 55, change: 10, trend: 'up', icon: 'car', color: 'blue' },
        { title: '총 운영 비용', value: '₩152,350,000', change: 5, trend: 'up', icon: 'money-bill', color: 'red' },
        { title: '차량당 평균 비용', value: '₩2,770,000', change: -2, trend: 'down', icon: 'chart-line', color: 'purple' },
        { title: '평균 차량 상태', value: '85%', change: 2, trend: 'up', icon: 'heartbeat', color: 'green' }
      ],
      charts: {
        costTrend: {
          labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
          datasets: [{
            label: '월별 비용 추이',
            data: [25000000, 22000000, 28000000, 24000000, 30000000, 32000000],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderWidth: 1
          }]
        },
        costByCategory: {
          labels: ['연료', '정비', '보험', '감가상각', '기타'],
          datasets: [{
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
          }]
        },
        fleetUtilization: {
          labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
          datasets: [{
            label: '차량 활용률 (%)',
            data: [75, 68, 82, 79, 85, 87],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderWidth: 1
          }]
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
      // API 호출 시 필터 파라미터 추가
      const params = {
        startDate: filters.dateRange.startDate.toISOString(),
        endDate: filters.dateRange.endDate.toISOString(),
        vehicleType: filters.vehicleType || undefined,
        maintenanceStatus: filters.maintenanceStatus || undefined,
        priority: filters.priority || undefined
      };

      // 필터링된 개요 데이터 가져오기
      const overviewData = await this.getFilteredOverviewData(filters);
      
      // 필터링된 차량 데이터 가져오기 
      const vehicleData = await this.getFilteredVehicleData(filters);
      
      // 필터링된 정비 데이터 가져오기
      const maintenanceData = await this.getFilteredMaintenanceData(filters);
      
      // 필터링된 운영 데이터 가져오기
      const fleetData = await this.getFilteredFleetData(filters);

      return {
        overview: overviewData,
        vehicle: vehicleData,
        maintenance: maintenanceData,
        fleet: fleetData
      };
    } catch (error) {
      console.error('필터링된 대시보드 데이터 조회 실패:', error);
      
      // 에러 발생 시 더미 데이터 반환
      return {
        overview: this.getFallbackOverviewData(),
        vehicle: this.getFallbackVehicleData(),
        maintenance: this.getFallbackMaintenanceData(),
        fleet: this.getFallbackFleetData()
      };
    }
  }

  /**
   * 필터를 적용하여 개요 데이터를 가져오는 메서드
   */
  async getFilteredOverviewData(filters: DashboardFilters) {
    try {
      // 실제 구현에서는 API 호출 필요
      // 현재는 더미 데이터 사용
      const data = this.getFallbackOverviewData();
      
      // 간단한 필터링 로직 (예시)
      if (filters.vehicleType) {
        // 차량 유형에 따른 필터링
        return data.filter(item => 
          item.title.includes('차량') ? Math.random() > 0.3 : true
        );
      }
      
      return data;
    } catch (error) {
      console.error('필터링된 개요 데이터 조회 실패:', error);
      return this.getFallbackOverviewData();
    }
  }

  /**
   * 필터를 적용하여 차량 데이터를 가져오는 메서드
   */
  async getFilteredVehicleData(filters: DashboardFilters) {
    try {
      // 실제 구현에서는 API 호출 필요
      // 현재는 더미 데이터 사용
      const data = this.getFallbackVehicleData();
      
      // 필터링 로직 (더미 데이터를 위한 간단한 필터링)
      return data;
    } catch (error) {
      console.error('필터링된 차량 데이터 조회 실패:', error);
      return this.getFallbackVehicleData();
    }
  }

  /**
   * 필터를 적용하여 정비 데이터를 가져오는 메서드
   */
  async getFilteredMaintenanceData(filters: DashboardFilters) {
    try {
      // 실제 구현에서는 API 호출 필요
      // 현재는 더미 데이터 사용
      const data = this.getFallbackMaintenanceData();
      
      // 필터링 로직 (더미 데이터를 위한 간단한 필터링)
      if (filters.maintenanceStatus) {
        // 정비 상태에 따른 필터링
        const cards = data.cards.map(card => {
          if (card.title.includes('상태') || card.title.includes('정비')) {
            return {
              ...card,
              value: Math.floor(Number(card.value) * 0.8)
            };
          }
          return card;
        });
        
        return {
          ...data,
          cards
        };
      }
      
      return data;
    } catch (error) {
      console.error('필터링된 정비 데이터 조회 실패:', error);
      return this.getFallbackMaintenanceData();
    }
  }

  /**
   * 필터를 적용하여 운영 데이터를 가져오는 메서드
   */
  async getFilteredFleetData(filters: DashboardFilters) {
    try {
      // 실제 구현에서는 API 호출 필요
      // 현재는 더미 데이터 사용
      const data = this.getFallbackFleetData();
      
      // 필터링 로직 (더미 데이터를 위한 간단한 필터링)
      return data;
    } catch (error) {
      console.error('필터링된 운영 데이터 조회 실패:', error);
      return this.getFallbackFleetData();
    }
  }

  /**
   * 필터를 적용하여 차트 데이터를 생성하는 메서드
   */
  getFilteredChartData(filters: DashboardFilters) {
    // 차량 유형별 차트 데이터
    const vehicleTypeChartData = this.getFilteredVehicleTypeChartData(filters);
    
    // 정비 상태별 차트 데이터
    const maintenanceStatusChartData = this.getFilteredMaintenanceStatusChartData(filters);
    
    // 정비 우선순위별 차트 데이터
    const maintenancePriorityChartData = this.getFilteredMaintenancePriorityChartData(filters);
    
    // 정비 추이 차트 데이터
    const maintenanceTrendChartData = this.getFilteredMaintenanceTrendChartData(filters);
    
    return {
      vehicleTypeChartData,
      maintenanceStatusChartData,
      maintenancePriorityChartData,
      maintenanceTrendChartData
    };
  }
  
  /**
   * 필터를 적용하여 차량 유형별 차트 데이터 생성
   */
  getFilteredVehicleTypeChartData(filters: DashboardFilters) {
    // 기본 데이터
    const baseData = [
      { label: '승용차', value: 25 },
      { label: 'SUV', value: 35 },
      { label: '밴', value: 15 },
      { label: '트럭', value: 20 },
      { label: '기타', value: 5 }
    ];
    
    // 차량 유형 필터 적용
    if (filters.vehicleType) {
      const filteredData = baseData.map(item => {
        // 선택된 차량 유형과 일치하는 항목은 강조
        if (filters.vehicleType === 'sedan' && item.label === '승용차' ||
            filters.vehicleType === 'suv' && item.label === 'SUV' ||
            filters.vehicleType === 'van' && item.label === '밴' ||
            filters.vehicleType === 'truck' && item.label === '트럭' ||
            filters.vehicleType === 'other' && item.label === '기타') {
          return { ...item, value: item.value * 1.2 }; // 값 강조
        }
        return { ...item, value: item.value * 0.8 }; // 다른 값 감소
      });
      
      return filteredData;
    }
    
    return baseData;
  }
  
  /**
   * 필터를 적용하여 정비 상태별 차트 데이터 생성
   */
  getFilteredMaintenanceStatusChartData(filters: DashboardFilters) {
    // 기본 데이터
    const baseData = [
      { label: '정기 점검', value: 45 },
      { label: '부품 교체', value: 30 },
      { label: '고장 수리', value: 15 },
      { label: '타이어', value: 20 },
      { label: '기타', value: 10 }
    ];
    
    // 정비 상태 필터 적용
    if (filters.maintenanceStatus) {
      // 정비 상태에 따라 데이터 변경 (더미 데이터를 위한 간단한 로직)
      const multiplier = 
        filters.maintenanceStatus === 'completed' ? 1.2 :
        filters.maintenanceStatus === 'inProgress' ? 0.8 :
        filters.maintenanceStatus === 'scheduled' ? 0.6 : 1;
      
      return baseData.map(item => ({
        ...item,
        value: Math.round(item.value * multiplier)
      }));
    }
    
    return baseData;
  }
  
  /**
   * 필터를 적용하여 정비 우선순위별 차트 데이터 생성
   */
  getFilteredMaintenancePriorityChartData(filters: DashboardFilters) {
    // 기본 데이터
    const baseData = [
      { label: '높음', value: 25 },
      { label: '중간', value: 40 },
      { label: '낮음', value: 55 }
    ];
    
    // 우선순위 필터 적용
    if (filters.priority) {
      const filteredData = baseData.map(item => {
        // 선택된 우선순위와 일치하는 항목은 강조
        if ((filters.priority === 'high' && item.label === '높음') ||
            (filters.priority === 'medium' && item.label === '중간') ||
            (filters.priority === 'low' && item.label === '낮음')) {
          return { ...item, value: item.value * 1.2 }; // 값 강조
        }
        return { ...item, value: item.value * 0.8 }; // 다른 값 감소
      });
      
      return filteredData;
    }
    
    return baseData;
  }
  
  /**
   * 필터를 적용하여 정비 추이 차트 데이터 생성
   */
  getFilteredMaintenanceTrendChartData(filters: DashboardFilters) {
    // 기본 데이터 가져오기
    const baseData = this.formatMaintenanceTrendChartData();
    
    // 날짜 필터 적용
    const startDate = filters.dateRange.startDate;
    const endDate = filters.dateRange.endDate;
    
    // 날짜에 따른 필터링 (간단한 데모 로직)
    // 실제 구현에서는 API 호출 필요
    
    // 날짜 범위가 지난 3개월 이내인 경우, 최근 데이터만 반환
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    if (startDate > threeMonthsAgo) {
      // 최근 데이터만 반환 (최근 3개월)
      return baseData.slice(-3);
    }
    
    // 날짜 범위가 지난 6개월 이내인 경우, 최근 6개월 데이터 반환
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    if (startDate > sixMonthsAgo) {
      // 최근 데이터만 반환 (최근 6개월)
      return baseData.slice(-6);
    }
    
    // 기본값: 모든 데이터 반환
    return baseData;
  }

  /**
   * 보고서 대시보드 카드 데이터 가져오기
   */
  async getReportOverviewData(): Promise<DashboardCardData[]> {
    try {
      // API에서 보고서 관련 통계 가져오기 (현재는 임시 데이터 사용)
      // 실제 구현에서는 API 호출로 대체
      return this.generateRandomReportOverviewData();
    } catch (error) {
      console.error('보고서 개요 데이터 조회 중 오류 발생:', error);
      return this.getFallbackReportOverviewData();
    }
  }

  /**
   * 보고서 유형에 맞는 차트 데이터 가져오기
   */
  async getReportChartData(reportType: ReportType): Promise<DashboardChartData> {
    try {
      // API에서 보고서 차트 데이터 가져오기
      // 실제 구현에서는 API 호출로 대체
      switch (reportType) {
        case ReportType.COMPLETION_RATE:
          return this.getCompletionRateChartData();
        case ReportType.COST_ANALYSIS:
          return this.getCostAnalysisChartData();
        case ReportType.MAINTENANCE_SUMMARY:
          return this.getMaintenanceSummaryChartData();
        default:
          return this.getCompletionRateChartData();
      }
    } catch (error) {
      console.error('보고서 차트 데이터 조회 중 오류 발생:', error);
      return this.getFallbackChartData();
    }
  }

  /**
   * 데모 목적을 위한 랜덤 보고서 개요 데이터 생성
   */
  private generateRandomReportOverviewData(): DashboardCardData[] {
    // 기존 데이터 베이스
    const baseData = [
      {
        title: '생성된 보고서',
        value: 32,
        change: 15,
        trend: 'up' as const,
        icon: 'file',
        color: 'blue'
      },
      {
        title: '월간 완료율',
        value: '85.2%',
        change: 3.5,
        trend: 'up' as const,
        icon: 'chart',
        color: 'green'
      },
      {
        title: '예정된 정비',
        value: 8,
        change: -2,
        trend: 'down' as const,
        icon: 'calendar',
        color: 'orange'
      },
      {
        title: '월간 정비 비용',
        value: '₩1,250,000',
        change: 5.2,
        trend: 'up' as const,
        icon: 'line-chart',
        color: 'red'
      }
    ];

    // 데모 목적으로 랜덤 데이터 생성
    return baseData.map(card => {
      // 숫자 값인 경우 랜덤 변동 적용
      if (typeof card.value === 'number') {
        const randomChange = Math.floor(Math.random() * 6) - 2; // -2 ~ 3 사이의 랜덤 변화
        const newValue = Math.max(1, card.value + randomChange);
        
        // 변화율 계산
        const changePercent = card.value > 0 ? ((newValue - card.value) / card.value) * 100 : 0;
        const trend = changePercent > 0 ? 'up' as const : changePercent < 0 ? 'down' as const : 'neutral' as const;

        return {
          ...card,
          value: newValue,
          change: parseFloat(changePercent.toFixed(1)),
          trend
        };
      } 
      // 비율(%) 값인 경우
      else if (card.value.includes('%')) {
        const currentValue = parseFloat(card.value.replace('%', ''));
        const randomChange = (Math.random() * 3 - 1); // -1 ~ 2 사이의 랜덤 변화
        const newValue = Math.min(100, Math.max(50, currentValue + randomChange)).toFixed(1);
        
        const changePercent = currentValue > 0 ? ((parseFloat(newValue) - currentValue) / currentValue) * 100 : 0;
        const trend = changePercent > 0 ? 'up' as const : changePercent < 0 ? 'down' as const : 'neutral' as const;
        
        return {
          ...card,
          value: `${newValue}%`,
          change: parseFloat(changePercent.toFixed(1)),
          trend
        };
      } 
      // 금액 값인 경우
      else if (card.value.includes('₩')) {
        const currentValue = parseInt(card.value.replace(/[^\d]/g, ''));
        const randomChange = Math.floor(Math.random() * 200000) - 100000; // 랜덤 금액 변화
        const newValue = Math.max(500000, currentValue + randomChange);
        
        const changePercent = currentValue > 0 ? ((newValue - currentValue) / currentValue) * 100 : 0;
        const trend = changePercent > 0 ? 'up' as const : changePercent < 0 ? 'down' as const : 'neutral' as const;
        
        // 한글 통화 형식으로 변환
        const formattedValue = '₩' + newValue.toLocaleString('ko-KR');
        
        return {
          ...card,
          value: formattedValue,
          change: parseFloat(changePercent.toFixed(1)),
          trend
        };
      }
      
      return card;
    });
  }

  /**
   * 데모 목적을 위한 랜덤 완료율 차트 데이터 생성
   */
  private getCompletionRateChartData(): DashboardChartData {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월'];
    const baseData = [65, 72, 78, 75, 82, 85];
    
    // 기존 데이터에 약간의 랜덤 변동 추가
    const data = baseData.map(value => {
      const randomOffset = Math.floor(Math.random() * 10) - 5; // -5 ~ 4 사이의 랜덤 값
      return Math.min(100, Math.max(50, value + randomOffset)); // 50~100 사이 값으로 제한
    });
    
    return {
      labels: months,
      datasets: [
        {
          label: '완료율',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  /**
   * 데모 목적을 위한 비용 분석 차트 데이터 생성
   */
  private getCostAnalysisChartData(): DashboardChartData {
    const categories = ['부품', '인건비', '출장비', '기타'];
    const baseData = [45, 25, 15, 15];
    
    // 합계가 100이 되도록 랜덤 데이터 생성
    let total = 0;
    const tempData = categories.map(() => {
      const value = Math.floor(Math.random() * 40) + 10; // 10 ~ 49 사이의 랜덤 값
      total += value;
      return value;
    });
    
    // 백분율로 변환 (합계가 100%가 되도록)
    const data = tempData.map(value => Math.round((value / total) * 100));
    
    // 마지막 값 조정으로 합계가 정확히 100이 되도록 보정
    const sum = data.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      data[data.length - 1] += (100 - sum);
    }
    
    return {
      labels: categories,
      datasets: [
        {
          label: '비용 분석',
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  /**
   * 데모 목적을 위한 정비 요약 차트 데이터 생성
   */
  private getMaintenanceSummaryChartData(): DashboardChartData {
    const categories = ['정기 점검', '엔진 정비', '브레이크 시스템', '전기 시스템', '냉각 시스템'];
    const baseData = [35, 20, 15, 15, 15];
    
    // 합계가 100이 되도록 랜덤 데이터 생성
    let total = 0;
    const tempData = categories.map(() => {
      const value = Math.floor(Math.random() * 30) + 5; // 5 ~ 34 사이의 랜덤 값
      total += value;
      return value;
    });
    
    // 백분율로 변환 (합계가 100%가 되도록)
    const data = tempData.map(value => Math.round((value / total) * 100));
    
    // 마지막 값 조정으로 합계가 정확히 100이 되도록 보정
    const sum = data.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      data[data.length - 1] += (100 - sum);
    }
    
    return {
      labels: categories,
      datasets: [
        {
          label: '정비 유형별 비율',
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)'
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

  /**
   * 임시 차트 데이터 (폴백)
   */
  private getFallbackChartData(): DashboardChartData {
    return {
      labels: ['A', 'B', 'C', 'D', 'E', 'F'],
      datasets: [
        {
          label: '샘플 데이터',
          data: [12, 19, 3, 5, 2, 3],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
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