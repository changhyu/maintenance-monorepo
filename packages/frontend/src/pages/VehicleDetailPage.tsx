import React, { useEffect, useState } from 'react';
import { Tabs, Spin, Alert, Button } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';

import MileageAlertSettings from '../components/vehicle/MileageAlertSettings';
import InspectionList from '../components/inspection/InspectionList';
import { useApi } from '../context/ApiContext';
import { useVehicleService } from '../hooks/useVehicleService';
import { MileageUnit } from '../services/mileageAlertService';
import { Vehicle } from '../types/vehicle';

const VehicleDetailPage: React.FC = () => {
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiClient } = useApi();
  const navigate = useNavigate();
  const { getVehicleById } = useVehicleService();

  useEffect(() => {
    const loadVehicleData = async () => {
      setLoading(true);
      try {
        const vehicleData = await getVehicleById(vehicleId);
        setVehicle(vehicleData);
      } catch (err) {
        console.error('차량 데이터 로드 중 오류 발생:', err);
        setError('차량 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      loadVehicleData();
    }
  }, [vehicleId]);

  if (loading) {
    return <Spin tip="차량 정보 로딩 중..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!vehicle) {
    return <Alert type="warning" message="차량 정보를 찾을 수 없습니다." />;
  }

  return (
    <div className="vehicle-detail-page">
      <h1>{vehicle.name || `${vehicle.manufacturer} ${vehicle.model} (${vehicle.year})`}</h1>
      
      <Tabs defaultActiveKey="overview">
        <Tabs.TabPane tab="개요" key="overview">
          {/* 차량 개요 내용 */}
          <p>차량 ID: {vehicleId}</p>
          <p>
            주행 거리: {vehicle.mileage} {vehicle.mileageUnit || MileageUnit.KILOMETERS}
          </p>
          {vehicle.licensePlate && <p>번호판: {vehicle.licensePlate}</p>}
          {vehicle.vin && <p>VIN: {vehicle.vin}</p>}
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="주행거리 알림" key="mileage-alerts">
          <MileageAlertSettings
            apiClient={apiClient}
            vehicleId={vehicleId}
            currentMileage={vehicle?.mileage}
            mileageUnit={vehicle?.mileageUnit || MileageUnit.KILOMETERS}
          />
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="법정검사 이력" key="inspections">
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate(`/inspections/create?vehicleId=${vehicleId}`)}
            >
              새 법정검사 등록
            </Button>
          </div>
          
          <InspectionList vehicleId={vehicleId} showVehicleInfo={false} />
        </Tabs.TabPane>
        
        {/* 필요에 따라 추가 탭 */}
      </Tabs>
    </div>
  );
};

export default VehicleDetailPage;
