/**
 * 정비 타입 정의
 */

/**
 * 정비 유형
 */
export enum MaintenanceType {
  ROUTINE = 'routine',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  EMERGENCY = 'emergency'
}

/**
 * 정비 상태
 */
export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed'
}

/**
 * 정비 우선순위
 */
export type MaintenancePriority =
  | 'low' // 낮음
  | 'medium' // 중간
  | 'high' // 높음
  | 'critical'; // 긴급

/**
 * 정비 인터페이스
 */
export interface Maintenance {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  vehicleLicensePlate?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledDate: string;
  completionDate?: string;
  shopId?: string;
  shopName?: string;
  technician?: string;
  mileage?: number;
  cost?: number;
  notes?: string;
  parts?: MaintenancePart[];
  documents?: MaintenanceDocument[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 정비 문서
 */
export interface MaintenanceDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

/**
 * 정비 부품
 */
export interface MaintenancePart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'INSTALLED' | 'IN_STOCK' | 'ORDERED';
  warrantyExpiry?: string;
}

/**
 * 정비 필터 인터페이스
 */
export interface MaintenanceFilter {
  vehicleId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  startDateFrom?: string;
  startDateTo?: string;
  costMin?: number;
  costMax?: number;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * 정비 목록 응답 인터페이스
 */
export interface MaintenanceListResponse {
  items: Maintenance[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 정비 생성/수정을 위한 DTO 인터페이스
 */
export interface MaintenanceDTO {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  startDate: string;
  endDate?: string;
  cost?: number;
  technician?: string;
  facility?: string;
  workOrder?: string;
  notes?: string;
  documents?: Omit<MaintenanceDocument, 'id' | 'uploadedAt'>[];
  parts?: Omit<MaintenancePart, 'id'>[];
}
