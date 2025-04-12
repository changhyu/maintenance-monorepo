import { api } from './api';

// 지오펜스 타입 정의
export interface Geofence {
  id: string;
  name: string;
  description?: string;
  type: 'circle' | 'polygon' | 'rectangle';
  coordinates: GeoCoordinate[];
  radius?: number; // 원형 지오펜스인 경우
  color?: string;
  vehicleIds?: string[]; // 이 지오펜스에 할당된 차량 ID 목록
  createdAt: Date;
  updatedAt: Date;
}

// 지오펜스 생성 요청 인터페이스
export interface CreateGeofenceRequest {
  name: string;
  description?: string;
  type: 'circle' | 'polygon' | 'rectangle';
  coordinates: GeoCoordinate[];
  radius?: number; // 원형 지오펜스인 경우
  color?: string;
  vehicleIds?: string[]; // 이 지오펜스에 할당된 차량 ID 목록
}

// 지오펜스 업데이트 요청 인터페이스
export interface UpdateGeofenceRequest {
  name?: string;
  description?: string;
  coordinates?: GeoCoordinate[];
  radius?: number;
  color?: string;
  vehicleIds?: string[];
}

// 지오코디네이트 인터페이스
export interface GeoCoordinate {
  lat: number;
  lng: number;
}

// 지오펜스 알림 설정
export interface GeofenceAlertSettings {
  geofenceId: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  alertOnDwell: boolean;
  dwellTime?: number; // 체류 알림 시간(초)
  notificationChannels: ('email' | 'sms' | 'push')[];
  recipients?: string[]; // 알림 수신자 (이메일 또는 전화번호)
}

// 지오펜스 이벤트 타입
export enum GeofenceEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  DWELL = 'dwell'
}

// 지오펜스 이벤트 인터페이스
export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  vehicleId: string;
  eventType: GeofenceEventType;
  timestamp: Date;
  coordinates: GeoCoordinate;
}

// 지오펜스 서비스 객체
export const geofenceService = {
  // 모든 지오펜스 가져오기
  async getAllGeofences(): Promise<Geofence[]> {
    try {
      const response = await api.get('/geofences');
      return response.data;
    } catch (error) {
      console.error('모든 지오펜스 조회 실패:', error);
      return [];
    }
  },

  // 특정 지오펜스 가져오기
  async getGeofence(geofenceId: string): Promise<Geofence | null> {
    try {
      const response = await api.get(`/geofences/${geofenceId}`);
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId} 조회 실패:`, error);
      return null;
    }
  },

  // 특정 차량에 할당된 지오펜스 가져오기
  async getGeofencesByVehicle(vehicleId: string): Promise<Geofence[]> {
    try {
      const response = await api.get(`/geofences/vehicle/${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error(`차량 ID ${vehicleId}의 지오펜스 조회 실패:`, error);
      return [];
    }
  },

  // 새 지오펜스 생성
  async createGeofence(geofenceData: CreateGeofenceRequest): Promise<Geofence | null> {
    try {
      const response = await api.post('/geofences', geofenceData);
      return response.data;
    } catch (error) {
      console.error('지오펜스 생성 실패:', error);
      return null;
    }
  },

  // 지오펜스 업데이트
  async updateGeofence(
    geofenceId: string,
    updateData: UpdateGeofenceRequest
  ): Promise<Geofence | null> {
    try {
      const response = await api.put(`/geofences/${geofenceId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId} 업데이트 실패:`, error);
      return null;
    }
  },

  // 지오펜스 삭제
  async deleteGeofence(geofenceId: string): Promise<boolean> {
    try {
      await api.delete(`/geofences/${geofenceId}`);
      return true;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId} 삭제 실패:`, error);
      return false;
    }
  },

  // 지오펜스에 차량 할당
  async assignVehiclesToGeofence(
    geofenceId: string,
    vehicleIds: string[]
  ): Promise<Geofence | null> {
    try {
      const response = await api.post(`/geofences/${geofenceId}/assign-vehicles`, { vehicleIds });
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId}에 차량 할당 실패:`, error);
      return null;
    }
  },

  // 지오펜스에서 차량 제거
  async removeVehiclesFromGeofence(
    geofenceId: string,
    vehicleIds: string[]
  ): Promise<Geofence | null> {
    try {
      const response = await api.post(`/geofences/${geofenceId}/remove-vehicles`, { vehicleIds });
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId}에서 차량 제거 실패:`, error);
      return null;
    }
  },

  // 지오펜스 알림 설정 가져오기
  async getGeofenceAlertSettings(geofenceId: string): Promise<GeofenceAlertSettings | null> {
    try {
      const response = await api.get(`/geofences/${geofenceId}/alert-settings`);
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId}의 알림 설정 조회 실패:`, error);
      return null;
    }
  },

  // 지오펜스 알림 설정 업데이트
  async updateGeofenceAlertSettings(
    geofenceId: string,
    settings: GeofenceAlertSettings
  ): Promise<GeofenceAlertSettings | null> {
    try {
      const response = await api.put(`/geofences/${geofenceId}/alert-settings`, settings);
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId}의 알림 설정 업데이트 실패:`, error);
      return null;
    }
  },

  // 지오펜스 이벤트 이력 가져오기
  async getGeofenceEvents(
    geofenceId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      vehicleId?: string;
      eventType?: GeofenceEventType;
      limit?: number;
      offset?: number;
    }
  ): Promise<GeofenceEvent[]> {
    try {
      const response = await api.get(`/geofences/${geofenceId}/events`, { params: options });
      return response.data;
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId}의 이벤트 조회 실패:`, error);
      return [];
    }
  },

  // 차량의 지오펜스 이벤트 이력 가져오기
  async getVehicleGeofenceEvents(
    vehicleId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      geofenceId?: string;
      eventType?: GeofenceEventType;
      limit?: number;
      offset?: number;
    }
  ): Promise<GeofenceEvent[]> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/geofence-events`, { params: options });
      return response.data;
    } catch (error) {
      console.error(`차량 ID ${vehicleId}의 지오펜스 이벤트 조회 실패:`, error);
      return [];
    }
  },

  // 특정 위치가 지오펜스 안에 있는지 확인
  async checkPointInGeofence(geofenceId: string, point: GeoCoordinate): Promise<boolean> {
    try {
      const response = await api.post(`/geofences/${geofenceId}/check-point`, { point });
      return response.data.isInside;
    } catch (error) {
      console.error(`위치의 지오펜스 ${geofenceId} 포함 여부 확인 실패:`, error);
      return false;
    }
  }
};
