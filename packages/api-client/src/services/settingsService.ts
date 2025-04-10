import { ApiClient } from '../client';

// 통합 설정 기본 타입 정의
export type IntegrationConfigBase = {
  enabled: boolean;
  [key: string]: unknown;
};

// 특정 통합에 대한 타입 정의
export interface GoogleMapsIntegration extends IntegrationConfigBase {
  apiKey?: string;
}

export interface SlackIntegration extends IntegrationConfigBase {
  webhookUrl?: string;
}

export interface ObdIntegration extends IntegrationConfigBase {
  providerApiKey?: string;
}

// 다른 통합을 위한 일반 타입
export interface GenericIntegration extends IntegrationConfigBase {}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum LocaleCode {
  KO_KR = 'ko-KR',
  EN_US = 'en-US',
  JA_JP = 'ja-JP',
  ZH_CN = 'zh-CN',
  ZH_TW = 'zh-TW'
}

export enum MeasurementUnit {
  METRIC = 'metric',     // km, liter, celsius
  IMPERIAL = 'imperial'  // miles, gallon, fahrenheit
}

export enum DateFormat {
  YYYY_MM_DD = 'YYYY-MM-DD',
  MM_DD_YYYY = 'MM/DD/YYYY',
  DD_MM_YYYY = 'DD/MM/YYYY',
  YYYY_MM_DD_KR = 'YYYY년 MM월 DD일'
}

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app'
}

export interface AppearanceSettings {
  themeMode: ThemeMode;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily?: string;
  colorAccent?: string;
  useDenseModeUI?: boolean;
  useHighContrast?: boolean;
  animationsEnabled?: boolean;
  customCss?: string;
}

export interface LocalizationSettings {
  locale: LocaleCode;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: '12h' | '24h';
  measurementUnit: MeasurementUnit;
  currencyCode: string;
  firstDayOfWeek: 0 | 1 | 6; // 0=일요일, 1=월요일, 6=토요일
  numberFormat: {
    decimalSeparator: '.' | ',';
    thousandsSeparator: ',' | '.' | ' ' | '';
    decimalPlaces: number;
  };
}

export interface NotificationSettings {
  enabled: boolean;
  channels: NotificationChannel[];
  doNotDisturbStart?: string; // 24시간 형식 "HH:MM"
  doNotDisturbEnd?: string;   // 24시간 형식 "HH:MM"
  events: {
    maintenanceDue: boolean;
    maintenanceReminders: boolean;
    maintenanceUpdates: boolean;
    vehicleIssues: boolean;
    bookingConfirmation: boolean;
    bookingReminders: boolean;
    bookingUpdates: boolean;
    paymentReceipts: boolean;
    systemAnnouncements: boolean;
    reportGeneration: boolean;
    [key: string]: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  emailDigest: boolean;
  emailDigestDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'app' | 'sms' | 'email';
  sessionTimeout: number; // 분 단위
  sessionExtendOnActivity: boolean;
  recentDevices: Array<{
    deviceId: string;
    deviceName: string;
    browser: string;
    os: string;
    ipAddress: string;
    lastAccess: string;
    isCurrent: boolean;
  }>;
  loginNotifications: boolean;
  dataEncryption?: {
    enabled: boolean;
    level: 'standard' | 'high';
  };
}

export interface PrivacySettings {
  shareUsageData: boolean;
  shareCrashReports: boolean;
  allowCookies: boolean;
  cookiePreferences: {
    necessary: boolean; // 항상 true
    functional: boolean;
    analytics: boolean;
    advertising: boolean;
    thirdParty: boolean;
  };
  dataRetention: {
    maintenanceHistory: 'forever' | '10years' | '7years' | '5years' | '3years' | '1year';
    locationData: 'forever' | '1year' | '6months' | '3months' | '1month' | 'never';
    telemetryData: 'forever' | '1year' | '6months' | '3months' | '1month' | 'never';
  };
}

export interface DisplaySettings {
  dashboardLayout: 'standard' | 'compact' | 'detailed' | 'custom';
  dashboardWidgets: string[]; // 위젯 ID 목록
  defaultView: 'dashboard' | 'vehicles' | 'maintenance' | 'calendar';
  maintenanceCalendarView: 'month' | 'week' | 'day' | 'agenda';
  showVehicleImages: boolean;
  showWeatherInfo: boolean;
  tableRowsPerPage: 10 | 25 | 50 | 100;
  favoriteVehicles: string[]; // 차량 ID 목록
  customFields?: Record<string, boolean>; // 사용자 정의 필드 표시 여부
}

export interface VehicleDisplaySettings {
  defaultSortBy: 'name' | 'make' | 'model' | 'year' | 'lastService' | 'status';
  defaultSortOrder: 'asc' | 'desc';
  showMileage: boolean;
  showMaintenanceStatus: boolean;
  showNextServiceDate: boolean;
  showFuelLevel: boolean;
  showHealthScore: boolean;
  groupBy: 'none' | 'make' | 'model' | 'year' | 'status' | 'owner';
  displayMode: 'grid' | 'list' | 'table';
}

export interface MaintenanceDisplaySettings {
  defaultSortBy: 'date' | 'vehicle' | 'type' | 'status' | 'cost';
  defaultSortOrder: 'asc' | 'desc';
  showCosts: boolean;
  showParts: boolean;
  showLabor: boolean;
  showShopDetails: boolean;
  showTechnician: boolean;
  showAttachments: boolean;
  groupBy: 'none' | 'vehicle' | 'type' | 'status' | 'shop';
  displayMode: 'grid' | 'list' | 'table' | 'timeline';
}

export interface UserPreferences {
  id: string;
  userId: string;
  appearance: AppearanceSettings;
  localization: LocalizationSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  privacy: PrivacySettings;
  display: DisplaySettings;
  vehicleDisplay: VehicleDisplaySettings;
  maintenanceDisplay: MaintenanceDisplaySettings;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  appName: string;
  appLogo: string;
  appFavicon: string;
  companyName: string;
  companyLogo: string;
  supportEmail: string;
  supportPhone: string;
  adminEmails: string[];
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceScheduledEnd?: string;
  registrationEnabled: boolean;
  defaultUserRole: string;
  maxUploadSize: number; // bytes
  allowedFileTypes: string[];
  sessionTimeout: number; // minutes
  emailSettings: {
    provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
    fromEmail: string;
    fromName: string;
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    apiKey?: string;
    domain?: string;
    region?: string;
  };
  storageSettings: {
    provider: 'local' | 's3' | 'gcs' | 'azure';
    bucketName?: string;
    basePath?: string;
    region?: string;
  };
  integrations: {
    googleMaps?: GoogleMapsIntegration;
    slack?: SlackIntegration;
    obd?: ObdIntegration;
    [key: string]: GenericIntegration | undefined;
  };
  backupSettings: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // "HH:MM" format
    keepBackups: number;
    includeFiles: boolean;
  };
  analytics: {
    enabled: boolean;
    provider: 'internal' | 'google' | 'mixpanel' | 'custom';
    trackingId?: string;
    anonymizeIp: boolean;
  };
  featureFlags: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsUpdateResponse {
  success: boolean;
  message?: string;
  settings: UserPreferences | SystemSettings;
}

export class SettingsService {
  private client: ApiClient;
  private basePath = '/settings';
  private userPreferencesPath = '/user-preferences';
  private systemSettingsPath = '/system-settings';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 사용자 설정 관련 메서드

