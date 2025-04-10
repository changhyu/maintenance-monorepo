import React, { useState } from 'react';
import { DateRangePicker, FilterSelect, DateRange, FilterOption } from './common';
import './dashboard/Dashboard.css';

export interface DashboardFilterProps {
  onFilterChange: (filters: DashboardFilters) => void;
  className?: string;
}

export interface DashboardFilters {
  dateRange: DateRange | null;
  vehicleType?: string;
  maintenanceStatus?: string;
  priority?: string;
}

/**
 * 대시보드 필터 컴포넌트
 */
const DashboardFilter: React.FC<DashboardFilterProps> = ({
  onFilterChange,
  className = '',
}) => {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    vehicleType: '',
    maintenanceStatus: '',
    priority: '',
  });

  // 차량 유형 옵션
  const vehicleTypeOptions: FilterOption[] = [
    { value: '', label: '모든 차량 유형' },
    { value: 'sedan', label: '승용차' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: '밴' },
    { value: 'truck', label: '트럭' },
    { value: 'other', label: '기타' },
  ];

  // 정비 상태 옵션
  const maintenanceStatusOptions: FilterOption[] = [
    { value: '', label: '모든 정비 상태' },
    { value: 'scheduled', label: '예약됨' },
    { value: 'inProgress', label: '진행 중' },
    { value: 'completed', label: '완료됨' },
    { value: 'cancelled', label: '취소됨' },
  ];

  // 우선순위 옵션
  const priorityOptions: FilterOption[] = [
    { value: '', label: '모든 우선순위' },
    { value: 'high', label: '높음' },
    { value: 'medium', label: '중간' },
    { value: 'low', label: '낮음' },
  ];

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dateRange: DateRange | null) => {
    const newFilters = { ...filters, dateRange };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // 필터 값 변경 핸들러
  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    const defaultFilters: DashboardFilters = {
      dateRange: {
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
      vehicleType: '',
      maintenanceStatus: '',
      priority: '',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">필터 옵션</h2>
        <button
          onClick={handleResetFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          필터 초기화
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <div className="filter-label">날짜 범위</div>
          <DateRangePicker
            value={filters.dateRange}
            defaultValue={filters.dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
        
        <FilterSelect
          options={vehicleTypeOptions}
          value={[filters.vehicleType || '']}
          onChange={(values) => handleFilterChange('vehicleType', values[0] || '')}
          label="차량 유형"
        />
        
        <FilterSelect
          options={maintenanceStatusOptions}
          value={[filters.maintenanceStatus || '']}
          onChange={(values) => handleFilterChange('maintenanceStatus', values[0] || '')}
          label="정비 상태"
        />
        
        <FilterSelect
          options={priorityOptions}
          value={[filters.priority || '']}
          onChange={(values) => handleFilterChange('priority', values[0] || '')}
          label="우선순위"
        />
      </div>
    </div>
  );
};

export default DashboardFilter; 