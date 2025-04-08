import React, { useEffect, useState } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Badge, 
  Table, 
  Tag, 
  Empty, 
  Spin, 
  Button,
  Typography,
  message
} from 'antd';
import { 
  CarOutlined, 
  ToolOutlined, 
  DollarOutlined, 
  CalendarOutlined,
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { VehicleService } from '../services/VehicleService';
import { MaintenanceService } from '../services/MaintenanceService';
import { DashboardDataService } from '../services/DashboardDataService';
import ReportWidgets from './dashboard/ReportWidgets';

export const Dashboard: React.FC = () => {
  const [vehicleStats, setVehicleStats] = useState<VehicleStats | null>(null);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<any[]>([]);
  const [predictiveMaintenance, setPredictiveMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdated, setDataUpdated] = useState<Date>(new Date());
  const [dataRefreshing, setDataRefreshing] = useState<boolean>(false);

  const vehicleService = new VehicleService();
  const maintenanceService = new MaintenanceService();
  const dashboardDataService = new DashboardDataService();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 차량 정보 가져오기
      const vehicles = await vehicleService.getVehicles();
      
      // 차량 통계 계산
      const activeVehicles = vehicles.filter(v => v.status === 'active').length;
      const maintenanceNeeded = vehicles.filter(v => v.status === 'maintenance').length;
      const outOfService = vehicles.filter(v => v.status === 'out_of_service').length;
      
      setVehicleStats({
        total: vehicles.length,
        active: activeVehicles,
        maintenanceNeeded: maintenanceNeeded,
        outOfService: outOfService,
      });
      
      // 정비 데이터 가져오기
      const maintenanceRecords = await maintenanceService.getMaintenanceRecords();
      
      // 예정된 정비
      const upcoming = maintenanceRecords
        .filter(record => record.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 5);
      setUpcomingMaintenance(upcoming);
      
      // 최근 정비 기록
      const recent = maintenanceRecords
        .filter(record => record.status === 'completed')
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime())
        .slice(0, 5);
      setRecentMaintenance(recent);
      
      // 예측 정비 (예시 데이터)
      const predictive = [
        {
          vehicleId: 'V001',
          component: '브레이크 패드',
          probability: 0.85,
          estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          severity: 'high'
        },
        {
          vehicleId: 'V003',
          component: '엔진 오일',
          probability: 0.75,
          estimatedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          severity: 'medium'
        },
        {
          vehicleId: 'V007',
          component: '에어 필터',
          probability: 0.65,
          estimatedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          severity: 'low'
        }
      ];
      setPredictiveMaintenance(predictive);
      
      setDataUpdated(new Date());
    } catch (err) {
      console.error('대시보드 데이터 로드 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 대시보드 데이터 수동 새로고침
  const refreshDashboardData = async () => {
    try {
      setDataRefreshing(true);
      await fetchDashboardData();
      message.success('대시보드 데이터가 업데이트되었습니다.');
    } catch (err) {
      message.error('데이터 새로고침 중 오류가 발생했습니다.');
    } finally {
      setDataRefreshing(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    return moment(dateString).format('YYYY년 MM월 DD일');
  };
  
  // 시간 포맷팅
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 상태에 따른 색상 결정
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'success';
      case 'maintenance':
      case 'scheduled':
        return 'warning';
      case 'out_of_service':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // 정비 심각도에 따른 색상 결정
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'blue';
    }
  };

  // 로딩 중이면 로딩 UI 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin size="large" tip="대시보드 데이터 로딩 중..." />
      </div>
    );
  }

  // 에러가 있으면 에러 메시지 표시
  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <Empty
          description={error}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Typography.Title level={2}>차량 정비 대시보드</Typography.Title>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-4">
            최근 업데이트: {formatTime(dataUpdated)}
          </span>
          <Button 
            icon={<ReloadOutlined spin={dataRefreshing} />} 
            onClick={refreshDashboardData}
            loading={dataRefreshing}
          >
            대시보드 새로고침
          </Button>
        </div>
      </div>
      
      {/* 차량 통계 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 차량"
              value={vehicleStats?.total || 0}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="운행 중 차량"
              value={vehicleStats?.active || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="정비 필요 차량"
              value={vehicleStats?.maintenanceNeeded || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="운행 불가 차량"
              value={vehicleStats?.outOfService || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 보고서 위젯 */}
      <ReportWidgets dashboardService={dashboardDataService} />
      
      <Row gutter={16} className="mb-6">
        <Col span={12}>
          <Card title="예정된 정비" extra={<a href="/maintenance">더 보기</a>}>
            {upcomingMaintenance.length > 0 ? (
              <Table
                dataSource={upcomingMaintenance}
                pagination={false}
                size="small"
                rowKey="id"
              >
                <Table.Column title="차량 ID" dataIndex="vehicleId" key="vehicleId" />
                <Table.Column title="정비 유형" dataIndex="maintenanceType" key="maintenanceType" />
                <Table.Column
                  title="예정일"
                  dataIndex="scheduledDate"
                  key="scheduledDate"
                  render={(date) => formatDate(date)}
                />
                <Table.Column
                  title="상태"
                  dataIndex="status"
                  key="status"
                  render={(status) => (
                    <Badge status={getStatusColor(status) as any} text={status} />
                  )}
                />
              </Table>
            ) : (
              <Empty description="예정된 정비가 없습니다" />
            )}
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="예측 정비" extra={<a href="/predictive">더 보기</a>}>
            {predictiveMaintenance.length > 0 ? (
              <Table
                dataSource={predictiveMaintenance}
                pagination={false}
                size="small"
                rowKey={(record, index) => `${record.vehicleId}-${index}`}
              >
                <Table.Column title="차량 ID" dataIndex="vehicleId" key="vehicleId" />
                <Table.Column title="부품" dataIndex="component" key="component" />
                <Table.Column
                  title="예상 정비일"
                  dataIndex="estimatedDate"
                  key="estimatedDate"
                  render={(date) => formatDate(date.toISOString())}
                />
                <Table.Column
                  title="심각도"
                  dataIndex="severity"
                  key="severity"
                  render={(severity) => (
                    <Tag color={getSeverityColor(severity)}>
                      {severity.toUpperCase()}
                    </Tag>
                  )}
                />
                <Table.Column
                  title="확률"
                  dataIndex="probability"
                  key="probability"
                  render={(probability) => `${Math.round(probability * 100)}%`}
                />
              </Table>
            ) : (
              <Empty description="예측 정비 데이터가 없습니다" />
            )}
          </Card>
        </Col>
      </Row>
      
      {/* 최근 정비 기록 */}
      <Card title="최근 정비 기록" extra={<a href="/maintenance/history">전체 보기</a>}>
        {recentMaintenance.length > 0 ? (
          <Table
            dataSource={recentMaintenance}
            pagination={false}
            size="small"
            rowKey="id"
          >
            <Table.Column title="차량 ID" dataIndex="vehicleId" key="vehicleId" />
            <Table.Column title="정비 유형" dataIndex="maintenanceType" key="maintenanceType" />
            <Table.Column
              title="완료일"
              dataIndex="completionDate"
              key="completionDate"
              render={(date) => formatDate(date)}
            />
            <Table.Column title="설명" dataIndex="description" key="description" ellipsis={true} />
            <Table.Column
              title="비용"
              dataIndex="cost"
              key="cost"
              render={(cost) => `₩${cost.toLocaleString()}`}
            />
            <Table.Column
              title="상태"
              dataIndex="status"
              key="status"
              render={(status) => (
                <Badge status={getStatusColor(status) as any} text={status} />
              )}
            />
          </Table>
        ) : (
          <Empty description="최근 정비 기록이 없습니다" />
        )}
      </Card>
    </div>
  );
};

export default Dashboard; 