/**
 * API 서비스 인덱스
 */

// 기본 API 클라이언트
export { api, apiRequest } from './api';

// 도메인별 서비스
export { vehicleService } from './vehicle';
export * from './vehicle'; // 차량 관련 타입 내보내기
export { maintenanceService } from './maintenance';
export { authService } from './auth';
export { notificationService } from './notificationService';
export * from './DashboardDataService';
export * from './bookingService';
export * from './mileageAlertService';
export * from './mapService';
// Geofence 서비스에서는 서비스만 내보내고 타입은 내보내지 않음
export { geofenceService } from './geofenceService'; 