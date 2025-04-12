import React from 'react';

import { Tabs } from 'antd';
import { useParams } from 'react-router-dom';

import MileageAlertSettings from '../components/vehicle/MileageAlertSettings';
import { useApi } from '../context/ApiContext';
import { MileageUnit } from '../services/mileageAlertService';

const VehicleDetailPage: React.FC = () => {
  const { vehicleId = 'vehicle-123' } = useParams<{ vehicleId: string }>();
  const vehicleData = { mileage: 12345, mileageUnit: MileageUnit.KILOMETERS };
  const { apiClient } = useApi();

  return (
    <div className="vehicle-detail-page">
      <h1>차량 상세 정보</h1>
      <Tabs defaultActiveKey="overview">
        <Tabs.TabPane tab="개요" key="overview">
          {/* 차량 개요 내용 */}
          <p>차량 ID: {vehicleId}</p>
          <p>
            주행 거리: {vehicleData.mileage} {vehicleData.mileageUnit}
          </p>
        </Tabs.TabPane>
        <Tabs.TabPane tab="주행거리 알림" key="mileage-alerts">
          <MileageAlertSettings
            apiClient={apiClient}
            vehicleId={vehicleId}
            currentMileage={vehicleData?.mileage}
            mileageUnit={vehicleData?.mileageUnit || MileageUnit.KILOMETERS}
          />
        </Tabs.TabPane>
        {/* 필요에 따라 추가 탭 */}
      </Tabs>
    </div>
  );
};

export default VehicleDetailPage;
