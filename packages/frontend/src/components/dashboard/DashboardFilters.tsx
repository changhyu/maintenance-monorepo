import React, { useState } from 'react';
import { Card, Row, Col, Button } from 'antd';
import { DateRangePicker } from '../common';
import { FilterSelect, FilterOption } from '../common';

// 필터 옵션들
const vehicleTypeOptions: FilterOption[] = [
  { value: 'all', label: '전체 차량' },
  { value: 'sedan', label: '승용차' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: '밴' },
  { value: 'truck', label: '트럭' },
  { value: 'bus', label: '버스' },
];

const statusOptions: FilterOption[] = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: '운행 중' },
  { value: 'maintenance', label: '정비 중' },
  { value: 'inactive', label: '비활성' },
];

const locationOptions: FilterOption[] = [
  { value: 'all', label: '전체 지역' },
  { value: 'seoul', label: '서울' },
  { value: 'busan', label: '부산' },
  { value: 'incheon', label: '인천' },
  { value: 'daegu', label: '대구' },
  { value: 'gwangju', label: '광주' },
];

export interface DashboardFilterValues {
  dateRange: [string, string] | null;
  vehicleTypes: string[];
  status: string[];
  locations: string[];
}

interface DashboardFiltersProps {
  onFilterChange: (filters: DashboardFilterValues) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({ onFilterChange }) => {
  // 필터 상태 관리
  const [filters, setFilters] = useState<DashboardFilterValues>({
    dateRange: null,
    vehicleTypes: ['all'],
    status: ['all'],
    locations: ['all'],
  });

  // 필터 변경 처리
  const handleFilterChange = (key: keyof DashboardFilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // 필터 초기화
  const resetFilters = () => {
    const defaultFilters: DashboardFilterValues = {
      dateRange: null,
      vehicleTypes: ['all'],
      status: ['all'],
      locations: ['all'],
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <Card title="대시보드 필터" extra={<Button onClick={resetFilters}>초기화</Button>}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <DateRangePicker
            onChange={(dates) => handleFilterChange('dateRange', dates)}
            defaultValue={filters.dateRange}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <FilterSelect
            label="차량 유형"
            options={vehicleTypeOptions}
            value={filters.vehicleTypes}
            onChange={(value) => handleFilterChange('vehicleTypes', value)}
            mode="multiple"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <FilterSelect
            label="상태"
            options={statusOptions}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            mode="multiple"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <FilterSelect
            label="지역"
            options={locationOptions}
            value={filters.locations}
            onChange={(value) => handleFilterChange('locations', value)}
            mode="multiple"
          />
        </Col>
      </Row>
    </Card>
  );
};

export default DashboardFilters; 