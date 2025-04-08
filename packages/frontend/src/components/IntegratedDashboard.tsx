import React, { useState, useEffect } from 'react';
import ScrDashboard from './ScrDashboard';
import ScrDataDashboard from './ScrDataDashboard';
import { DashboardCardData, DashboardChartData, DashboardDataService } from '../services/DashboardDataService';
import { VehicleTypeChart, MaintenanceStatusChart, MaintenanceTrendChart, CostDistributionChart, UtilizationChart } from './charts';
import DashboardFilters, { DashboardFilterValues } from './dashboard/DashboardFilters';

/**
 * 대시보드 탭 타입
 */
type DashboardTab = 'overview' | 'vehicles' | 'maintenance' | 'fleet';

/**
 * 대시보드 데이터 타입
 */
interface DashboardData {
  cards: DashboardCardData[];
  charts?: { [key: string]: DashboardChartData };
}

/**
 * 통합 대시보드 프롭스 인터페이스
 */
interface IntegratedDashboardProps {
  /** 초기 선택 탭 */
  initialTab?: DashboardTab;
  /** 로딩 상태 */
  loading?: boolean;
  /** 유저 ID */
  userId?: string;
  /** 회사 ID */
  companyId?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 통합 대시보드 컴포넌트
 * 여러 유형의 데이터를 한 화면에 통합하여 보여주는 대시보드
 */
const IntegratedDashboard: React.FC<IntegratedDashboardProps> = ({
  initialTab = 'overview',
  loading = false,
  userId,
  companyId,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [overviewData, setOverviewData] = useState<DashboardCardData[]>([]);
  const [vehicleData, setVehicleData] = useState<DashboardData>({ cards: [] });
  const [maintenanceData, setMaintenanceData] = useState<DashboardData>({ cards: [] });
  const [fleetData, setFleetData] = useState<DashboardData>({ cards: [] });
  
  // 차트 데이터 상태
  const [vehicleTypeChartData, setVehicleTypeChartData] = useState<{ label: string; value: number }[]>([]);
  const [maintenanceStatusChartData, setMaintenanceStatusChartData] = useState<{ label: string; value: number }[]>([]);
  const [maintenancePriorityChartData, setMaintenancePriorityChartData] = useState<{ label: string; value: number }[]>([]);
  const [maintenanceTrendChartData, setMaintenanceTrendChartData] = useState<{ date: string; completed: number; pending: number }[]>([]);
  
  const [isDataLoading, setIsDataLoading] = useState(false);
  const dashboardService = new DashboardDataService();
  
  // 필터 상태 (새로운 필터 타입으로 변경)
  const [filters, setFilters] = useState<DashboardFilterValues>({
    dateRange: null,
    vehicleTypes: ['all'],
    status: ['all'],
    locations: ['all'],
  });

  // 필터 변경 핸들러 (새로운 필터 타입으로 변경)
  const handleFilterChange = (newFilters: DashboardFilterValues) => {
    setFilters(newFilters);
    loadFilteredDashboardData(newFilters);
  };

  // 데이터 로드 함수 (필터 없음)
  const loadDashboardData = async () => {
    setIsDataLoading(true);
    try {
      // 일반 데이터 로드
      const overview = await dashboardService.getOverviewData();
      const vehicle = await dashboardService.getVehicleData();
      const maintenance = await dashboardService.getMaintenanceData();
      const fleet = await dashboardService.getFleetData();
      
      // 기본 데이터 설정
      setOverviewData(overview);
      setVehicleData(vehicle);
      setMaintenanceData(maintenance);
      setFleetData(fleet);
      
      // 차트 데이터 설정 - 임시 데이터로 구현
      // 실제 구현 시 API 연동 필요
      setVehicleTypeChartData([
        { label: '승용차', value: 25 },
        { label: 'SUV', value: 35 },
        { label: '밴', value: 15 },
        { label: '트럭', value: 20 },
        { label: '기타', value: 5 }
      ]);
      
      setMaintenanceStatusChartData([
        { label: '정기 점검', value: 45 },
        { label: '부품 교체', value: 30 },
        { label: '고장 수리', value: 15 },
        { label: '타이어', value: 20 },
        { label: '기타', value: 10 }
      ]);
      
      setMaintenancePriorityChartData([
        { label: '높음', value: 25 },
        { label: '중간', value: 40 },
        { label: '낮음', value: 55 }
      ]);
      
      setMaintenanceTrendChartData(dashboardService.formatMaintenanceTrendChartData());
      
    } catch (error) {
      console.error('데이터 로드 중 오류 발생:', error);
    } finally {
      setIsDataLoading(false);
    }
  };
  
  // 필터링된 데이터 로드 함수 (새로운 필터 타입으로 변경)
  const loadFilteredDashboardData = async (currentFilters: DashboardFilterValues) => {
    setIsDataLoading(true);
    try {
      // 기존 DashboardDataService에 맞게 필터 변환
      const adaptedFilters = {
        dateRange: {
          startDate: currentFilters.dateRange ? new Date(currentFilters.dateRange[0]) : 
            new Date(new Date().setMonth(new Date().getMonth() - 1)),
          endDate: currentFilters.dateRange ? new Date(currentFilters.dateRange[1]) : 
            new Date(),
        },
        vehicleType: currentFilters.vehicleTypes.includes('all') ? '' : currentFilters.vehicleTypes[0],
        maintenanceStatus: currentFilters.status.includes('all') ? '' : currentFilters.status[0],
        priority: '',
      };
      
      // 일반 데이터 로드
      const overview = await dashboardService.getOverviewData();
      const vehicle = await dashboardService.getVehicleData();
      const maintenance = await dashboardService.getMaintenanceData();
      const fleet = await dashboardService.getFleetData();
      
      // 기본 데이터 설정
      setOverviewData(overview);
      setVehicleData(vehicle);
      setMaintenanceData(maintenance);
      setFleetData(fleet);
      
      // 차트 데이터 설정 - 임시 데이터로 구현
      // 실제 구현 시 API 연동 필요
      setVehicleTypeChartData([
        { label: '승용차', value: 25 },
        { label: 'SUV', value: 35 },
        { label: '밴', value: 15 },
        { label: '트럭', value: 20 },
        { label: '기타', value: 5 }
      ]);
      
      setMaintenanceStatusChartData([
        { label: '정기 점검', value: 45 },
        { label: '부품 교체', value: 30 },
        { label: '고장 수리', value: 15 },
        { label: '타이어', value: 20 },
        { label: '기타', value: 10 }
      ]);
      
      setMaintenancePriorityChartData([
        { label: '높음', value: 25 },
        { label: '중간', value: 40 },
        { label: '낮음', value: 55 }
      ]);
      
      setMaintenanceTrendChartData(dashboardService.formatMaintenanceTrendChartData());
      
    } catch (error) {
      console.error('데이터 로드 중 오류 발생:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadFilteredDashboardData(filters);
  }, [userId, companyId]);

  // 탭 변경 핸들러
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          <button
            className={`px-4 py-2 font-medium text-sm rounded-md ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => handleTabChange('overview')}
          >
            전체 개요
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm rounded-md ${
              activeTab === 'vehicles'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => handleTabChange('vehicles')}
          >
            차량 현황
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm rounded-md ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => handleTabChange('maintenance')}
          >
            정비 현황
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm rounded-md ${
              activeTab === 'fleet'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => handleTabChange('fleet')}
          >
            운영 현황
          </button>
        </div>
      </div>
      
      {/* 데이터 필터 (새로운 필터 컴포넌트로 변경) */}
      <DashboardFilters onFilterChange={handleFilterChange} />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <ScrDataDashboard
            title="전체 개요"
            data={overviewData}
            loading={loading || isDataLoading}
            columns={4}
            headerContent={
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => loadFilteredDashboardData(filters)}
              >
                새로고침
              </button>
            }
          />
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div className="space-y-6">
          <ScrDataDashboard
            title="차량 현황"
            data={vehicleData.cards}
            loading={loading || isDataLoading}
            columns={4}
            headerContent={
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => loadFilteredDashboardData(filters)}
              >
                새로고침
              </button>
            }
          />
          
          {/* 차량 관련 차트 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VehicleTypeChart 
              data={vehicleTypeChartData} 
              isLoading={isDataLoading}
              title="차량 유형별 분포"
            />
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">차량 상태 분포</h3>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-600">양호 (70%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm text-gray-600">주의 (20%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-sm text-gray-600">위험 (10%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <ScrDataDashboard
            title="정비 현황"
            data={maintenanceData.cards}
            loading={loading || isDataLoading}
            columns={4}
            headerContent={
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => loadFilteredDashboardData(filters)}
              >
                새로고침
              </button>
            }
          />
          
          {/* 정비 관련 차트 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MaintenanceStatusChart 
              data={maintenanceStatusChartData} 
              isLoading={isDataLoading}
              title="정비 유형별 분포"
            />
            
            <MaintenanceStatusChart 
              data={maintenancePriorityChartData} 
              isLoading={isDataLoading}
              title="정비 우선순위별 분포"
            />
          </div>
          
          {/* 정비 추이 차트 */}
          <MaintenanceTrendChart 
            data={maintenanceTrendChartData} 
            isLoading={isDataLoading}
            title="월별 정비 추이"
            height={350}
          />
        </div>
      )}

      {activeTab === 'fleet' && (
        <div className="space-y-6">
          <ScrDataDashboard
            title="운영 현황"
            data={fleetData.cards}
            loading={loading || isDataLoading}
            columns={4}
            headerContent={
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => loadFilteredDashboardData(filters)}
              >
                새로고침
              </button>
            }
          />
          
          {/* 운영 관련 차트 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CostDistributionChart 
              data={[
                { label: '연료', value: 45000000 },
                { label: '정비', value: 35000000 },
                { label: '보험', value: 30000000 },
                { label: '감가상각', value: 25000000 },
                { label: '기타', value: 15000000 }
              ]} 
              isLoading={isDataLoading}
              title="비용 카테고리별 분포"
            />
            
            <UtilizationChart 
              data={{
                value: 85,
                previousValue: 83,
                change: 2,
                label: '차량 가동률'
              }} 
              isLoading={isDataLoading}
              title="차량 활용률"
            />
          </div>
          
          {/* 월별 비용 추이 차트 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">월별 비용 추이</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">월</th>
                    <th scope="col" className="px-6 py-3">연료</th>
                    <th scope="col" className="px-6 py-3">정비</th>
                    <th scope="col" className="px-6 py-3">보험</th>
                    <th scope="col" className="px-6 py-3">기타</th>
                    <th scope="col" className="px-6 py-3">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { month: '1월', fuel: 7200000, maintenance: 5500000, insurance: 2800000, etc: 3000000 },
                    { month: '2월', fuel: 6500000, maintenance: 3200000, insurance: 2800000, etc: 2700000 },
                    { month: '3월', fuel: 7100000, maintenance: 6700000, insurance: 2800000, etc: 2800000 },
                    { month: '4월', fuel: 6900000, maintenance: 4100000, insurance: 2800000, etc: 2900000 },
                    { month: '5월', fuel: 7800000, maintenance: 3900000, insurance: 2800000, etc: 3200000 },
                    { month: '6월', fuel: 8300000, maintenance: 6200000, insurance: 2800000, etc: 3500000 }
                  ].map((item, index) => {
                    const total = item.fuel + item.maintenance + item.insurance + item.etc;
                    return (
                      <tr key={index} className="bg-white border-b">
                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {item.month}
                        </th>
                        <td className="px-6 py-4">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.fuel)}</td>
                        <td className="px-6 py-4">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.maintenance)}</td>
                        <td className="px-6 py-4">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.insurance)}</td>
                        <td className="px-6 py-4">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.etc)}</td>
                        <td className="px-6 py-4 font-medium">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedDashboard; 