  // 현재 사용자 설정 조회
  async getUserPreferences(): Promise<UserPreferences> {
    return this.client.get<UserPreferences>(this.userPreferencesPath);
  }

  // 특정 사용자 설정 조회 (관리자)
  async getUserPreferencesByUserId(userId: string): Promise<UserPreferences> {
    return this.client.get<UserPreferences>(`${this.userPreferencesPath}/${userId}`);
  }

  // 전체 사용자 설정 업데이트
  async updateUserPreferences(preferences: Partial<Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<SettingsUpdateResponse> {
    return this.client.put<SettingsUpdateResponse>(this.userPreferencesPath, preferences);
  }

  // 외형 설정 업데이트
  async updateAppearanceSettings(settings: Partial<AppearanceSettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/appearance`, settings);
  }

  // 지역화 설정 업데이트
  async updateLocalizationSettings(settings: Partial<LocalizationSettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/localization`, settings);
  }

  // 알림 설정 업데이트
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/notifications`, settings);
  }

  // 보안 설정 업데이트
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/security`, settings);
  }

  // 개인정보 설정 업데이트
  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/privacy`, settings);
  }

  // 표시 설정 업데이트
  async updateDisplaySettings(settings: Partial<DisplaySettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/display`, settings);
  }

  // 차량 표시 설정 업데이트
  async updateVehicleDisplaySettings(settings: Partial<VehicleDisplaySettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/vehicle-display`, settings);
  }

  // 정비 표시 설정 업데이트
  async updateMaintenanceDisplaySettings(settings: Partial<MaintenanceDisplaySettings>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.userPreferencesPath}/maintenance-display`, settings);
  }

  // 설정 초기화
  async resetUserPreferences(section?: 'appearance' | 'localization' | 'notifications' | 'security' | 'privacy' | 'display' | 'vehicleDisplay' | 'maintenanceDisplay'): Promise<SettingsUpdateResponse> {
    return this.client.post<SettingsUpdateResponse>(`${this.userPreferencesPath}/reset`, { section });
  }

  // 설정 내보내기
  async exportUserPreferences(): Promise<Blob> {
    return this.client.get<Blob>(`${this.userPreferencesPath}/export`, {
      responseType: 'blob'
    });
  }

  // 설정 가져오기
  async importUserPreferences(file: File): Promise<SettingsUpdateResponse> {
    const formData = new FormData();
    formData.append('settings', file);
    
    return this.client.post<SettingsUpdateResponse>(`${this.userPreferencesPath}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 시스템 설정 관련 메서드 (관리자 전용)

  // 시스템 설정 조회
  async getSystemSettings(): Promise<SystemSettings> {
    return this.client.get<SystemSettings>(this.systemSettingsPath);
  }

  // 시스템 설정 업데이트
  async updateSystemSettings(settings: Partial<Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SettingsUpdateResponse> {
    return this.client.put<SettingsUpdateResponse>(this.systemSettingsPath, settings);
  }

  // 이메일 설정 테스트
  async testEmailSettings(emailSettings: SystemSettings['emailSettings'], testEmail: string): Promise<{ success: boolean; message: string }> {
    return this.client.post<{ success: boolean; message: string }>(`${this.systemSettingsPath}/test-email`, {
      emailSettings,
      testEmail
    });
  }

  // 스토리지 설정 테스트
  async testStorageSettings(storageSettings: SystemSettings['storageSettings']): Promise<{ success: boolean; message: string }> {
    return this.client.post<{ success: boolean; message: string }>(`${this.systemSettingsPath}/test-storage`, {
      storageSettings
    });
  }

  // 시스템 백업 생성
  async createSystemBackup(): Promise<{ success: boolean; message: string; backupUrl?: string }> {
    return this.client.post<{ success: boolean; message: string; backupUrl?: string }>(`${this.systemSettingsPath}/create-backup`, {});
  }

  // 시스템 백업 복원
  async restoreSystemBackup(backupFile: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('backup', backupFile);
    
    return this.client.post<{ success: boolean; message: string }>(`${this.systemSettingsPath}/restore-backup`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 유지보수 모드 설정
  async setMaintenanceMode(enabled: boolean, message?: string, scheduledEnd?: string): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.systemSettingsPath}/maintenance-mode`, {
      maintenanceMode: enabled,
      maintenanceMessage: message,
      maintenanceScheduledEnd: scheduledEnd
    });
  }

  // 기능 플래그 업데이트
  async updateFeatureFlags(flags: Record<string, boolean>): Promise<SettingsUpdateResponse> {
    return this.client.patch<SettingsUpdateResponse>(`${this.systemSettingsPath}/feature-flags`, flags);
  }

  // 설정 유효성 검사
  async validateSettings(settings: Partial<SystemSettings>): Promise<{
    valid: boolean;
    errors?: Record<string, string>;
  }> {
    return this.client.post<{
      valid: boolean;
      errors?: Record<string, string>;
    }>(`${this.systemSettingsPath}/validate`, settings);
  }

  // 시스템 로고 업로드
  async uploadSystemLogo(logoFile: File, type: 'appLogo' | 'appFavicon' | 'companyLogo'): Promise<{
    success: boolean;
    url: string;
  }> {
    const formData = new FormData();
    formData.append('logo', logoFile);
    formData.append('type', type);
    
    return this.client.post<{
      success: boolean;
      url: string;
    }>(`${this.systemSettingsPath}/upload-logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 테마 설정 관련 메서드

  // 현재 테마 설정 조회
  async getThemeSettings(): Promise<{
    themeMode: ThemeMode;
    primaryColor: string;
    secondaryColor: string;
    customCss?: string;
    customLogoUrl?: string;
    bodyFont?: string;
    headingFont?: string;
  }> {
    return this.client.get<{
      themeMode: ThemeMode;
      primaryColor: string;
      secondaryColor: string;
      customCss?: string;
      customLogoUrl?: string;
      bodyFont?: string;
      headingFont?: string;
    }>(`${this.basePath}/theme`);
  }

  // 테마 설정 저장
  async saveThemeSettings(settings: {
    themeMode: ThemeMode;
    primaryColor: string;
    secondaryColor: string;
    customCss?: string;
    customLogoUrl?: string;
    bodyFont?: string;
    headingFont?: string;
  }): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`${this.basePath}/theme`, settings);
  }

  // 기본 테마로 재설정
  async resetTheme(): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`${this.basePath}/theme/reset`, {});
  }

  // 시간대 목록 조회
  async getTimezones(): Promise<string[]> {
    return this.client.get<string[]>(`${this.basePath}/timezones`);
  }

  // 언어 목록 조회
  async getAvailableLocales(): Promise<Array<{
    code: LocaleCode;
    name: string;
    nativeName: string;
    isAvailable: boolean;
  }>> {
    return this.client.get<Array<{
      code: LocaleCode;
      name: string;
      nativeName: string;
      isAvailable: boolean;
    }>>(`${this.basePath}/locales`);
  }

  // 통화 목록 조회
  async getAvailableCurrencies(): Promise<Array<{
    code: string;
    name: string;
    symbol: string;
  }>> {
    return this.client.get<Array<{
      code: string;
      name: string;
      symbol: string;
    }>>(`${this.basePath}/currencies`);
  }
} 