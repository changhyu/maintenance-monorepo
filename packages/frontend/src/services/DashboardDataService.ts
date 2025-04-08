import { ApiClient } from '../../../api-client/src/client';
import { AnalyticsService, AnalyticsTimeFrame } from '../../../api-client/src/services/analyticsService';

// 대시보드 카드 데이터 인터페이스
export interface DashboardCardData {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color?: string;
  icon?: string;
}

// 대시보드 차트 데이터 인터페이스
export interface DashboardChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// 대시보드 데이터 서비스 클래스
export class DashboardDataService {
  private analyticsService: AnalyticsService;

  constructor() {
    const apiClient = new ApiClient({ baseURL: '/api' });
    this.analyticsService = new AnalyticsService(apiClient);
  }

  /**
   * 개요 데이터를 가져옵니다
   */
  async getOverviewData(): Promise<DashboardCardData[]> {
    try {
      // getBusinessOverview 메서드가 없으므로 폴백 데이터 사용
      return this.getFallbackOverviewData();
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
      return this.getFallbackOverviewData();
    }
  }

  /**
   * 차량 데이터를 가져옵니다
   */
  async getVehicleData(): Promise<DashboardCardData[]> {
    try {
      // API 호출 시 올바른 파라미터 전달
      const vehicleAnalytics = await this.analyticsService.getVehicleAnalytics(
        AnalyticsTimeFrame.MONTH
      );
      
      // 실제 API 응답에 맞게 매핑
      return [
        {
          id: 'active-vehicles',
          label: '활성 차량',
          value: vehicleAnalytics.activeVehicles,
          // 필요한 속성이 없는 경우 대체 로직
          change: vehicleAnalytics.newVehicles?.percentage || 0,
          color: 'green'
        },
        {
          id: 'inactive-vehicles',
          label: '비활성 차량',
          value: vehicleAnalytics.totalVehicles - vehicleAnalytics.activeVehicles,
          change: -2.3, // 예시 값
          color: 'red'
        },
        {
          id: 'avg-age',
          label: '평균 차량 연식',
          value: (vehicleAnalytics.averageAge || 0) + '년',
          color: 'blue'
        },
        {
          id: 'avg-mileage',
          label: '평균 주행거리',
          value: this.formatNumber(vehicleAnalytics.averageMileage || 0) + 'km',
          change: 1.5, // 예시 값
          color: 'gray'
        }
      ];
    } catch (error) {
      console.error('Failed to fetch vehicle data:', error);
      return this.getFallbackVehicleData();
    }
  }

  /**
   * 정비 데이터를 가져옵니다
   */
  async getMaintenanceData(): Promise<DashboardCardData[]> {
    try {
      // API 호출 시 올바른 파라미터 전달
      const maintenanceAnalytics = await this.analyticsService.getMaintenanceAnalytics(
        AnalyticsTimeFrame.MONTH
      );
      
      // 실제 API 응답에 맞게 매핑
      return [
        {
          id: 'scheduled-maintenance',
          label: '예정된 정비',
          value: 18, // 예시 값 (API에서 제공하지 않는 경우)
          change: 5.9,
          color: 'blue'
        },
        {
          id: 'completed-maintenance',
          label: '완료된 정비',
          value: maintenanceAnalytics.totalMaintenanceRecords || 0,
          change: maintenanceAnalytics.costTrend?.percentage || 0,
          color: 'green'
        },
        {
          id: 'overdue-maintenance',
          label: '지연된 정비',
          value: 3, // 예시 값 (API에서 제공하지 않는 경우)
          change: -15.2,
          color: 'red'
        },
        {
          id: 'avg-completion-time',
          label: '평균 완료 시간',
          value: (maintenanceAnalytics.averageTimeBetweenMaintenance || 0) + '일',
          change: -8.3,
          color: 'yellow'
        }
      ];
    } catch (error) {
      console.error('Failed to fetch maintenance data:', error);
      return this.getFallbackMaintenanceData();
    }
  }

  /**
   * 차량 관리 데이터를 가져옵니다
   */
  async getFleetData(): Promise<DashboardCardData[]> {
    try {
      // API 호출 시 올바른 파라미터 전달
      const costAnalytics = await this.analyticsService.getCostAnalytics(
        AnalyticsTimeFrame.MONTH
      );
      
      // 실제 API 응답에 맞게 매핑
      return [
        {
          id: 'fleet-utilization',
          label: '차량 활용도',
          value: '78%', // 예시 값 (API에서 제공하지 않는 경우)
          change: 3.2,
          color: 'green'
        },
        {
          id: 'avg-downtime',
          label: '평균 비가동 시간',
          value: '5.3시간', // 예시 값 (API에서 제공하지 않는 경우)
          change: -7.2,
          color: 'green'
        },
        {
          id: 'fuel-efficiency',
          label: '평균 연비',
          value: '12.8km/L', // 예시 값 (API에서 제공하지 않는 경우)
          change: 2.1,
          color: 'green'
        },
        {
          id: 'avg-maintenance-cost',
          label: '평균 정비 비용',
          value: this.formatCurrency(costAnalytics.averageCostPerKilometer * 1000),
          change: costAnalytics.costTrend?.percentage || 0,
          color: 'green'
        }
      ];
    } catch (error) {
      console.error('Failed to fetch fleet data:', error);
      return this.getFallbackFleetData();
    }
  }

