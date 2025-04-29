import defaultApiClient from '../api-client';
/**
 * 알림 유형 열거형
 */
export var MileageAlertType;
(function (MileageAlertType) {
    MileageAlertType["OIL_CHANGE"] = "oil_change";
    MileageAlertType["TIRE_ROTATION"] = "tire_rotation";
    MileageAlertType["AIR_FILTER"] = "air_filter";
    MileageAlertType["BRAKE_CHECK"] = "brake_check";
    MileageAlertType["REGULAR_SERVICE"] = "regular_service";
    MileageAlertType["TIMING_BELT"] = "timing_belt";
    MileageAlertType["CUSTOM"] = "custom"; // 사용자 정의 알림
})(MileageAlertType || (MileageAlertType = {}));
/**
 * 알림 빈도 열거형
 */
export var AlertFrequency;
(function (AlertFrequency) {
    AlertFrequency["ONCE"] = "once";
    AlertFrequency["DAILY"] = "daily";
    AlertFrequency["WEEKLY"] = "weekly";
    AlertFrequency["BIWEEKLY"] = "biweekly";
    AlertFrequency["MONTHLY"] = "monthly"; // 매월
})(AlertFrequency || (AlertFrequency = {}));
/**
 * 주행거리 단위 열거형
 */
export var MileageUnit;
(function (MileageUnit) {
    MileageUnit["KILOMETERS"] = "km";
    MileageUnit["MILES"] = "miles";
})(MileageUnit || (MileageUnit = {}));
/**
 * 주행거리 알림 서비스 클래스
 */
