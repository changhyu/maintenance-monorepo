import React from 'react';
import { Card, Typography, Breadcrumb } from 'antd';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HomeOutlined, CarOutlined, EditOutlined } from '@ant-design/icons';

import InspectionForm from '../components/inspection/InspectionForm';
import { Inspection } from '../types/inspection';

const { Title } = Typography;

/**
 * 법정검사 수정 페이지
 */
const InspectionEditPage: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();

  const handleSuccess = (inspection: Inspection) => {
    navigate(`/inspections/${inspection.id}`);
  };

  return (
    <div className="inspection-edit-page">
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
          <EditOutlined /> 수정
        </Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Title level={2}>법정검사 정보 수정</Title>
        <p>차량의 법정검사 정보를 수정합니다. 변경할 내용을 입력해주세요.</p>
        
        {inspectionId && (
          <InspectionForm 
            mode="edit" 
            inspectionId={inspectionId}
            onSuccess={handleSuccess} 
          />
        )}
      </Card>
    </div>
  );
};

export default InspectionEditPage;