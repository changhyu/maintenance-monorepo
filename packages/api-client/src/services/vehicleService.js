export class VehicleService {
    constructor(apiClient) {
        this.basePath = '/vehicles';
        this.client = apiClient;
    }
    // 모든 차량 목록 조회
    async getAllVehicles() {
        return this.client.get(this.basePath);
    }
    // 특정 차량 조회
    async getVehicleById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 차량 생성
    async createVehicle(vehicleData) {
        return this.client.post(this.basePath, vehicleData);
    }
    // 차량 정보 업데이트
    async updateVehicle(id, vehicleData) {
        return this.client.put(`${this.basePath}/${id}`, vehicleData);
    }
    // 차량 삭제
    async deleteVehicle(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 차량 정비 기록 조회
    async getVehicleMaintenanceRecords(vehicleId) {
        return this.client.get(`${this.basePath}/${vehicleId}/maintenance`);
    }
    // 차량 정비 기록 추가
    async addMaintenanceRecord(data) {
        return this.client.post(`${this.basePath}/${data.vehicleId}/maintenance`, data);
    }
    // 차량 상태 변경
    async changeVehicleStatus(id, status) {
        return this.client.patch(`${this.basePath}/${id}/status`, { status });
    }
}
