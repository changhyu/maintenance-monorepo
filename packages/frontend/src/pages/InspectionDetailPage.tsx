import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Typography, 
  Breadcrumb, 
  Descriptions, 
  Button, 
  Space, 
  Tag, 
  Spin, 
  Alert,
  Modal,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  HomeOutlined, 
  CarOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  RollbackOutlined 
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';

import { useInspectionService } from '../hooks/useInspectionService';
import { Inspection, InspectionStatus, InspectionType } from '../types/inspection';

const { Title, Text } = Typography;
const { confirm } = Modal;

/**
 * 법정검사 상세 페이지
 */
const InspectionDetailPage: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const { 
    currentInspection, 
    isLoading, 
    error, 
    getInspection, 
    deleteInspection 
  } = useInspectionService();
  
  const [inspection, setInspection] = useState<Inspection | null>(null);
  
  useEffect(() => {
    const loadInspection = async () => {
      if (inspectionId) {
        const data = await getInspection(inspectionId);
        setInspection(data);
      }
    };
    
    loadInspection();
  }, [inspectionId]);
  
  const handleDelete = () => {
    if (!inspectionId) return;
    
    confirm({
      title: '법정검사 일정을 삭제하시겠습니까?',
      content: '이 작업은 되돌릴 수 없습니다.',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        const success = await deleteInspection(inspectionId);
        if (success) {
          navigate('/inspections');
        }
      }
    });
  };
  
  const getStatusTag = (status: InspectionStatus) => {
    const statusColors: Record<InspectionStatus, string> = {
      [InspectionStatus.PENDING]: 'orange',
      [InspectionStatus.SCHEDULED]: 'blue',
      [InspectionStatus.COMPLETED]: 'green',
      [InspectionStatus.EXPIRED]: 'red',
      [InspectionStatus.FAILED]: 'volcano',
    };
    
    const statusLabels: Record<InspectionStatus, string> = {
      [InspectionStatus.PENDING]: '대기중',
      [InspectionStatus.SCHEDULED]: '예정됨',
      [InspectionStatus.COMPLETED]: '완료',
      [InspectionStatus.EXPIRED]: '기한만료',
      [InspectionStatus.FAILED]: '불합격',
    };
    
    return (
      <Tag color={statusColors[status]}>
        {statusLabels[status]}
      </Tag>
    );
  };
  
  const getInspectionTypeLabel = (type: InspectionType) => {
    const typeLabels: Record<InspectionType, string> = {
      [InspectionType.REGULAR]: '정기검사',
      [InspectionType.EMISSION]: '배출가스검사',
      [InspectionType.SAFETY]: '안전검사',
      [InspectionType.COMPREHENSIVE]: '종합검사',
    };
    
    return typeLabels[type];
  };
  
  if (isLoading) {
    return <Spin tip="법정검사 정보 로딩 중..." />;
  }
  
  if (error) {
    return <Alert type="error" message={error} />;
  }
  
  if (!inspection) {
    return <Alert type="warning" message="법정검사 정보를 찾을 수 없습니다." />;
  }
  
  const vehicle = inspection.vehicle;
  
  return (
    <div className="inspection-detail-page">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> 홈</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/inspections"><CarOutlined /> 법정검사</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          검사 상세
        </Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={2}>법정검사 상세 정보</Title>
            <Space>
              {getStatusTag(inspection.status)}
              <Text>{getInspectionTypeLabel(inspection.inspectionType)}</Text>
            </Space>
          </div>
          <Space>
            <Button 
              icon={<RollbackOutlined />}
              onClick={() => navigate('/inspections')}
            >
              목록으로
            </Button>
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => navigate(`/inspections/${inspectionId}/edit`)}
            >
              수정
            </Button>
            {inspection.status !== InspectionStatus.COMPLETED && 
             inspection.status !== InspectionStatus.FAILED && (
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={() => navigate(`/inspections/${inspectionId}/complete`)}
              >
                완료 처리
              </Button>
            )}
            <Button 
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              삭제
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="검사 정보">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="검사 유형">{getInspectionTypeLabel(inspection.inspectionType)}</Descriptions.Item>
                <Descriptions.Item label="검사 상태">{getStatusTag(inspection.status)}</Descriptions.Item>
                <Descriptions.Item label="검사 예정일">{dayjs(inspection.dueDate).format('YYYY년 MM월 DD일')}</Descriptions.Item>
                {inspection.inspectionDate && (
                  <Descriptions.Item label="실제 검사일">{dayjs(inspection.inspectionDate).format('YYYY년 MM월 DD일')}</Descriptions.Item>
                )}
                {inspection.location && (
                  <Descriptions.Item label="검사소">{inspection.location}</Descriptions.Item>
                )}
                {inspection.inspector && (
                  <Descriptions.Item label="검사원">{inspection.inspector}</Descriptions.Item>
                )}
                {inspection.fee !== undefined && (
                  <Descriptions.Item label="검사 비용">
                    {inspection.fee.toLocaleString()}원
                  </Descriptions.Item>
                )}
                {inspection.passed !== undefined && (
                  <Descriptions.Item label="검사 결과">
                    {inspection.passed ? 
                      <Tag color="green">합격</Tag> : 
                      <Tag color="red">불합격</Tag>
                    }
                  </Descriptions.Item>
                )}
                {inspection.certificateNumber && (
                  <Descriptions.Item label="검사 증명서 번호">{inspection.certificateNumber}</Descriptions.Item>
                )}
                {inspection.nextDueDate && (
                  <Descriptions.Item label="다음 검사 예정일">{dayjs(inspection.nextDueDate).format('YYYY년 MM월 DD일')}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card title="차량 정보">
              {vehicle ? (
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="제조사/모델">{vehicle.make} {vehicle.model}</Descriptions.Item>
                  <Descriptions.Item label="연식">{vehicle.year}년식</Descriptions.Item>
                  {vehicle.licensePlate && (
                    <Descriptions.Item label="번호판">{vehicle.licensePlate}</Descriptions.Item>
                  )}
                  {vehicle.vin && (
                    <Descriptions.Item label="VIN">{vehicle.vin}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="액션">
                    <Button 
                      type="link"
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    >
                      차량 상세 보기
                    </Button>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Alert type="warning" message="차량 정보를 불러올 수 없습니다." />
              )}
            </Card>
          </Col>
        </Row>

        {inspection.notes && (
          <>
            <Divider />
            <Card title="비고">
              <p>{inspection.notes}</p>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default InspectionDetailPage;