/**
 * 서비스 모듈 인덱스 파일
 *
 * 모든 API 클라이언트 서비스를 중앙에서 export합니다.
 * 중복 export 이름은 명시적으로 renaming하여 해결합니다.
 */
// 기본 서비스 내보내기
export * from './vehicleService';
export * from './maintenanceService';
export * from './userService';
export * from './shopService';
export * from './notificationService';
export * from './dashboardService';
export * from './todoService';
export * from './searchService';
export * from './importExportService';
// 개별 서비스 export - 타입 충돌 방지
export { AnalyticsService } from './analyticsService';
export { FileService } from './fileService';
export { ReportService } from './reportService';
export { SettingsService } from './settingsService';
export { BookingService } from './bookingService';
export { PaymentService } from './paymentService';
export { TelemetryService } from './telemetryService';
