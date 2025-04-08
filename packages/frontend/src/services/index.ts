/**
 * API 서비스 인덱스
 */

// 기본 API 클라이언트
export { api, apiRequest } from './api';

// 도메인별 서비스
export { vehicleService } from './vehicle';
export { maintenanceService } from './maintenance';
export { authService } from './auth';
export { notificationService } from './notificationService';
export * from './DashboardDataService';
export * from './bookingService';
export * from './mileageAlertService'; 