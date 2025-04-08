import React, { useState, useEffect } from 'react';
import ScrDashboard from './ScrDashboard';
import ScrDataDashboard from './ScrDataDashboard';
import { DashboardDataService, DashboardCardData } from '../services/DashboardDataService';

/**
 * 대시보드 탭 타입
 */
type DashboardTab = 'overview' | 'vehicles' | 'maintenance' | 'fleet';

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
  const [vehicleData, setVehicleData] = useState<DashboardCardData[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<DashboardCardData[]>([]);
  const [fleetData, setFleetData] = useState<DashboardCardData[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const dashboardService = new DashboardDataService();

  // 데이터 로드 함수
  const loadDashboardData = async () => {
    setIsDataLoading(true);
    try {
      // 대시보드 서비스를 사용하여 데이터 로드
      const [overview, vehicle, maintenance, fleet] = await Promise.all([
        dashboardService.getOverviewData(),
        dashboardService.getVehicleData(),
        dashboardService.getMaintenanceData(),
        dashboardService.getFleetData()
      ]);
      
      setOverviewData(overview);
      setVehicleData(vehicle);
      setMaintenanceData(maintenance);
      setFleetData(fleet);
    } catch (error) {
      console.error('데이터 로드 중 오류 발생:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, [userId, companyId]);

  // 탭 변경 핸들러
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 탭 메뉴 */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('overview')}
        >
          개요
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'vehicles'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('vehicles')}
        >
          차량
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'maintenance'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('maintenance')}
        >
          정비
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'fleet'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('fleet')}
        >
          운영 현황
        </button>
      </div>

      {/* 선택된 탭에 따른 대시보드 */}
      {activeTab === 'overview' && (
        <ScrDataDashboard
          title="전체 개요"
          data={overviewData}
          loading={loading || isDataLoading}
          columns={4}
          headerContent={
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={loadDashboardData}
            >
              새로고침
            </button>
          }
        />
      )}

      {activeTab === 'vehicles' && (
        <ScrDataDashboard
          title="차량 현황"
          data={vehicleData}
          loading={loading || isDataLoading}
          columns={4}
          headerContent={
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={loadDashboardData}
            >
              새로고침
            </button>
          }
        />
      )}

      {activeTab === 'maintenance' && (
        <ScrDataDashboard
          title="정비 현황"
          data={maintenanceData}
          loading={loading || isDataLoading}
          columns={4}
          headerContent={
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={loadDashboardData}
            >
              새로고침
            </button>
          }
        />
      )}

      {activeTab === 'fleet' && (
        <ScrDataDashboard
          title="운영 현황"
          data={fleetData}
          loading={loading || isDataLoading}
          columns={4}
          headerContent={
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={loadDashboardData}
            >
              새로고침
            </button>
          }
        />
      )}
    </div>
  );
};

export default IntegratedDashboard; 