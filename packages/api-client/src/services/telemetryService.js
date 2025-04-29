export var TelemetryType;
(function (TelemetryType) {
    TelemetryType["ENGINE"] = "ENGINE";
    TelemetryType["BATTERY"] = "BATTERY";
    TelemetryType["FUEL"] = "FUEL";
    TelemetryType["TIRE"] = "TIRE";
    TelemetryType["TRANSMISSION"] = "TRANSMISSION";
    TelemetryType["BRAKE"] = "BRAKE";
    TelemetryType["ODOMETER"] = "ODOMETER";
    TelemetryType["GPS"] = "GPS";
    TelemetryType["TEMPERATURE"] = "TEMPERATURE";
    TelemetryType["DIAGNOSTICS"] = "DIAGNOSTICS";
})(TelemetryType || (TelemetryType = {}));
export var TelemetrySeverity;
(function (TelemetrySeverity) {
    TelemetrySeverity["NORMAL"] = "NORMAL";
    TelemetrySeverity["WARNING"] = "WARNING";
    TelemetrySeverity["CRITICAL"] = "CRITICAL";
})(TelemetrySeverity || (TelemetrySeverity = {}));
export class TelemetryService {
    constructor(apiClient) {
        this.basePath = '/telemetry';
        this.client = apiClient;
    }
    // 특정 차량의 텔레메트리 데이터 조회
    async getVehicleTelemetry(vehicleId, filter) {
        return this.client.get(`/vehicles/${vehicleId}/telemetry`, { params: filter });
    }
    // 특정 차량의 특정 유형 텔레메트리 데이터 조회
    async getVehicleTelemetryByType(vehicleId, type, filter) {
        return this.client.get(`/vehicles/${vehicleId}/telemetry/${type}`, { params: filter });
    }
    // 텔레메트리 데이터 통계 조회
    async getVehicleTelemetryStats(vehicleId, type, filter) {
        return this.client.get(`/vehicles/${vehicleId}/telemetry/${type}/stats`, { params: filter });
    }
    // 여러 차량의 텔레메트리 데이터 조회
    async getMultiVehicleTelemetry(vehicleIds, filter) {
        return this.client.post(`${this.basePath}/vehicles`, { vehicleIds, ...filter });
    }
    // 차량 진단 코드 조회
    async getDiagnosticCodes(filter) {
        return this.client.get(`${this.basePath}/diagnostic-codes`, { params: filter });
    }
    // 특정 차량의 진단 이벤트 조회
    async getVehicleDiagnosticEvents(vehicleId, filter) {
        return this.client.get(`/vehicles/${vehicleId}/diagnostics`, { params: filter });
    }
    // 진단 이벤트 해결 처리
    async resolveDiagnosticEvent(vehicleId, eventId, resolutionData) {
        return this.client.post(`/vehicles/${vehicleId}/diagnostics/${eventId}/resolve`, resolutionData);
    }
    // 차량 위치 조회
    async getVehicleLocation(vehicleId) {
        return this.client.get(`/vehicles/${vehicleId}/location`);
    }
    // 차량 위치 이력 조회
    async getVehicleLocationHistory(vehicleId, filter) {
        return this.client.get(`/vehicles/${vehicleId}/location/history`, { params: filter });
    }
    // 여러 차량의 현재 위치 조회
    async getMultiVehicleLocations(vehicleIds) {
        return this.client.post(`${this.basePath}/locations`, { vehicleIds });
    }
    // 텔레메트리 알림 규칙 조회
    async getTelemetryAlertRules(filter) {
        return this.client.get(`${this.basePath}/alert-rules`, { params: filter });
    }
    // 텔레메트리 알림 규칙 생성
    async createTelemetryAlertRule(rule) {
        return this.client.post(`${this.basePath}/alert-rules`, rule);
    }
    // 텔레메트리 알림 규칙 업데이트
    async updateTelemetryAlertRule(ruleId, rule) {
        return this.client.put(`${this.basePath}/alert-rules/${ruleId}`, rule);
    }
    // 텔레메트리 알림 규칙 삭제
    async deleteTelemetryAlertRule(ruleId) {
        return this.client.delete(`${this.basePath}/alert-rules/${ruleId}`);
    }
    // 텔레메트리 알림 조회
    async getTelemetryAlerts(filter) {
        return this.client.get(`${this.basePath}/alerts`, { params: filter });
    }
    // 텔레메트리 알림 확인 처리
    async acknowledgeTelemetryAlert(alertId, acknowledgeData) {
        return this.client.post(`${this.basePath}/alerts/${alertId}/acknowledge`, acknowledgeData);
    }
    // 차량의 소프트웨어 업데이트 이력 조회
    async getVehicleSoftwareUpdateHistory(vehicleId) {
        return this.client.get(`/vehicles/${vehicleId}/software-updates`);
    }
}
