import React, { useEffect } from 'react';
import { Card, List, Tag, Space, Button, Typography } from 'antd';
import { CalendarOutlined, CarOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useInspectionService } from '../../hooks/useInspectionService';
import { UpcomingInspection, InspectionType } from '../../types/inspection';

const { Text, Title } = Typography;

interface UpcomingInspectionsWidgetProps {
  days?: number;
  limit?: number;
}

/**
 * 다가오는 법정검사 위젯 컴포넌트
 */
const UpcomingInspectionsWidget: React.FC<UpcomingInspectionsWidgetProps> = ({ 
  days = 30, 
  limit = 5 
}) => {
  const navigate = useNavigate();
  const { upcomingInspections, isLoading, getUpcomingInspections } = useInspectionService();

  useEffect(() => {
    getUpcomingInspections(days);
  }, [days]);

  const getInspectionTypeLabel = (type: InspectionType) => {
    const typeLabels: Record<InspectionType, string> = {
      [InspectionType.REGULAR]: '정기검사',
      [InspectionType.EMISSION]: '배출가스검사',
      [InspectionType.SAFETY]: '안전검사',
      [InspectionType.COMPREHENSIVE]: '종합검사',
    };
    
    return typeLabels[type];
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 7) return 'red';
    if (daysRemaining <= 14) return 'orange';
    return 'green';
  };

  const limitedInspections = upcomingInspections.slice(0, limit);

  return (
    <Card 
      title={
        <Space>
          <CalendarOutlined />
          <span>다가오는 법정검사</span>
          <Tag color="blue">{days}일 이내</Tag>
        </Space>
      }
      extra={
        <Button type="link" onClick={() => navigate('/inspections')}>
          모두 보기
        </Button>
      }
      loading={isLoading}
    >
      {limitedInspections.length > 0 ? (
        <List
          dataSource={limitedInspections}
          renderItem={(inspection: UpcomingInspection) => (
            <List.Item
              key={inspection.id}
              onClick={() => navigate(`/inspections/${inspection.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ position: 'relative' }}>
                    <CarOutlined style={{ fontSize: 24 }} />
                    {(inspection.daysRemaining || 0) <= 7 && (
                      <ExclamationCircleOutlined 
                        style={{ 
                          color: 'red',
                          position: 'absolute',
                          right: -8,
                          top: -8,
                          fontSize: 14
                        }} 
                      />
                    )}
                  </div>
                }
                title={
                  <Space>
                    <Text>
                      {inspection.vehicle?.make} {inspection.vehicle?.model} ({inspection.vehicle?.licensePlate || '번호판 없음'})
                    </Text>
                    <Tag>{getInspectionTypeLabel(inspection.inspectionType)}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text>만료일: {dayjs(inspection.dueDate).format('YYYY년 MM월 DD일')}</Text>
                    <Text type={getUrgencyColor(inspection.daysRemaining || 0) as any}>
                      남은 일수: {inspection.daysRemaining}일
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary">{days}일 이내에 예정된 법정검사가 없습니다.</Text>
        </div>
      )}
      
      {upcomingInspections.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary">
            외 {upcomingInspections.length - limit}건의 예정된 법정검사가 있습니다.
          </Text>
        </div>
      )}
    </Card>
  );
};

export default UpcomingInspectionsWidget;