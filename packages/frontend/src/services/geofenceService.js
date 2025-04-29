import { api } from './api';
// 지오펜스 이벤트 타입
export var GeofenceEventType;
(function (GeofenceEventType) {
    GeofenceEventType["ENTER"] = "enter";
    GeofenceEventType["EXIT"] = "exit";
    GeofenceEventType["DWELL"] = "dwell";
})(GeofenceEventType || (GeofenceEventType = {}));
// 지오펜스 서비스 객체
export const geofenceService = {
    // 모든 지오펜스 가져오기
    async getAllGeofences() {
        try {
            const response = await api.get('/geofences');
            return response.data;
        }
        catch (error) {
            console.error('모든 지오펜스 조회 실패:', error);
            return [];
        }
    },
    // 특정 지오펜스 가져오기
    async getGeofence(geofenceId) {
        try {
            const response = await api.get(`/geofences/${geofenceId}`);
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId} 조회 실패:`, error);
            return null;
        }
    },
    // 특정 차량에 할당된 지오펜스 가져오기
    async getGeofencesByVehicle(vehicleId) {
        try {
            const response = await api.get(`/geofences/vehicle/${vehicleId}`);
            return response.data;
        }
        catch (error) {
            console.error(`차량 ID ${vehicleId}의 지오펜스 조회 실패:`, error);
            return [];
        }
    },
    // 새 지오펜스 생성
    async createGeofence(geofenceData) {
        try {
            const response = await api.post('/geofences', geofenceData);
            return response.data;
        }
        catch (error) {
            console.error('지오펜스 생성 실패:', error);
            return null;
        }
    },
    // 지오펜스 업데이트
    async updateGeofence(geofenceId, updateData) {
        try {
            const response = await api.put(`/geofences/${geofenceId}`, updateData);
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId} 업데이트 실패:`, error);
            return null;
        }
    },
    // 지오펜스 삭제
    async deleteGeofence(geofenceId) {
        try {
            await api.delete(`/geofences/${geofenceId}`);
            return true;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId} 삭제 실패:`, error);
            return false;
        }
    },
    // 지오펜스에 차량 할당
    async assignVehiclesToGeofence(geofenceId, vehicleIds) {
        try {
            const response = await api.post(`/geofences/${geofenceId}/assign-vehicles`, { vehicleIds });
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId}에 차량 할당 실패:`, error);
            return null;
        }
    },
    // 지오펜스에서 차량 제거
    async removeVehiclesFromGeofence(geofenceId, vehicleIds) {
        try {
            const response = await api.post(`/geofences/${geofenceId}/remove-vehicles`, { vehicleIds });
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId}에서 차량 제거 실패:`, error);
            return null;
        }
    },
    // 지오펜스 알림 설정 가져오기
    async getGeofenceAlertSettings(geofenceId) {
        try {
            const response = await api.get(`/geofences/${geofenceId}/alert-settings`);
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId}의 알림 설정 조회 실패:`, error);
            return null;
        }
    },
    // 지오펜스 알림 설정 업데이트
    async updateGeofenceAlertSettings(geofenceId, settings) {
        try {
            const response = await api.put(`/geofences/${geofenceId}/alert-settings`, settings);
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId}의 알림 설정 업데이트 실패:`, error);
            return null;
        }
    },
    // 지오펜스 이벤트 이력 가져오기
    async getGeofenceEvents(geofenceId, options) {
        try {
            const response = await api.get(`/geofences/${geofenceId}/events`, { params: options });
            return response.data;
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId}의 이벤트 조회 실패:`, error);
            return [];
        }
    },
    // 차량의 지오펜스 이벤트 이력 가져오기
    async getVehicleGeofenceEvents(vehicleId, options) {
        try {
            const response = await api.get(`/vehicles/${vehicleId}/geofence-events`, { params: options });
            return response.data;
        }
        catch (error) {
            console.error(`차량 ID ${vehicleId}의 지오펜스 이벤트 조회 실패:`, error);
            return [];
        }
    },
    // 특정 위치가 지오펜스 안에 있는지 확인
    async checkPointInGeofence(geofenceId, point) {
        try {
            const response = await api.post(`/geofences/${geofenceId}/check-point`, { point });
            return response.data.isInside;
        }
        catch (error) {
            console.error(`위치의 지오펜스 ${geofenceId} 포함 여부 확인 실패:`, error);
            return false;
        }
    }
};
