export var AnalyticsTimeFrame;
(function (AnalyticsTimeFrame) {
    AnalyticsTimeFrame["DAY"] = "day";
    AnalyticsTimeFrame["WEEK"] = "week";
    AnalyticsTimeFrame["MONTH"] = "month";
    AnalyticsTimeFrame["QUARTER"] = "quarter";
    AnalyticsTimeFrame["YEAR"] = "year";
    AnalyticsTimeFrame["CUSTOM"] = "custom";
})(AnalyticsTimeFrame || (AnalyticsTimeFrame = {}));
export var AnalyticsMetricType;
(function (AnalyticsMetricType) {
    AnalyticsMetricType["COUNT"] = "count";
    AnalyticsMetricType["SUM"] = "sum";
    AnalyticsMetricType["AVERAGE"] = "average";
    AnalyticsMetricType["MIN"] = "min";
    AnalyticsMetricType["MAX"] = "max";
    AnalyticsMetricType["MEDIAN"] = "median";
    AnalyticsMetricType["PERCENTAGE"] = "percentage";
})(AnalyticsMetricType || (AnalyticsMetricType = {}));
export var AnalyticsChartType;
(function (AnalyticsChartType) {
    AnalyticsChartType["LINE"] = "line";
    AnalyticsChartType["BAR"] = "bar";
    AnalyticsChartType["PIE"] = "pie";
    AnalyticsChartType["AREA"] = "area";
    AnalyticsChartType["SCATTER"] = "scatter";
    AnalyticsChartType["TABLE"] = "table";
})(AnalyticsChartType || (AnalyticsChartType = {}));
export class AnalyticsService {
    constructor(apiClient) {
        this.basePath = '/analytics';
        this.dashboardsPath = '/dashboards';
        this.reportsPath = '/reports';
        this.client = apiClient;
    }
    // 기본 분석 쿼리 실행
    async runAnalyticsQuery(query) {
        return this.client.post(`${this.basePath}/query`, query);
    }
    // 여러 분석 쿼리 실행
    async runMultipleQueries(queries) {
        return this.client.post(`${this.basePath}/multi-query`, queries);
    }
    // 차량 관련 분석
    async getVehicleAnalytics(timeFrame, dateRange) {
        return this.client.get(`${this.basePath}/vehicles/overview`, {
            params: {
                timeFrame,
                ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
            }
        });
    }
    // 특정 차량의 분석 데이터 조회
    async getVehicleDetails(vehicleId, timeFrame, dateRange) {
        return this.client.get(`${this.basePath}/vehicles/${vehicleId}/details`, {
            params: {
                timeFrame,
                ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
            }
        });
    }
    // 정비 관련 분석
    async getMaintenanceAnalytics(timeFrame, dateRange) {
        return this.client.get(`${this.basePath}/maintenance/overview`, {
            params: {
                timeFrame,
                ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
            }
        });
    }
    // 비용 관련 분석
    async getCostAnalytics(timeFrame, dateRange) {
        return this.client.get(`${this.basePath}/costs/overview`, {
            params: {
                timeFrame,
                ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
            }
        });
    }
    // 예측 정비 분석
    async getPredictiveMaintenanceAnalytics(vehicleId) {
        return this.client.get(`${this.basePath}/predictive-maintenance`, {
            params: { vehicleId }
        });
    }
    // 사용자 관련 분석
    async getUserAnalytics(timeFrame, dateRange) {
        return this.client.get(`${this.basePath}/users/overview`, {
            params: {
                timeFrame,
                ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
            }
        });
    }
    // 정비소 관련 분석
    async getShopAnalytics(timeFrame, dateRange) {
        return this.client.get(`${this.basePath}/shops/overview`, {
            params: {
                timeFrame,
                ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
            }
        });
    }
    // 대시보드 관련 메서드
    // 대시보드 목록 조회
    async getDashboards() {
        return this.client.get(this.dashboardsPath);
    }
    // 특정 대시보드 조회
    async getDashboard(dashboardId) {
        return this.client.get(`${this.dashboardsPath}/${dashboardId}`);
    }
    // 새 대시보드 생성
    async createDashboard(dashboard) {
        return this.client.post(this.dashboardsPath, dashboard);
    }
    // 대시보드 업데이트
    async updateDashboard(dashboardId, updates) {
        return this.client.put(`${this.dashboardsPath}/${dashboardId}`, updates);
    }
    // 대시보드 삭제
    async deleteDashboard(dashboardId) {
        return this.client.delete(`${this.dashboardsPath}/${dashboardId}`);
    }
    // 위젯 관련 메서드
    // 대시보드에 위젯 추가
    async addWidgetToDashboard(dashboardId, widget) {
        return this.client.post(`${this.dashboardsPath}/${dashboardId}/widgets`, widget);
    }
    // 위젯 업데이트
    async updateWidget(dashboardId, widgetId, updates) {
        return this.client.put(`${this.dashboardsPath}/${dashboardId}/widgets/${widgetId}`, updates);
    }
    // 위젯 데이터 조회
    async getWidgetData(dashboardId, widgetId) {
        return this.client.get(`${this.dashboardsPath}/${dashboardId}/widgets/${widgetId}/data`);
    }
    // 위젯 삭제
    async deleteWidget(dashboardId, widgetId) {
        return this.client.delete(`${this.dashboardsPath}/${dashboardId}/widgets/${widgetId}`);
    }
    // 리포트 관련 메서드
    // 리포트 생성
    async createReport(options) {
        return this.client.post(this.reportsPath, options);
    }
    // 리포트 목록 조회
    async getReports(filter) {
        return this.client.get(this.reportsPath, { params: filter });
    }
    // 특정 리포트 조회
    async getReport(reportId) {
        return this.client.get(`${this.reportsPath}/${reportId}`);
    }
    // 리포트 다운로드
    async downloadReport(reportId, format = 'pdf') {
        return this.client.get(`${this.reportsPath}/${reportId}/download`, {
            params: { format },
            responseType: 'blob'
        });
    }
    // 리포트 삭제
    async deleteReport(reportId) {
        return this.client.delete(`${this.reportsPath}/${reportId}`);
    }
    // 리포트 예약 설정
    async scheduleReport(reportId, schedule) {
        return this.client.post(`${this.reportsPath}/${reportId}/schedule`, schedule);
    }
    // 데이터 내보내기
    async exportData(query, format) {
        return this.client.post(`${this.basePath}/export`, { query, format }, {
            responseType: 'blob'
        });
    }
    // 분석 설정 저장
    async saveAnalyticsSettings(settings) {
        return this.client.post(`${this.basePath}/settings`, settings);
    }
    // 최적화 제안 조회
    async getOptimizationSuggestions() {
        return this.client.get(`${this.basePath}/optimization-suggestions`);
    }
}
