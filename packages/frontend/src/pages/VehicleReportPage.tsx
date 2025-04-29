import React, { useState, useEffect } from 'react';

import {
  CarOutlined,
  LineChartOutlined,
  FileDoneOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import {
  Table,
  Card,
  Row,
  Col,
  Tabs,
  Space,
  Spin,
  Alert,
  Typography,
  Badge,
  Select,
  Button,
  Divider,
  Empty,
  message
} from 'antd';
import axios from 'axios';

import { BookingButton } from '../components/booking/BookingModal';
import CostDistributionChart from '../components/charts/CostDistributionChart';
import MaintenanceStatusChart from '../components/charts/MaintenanceStatusChart';
import MaintenanceTrendChart from '../components/charts/MaintenanceTrendChart';
import VehicleTypeChart from '../components/charts/VehicleTypeChart';
import { DateRangePicker, FilterSelect, ReportGenerator, ReportType } from '../components/common';
import apiClient from '../services/api';

import type { DateRange } from '../components/common';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

// 차트 데이터 아이템 인터페이스
interface ChartDataItem {
  label: string;
  value: number;
}

// 정비 동향 차트 데이터 아이템 인터페이스
interface MaintenanceTrendDataItem {
  date: string;
  completed: number;
  pending: number;
}

// 보고서 차량 정보 인터페이스
interface ReportVehicle {
  id: string;
  name: string;
  status: string;
  type: string;
  lastMaintenance: string;
  mileage: number;
  healthScore: number;
  maintenanceCount?: number;
  cost?: number;
  // 문자열 인덱스 시그니처 추가하여 DataItem과 호환되도록 함
  [key: string]: string | number | boolean | Date | null | undefined;
}

const VehicleReportPage: React.FC = () => {
  // 상태 관리
  const [vehicles, setVehicles] = useState<ReportVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<ReportVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('status');
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchVehicles();
  }, []);

  // 필터 변경 시 필터링 적용
  useEffect(() => {
    applyFilters();
  }, [selectedVehicleTypes, dateRange, vehicles]);

  // 차량 데이터 조회
  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      // 실제 구현에서는 API 호출
      // const response = await apiClient.get('/vehicles');
      // setVehicles(response.data);

      // 샘플 데이터
      const mockVehicles = generateMockVehicles();
      setVehicles(mockVehicles);
      
      // 차량 유형 목록 추출
      const types = [...new Set(mockVehicles.map(v => v.type))];
      setVehicleTypes(types);
    } catch (err) {
      console.error('차량 데이터를 불러오는 중 오류가 발생했습니다:', err);
      setError('차량 데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 에러 발생 시에도 샘플 데이터 사용
      const mockVehicles = generateMockVehicles();
      setVehicles(mockVehicles);
      const types = [...new Set(mockVehicles.map(v => v.type))];
      setVehicleTypes(types);
    } finally {
      setLoading(false);
    }
  };

  // 샘플 차량 데이터 생성
  const generateMockVehicles = (): ReportVehicle[] => {
    const statuses = ['active', 'maintenance', 'inactive', 'recalled'];
    const types = ['sedan', 'suv', 'truck', 'van', 'bus', 'electric'];
    
    return Array.from({ length: 50 }).map((_, idx) => ({
      id: `V${1000 + idx}`,
      name: `차량 ${1000 + idx}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      type: types[Math.floor(Math.random() * types.length)],
      lastMaintenance: new Date(Date.now() - Math.random() * 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
      mileage: Math.floor(10000 + Math.random() * 90000),
      healthScore: Math.floor(60 + Math.random() * 40),
      maintenanceCount: Math.floor(1 + Math.random() * 10),
      cost: Math.floor(200000 + Math.random() * 800000)
    }));
  };

  // 필터 적용
  const applyFilters = () => {
    let filtered = [...vehicles];
    
    // 차량 유형 필터
    if (selectedVehicleTypes.length > 0) {
      filtered = filtered.filter(v => selectedVehicleTypes.includes(v.type));
    }
    
    // 날짜 범위 필터
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      filtered = filtered.filter(v => {
        const maintenanceDate = new Date(v.lastMaintenance);
        return maintenanceDate >= startDate && maintenanceDate <= endDate;
      });
    }
    
    setFilteredVehicles(filtered);
  };

  // 차량 유형 선택 변경 핸들러
  const handleVehicleTypeChange = (values: string[]) => {
    setSelectedVehicleTypes(values);
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (range: DateRange | null) => {
    setDateRange(range);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSelectedVehicleTypes([]);
    setDateRange(null);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    fetchVehicles();
  };

  // 탭 변경 핸들러
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 테이블 칼럼 정의
  const columns = [
    {
      title: '차량명',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'active') color = 'green';
        else if (status === 'maintenance') color = 'orange';
        else if (status === 'inactive') color = 'red';
        else if (status === 'recalled') color = 'purple';
        
        return <Badge status={color as any} text={status} />;
      },
    },
    {
      title: '최근 정비일',
      dataIndex: 'lastMaintenance',
      key: 'lastMaintenance',
      sorter: (a: ReportVehicle, b: ReportVehicle) => {
        const dateA = new Date(a.lastMaintenance).getTime();
        const dateB = new Date(b.lastMaintenance).getTime();
        return dateA - dateB;
      },
    },
    {
      title: '주행거리 (km)',
      dataIndex: 'mileage',
      key: 'mileage',
      sorter: (a: ReportVehicle, b: ReportVehicle) => a.mileage - b.mileage,
    },
    {
      title: '상태점수',
      dataIndex: 'healthScore',
      key: 'healthScore',
      sorter: (a: ReportVehicle, b: ReportVehicle) => a.healthScore - b.healthScore,
      render: (score: number) => {
        let color = 'green';
        if (score < 70) color = 'orange';
        if (score < 50) color = 'red';
        
        return <span style={{ color }}>{score}</span>;
      },
    },
    {
      title: '액션',
      key: 'action',
      render: (_text: any, record: ReportVehicle) => (
        <Space size="middle">
          <BookingButton vehicleId={record.id} buttonText="정비 예약" />
          <Button type="text" icon={<CarOutlined />} onClick={() => console.log('상세보기', record.id)}>
            상세보기
          </Button>
        </Space>
      ),
    },
  ];

  // 차트 데이터 변환 함수
  const vehiclesToChartData = (vehicles: ReportVehicle[]): ChartDataItem[] => {
    const typeCount: Record<string, number> = {};
    
    vehicles.forEach(vehicle => {
      typeCount[vehicle.type] = (typeCount[vehicle.type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([label, value]) => ({
      label,
      value
    }));
  };

  const vehiclesToStatusChartData = (vehicles: ReportVehicle[]): ChartDataItem[] => {
    const statusCount: Record<string, number> = {};
    
    vehicles.forEach(vehicle => {
      statusCount[vehicle.status] = (statusCount[vehicle.status] || 0) + 1;
    });
    
    return Object.entries(statusCount).map(([label, value]) => ({
      label,
      value
    }));
  };

  const vehiclesToCostChartData = (vehicles: ReportVehicle[]): ChartDataItem[] => {
    const costByType: Record<string, number> = {};
    
    vehicles.forEach(vehicle => {
      if (vehicle.cost) {
        costByType[vehicle.type] = (costByType[vehicle.type] || 0) + vehicle.cost;
      }
    });
    
    return Object.entries(costByType).map(([label, value]) => ({
      label,
      value
    }));
  };

  const vehiclesToMaintenanceTrendData = (vehicles: ReportVehicle[]): MaintenanceTrendDataItem[] => {
    // 최근 6개월 데이터 생성
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      months.push({
        date: dateString,
        completed: 0,
        pending: 0
      });
    }
    
    // 데이터 채우기 (실제로는 API에서 받아와야 함)
    return months.map(month => ({
      ...month,
      completed: Math.floor(Math.random() * 10) + 5,
      pending: Math.floor(Math.random() * 5) + 1
    }));
  };

  return (
    <div className="vehicle-report-page">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>차량 보고서</Title>
            <Text type="secondary">차량 현황 및 정비 상태를 분석하고 보고서를 생성합니다.</Text>
          </Col>
          <Col>
            <Space>
              <ReportGenerator 
                data={filteredVehicles} 
                availableTypes={[ReportType.VEHICLE_HISTORY]} 
                buttonText="보고서 내보내기"
                filenamePrefix="vehicle_report"
                buttonStyle={{ padding: '4px 15px' }}
                onReportGenerated={() => message.success('보고서가 생성되었습니다.')}
              />
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                새로고침
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <FilterSelect
              title="차량 유형"
              placeholder="차량 유형 선택"
              mode="multiple"
              options={vehicleTypes.map(type => ({ value: type, label: type }))}
              value={selectedVehicleTypes}
              onChange={handleVehicleTypeChange}
            />
          </Col>
          <Col span={8}>
            <DateRangePicker
              title="정비 날짜 범위"
              value={dateRange}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col span={8} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Button 
              icon={<FilterOutlined />} 
              onClick={handleResetFilters}
              style={{ marginBottom: 8 }}
            >
              필터 초기화
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab={<span><CarOutlined />차량 상태</span>} key="status">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="차량 유형별 분포">
                <VehicleTypeChart data={vehiclesToChartData(filteredVehicles)} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="정비 상태 분포">
                <MaintenanceStatusChart data={vehiclesToStatusChartData(filteredVehicles)} />
              </Card>
            </Col>
          </Row>

          <Card title="차량 목록">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            ) : error ? (
              <Alert message={error} type="error" showIcon />
            ) : filteredVehicles.length === 0 ? (
              <Empty description="조건에 맞는 차량이 없습니다." />
            ) : (
              <Table 
                columns={columns} 
                dataSource={filteredVehicles} 
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </TabPane>
        
        <TabPane tab={<span><LineChartOutlined />정비 동향</span>} key="trends">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card title="월별 정비 추이">
                <MaintenanceTrendChart data={vehiclesToMaintenanceTrendData(filteredVehicles)} />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={24}>
              <Card title="비용 분포">
                <CostDistributionChart data={vehiclesToCostChartData(filteredVehicles)} />
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab={<span><FileDoneOutlined />요약 보고서</span>} key="summary">
          <Card>
            {loading ? (
              <Spin />
            ) : (
              <div>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card bodyStyle={{ padding: 16, textAlign: 'center' }}>
                      <Text type="secondary">총 차량 수</Text>
                      <br />
                      <Text style={{ fontSize: 24 }}>{filteredVehicles.length}</Text>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card bodyStyle={{ padding: 16, textAlign: 'center' }}>
                      <Text type="secondary">정상 운행</Text>
                      <br />
                      <Text style={{ fontSize: 24, color: 'green' }}>
                        {filteredVehicles.filter(v => v.status === 'active').length}
                      </Text>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card bodyStyle={{ padding: 16, textAlign: 'center' }}>
                      <Text type="secondary">정비 중</Text>
                      <br />
                      <Text style={{ fontSize: 24, color: 'orange' }}>
                        {filteredVehicles.filter(v => v.status === 'maintenance').length}
                      </Text>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card bodyStyle={{ padding: 16, textAlign: 'center' }}>
                      <Text type="secondary">비운행</Text>
                      <br />
                      <Text style={{ fontSize: 24, color: 'red' }}>
                        {filteredVehicles.filter(v => v.status === 'inactive' || v.status === 'recalled').length}
                      </Text>
                    </Card>
                  </Col>
                </Row>
                
                <Divider />
                
                <Row gutter={16}>
                  <Col span={24}>
                    <ReportGenerator 
                      data={filteredVehicles} 
                      availableTypes={[
                        ReportType.VEHICLE_HISTORY,
                        ReportType.MAINTENANCE_SUMMARY,
                        ReportType.COST_ANALYSIS
                      ]} 
                      filenamePrefix="vehicle_summary_report"
                      buttonText="상세 보고서 생성"
                      buttonStyle={{ padding: '8px 20px', fontSize: '16px' }}
                      onReportGenerated={() => message.success('보고서가 생성되었습니다.')}
                    />
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default VehicleReportPage;
