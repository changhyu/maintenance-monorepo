import React from 'react';
import { Card, Typography, Breadcrumb } from 'antd';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HomeOutlined, CarOutlined, CheckCircleOutlined } from '@ant-design/icons';

import InspectionCompleteForm from '../components/inspection/InspectionCompleteForm';
import { Inspection } from '../types/inspection';

const { Title } = Typography;

/**
 * 법정검사 완료 처리 페이지
 */
const InspectionCompletePage: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();

  const handleSuccess = (inspection: Inspection) => {
    navigate(`/inspections/${inspection.id}`);
  };

  return (
    <div className="inspection-complete-page">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> 홈</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/inspections"><CarOutlined /> 법정검사</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to={`/inspections/${inspectionId}`}>검사 상세</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <CheckCircleOutlined /> 검사 완료 처리
        </Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Title level={2}>법정검사 완료 처리</Title>
        <p>차량의 법정검사 완료 정보를 입력합니다. 검사 결과와 다음 검사 예정일을 정확하게 입력해주세요.</p>
        
        {inspectionId && (
          <InspectionCompleteForm 
            inspectionId={inspectionId}
            onSuccess={handleSuccess} 
          />
        )}
      </Card>
    </div>
  );
};

export default InspectionCompletePage;