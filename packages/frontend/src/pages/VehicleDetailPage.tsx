import MileageAlertSettings from '../components/vehicle/MileageAlertSettings';
import { MileageUnit } from '../services/mileageAlertService';

// ... existing code ...

// 차량 상세 페이지 컴포넌트 내부 적절한 위치에 추가
<Tabs.TabPane tab="주행거리 알림" key="mileage-alerts">
  <MileageAlertSettings 
    apiClient={apiClient}
    vehicleId={vehicleId}
    currentMileage={vehicleData?.mileage}
    mileageUnit={vehicleData?.mileageUnit || MileageUnit.KILOMETERS}
  />
</Tabs.TabPane>

// ... existing code ... 