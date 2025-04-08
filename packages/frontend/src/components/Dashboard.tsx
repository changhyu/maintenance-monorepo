import React, { useEffect, useState } from 'react';
import { vehicleService } from '../services/vehicle';
import { maintenanceService } from '../services/maintenance';
import { Vehicle, VehicleStatus } from '../types/vehicle';
import { MaintenanceRecord } from '../types/maintenance';
import { DashboardDataService } from '../services/DashboardDataService';

export const Dashboard: React.FC = () => {
  const [vehicleStats, setVehicleStats] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    inactive: 0,
    recalled: 0
  });
  
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceRecord[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRecord[]>([]);
  const [predictiveMaintenance, setPredictiveMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dashboardService = new DashboardDataService();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 차량 정보 가져오기
        const vehicles = await vehicleService.getVehicles();
        
        // 차량 상태 통계 계산
        const stats = {
          total: vehicles.length,
          active: vehicles.filter(v => v.status === VehicleStatus.ACTIVE).length,
          maintenance: vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length,
          inactive: vehicles.filter(v => v.status === VehicleStatus.INACTIVE).length,
          recalled: vehicles.filter(v => v.status === VehicleStatus.RECALLED).length
        };
        
        setVehicleStats(stats);
        
        // 예정된 정비 일정 가져오기
        const upcoming = await maintenanceService.getUpcomingMaintenance(30);
        setUpcomingMaintenance(upcoming);
        
        // 최근 정비 기록 가져오기
        const records = await maintenanceService.getMaintenanceRecords({ limit: 5 });
        setRecentMaintenance(records);

        // 예측 정비 데이터 가져오기
        const predictiveData = await dashboardService.getPredictiveMaintenanceData();
        setPredictiveMaintenance(predictiveData);
        
        setLoading(false);
      } catch (err) {
        setError('데이터 로딩 중 오류가 발생했습니다.');
        setLoading(false);
        console.error('Dashboard data loading error:', err);
      }
    };
    
    fetchDashboardData();
  }, []);

  // 상태 배지 색상 결정 함수
  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case VehicleStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case VehicleStatus.MAINTENANCE:
        return 'bg-yellow-100 text-yellow-800';
      case VehicleStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      case VehicleStatus.RECALLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // MaintenanceRecord의 날짜 필드 접근 함수
  const getMaintenanceDate = (record: MaintenanceRecord): Date => {
    // 타입에 date 필드가 없을 경우 대체 필드 사용 (scheduledDate 또는 completedDate)
    if ('scheduledDate' in record && record.scheduledDate) 
      return new Date(record.scheduledDate as string);
    if ('completedDate' in record && record.completedDate) 
      return new Date(record.completedDate as string);
    // 접근할 수 있는 날짜 필드가 없는 경우 현재 날짜 반환
    return new Date();
  };

  // 날짜를 문자열로 포맷팅하는 함수
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">데이터 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">대시보드</h1>
      
      {/* 차량 통계 요약 */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-3">차량 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">전체 차량</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{vehicleStats.total}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">활성 차량</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">{vehicleStats.active}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">정비 중</dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-600">{vehicleStats.maintenance}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">비활성 차량</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-600">{vehicleStats.inactive}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">리콜 차량</dt>
              <dd className="mt-1 text-3xl font-semibold text-red-600">{vehicleStats.recalled}</dd>
            </div>
          </div>
        </div>
      </div>
      
      {/* 예측 정비 섹션 (새로 추가됨) */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium text-gray-900">예측 정비 분석</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {predictiveMaintenance.map((item) => (
            <div key={item.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">{item.label}</dt>
                <dd className="mt-1 text-3xl font-semibold" style={{ color: getColorValue(item.color) }}>
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </dd>
                {item.change !== undefined && (
                  <p className={`text-sm mt-2 ${item.change > 0 ? 'text-green-500' : item.change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {item.change > 0 ? '+' : ''}{item.change}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 예정된 정비 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium text-gray-900">예정된 정비</h2>
          <a href="/maintenance?upcoming=true" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            모두 보기
          </a>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {upcomingMaintenance.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {upcomingMaintenance.map((record) => (
                <li key={record.id}>
                  <a href={`/maintenance/${record.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {record.type} - {record.vehicleId}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getMaintenanceDate(record) < new Date() ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {formatDate(getMaintenanceDate(record))}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {record.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
              예정된 정비가 없습니다.
            </div>
          )}
        </div>
      </div>
      
      {/* 최근 정비 기록 */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium text-gray-900">최근 정비 기록</h2>
          <a href="/maintenance" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            모두 보기
          </a>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {recentMaintenance.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentMaintenance.map((record) => (
                <li key={record.id}>
                  <a href={`/maintenance/${record.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {record.type} - {record.vehicleId}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {formatDate(getMaintenanceDate(record))}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {record.description}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            비용: {record.cost.toLocaleString('ko-KR')}원
                          </p>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
              최근 정비 기록이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 색상 코드 반환 함수
const getColorValue = (color: string): string => {
  switch (color) {
    case 'red':
      return '#ef4444';
    case 'green':
      return '#10b981';
    case 'blue':
      return '#3b82f6';
    case 'yellow':
      return '#f59e0b';
    case 'gray':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}; 