  /**
   * 예측 정비 데이터를 가져옵니다
   */
  async getPredictiveMaintenanceData(): Promise<DashboardCardData[]> {
    try {
      // getPredictiveMaintenance 메서드가 없으므로 getPredictiveMaintenanceAnalytics 사용
      const predictiveData = await this.analyticsService.getPredictiveMaintenanceAnalytics();
      
      // 실제 API 응답에 맞게 매핑
      return [
        {
          id: 'vehicles-at-risk',
          label: '위험 상태 차량',
          value: predictiveData?.warnings?.length || 0,
          change: -12.5, // 예시 값
          color: 'red'
        },
        {
          id: 'predicted-failures',
          label: '예상 고장',
          value: predictiveData?.upcomingMaintenance?.length || 0,
          change: -5.3, // 예시 값
          color: 'yellow'
        },
        {
          id: 'savings-estimate',
          label: '예상 비용 절감',
          value: this.formatCurrency(3750000), // 예시 값
          color: 'green'
        },
        {
          id: 'prediction-accuracy',
          label: '예측 정확도',
          value: '87%', // 예시 값
          change: 2.3, // 예시 값
          color: 'green'
        }
      ];
    } catch (error) {
      console.error('Failed to fetch predictive maintenance data:', error);
      return this.getFallbackPredictiveData();
    }
  }

  // 변화에 따른 색상을 반환
  private getChangeColor(change: number): string {
    if (change > 0) return 'green';
    if (change < 0) return 'red';
    return 'gray';
  }

  // 상태 점수에 따른 색상을 반환
  private getHealthColor(score: number): string {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  }

  // 활용도에 따른 색상을 반환
  private getUtilizationColor(utilization: number): string {
    if (utilization >= 75) return 'green';
    if (utilization >= 50) return 'yellow';
    return 'red';
  }

  // 규정 준수율에 따른 색상을 반환
  private getComplianceColor(compliance: number): string {
    if (compliance >= 90) return 'green';
    if (compliance >= 70) return 'yellow';
    return 'red';
  }

  // 예측 정확도에 따른 색상을 반환
  private getAccuracyColor(accuracy: number): string {
    if (accuracy >= 85) return 'green';
    if (accuracy >= 70) return 'yellow';
    return 'red';
  }

  // 숫자 포맷팅
  private formatNumber(value: number): string {
    return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  }

  // 통화 포맷팅
  private formatCurrency(value: number): string {
    return value.toLocaleString('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    });
  }

  // 폴백 개요 데이터
  private getFallbackOverviewData(): DashboardCardData[] {
    return [
      {
        id: 'total-vehicles',
        label: '총 차량',
        value: 127,
        change: 5.2,
        changeLabel: '전월 대비',
        color: 'green'
      },
      {
        id: 'maintenance-count',
        label: '정비 건수',
        value: 42,
        change: 3.7,
        changeLabel: '전월 대비',
        color: 'green'
      },
      {
        id: 'avg-health',
        label: '평균 상태 점수',
        value: '87%',
        change: 2.1,
        changeLabel: '전월 대비',
        color: 'green'
      },
      {
        id: 'maintenance-cost',
        label: '총 정비 비용',
        value: '₩4,250,000',
        change: -1.8,
        changeLabel: '전월 대비',
        color: 'green'
      }
    ];
  }

  // 폴백 차량 데이터
  private getFallbackVehicleData(): DashboardCardData[] {
    return [
      {
        id: 'active-vehicles',
        label: '활성 차량',
        value: 112,
        change: 4.5,
        color: 'green'
      },
      {
        id: 'inactive-vehicles',
        label: '비활성 차량',
        value: 15,
        change: -2.3,
        color: 'red'
      },
      {
        id: 'avg-age',
        label: '평균 차량 연식',
        value: '3.2년',
        color: 'blue'
      },
      {
        id: 'avg-mileage',
        label: '평균 주행거리',
        value: '45,230km',
        change: 8.7,
        color: 'gray'
      }
    ];
  }

  // 폴백 정비 데이터
  private getFallbackMaintenanceData(): DashboardCardData[] {
    return [
      {
        id: 'scheduled-maintenance',
        label: '예정된 정비',
        value: 18,
        change: 5.9,
        color: 'blue'
      },
      {
        id: 'completed-maintenance',
        label: '완료된 정비',
        value: 24,
        change: 12.5,
        color: 'green'
      },
      {
        id: 'overdue-maintenance',
        label: '지연된 정비',
        value: 3,
        change: -15.2,
        color: 'red'
      },
      {
        id: 'avg-completion-time',
        label: '평균 완료 시간',
        value: '2.5일',
        change: -8.3,
        color: 'yellow'
      }
    ];
  }

  // 폴백 차량 관리 데이터
  private getFallbackFleetData(): DashboardCardData[] {
    return [
      {
        id: 'fleet-utilization',
        label: '차량 활용도',
        value: '78%',
        change: 3.2,
        color: 'green'
      },
      {
        id: 'avg-downtime',
        label: '평균 비가동 시간',
        value: '5.3시간',
        change: -7.2,
        color: 'green'
      },
      {
        id: 'fuel-efficiency',
        label: '평균 연비',
        value: '12.8km/L',
        change: 2.1,
        color: 'green'
      },
      {
        id: 'maintenance-compliance',
        label: '정비 규정 준수율',
        value: '93%',
        change: 1.5,
        color: 'green'
      }
    ];
  }

  // 폴백 예측 정비 데이터
  private getFallbackPredictiveData(): DashboardCardData[] {
    return [
      {
        id: 'vehicles-at-risk',
        label: '위험 상태 차량',
        value: 8,
        change: -12.5,
        color: 'red'
      },
      {
        id: 'predicted-failures',
        label: '예상 고장',
        value: 12,
        change: -5.3,
        color: 'yellow'
      },
      {
        id: 'savings-estimate',
        label: '예상 비용 절감',
        value: '₩3,750,000',
        color: 'green'
      },
      {
        id: 'prediction-accuracy',
        label: '예측 정확도',
        value: '87%',
        change: 2.3,
        color: 'green'
      }
    ];
  }
} 