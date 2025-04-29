import React, { useEffect } from 'react';
import { Card, Typography, Breadcrumb } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HomeOutlined, CarOutlined, PlusOutlined } from '@ant-design/icons';

import InspectionForm from '../components/inspection/InspectionForm';
import { Inspection } from '../types/inspection';

const { Title } = Typography;

/**
 * 법정검사 생성 페이지
 */
const InspectionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const vehicleId = queryParams.get('vehicleId');

  const handleSuccess = (inspection: Inspection) => {
    navigate(`/inspections/${inspection.id}`);
  };

  return (
    <div className="inspection-create-page">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> 홈</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/inspections"><CarOutlined /> 법정검사</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <PlusOutlined /> 새 법정검사
        </Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Title level={2}>새 법정검사 등록</Title>
        <p>차량의 법정검사 정보를 등록합니다. 검사 날짜와 유형을 정확하게 입력해주세요.</p>
        
        <InspectionForm 
          mode="create" 
          vehicleId={vehicleId || undefined}
          onSuccess={handleSuccess} 
        />
      </Card>
    </div>
  );
};

export default InspectionCreatePage;