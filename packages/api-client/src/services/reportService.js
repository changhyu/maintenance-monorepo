export var ReportType;
(function (ReportType) {
    ReportType["VEHICLE"] = "VEHICLE";
    ReportType["MAINTENANCE"] = "MAINTENANCE";
    ReportType["COST"] = "COST";
    ReportType["USAGE"] = "USAGE";
    ReportType["SUMMARY"] = "SUMMARY";
    ReportType["CUSTOM"] = "CUSTOM";
})(ReportType || (ReportType = {}));
export var ReportFormat;
(function (ReportFormat) {
    ReportFormat["PDF"] = "PDF";
    ReportFormat["EXCEL"] = "EXCEL";
    ReportFormat["CSV"] = "CSV";
    ReportFormat["JSON"] = "JSON";
})(ReportFormat || (ReportFormat = {}));
export var ReportFrequency;
(function (ReportFrequency) {
    ReportFrequency["ONCE"] = "ONCE";
    ReportFrequency["DAILY"] = "DAILY";
    ReportFrequency["WEEKLY"] = "WEEKLY";
    ReportFrequency["MONTHLY"] = "MONTHLY";
    ReportFrequency["QUARTERLY"] = "QUARTERLY";
    ReportFrequency["ANNUALLY"] = "ANNUALLY";
})(ReportFrequency || (ReportFrequency = {}));
export class ReportService {
    constructor(apiClient) {
        this.basePath = '/reports';
        this.client = apiClient;
    }
    // 보고서 생성
    async generateReport(request) {
        return this.client.post(`${this.basePath}/generate`, request);
    }
    // 생성된 보고서 조회
    async getReports(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 특정 보고서 조회
    async getReportById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 보고서 다운로드 URL 가져오기
    async getReportDownloadUrl(id) {
        const response = await this.client.get(`${this.basePath}/${id}/download`);
        return response.url;
    }
    // 보고서 삭제
    async deleteReport(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 보고서 템플릿 목록 조회
    async getReportTemplates(filter) {
        return this.client.get(`${this.basePath}/templates`, { params: filter });
    }
    // 특정 보고서 템플릿 조회
    async getReportTemplateById(id) {
        return this.client.get(`${this.basePath}/templates/${id}`);
    }
    // 보고서 템플릿 생성
    async createReportTemplate(template) {
        return this.client.post(`${this.basePath}/templates`, template);
    }
    // 보고서 템플릿 업데이트
    async updateReportTemplate(id, template) {
        return this.client.put(`${this.basePath}/templates/${id}`, template);
    }
    // 보고서 템플릿 삭제
    async deleteReportTemplate(id) {
        return this.client.delete(`${this.basePath}/templates/${id}`);
    }
    // 보고서 스케줄 목록 조회
    async getReportSchedules(filter) {
        return this.client.get(`${this.basePath}/schedules`, { params: filter });
    }
    // 특정 보고서 스케줄 조회
    async getReportScheduleById(id) {
        return this.client.get(`${this.basePath}/schedules/${id}`);
    }
    // 보고서 스케줄 생성
    async createReportSchedule(schedule) {
        return this.client.post(`${this.basePath}/schedules`, schedule);
    }
    // 보고서 스케줄 업데이트
    async updateReportSchedule(id, schedule) {
        return this.client.put(`${this.basePath}/schedules/${id}`, schedule);
    }
    // 보고서 스케줄 삭제
    async deleteReportSchedule(id) {
        return this.client.delete(`${this.basePath}/schedules/${id}`);
    }
    // 보고서 스케줄 활성화/비활성화
    async toggleReportScheduleActive(id, isActive) {
        return this.client.patch(`${this.basePath}/schedules/${id}/status`, { isActive });
    }
    // 보고서 스케줄 수동 실행
    async runReportSchedule(id) {
        return this.client.post(`${this.basePath}/schedules/${id}/run`, {});
    }
    // 차량별 보고서 생성
    async generateVehicleReport(vehicleId, options) {
        const request = {
            type: ReportType.VEHICLE,
            name: options.name,
            description: options.description,
            format: options.format,
            parameters: {
                ...(options.parameters || {}),
                vehicleIds: [vehicleId]
            }
        };
        return this.generateReport(request);
    }
    // 정비소별 보고서 생성
    async generateShopReport(shopId, options) {
        const request = {
            type: ReportType.MAINTENANCE,
            name: options.name,
            description: options.description,
            format: options.format,
            parameters: {
                ...(options.parameters || {}),
                shopIds: [shopId]
            }
        };
        return this.generateReport(request);
    }
}
