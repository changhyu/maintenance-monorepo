import axios from 'axios';
import { format } from 'date-fns';
// import { Todo } from '../hooks/useTodoService';
// import { Vehicle } from './vehicle';
// import { Maintenance } from './maintenance';
/**
 * 정비 보고서 유형
 */
export var ReportType;
(function (ReportType) {
    ReportType["COMPLETION_RATE"] = "completion_rate";
    ReportType["VEHICLE_HISTORY"] = "vehicle_history";
    ReportType["COST_ANALYSIS"] = "cost_analysis";
    ReportType["MAINTENANCE_SUMMARY"] = "maintenance_summary";
    ReportType["MAINTENANCE_FORECAST"] = "maintenance_forecast";
    ReportType["VEHICLE_UTILIZATION"] = "vehicle_utilization";
    ReportType["MAINTENANCE_COMPLETION_RATE"] = "maintenance_completion_rate";
    ReportType["PREDICTIVE_MAINTENANCE"] = "predictive_maintenance";
    ReportType["PARTS_USAGE"] = "parts_usage";
})(ReportType || (ReportType = {}));
/**
 * 보고서 내보내기 형식
 */
export var ReportFormat;
(function (ReportFormat) {
    ReportFormat["PDF"] = "pdf";
    ReportFormat["EXCEL"] = "excel";
    ReportFormat["CSV"] = "csv";
    ReportFormat["JSON"] = "json";
})(ReportFormat || (ReportFormat = {}));
/**
 * 보고서 서비스 클래스
 */
