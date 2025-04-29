export class MaintenanceService {
    constructor(apiClient) {
        this.basePath = '/maintenance';
        this.client = apiClient;
    }
    // 모든 정비 일정 조회
    async getAllMaintenanceSchedules() {
        return this.client.get(this.basePath);
    }
    // 특정 차량의 정비 일정 조회
    async getVehicleMaintenanceSchedules(vehicleId) {
        return this.client.get(`${this.basePath}/vehicle/${vehicleId}`);
    }
    // 특정 정비 일정 조회
    async getMaintenanceScheduleById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 정비 일정 생성
    async createMaintenanceSchedule(data) {
        return this.client.post(this.basePath, data);
    }
    // 정비 일정 업데이트
    async updateMaintenanceSchedule(id, data) {
        return this.client.put(`${this.basePath}/${id}`, data);
    }
    // 정비 일정 삭제
    async deleteMaintenanceSchedule(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 정비 일정 상태 변경
    async changeMaintenanceStatus(id, status) {
        return this.client.patch(`${this.basePath}/${id}/status`, { status });
    }
    // 정비 보고서 생성
    async createMaintenanceReport(data) {
        return this.client.post(`${this.basePath}/${data.maintenanceId}/reports`, data);
    }
    // 정비 보고서 조회
    async getMaintenanceReport(maintenanceId) {
        return this.client.get(`${this.basePath}/${maintenanceId}/reports`);
    }
}
