import MileageAlertSettings from '../components/vehicle/MileageAlertSettings';
import { MileageUnit } from '../services/mileageAlertService';
import { Tabs } from 'antd';
import { ApiClient } from '../../../api-client/src/client';

const vehicleId: string = "vehicle-123";
const vehicleData = { mileage: 12345, mileageUnit: MileageUnit.KILOMETERS };

// 외부 ApiClient 사용 및 DummyApiClient 클래스 생성
class DummyApiClient extends ApiClient {
  constructor() {
    super({ baseURL: '' });
  }
  get(url: string, params?: any): Promise<any> {
    return Promise.resolve({ data: {} });
  }
  post(url: string, data?: any): Promise<any> {
    return Promise.resolve({ data: {} });
  }
  put(url: string, data?: any): Promise<any> {
    return Promise.resolve({ data: {} });
  }
  patch(url: string, data?: any): Promise<any> {
    return Promise.resolve({ data: {} });
  }
  delete(url: string, data?: any): Promise<any> {
    return Promise.resolve({ data: {} });
  }
  setAuthToken(token: string): void {
    // dummy implementation
  }
  removeAuthToken(): void {
    // dummy implementation
  }
}

const apiClient = new DummyApiClient();

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