export class MileageAlertService {
    /**
     * 생성자
     * @param apiClient API 클라이언트
     */
    constructor(apiClient = defaultApiClient) {
        this.basePath = '/mileage-alerts';
        this.apiClient = apiClient;
    }
    /**
     * 주행거리 알림 생성
     * @param request 알림 생성 요청
     * @returns 생성된 알림
     */
    async createAlert(request) {
        try {
            const response = await this.apiClient.post(this.basePath, request);
            return response.data;
        }
        catch (error) {
            console.error('주행거리 알림 생성 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 주행거리 알림 업데이트
     * @param request 알림 업데이트 요청
     * @returns 업데이트된 알림
     */
    async updateAlert(request) {
        try {
            const response = await this.apiClient.put(`${this.basePath}/${request.id}`, request);
            return response.data;
        }
        catch (error) {
            console.error(`알림 ID ${request.id} 업데이트 중 오류 발생:`, error);
            throw error;
        }
    }
    /**
     * 주행거리 알림 조회
     * @param alertId 알림 ID
     * @returns 알림 정보
     */
    async getAlert(alertId) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/${alertId}`);
            return response.data;
        }
        catch (error) {
            console.error(`알림 ID ${alertId} 조회 중 오류 발생:`, error);
            throw error;
        }
    }
    /**
     * 주행거리 알림 목록 조회
     * @param filter 알림 필터
     * @returns 알림 목록
     */
    async getAlerts(filter) {
        try {
            const response = await this.apiClient.get(this.basePath, { params: filter });
            return response.data;
        }
        catch (error) {
            console.error('주행거리 알림 목록 조회 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 차량별 주행거리 알림 조회
     * @param vehicleId 차량 ID
     * @param filter 추가 필터
     * @returns 알림 목록
     */
    async getVehicleAlerts(vehicleId, filter) {
        return this.getAlerts({ ...filter, vehicleId });
    }
    /**
     * 사용자별 주행거리 알림 조회
     * @param userId 사용자 ID
     * @param filter 추가 필터
     * @returns 알림 목록
     */
    async getUserAlerts(userId, filter) {
        return this.getAlerts({ ...filter, userId });
    }
    /**
     * 주행거리 알림 삭제
     * @param alertId 알림 ID
     * @returns 성공 여부
     */
    async deleteAlert(alertId) {
        try {
            await this.apiClient.delete(`${this.basePath}/${alertId}`);
            return true;
        }
        catch (error) {
            console.error(`알림 ID ${alertId} 삭제 중 오류 발생:`, error);
            throw error;
        }
    }
    /**
     * 주행거리 알림 활성화/비활성화
     * @param alertId 알림 ID
     * @param isActive 활성화 여부
     * @returns 업데이트된 알림
     */
    async toggleAlertActive(alertId, isActive) {
        return this.updateAlert({ id: alertId, isActive });
    }
    /**
     * 차량 주행거리 업데이트
     * @param request 주행거리 갱신 요청
     * @returns 업데이트 성공 여부
     */
    async updateVehicleMileage(request) {
        try {
            const response = await this.apiClient.post('/vehicles/mileage', request);
            return response.data.success;
        }
        catch (error) {
            console.error('차량 주행거리 업데이트 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 주행거리 기준 자동 생성 기본 알림
     * @param vehicleId 차량 ID
     * @returns 생성된 알림 목록
     */
    async createDefaultAlerts(vehicleId) {
        try {
            // 기본 알림 템플릿 목록
            const defaultAlerts = [
                {
                    alertType: MileageAlertType.OIL_CHANGE,
                    mileageThreshold: 5000,
                    mileageUnit: MileageUnit.KILOMETERS,
                    description: '정기 오일 교체 시점입니다',
                    sendEmail: true,
                    sendPush: true,
                    frequency: AlertFrequency.ONCE
                },
                {
                    alertType: MileageAlertType.TIRE_ROTATION,
                    mileageThreshold: 10000,
                    mileageUnit: MileageUnit.KILOMETERS,
                    description: '타이어 로테이션 시점입니다',
                    sendEmail: true,
                    sendPush: true,
                    frequency: AlertFrequency.ONCE
                },
                {
                    alertType: MileageAlertType.AIR_FILTER,
                    mileageThreshold: 15000,
                    mileageUnit: MileageUnit.KILOMETERS,
                    description: '에어필터 교체 시점입니다',
                    sendEmail: true,
                    sendPush: true,
                    frequency: AlertFrequency.ONCE
                },
                {
                    alertType: MileageAlertType.BRAKE_CHECK,
                    mileageThreshold: 20000,
                    mileageUnit: MileageUnit.KILOMETERS,
                    description: '브레이크 점검 시점입니다',
                    sendEmail: true,
                    sendPush: true,
                    frequency: AlertFrequency.ONCE
                }
            ];
            // 각 기본 알림에 대해 생성 요청 전송
            const createdAlerts = [];
            for (const alertTemplate of defaultAlerts) {
                const alert = await this.createAlert({
                    vehicleId,
                    ...alertTemplate
                });
                createdAlerts.push(alert);
            }
            return createdAlerts;
        }
        catch (error) {
            console.error('기본 주행거리 알림 생성 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 주행거리에 따른 알림 검사 및 트리거
     * @param vehicleId 차량 ID
     * @param currentMileage 현재 주행거리
     * @param mileageUnit 주행거리 단위
     * @returns 트리거된 알림 목록
     */
    async checkAndTriggerAlerts(vehicleId, currentMileage, mileageUnit) {
        try {
            const response = await this.apiClient.post(`${this.basePath}/check`, {
                vehicleId,
                currentMileage,
                mileageUnit
            });
            return response.data.triggeredAlerts;
        }
        catch (error) {
            console.error('주행거리 알림 검사 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 메일, SMS, 푸시 방식 중 알림 수신 방식 설정
     * @param alertId 알림 ID
     * @param channels 알림 채널 설정 (이메일, SMS, 푸시)
     * @returns 업데이트된 알림
     */
    async setAlertChannels(alertId, channels) {
        try {
            const response = await this.apiClient.put(`${this.basePath}/${alertId}/channels`, channels);
            return response.data;
        }
        catch (error) {
            console.error(`알림 ID ${alertId} 채널 설정 중 오류 발생:`, error);
            throw error;
        }
    }
    /**
     * 알림 이력 조회
     * @param alertId 알림 ID
     * @returns 알림 트리거 이력
     */
    async getAlertHistory(alertId) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/${alertId}/history`);
            return response.data;
        }
        catch (error) {
            console.error(`알림 ID ${alertId} 이력 조회 중 오류 발생:`, error);
            throw error;
        }
    }
}
