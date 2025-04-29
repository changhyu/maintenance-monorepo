export var ThemeMode;
(function (ThemeMode) {
    ThemeMode["LIGHT"] = "light";
    ThemeMode["DARK"] = "dark";
    ThemeMode["SYSTEM"] = "system";
})(ThemeMode || (ThemeMode = {}));
export var LocaleCode;
(function (LocaleCode) {
    LocaleCode["KO_KR"] = "ko-KR";
    LocaleCode["EN_US"] = "en-US";
    LocaleCode["JA_JP"] = "ja-JP";
    LocaleCode["ZH_CN"] = "zh-CN";
    LocaleCode["ZH_TW"] = "zh-TW";
})(LocaleCode || (LocaleCode = {}));
export var MeasurementUnit;
(function (MeasurementUnit) {
    MeasurementUnit["METRIC"] = "metric";
    MeasurementUnit["IMPERIAL"] = "imperial"; // miles, gallon, fahrenheit
})(MeasurementUnit || (MeasurementUnit = {}));
export var DateFormat;
(function (DateFormat) {
    DateFormat["YYYY_MM_DD"] = "YYYY-MM-DD";
    DateFormat["MM_DD_YYYY"] = "MM/DD/YYYY";
    DateFormat["DD_MM_YYYY"] = "DD/MM/YYYY";
    DateFormat["YYYY_MM_DD_KR"] = "YYYY\uB144 MM\uC6D4 DD\uC77C";
})(DateFormat || (DateFormat = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (NotificationChannel = {}));
export class SettingsService {
    constructor(apiClient) {
        this.basePath = '/settings';
        this.userPreferencesPath = '/user-preferences';
        this.systemSettingsPath = '/system-settings';
        this.client = apiClient;
    }
    // 사용자 설정 관련 메서드
    // 현재 사용자 설정 조회
    async getUserPreferences() {
        return this.client.get(this.userPreferencesPath);
    }
    // 특정 사용자 설정 조회 (관리자)
    async getUserPreferencesByUserId(userId) {
        return this.client.get(`${this.userPreferencesPath}/${userId}`);
    }
    // 전체 사용자 설정 업데이트
    async updateUserPreferences(preferences) {
        return this.client.put(this.userPreferencesPath, preferences);
    }
    // 외형 설정 업데이트
    async updateAppearanceSettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/appearance`, settings);
    }
    // 지역화 설정 업데이트
    async updateLocalizationSettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/localization`, settings);
    }
    // 알림 설정 업데이트
    async updateNotificationSettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/notifications`, settings);
    }
    // 보안 설정 업데이트
    async updateSecuritySettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/security`, settings);
    }
    // 개인정보 설정 업데이트
    async updatePrivacySettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/privacy`, settings);
    }
    // 표시 설정 업데이트
    async updateDisplaySettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/display`, settings);
    }
    // 차량 표시 설정 업데이트
    async updateVehicleDisplaySettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/vehicle-display`, settings);
    }
    // 정비 표시 설정 업데이트
    async updateMaintenanceDisplaySettings(settings) {
        return this.client.patch(`${this.userPreferencesPath}/maintenance-display`, settings);
    }
    // 설정 초기화
    async resetUserPreferences(section) {
        return this.client.post(`${this.userPreferencesPath}/reset`, { section });
    }
    // 설정 내보내기
    async exportUserPreferences() {
        return this.client.get(`${this.userPreferencesPath}/export`, {
            responseType: 'blob'
        });
    }
    // 설정 가져오기
    async importUserPreferences(file) {
        const formData = new FormData();
        formData.append('settings', file);
        return this.client.post(`${this.userPreferencesPath}/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 시스템 설정 관련 메서드 (관리자 전용)
    // 시스템 설정 조회
    async getSystemSettings() {
        return this.client.get(this.systemSettingsPath);
    }
    // 시스템 설정 업데이트
    async updateSystemSettings(settings) {
        return this.client.put(this.systemSettingsPath, settings);
    }
    // 이메일 설정 테스트
    async testEmailSettings(emailSettings, testEmail) {
        return this.client.post(`${this.systemSettingsPath}/test-email`, {
            emailSettings,
            testEmail
        });
    }
    // 스토리지 설정 테스트
    async testStorageSettings(storageSettings) {
        return this.client.post(`${this.systemSettingsPath}/test-storage`, {
            storageSettings
        });
    }
    // 시스템 백업 생성
    async createSystemBackup() {
        return this.client.post(`${this.systemSettingsPath}/create-backup`, {});
    }
    // 시스템 백업 복원
    async restoreSystemBackup(backupFile) {
        const formData = new FormData();
        formData.append('backup', backupFile);
        return this.client.post(`${this.systemSettingsPath}/restore-backup`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 유지보수 모드 설정
    async setMaintenanceMode(enabled, message, scheduledEnd) {
        return this.client.patch(`${this.systemSettingsPath}/maintenance-mode`, {
            maintenanceMode: enabled,
            maintenanceMessage: message,
            maintenanceScheduledEnd: scheduledEnd
        });
    }
    // 기능 플래그 업데이트
    async updateFeatureFlags(flags) {
        return this.client.patch(`${this.systemSettingsPath}/feature-flags`, flags);
    }
    // 설정 유효성 검사
    async validateSettings(settings) {
        return this.client.post(`${this.systemSettingsPath}/validate`, settings);
    }
    // 시스템 로고 업로드
    async uploadSystemLogo(logoFile, type) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        formData.append('type', type);
        return this.client.post(`${this.systemSettingsPath}/upload-logo`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 테마 설정 관련 메서드
    // 현재 테마 설정 조회
    async getThemeSettings() {
        return this.client.get(`${this.basePath}/theme`);
    }
    // 테마 설정 저장
    async saveThemeSettings(settings) {
        return this.client.post(`${this.basePath}/theme`, settings);
    }
    // 기본 테마로 재설정
    async resetTheme() {
        return this.client.post(`${this.basePath}/theme/reset`, {});
    }
    // 시간대 목록 조회
    async getTimezones() {
        return this.client.get(`${this.basePath}/timezones`);
    }
    // 언어 목록 조회
    async getAvailableLocales() {
        return this.client.get(`${this.basePath}/locales`);
    }
    // 통화 목록 조회
    async getAvailableCurrencies() {
        return this.client.get(`${this.basePath}/currencies`);
    }
}
