import React, { useState } from 'react';
import { Card, Typography, Button, Space, Row, Col, Tabs, Divider } from 'antd';
import { PlusOutlined, CarOutlined, CalendarOutlined, AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import InspectionList from '../components/inspection/InspectionList';
import UpcomingInspectionsWidget from '../components/dashboard/UpcomingInspectionsWidget';
import { InspectionStatus } from '../types/inspection';

const { Title } = Typography;
const { TabPane } = Tabs;

/**
 * 법정검사 목록 페이지
 */
const InspectionListPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');

  const filterByStatus = (status?: InspectionStatus) => {
    if (status) {
      return { status };
    }
    return undefined;
  };

  return (
    <div className="inspection-list-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Title level={2}>
                <CarOutlined /> 차량 법정검사 관리
              </Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/inspections/create')}
              >
                새 법정검사 등록
              </Button>
            </Space>
            <p>
              차량 법정검사를 등록하고, 일정을 관리하며, 검사 완료 여부를 추적할 수 있습니다.
            </p>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <UpcomingInspectionsWidget days={30} />
        </Col>
        <Col xs={24} md={16}>
          <Card title={<><CalendarOutlined /> 법정검사 통계</>}>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ color: '#52c41a' }}>13</Title>
                    <p>완료된 검사</p>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ color: '#1890ff' }}>8</Title>
                    <p>예정된 검사</p>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ color: '#ff4d4f' }}>2</Title>
                    <p>기한 만료</p>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Card style={{ marginTop: 16 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="전체 검사" key="all">
            <InspectionList showVehicleInfo={true} />
          </TabPane>
          <TabPane tab="예정된 검사" key="scheduled">
            <InspectionList 
              showVehicleInfo={true} 
              filters={filterByStatus(InspectionStatus.SCHEDULED)} 
            />
          </TabPane>
          <TabPane tab="대기중인 검사" key="pending">
            <InspectionList 
              showVehicleInfo={true} 
              filters={filterByStatus(InspectionStatus.PENDING)} 
            />
          </TabPane>
          <TabPane tab="완료된 검사" key="completed">
            <InspectionList 
              showVehicleInfo={true} 
              filters={filterByStatus(InspectionStatus.COMPLETED)} 
            />
          </TabPane>
          <TabPane tab="만료된 검사" key="expired">
            <InspectionList 
              showVehicleInfo={true} 
              filters={filterByStatus(InspectionStatus.EXPIRED)} 
            />
          </TabPane>
          <TabPane tab={<><AlertOutlined /> 불합격 검사</>} key="failed">
            <InspectionList 
              showVehicleInfo={true} 
              filters={filterByStatus(InspectionStatus.FAILED)} 
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default InspectionListPage;