export class ReportService {
    constructor() {
        this.apiUrl = '/api/reports';
        this.TEMPLATES_STORAGE_KEY = 'reportTemplates';
    }
    /**
     * 완료율 보고서 생성
     */
    async generateCompletionRateReport(filter) {
        try {
            const response = await axios.post(`${this.apiUrl}/completion-rate`, filter);
            return response.data;
        }
        catch (error) {
            console.error('완료율 보고서 생성 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockCompletionRateReport(filter);
        }
    }
    /**
     * 차량 정비 이력 보고서 생성
     */
    async generateVehicleHistoryReport(vehicleId, filter) {
        try {
            const response = await axios.post(`${this.apiUrl}/vehicle-history/${vehicleId}`, filter);
            return response.data;
        }
        catch (error) {
            console.error('차량 정비 이력 보고서 생성 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockVehicleHistoryReport(vehicleId, filter);
        }
    }
    /**
     * 비용 분석 보고서 생성
     */
    async generateCostAnalysisReport(filter) {
        try {
            const response = await axios.post(`${this.apiUrl}/cost-analysis`, filter);
            return response.data;
        }
        catch (error) {
            console.error('비용 분석 보고서 생성 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockCostAnalysisReport(filter);
        }
    }
    /**
     * 정비 요약 보고서 생성
     */
    async generateMaintenanceSummaryReport(filter) {
        try {
            const response = await axios.post(`${this.apiUrl}/maintenance-summary`, filter);
            return response.data;
        }
        catch (error) {
            console.error('정비 요약 보고서 생성 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockMaintenanceSummaryReport(filter);
        }
    }
    /**
     * 정비 예측 보고서 생성
     */
    async generateMaintenanceForecastReport(filter) {
        try {
            const response = await axios.post(`${this.apiUrl}/maintenance-forecast`, filter);
            return response.data;
        }
        catch (error) {
            console.error('정비 예측 보고서 생성 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockMaintenanceForecastReport(filter);
        }
    }
    /**
     * 보고서 내보내기
     */
    async exportReport(reportId, options) {
        try {
            const response = await axios.post(`${this.apiUrl}/export/${reportId}`, options, {
                responseType: 'blob'
            });
            return response.data;
        }
        catch (error) {
            console.error('보고서 내보내기 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 보고서 목록 조회
     */
    async getReports(filter) {
        try {
            const response = await axios.get(this.apiUrl, { params: filter });
            return response.data;
        }
        catch (error) {
            console.error('보고서 목록 조회 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockReportList(filter);
        }
    }
    /**
     * 보고서 요약 데이터 조회
     */
    async getReportSummary() {
        try {
            const response = await axios.get(`${this.apiUrl}/summary`);
            return response.data;
        }
        catch (error) {
            console.error('보고서 요약 데이터 조회 중 오류 발생:', error);
            // 임시 데이터로 대체
            return this.getMockReportSummary();
        }
    }
    /**
     * 임시 보고서 요약 데이터 생성
     */
    getMockReportSummary() {
        const reports = this.getMockReportList();
        const totalReports = reports.length;
        // 보고서 유형별 개수 계산
        const reportsByType = {
            completionRate: 0,
            costAnalysis: 0,
            maintenanceForecast: 0,
            vehicleHistory: 0,
            maintenanceSummary: 0
        };
        reports.forEach(report => {
            switch (report.type) {
                case ReportType.COMPLETION_RATE:
                    reportsByType.completionRate += 1;
                    break;
                case ReportType.COST_ANALYSIS:
                    reportsByType.costAnalysis += 1;
                    break;
                case ReportType.MAINTENANCE_FORECAST:
                    reportsByType.maintenanceForecast += 1;
                    break;
                case ReportType.VEHICLE_HISTORY:
                    reportsByType.vehicleHistory += 1;
                    break;
                case ReportType.MAINTENANCE_SUMMARY:
                    reportsByType.maintenanceSummary += 1;
                    break;
            }
        });
        // 최근 보고서 날짜 (가장 최근 생성된 보고서)
        const lastReportDate = reports.length > 0
            ? reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
            : new Date().toISOString();
        // 차트 데이터 생성
        const chartData = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - 11 + i);
            return {
                month: format(date, 'yyyy-MM'),
                '정비 완료': Math.floor(Math.random() * 30) + 5,
                '보고서 생성': Math.floor(Math.random() * 15) + 2
            };
        });
        return {
            totalReports,
            reportsByType,
            lastReportDate,
            chartData
        };
    }
    /**
     * 보고서 삭제
     */
    async deleteReport(reportId) {
        try {
            await axios.delete(`${this.apiUrl}/${reportId}`);
        }
        catch (error) {
            console.error('보고서 삭제 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 보고서 스케줄 설정
     */
    async scheduleReport(type, filter, schedule, delivery) {
        try {
            const response = await axios.post(`${this.apiUrl}/schedule`, {
                type,
                filter,
                schedule,
                delivery
            });
            return response.data;
        }
        catch (error) {
            console.error('보고서 스케줄 설정 중 오류 발생:', error);
            // 임시 데이터로 대체
            return { id: `schedule-${Date.now()}` };
        }
    }
    /**
     * 보고서 템플릿 저장
     */
    async saveTemplate(template) {
        try {
            // API가 구현되어 있다면 서버에 저장
            // const response = await axios.post(`${this.apiUrl}/templates`, template);
            // return response.data;
            // 로컬 스토리지에 저장하는 임시 구현
            const templates = this.getTemplates();
            const newTemplate = {
                ...template,
                id: `template-${Date.now()}`,
                createdAt: new Date().toISOString()
            };
            templates.push(newTemplate);
            localStorage.setItem(this.TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
            return newTemplate;
        }
        catch (error) {
            console.error('템플릿 저장 중 오류 발생:', error);
            throw new Error('템플릿을 저장할 수 없습니다.');
        }
    }
    /**
     * 모든 보고서 템플릿 조회
     */
    getTemplates() {
        try {
            const templatesJson = localStorage.getItem(this.TEMPLATES_STORAGE_KEY);
            return templatesJson ? JSON.parse(templatesJson) : [];
        }
        catch (error) {
            console.error('템플릿 조회 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 템플릿 ID로 단일 템플릿 조회
     */
    getTemplateById(templateId) {
        const templates = this.getTemplates();
        return templates.find(template => template.id === templateId) || null;
    }
    /**
     * 템플릿 업데이트
     */
    updateTemplate(templateId, updates) {
        try {
            const templates = this.getTemplates();
            const templateIndex = templates.findIndex(template => template.id === templateId);
            if (templateIndex === -1) {
                return null;
            }
            const updatedTemplate = {
                ...templates[templateIndex],
                ...updates
            };
            templates[templateIndex] = updatedTemplate;
            localStorage.setItem(this.TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
            return updatedTemplate;
        }
        catch (error) {
            console.error('템플릿 업데이트 중 오류 발생:', error);
            return null;
        }
    }
    /**
     * 템플릿 삭제
     */
    deleteTemplate(templateId) {
        try {
            const templates = this.getTemplates();
            const filteredTemplates = templates.filter(template => template.id !== templateId);
            if (filteredTemplates.length === templates.length) {
                return false; // 삭제할 템플릿이 없음
            }
            localStorage.setItem(this.TEMPLATES_STORAGE_KEY, JSON.stringify(filteredTemplates));
            return true;
        }
        catch (error) {
            console.error('템플릿 삭제 중 오류 발생:', error);
            return false;
        }
    }
    /**
     * 템플릿 사용 시간 업데이트
     */
    updateTemplateUsage(templateId) {
        return this.updateTemplate(templateId, { lastUsed: new Date().toISOString() });
    }
    /**
     * 템플릿에서 보고서 생성
     */
    async generateReportFromTemplate(templateId) {
        try {
            const template = this.getTemplateById(templateId);
            if (!template) {
                throw new Error('템플릿을 찾을 수 없습니다');
            }
            // 템플릿 사용 기록 업데이트
            this.updateTemplateUsage(templateId);
            // 보고서 유형에 따라 적절한 생성 메서드 호출
            let report;
            switch (template.type) {
                case ReportType.COMPLETION_RATE:
                    report = await this.generateCompletionRateReport(template.filter);
                    break;
                case ReportType.VEHICLE_HISTORY:
                    if (template.filter.vehicleId) {
                        // vehicleId를 추출하고 나머지 속성만 두 번째 인자로 전달
                        const { vehicleId, ...restFilter } = template.filter;
                        report = await this.generateVehicleHistoryReport(vehicleId, restFilter);
                    }
                    else {
                        throw new Error('차량 정비 이력 보고서에는 차량 ID가 필요합니다');
                    }
                    break;
                case ReportType.COST_ANALYSIS:
                    report = await this.generateCostAnalysisReport(template.filter);
                    break;
                case ReportType.MAINTENANCE_SUMMARY:
                    report = await this.generateMaintenanceSummaryReport(template.filter);
                    break;
                case ReportType.MAINTENANCE_FORECAST:
                    report = await this.generateMaintenanceForecastReport(template.filter);
                    break;
                default:
                    throw new Error('지원되지 않는 보고서 유형입니다');
            }
            return report;
        }
        catch (error) {
            console.error('템플릿에서 보고서 생성 중 오류 발생:', error);
            return null;
        }
    }
    /**
     * 최근 보고서 가져오기
     * @returns 최근 보고서 목록
     */
    async getRecentReports() {
        try {
            // 여기서는 임시 데이터를 반환합니다. 실제로는 API 호출을 통해 데이터를 가져와야 합니다.
            return [
                {
                    id: '1',
                    name: '월간 정비 요약 보고서',
                    type: ReportType.MAINTENANCE_SUMMARY,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: '차량 비용 분석',
                    type: ReportType.COST_ANALYSIS,
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: '3',
                    name: '부품 사용 현황',
                    type: ReportType.PARTS_USAGE,
                    createdAt: new Date(Date.now() - 172800000).toISOString()
                }
            ];
        }
        catch (error) {
            console.error('최근 보고서를 가져오는 중 오류가 발생했습니다:', error);
            return [];
        }
    }
    // ============= 임시 데이터 생성 메서드 =============
    /**
     * 임시 완료율 보고서 생성
     */
    getMockCompletionRateReport(filter) {
        const today = new Date();
        const startDate = filter.dateRange.startDate
            ? new Date(filter.dateRange.startDate)
            : new Date(today.setMonth(today.getMonth() - 1));
        const endDate = filter.dateRange.endDate ? new Date(filter.dateRange.endDate) : new Date();
        // 날짜 간격 계산
        const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // 임의의 트렌드 데이터 생성
        const trend = [];
        const currentDate = new Date(startDate);
        let rate = 0.65; // 초기 완료율
        while (currentDate <= endDate) {
            // 랜덤한 완료율 변동 (-5% ~ +5%)
            rate += (Math.random() - 0.5) * 0.1;
            // 완료율 범위 제한 (0.4 ~ 0.95)
            rate = Math.max(0.4, Math.min(0.95, rate));
            trend.push({
                date: format(currentDate, 'yyyy-MM-dd'),
                completionRate: rate
            });
            // 다음 날짜로 이동
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return {
            id: `cr-${Date.now()}`,
            title: `완료율 보고서 (${format(startDate, 'yyyy-MM-dd')} ~ ${format(endDate, 'yyyy-MM-dd')})`,
            type: ReportType.COMPLETION_RATE,
            createdAt: new Date().toISOString(),
            data: {
                totalTasks: 87,
                completedTasks: 62,
                completionRate: 71.3,
                byPriority: {
                    high: { total: 23, completed: 20, rate: 87.0 },
                    medium: { total: 42, completed: 30, rate: 71.4 },
                    low: { total: 22, completed: 12, rate: 54.5 }
                },
                trend
            }
        };
    }
    /**
     * 임시 차량 정비 이력 보고서 생성
     */
    getMockVehicleHistoryReport(vehicleId, filter) {
        // 임의의 정비 이력 데이터 생성
        const maintenanceHistory = [];
        const today = new Date();
        let totalCost = 0;
        // 과거 12개월간 임의의 정비 기록 생성
        for (let i = 0; i < 8; i++) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - Math.floor(Math.random() * 12));
            const cost = Math.floor(Math.random() * 50 + 1) * 10000;
            totalCost += cost;
            const types = [
                '정기 점검',
                '엔진 정비',
                '오일 교체',
                '타이어 교체',
                '브레이크 점검',
                '냉각 시스템 점검'
            ];
            const type = types[Math.floor(Math.random() * types.length)];
            const statuses = ['완료', '진행중', '예정됨'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            maintenanceHistory.push({
                id: `maint-${i}-${Date.now()}`,
                date: format(date, 'yyyy-MM-dd'),
                description: `${type} 작업 수행`,
                type,
                cost,
                technicianName: ['김기술', '박정비', '이엔진', '최기계'][Math.floor(Math.random() * 4)],
                status
            });
        }
        // 날짜 순으로 정렬
        maintenanceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // 일반적인 이슈 빈도 생성
        const commonIssues = [
            { issue: '엔진 오일 부족', frequency: 3 },
            { issue: '타이어 마모', frequency: 2 },
            { issue: '브레이크 패드 교체 필요', frequency: 2 },
            { issue: '냉각수 부족', frequency: 1 }
        ];
        return {
            id: `vh-${vehicleId}-${Date.now()}`,
            title: `차량 정비 이력 (${vehicleId})`,
            type: ReportType.VEHICLE_HISTORY,
            createdAt: new Date().toISOString(),
            data: {
                vehicleInfo: {
                    id: vehicleId,
                    name: `테스트 차량 ${vehicleId.slice(-3)}`,
                    model: '현대 아반떼',
                    year: 2020,
                    registrationNumber: `123가${Math.floor(Math.random() * 9000) + 1000}`
                },
                maintenanceHistory,
                totalCost,
                averageInterval: 45, // 평균 45일 간격으로 정비
                commonIssues
            }
        };
    }
    /**
     * 임시 비용 분석 보고서 생성
     */
    getMockCostAnalysisReport(filter) {
        const today = new Date();
        const startDate = filter.dateRange.startDate
            ? new Date(filter.dateRange.startDate)
            : new Date(today.setMonth(today.getMonth() - 6));
        // 월별 비용 트렌드 생성
        const costTrend = [];
        const months = [
            '1월',
            '2월',
            '3월',
            '4월',
            '5월',
            '6월',
            '7월',
            '8월',
            '9월',
            '10월',
            '11월',
            '12월'
        ];
        const startMonth = startDate.getMonth();
        for (let i = 0; i < 6; i++) {
            const monthIndex = (startMonth + i) % 12;
            costTrend.push({
                month: months[monthIndex],
                cost: Math.floor(Math.random() * 100 + 50) * 10000
            });
        }
        // 차량별 비용 비교 생성
        const vehicleCostComparison = [];
        for (let i = 1; i <= 5; i++) {
            vehicleCostComparison.push({
                vehicleId: `V00${i}`,
                vehicleName: `테스트 차량 ${i}`,
                totalCost: Math.floor(Math.random() * 200 + 100) * 10000
            });
        }
        // 비용 예측 생성
        const costProjection = [];
        let nextMonth = (today.getMonth() + 1) % 12;
        for (let i = 0; i < 3; i++) {
            costProjection.push({
                month: months[nextMonth],
                projectedCost: Math.floor(Math.random() * 100 + 60) * 10000
            });
            nextMonth = (nextMonth + 1) % 12;
        }
        // 총 비용 및 세부 내역
        const parts = Math.floor(Math.random() * 300 + 200) * 10000;
        const labor = Math.floor(Math.random() * 200 + 100) * 10000;
        const etc = Math.floor(Math.random() * 50 + 20) * 10000;
        const totalCost = parts + labor + etc;
        return {
            id: `ca-${Date.now()}`,
            title: '비용 분석 보고서',
            type: ReportType.COST_ANALYSIS,
            createdAt: new Date().toISOString(),
            data: {
                totalCost,
                costBreakdown: {
                    parts,
                    labor,
                    etc
                },
                costTrend,
                vehicleCostComparison,
                averageCostPerVehicle: Math.floor(totalCost / 5),
                costProjection
            }
        };
    }
    /**
     * 임시 정비 요약 보고서 생성
     */
    getMockMaintenanceSummaryReport(filter) {
        const today = new Date();
        const startDate = filter.dateRange.startDate
            ? filter.dateRange.startDate
            : format(new Date(today.setMonth(today.getMonth() - 3)), 'yyyy-MM-dd');
        const endDate = filter.dateRange.endDate
            ? filter.dateRange.endDate
            : format(new Date(), 'yyyy-MM-dd');
        // 유형별 정비 데이터
        const maintenanceTypes = [
            { type: '정기 점검', count: 35, percentage: 38.5 },
            { type: '엔진 정비', count: 18, percentage: 19.8 },
            { type: '브레이크 시스템', count: 12, percentage: 13.2 },
            { type: '냉각 시스템', count: 8, percentage: 8.8 },
            { type: '전기 시스템', count: 10, percentage: 11.0 },
            { type: '기타', count: 8, percentage: 8.8 }
        ];
        // 상태별 정비 데이터
        const byStatus = {
            completed: 65,
            pending: 15,
            scheduled: 8,
            overdue: 3
        };
        // 기술자별 완료 작업
        const topTechnicians = [
            { name: '김기술', completedTasks: 28, averageRating: 4.8 },
            { name: '박정비', completedTasks: 22, averageRating: 4.6 },
            { name: '이엔진', completedTasks: 18, averageRating: 4.7 },
            { name: '최기계', completedTasks: 15, averageRating: 4.5 }
        ];
        return {
            id: `ms-${Date.now()}`,
            title: `정비 요약 보고서 (${startDate} ~ ${endDate})`,
            type: ReportType.MAINTENANCE_SUMMARY,
            createdAt: new Date().toISOString(),
            data: {
                period: {
                    start: startDate,
                    end: endDate
                },
                overview: {
                    totalVehicles: 12,
                    totalMaintenances: 91,
                    averagePerVehicle: 7.6
                },
                byType: maintenanceTypes,
                byStatus,
                topTechnicians
            }
        };
    }
    /**
     * 임시 정비 예측 보고서 생성
     */
    getMockMaintenanceForecastReport(filter) {
        const today = new Date();
        // 예정된 정비 작업
        const upcoming = [];
        for (let i = 1; i <= 5; i++) {
            const daysToAdd = Math.floor(Math.random() * 30) + 1;
            const date = new Date(today);
            date.setDate(date.getDate() + daysToAdd);
            const maintenanceTypes = [
                '정기 점검',
                '엔진 오일 교체',
                '타이어 교체',
                '브레이크 패드 교체',
                '에어필터 교체'
            ];
            const type = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
            upcoming.push({
                vehicleId: `V00${i}`,
                vehicleName: `테스트 차량 ${i}`,
                maintenanceType: type,
                estimatedDate: format(date, 'yyyy-MM-dd'),
                confidence: Math.random() * 0.3 + 0.7, // 70~100% 신뢰도
                basedOn: '과거 정비 주기 및 주행 거리'
            });
        }
        // 잠재적 이슈
        const potentialIssues = [
            {
                vehicleId: 'V001',
                vehicleName: '테스트 차량 1',
                issue: '배터리 성능 저하',
                probability: 0.85,
                suggestedAction: '배터리 교체 또는 충전 시스템 점검'
            },
            {
                vehicleId: 'V003',
                vehicleName: '테스트 차량 3',
                issue: '냉각수 누수',
                probability: 0.72,
                suggestedAction: '냉각 시스템 점검 및 호스 교체'
            },
            {
                vehicleId: 'V005',
                vehicleName: '테스트 차량 5',
                issue: '연료 시스템 효율 저하',
                probability: 0.68,
                suggestedAction: '연료 인젝터 청소 및 필터 교체'
            }
        ];
        // 계절별 권장사항
        const currentMonth = today.getMonth() + 1;
        let season;
        if (currentMonth >= 3 && currentMonth <= 5) {
            season = '봄';
        }
        else if (currentMonth >= 6 && currentMonth <= 8) {
            season = '여름';
        }
        else if (currentMonth >= 9 && currentMonth <= 11) {
            season = '가을';
        }
        else {
            season = '겨울';
        }
        const seasonalRecommendations = [];
        if (season === '봄') {
            seasonalRecommendations.push({
                season: '봄',
                recommendations: [
                    '겨울철 도로 염분으로 인한 하체 세차 및 점검',
                    '냉방 시스템 점검 및 에어컨 가스 충전',
                    '와이퍼 블레이드 교체',
                    '타이어 공기압 및 마모도 점검'
                ]
            });
        }
        else if (season === '여름') {
            seasonalRecommendations.push({
                season: '여름',
                recommendations: [
                    '냉각 시스템 점검 및 냉각수 교체',
                    '배터리 상태 점검',
                    '에어컨 필터 교체',
                    '브레이크 성능 점검'
                ]
            });
        }
        else if (season === '가을') {
            seasonalRecommendations.push({
                season: '가을',
                recommendations: [
                    '히터 시스템 점검',
                    '타이어 마모도 확인 및 필요시 교체',
                    '브레이크 패드 및 디스크 점검',
                    '와이퍼 블레이드 및 워셔액 보충'
                ]
            });
        }
        else {
            seasonalRecommendations.push({
                season: '겨울',
                recommendations: [
                    '부동액 농도 확인 및 보충',
                    '배터리 상태 점검',
                    '타이어 공기압 조정 및 동절기 타이어 교체 고려',
                    '도어 및 트렁크 잠금장치 윤활'
                ]
            });
        }
        // 다음 시즌 추가
        let nextSeason;
        if (season === '봄')
            nextSeason = '여름';
        else if (season === '여름')
            nextSeason = '가을';
        else if (season === '가을')
            nextSeason = '겨울';
        else
            nextSeason = '봄';
        const nextSeasonRecommendations = {
            봄: [
                '겨울철 도로 염분으로 인한 하체 세차 및 점검',
                '냉방 시스템 점검 및 에어컨 가스 충전',
                '와이퍼 블레이드 교체',
                '타이어 공기압 및 마모도 점검'
            ],
            여름: [
                '냉각 시스템 점검 및 냉각수 교체',
                '배터리 상태 점검',
                '에어컨 필터 교체',
                '브레이크 성능 점검'
            ],
            가을: [
                '히터 시스템 점검',
                '타이어 마모도 확인 및 필요시 교체',
                '브레이크 패드 및 디스크 점검',
                '와이퍼 블레이드 및 워셔액 보충'
            ],
            겨울: [
                '부동액 농도 확인 및 보충',
                '배터리 상태 점검',
                '타이어 공기압 조정 및 동절기 타이어 교체 고려',
                '도어 및 트렁크 잠금장치 윤활'
            ]
        };
        seasonalRecommendations.push({
            season: `다가오는 ${nextSeason}`,
            recommendations: nextSeasonRecommendations[nextSeason]
        });
        return {
            id: `mf-${Date.now()}`,
            title: '정비 예측 보고서',
            type: ReportType.MAINTENANCE_FORECAST,
            createdAt: new Date().toISOString(),
            data: {
                upcoming,
                potentialIssues,
                seasonalRecommendations
            }
        };
    }
    /**
     * 임시 보고서 목록 생성
     */
    getMockReportList(filter) {
        const reports = [];
        const reportTypes = [
            ReportType.COMPLETION_RATE,
            ReportType.VEHICLE_HISTORY,
            ReportType.COST_ANALYSIS,
            ReportType.MAINTENANCE_SUMMARY,
            ReportType.MAINTENANCE_FORECAST
        ];
        // 임의의 보고서 10개 생성
        for (let i = 0; i < 10; i++) {
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
            const type = filter?.type || reportTypes[Math.floor(Math.random() * reportTypes.length)];
            let title;
            switch (type) {
                case ReportType.COMPLETION_RATE:
                    title = '완료율 보고서';
                    break;
                case ReportType.VEHICLE_HISTORY:
                    title = `차량 정비 이력 (V00${(i % 5) + 1})`;
                    break;
                case ReportType.COST_ANALYSIS:
                    title = '비용 분석 보고서';
                    break;
                case ReportType.MAINTENANCE_SUMMARY:
                    title = '정비 요약 보고서';
                    break;
                case ReportType.MAINTENANCE_FORECAST:
                    title = '정비 예측 보고서';
                    break;
            }
            reports.push({
                id: `report-${i}-${Date.now()}`,
                title,
                type,
                createdAt: createdDate.toISOString(),
                data: {} // 실제 데이터 없이 목록만 반환
            });
        }
        return reports;
    }
}
// 인스턴스 생성
export const reportService = new ReportService();
// default export 유지
export default reportService;
