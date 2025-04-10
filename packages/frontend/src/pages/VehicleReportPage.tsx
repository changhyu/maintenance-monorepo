import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Row, Col, Tabs, Space, Spin, 
  Alert, Typography, Badge, Select, Button, 
  Divider, Empty, message
} from 'antd';
import { 
  CarOutlined, LineChartOutlined, 
  FileDoneOutlined, FilterOutlined, 
  ReloadOutlined, DownloadOutlined
} from '@ant-design/icons';
import { DateRangePicker, FilterSelect, ReportGenerator } from '../components/common';
import { ReportType } from '../components/common';
import type { DateRange } from '../components/common';
import VehicleTypeChart from '../components/charts/VehicleTypeChart';
import MaintenanceStatusChart from '../components/charts/MaintenanceStatusChart';
import CostDistributionChart from '../components/charts/CostDistributionChart';
import MaintenanceTrendChart from '../components/charts/MaintenanceTrendChart';
import axios from 'axios';
import apiClient from '../services/api';
import { BookingButton } from '../components/booking/BookingModal';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

// 차량 보고서 인터페이스
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
      const mockVehicles: ReportVehicle[] = generateMockVehicles();
      setVehicles(mockVehicles);
      
      // 차량 유형 목록 추출
      const types = [...new Set(mockVehicles.map(v => v.type))];
      setVehicleTypes(types);
    } catch (err) {
      console.error('차량 데이터를 불러오는 중 오류가 발생했습니다:', err);
      setError('차량 데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 에러 발생 시에도 샘플 데이터 사용
      const mockVehicles: ReportVehicle[] = generateMockVehicles();
      setVehicles(mockVehicles);
      
      const types = [...new Set(mockVehicles.map(v => v.type))];
      setVehicleTypes(types);
    } finally {
      setLoading(false);
    }
  };

  // 샘플 차량 데이터 생성
  const generateMockVehicles = (): ReportVehicle[] => {
    const vehicleTypes = ['승용차', '화물차', 'SUV', '버스', '트럭'];
    const statuses = ['운행 중', '정비 중', '대기 중', '고장', '점검 필요'];
    
    return Array.from({ length: 50 }).map((_, idx) => {
      const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const healthScore = Math.floor(Math.random() * 100);
      const lastMaintenance = new Date();
      lastMaintenance.setDate(lastMaintenance.getDate() - Math.floor(Math.random() * 90));
      
      return {
        id: `VH-${1000 + idx}`,
        name: `차량 ${1000 + idx}`,
        type,
        status,
        healthScore,
        lastMaintenance: lastMaintenance.toISOString().split('T')[0],
        mileage: Math.floor(Math.random() * 100000),
        maintenanceCount: Math.floor(Math.random() * 20),
        cost: Math.floor(Math.random() * 5000000)
      };
    });
  };

  // 필터 적용
  const applyFilters = () => {
    let filtered = [...vehicles];
    
    // 차량 유형 필터
    if (selectedVehicleTypes.length > 0) {
      filtered = filtered.filter(vehicle => selectedVehicleTypes.includes(vehicle.type));
    }
    
    // 날짜 범위 필터
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate).getTime();
      const endDate = new Date(dateRange.endDate).getTime();
      
      filtered = filtered.filter(vehicle => {
        const maintenanceDate = new Date(vehicle.lastMaintenance).getTime();
        return maintenanceDate >= startDate && maintenanceDate <= endDate;
      });
    }
    
    setFilteredVehicles(filtered);
  };

  // 필터 초기화
  const resetFilters = () => {
    setSelectedVehicleTypes([]);
    setDateRange(null);
  };

  // 상태에 따른 배지 색상 
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '운행 중':
        return <Badge status="success" text="운행 중" />;
      case '정비 중':
        return <Badge status="processing" text="정비 중" />;
      case '대기 중':
        return <Badge status="default" text="대기 중" />;
      case '고장':
        return <Badge status="error" text="고장" />;
      case '점검 필요':
        return <Badge status="warning" text="점검 필요" />;
      default:
        return <Badge status="default" text={status} />;
    }
  };

  // 건강 점수에 따른 색상
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 50) return 'orange';
    return 'red';
  };

  // 보고서 생성 완료 시 처리
  const handleReportGenerated = (filename: string, format: string) => {
    console.log(`보고서가 생성되었습니다: ${filename}.${format}`);
  };

  // 차량 테이블 컬럼 정의
  const columns = [
    {
      title: '차량 ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '차량명',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: '최근 정비일',
      dataIndex: 'lastMaintenance',
      key: 'lastMaintenance',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '주행거리',
      dataIndex: 'mileage',
      key: 'mileage',
      width: 120,
      render: (mileage: number) => `${mileage.toLocaleString('ko-KR')} km`,
    },
    {
      title: '상태 점수',
      dataIndex: 'healthScore',
      key: 'healthScore',
      width: 120,
      render: (score: number) => (
        <div style={{ color: getHealthScoreColor(score), fontWeight: 'bold' }}>
          {score}%
        </div>
      ),
    },
    {
      title: '정비 예약',
      key: 'action',
      width: 120,
      render: (_: any, record: ReportVehicle) => (
        <Space>
          <BookingButton 
            vehicleId={record.id} 
            buttonText={record.healthScore < 50 ? '긴급 정비' : '정비 예약'} 
            buttonType={record.healthScore < 50 ? 'primary' : 'default'}
            onBookingCreated={(bookingId) => {
              message.success(`차량 ${record.name}에 대한 정비 예약이 완료되었습니다. (예약 ID: ${bookingId})`);
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="vehicle-report-page" style={{ padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>차량 보고서</Title>
            <Text type="secondary">차량 현황 및 분석 데이터를 조회하고 보고서를 생성합니다.</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchVehicles}
                loading={loading}
              >
                새로고침
              </Button>
              <BookingButton 
                buttonText="신규 정비 예약" 
                buttonType="primary"
                onBookingCreated={(bookingId) => {
                  message.success(`정비 예약이 완료되었습니다. (예약 ID: ${bookingId})`);
                  fetchVehicles();
                }}
              />
              <ReportGenerator
                data={filteredVehicles}
                availableTypes={[
                  ReportType.VEHICLE_STATUS,
                  ReportType.MAINTENANCE_HISTORY,
                  ReportType.FLEET_SUMMARY,
                ]}
                filenamePrefix="vehicle-report"
                onReportGenerated={handleReportGenerated}
                buttonText="보고서 생성"
                disabled={filteredVehicles.length === 0}
              />
            </Space>
          </Col>
        </Row>
      </div>

      {/* 필터 영역 */}
      <Card className="filter-section" style={{ marginBottom: '20px' }}>
        <Space align="start" size="large">
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>차량 유형</Text>
            <FilterSelect
              options={vehicleTypes.map(type => ({ value: type, label: type }))}
              value={selectedVehicleTypes}
              onChange={setSelectedVehicleTypes}
              placeholder="차량 유형 선택"
              style={{ width: 200 }}
              mode="multiple"
            />
          </div>
          
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>정비 기간</Text>
            <DateRangePicker 
              onChange={setDateRange}
              defaultValue={dateRange}
            />
          </div>
          
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={applyFilters}
            style={{ marginTop: '30px' }}
          >
            필터 적용
          </Button>
          
          <Button 
            onClick={resetFilters} 
            style={{ marginTop: '30px' }}
          >
            초기화
          </Button>
        </Space>
      </Card>

      {/* 로딩 및 에러 표시 */}
      {loading && (
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {error && !loading && (
        <Alert
          message="데이터 로드 오류"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      )}

      {/* 데이터 표시 영역 */}
      {!loading && !error && (
        <>
          {!loading && !error && filteredVehicles.filter(v => v.healthScore < 50).length > 0 && (
            <Alert
              message="차량 상태 경고"
              description={`${filteredVehicles.filter(v => v.healthScore < 50).length}대의 차량이 정비가 필요한 상태입니다. 해당 차량의 정비 예약을 진행해주세요.`}
              type="warning"
              showIcon
              style={{ marginBottom: '20px' }}
              action={
                <Button 
                  size="small" 
                  type="primary" 
                  danger
                  onClick={() => {
                    const lowHealthVehicles = filteredVehicles.filter(v => v.healthScore < 50);
                    if (lowHealthVehicles.length > 0) {
                      message.info(`${lowHealthVehicles[0].name} 차량의 정비 예약을 위해 목록에서 "긴급 정비" 버튼을 클릭하세요.`);
                    }
                  }}
                >
                  상세 보기
                </Button>
              }
            />
          )}
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ marginBottom: '20px' }}
          >
            <TabPane tab={<span><CarOutlined /> 차량 상태</span>} key="status">
              <Table
                dataSource={filteredVehicles}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
                loading={loading}
                locale={{ emptyText: <Empty description="데이터가 없습니다" /> }}
              />
            </TabPane>
            
            <TabPane tab={<span><LineChartOutlined /> 요약 대시보드</span>} key="dashboard">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Card title="차량 유형 분포">
                    {filteredVehicles.length > 0 ? (
                      <VehicleTypeChart 
                        data={Object.entries(filteredVehicles.reduce((acc, vehicle) => {
                          acc[vehicle.type] = (acc[vehicle.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)).map(([label, value]) => ({
                          label,
                          value
                        }))}
                      />
                    ) : (
                      <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Text type="secondary">데이터가 없습니다</Text>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="차량 상태 분포">
                    {filteredVehicles.length > 0 ? (
                      <MaintenanceStatusChart 
                        data={Object.entries(filteredVehicles.reduce((acc, vehicle) => {
                          acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)).map(([label, value]) => ({
                          label,
                          value
                        }))}
                      />
                    ) : (
                      <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Text type="secondary">데이터가 없습니다</Text>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="상태 점수 분포">
                    {filteredVehicles.length > 0 ? (
                      <CostDistributionChart 
                        data={[
                          { label: '양호 (80-100)', value: filteredVehicles.filter(v => v.healthScore >= 80).length },
                          { label: '주의 (50-79)', value: filteredVehicles.filter(v => v.healthScore >= 50 && v.healthScore < 80).length },
                          { label: '위험 (0-49)', value: filteredVehicles.filter(v => v.healthScore < 50).length }
                        ]}
                      />
                    ) : (
                      <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Text type="secondary">데이터가 없습니다</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <Card title="차량 상태 점수 통계">
                    {filteredVehicles.length > 0 ? (
                      <MaintenanceTrendChart 
                        data={filteredVehicles.map(vehicle => ({
                          date: vehicle.lastMaintenance,
                          completed: 1,
                          pending: vehicle.healthScore < 70 ? 1 : 0
                        }))}
                      />
                    ) : (
                      <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Text type="secondary">데이터가 없습니다</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab={<span><FileDoneOutlined /> 상세 분석</span>} key="analysis">
              <Card>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="정비 횟수 분포" type="inner">
                      {filteredVehicles.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: 16 }}>
                            <Title level={4}>평균 정비 횟수: {(filteredVehicles.reduce((sum, v) => sum + (v.maintenanceCount || 0), 0) / filteredVehicles.length).toFixed(1)}회</Title>
                          </div>
                          <div>
                            <Text>5회 미만: {filteredVehicles.filter(v => (v.maintenanceCount || 0) < 5).length}대</Text>
                          </div>
                          <div>
                            <Text>5-10회: {filteredVehicles.filter(v => (v.maintenanceCount || 0) >= 5 && (v.maintenanceCount || 0) < 10).length}대</Text>
                          </div>
                          <div>
                            <Text>10회 이상: {filteredVehicles.filter(v => (v.maintenanceCount || 0) >= 10).length}대</Text>
                          </div>
                        </div>
                      ) : (
                        <Empty description="데이터가 없습니다" />
                      )}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="정비 비용 분석" type="inner">
                      {filteredVehicles.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: 16 }}>
                            <Title level={4}>총 정비 비용: {filteredVehicles.reduce((sum, v) => sum + (v.cost || 0), 0).toLocaleString('ko-KR')}원</Title>
                            <Title level={5}>차량당 평균: {(filteredVehicles.reduce((sum, v) => sum + (v.cost || 0), 0) / filteredVehicles.length).toLocaleString('ko-KR')}원</Title>
                          </div>
                          <div>
                            <Text>최고 비용 차량: {filteredVehicles.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]?.name} ({filteredVehicles.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]?.cost?.toLocaleString('ko-KR')}원)</Text>
                          </div>
                        </div>
                      ) : (
                        <Empty description="데이터가 없습니다" />
                      )}
                    </Card>
                  </Col>
                </Row>
                <Divider />
                <Button type="primary" icon={<DownloadOutlined />} size="large" block>
                  상세 분석 보고서 다운로드
                </Button>
              </Card>
            </TabPane>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default VehicleReportPage; 