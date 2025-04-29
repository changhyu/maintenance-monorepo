export class DashboardService {
    constructor(apiClient) {
        this.basePath = '/dashboard';
        this.client = apiClient;
    }
    // 대시보드 데이터 조회
    async getDashboardData(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 차량 통계 조회
    async getVehicleStats(filter) {
        return this.client.get(`${this.basePath}/vehicle-stats`, { params: filter });
    }
    // 정비 통계 조회
    async getMaintenanceStats(filter) {
        return this.client.get(`${this.basePath}/maintenance-stats`, { params: filter });
    }
    // 최근 정비 일정 조회
    async getRecentMaintenance(filter) {
        return this.client.get(`${this.basePath}/recent-maintenance`, { params: filter });
    }
    // 알림 및 경고 조회
    async getAlerts(filter) {
        return this.client.get(`${this.basePath}/alerts`, { params: filter });
    }
    // 최근 등록된 차량 조회
    async getRecentVehicles(filter) {
        return this.client.get(`${this.basePath}/recent-vehicles`, { params: filter });
    }
    // 비용 통계 조회
    async getCostStats(filter) {
        return this.client.get(`${this.basePath}/cost-stats`, { params: filter });
    }
    // 성능 통계 조회
    async getPerformanceStats(filter) {
        return this.client.get(`${this.basePath}/performance-stats`, { params: filter });
    }
    // 특정 사용자의 대시보드 데이터 조회
    async getUserDashboard(userId, filter) {
        return this.client.get(`/users/${userId}/dashboard`, { params: filter });
    }
    // 특정 정비소의 대시보드 데이터 조회
    async getShopDashboard(shopId, filter) {
        return this.client.get(`/shops/${shopId}/dashboard`, { params: filter });
    }
}
