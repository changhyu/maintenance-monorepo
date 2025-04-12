/**
 * 정비 관련 타입 정의
 */

import { Vehicle } from './vehicle';

/**
 * 정비 타입 열거형
 */
export enum MaintenanceType {
  REGULAR = 'REGULAR',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION',
  RECALL = 'RECALL',
  UPGRADE = 'UPGRADE',
  OTHER = 'OTHER'
}

/**
 * 정비 상태 열거형
 */
export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DELAYED = 'DELAYED'
}

/**
 * 정비 우선순위 열거형
 */
export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * 정비 부품 정보 인터페이스
 */
export interface MaintenancePart {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * 정비 문서 인터페이스
 */
export interface MaintenanceDocument {
  id: string;
  name: string;
  fileUrl: string;
  uploadedAt: string;
  expiryDate?: string;
  size: number;
  type: string;
}

/**
 * 정비 기록 인터페이스
 */
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  startDate: string;
  endDate?: string;
  mileage: number;
  cost: number;
  technicianName?: string;
  shopName?: string;
  notes?: string;
  parts: MaintenancePart[];
  documents: MaintenanceDocument[];
  vehicle?: Vehicle;
  createdAt: string;
  updatedAt: string;
}

/**
 * 정비 기록 필터 인터페이스
 */
export interface MaintenanceFilter {
  vehicleId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 정비 기록 생성 인터페이스
 */
export type MaintenanceRecordCreate = Omit<
  MaintenanceRecord,
  'id' | 'createdAt' | 'updatedAt' | 'vehicle'
>;

/**
 * 정비 기록 업데이트 인터페이스
 */
export type MaintenanceRecordUpdate = Partial<
  Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'vehicle'>
>;

/**
 * 정비 통계 인터페이스
 */
export interface MaintenanceStats {
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  scheduledCount: number;
  averageCost: number;
  totalCost: number;
  byType: Record<MaintenanceType, number>;
  byMonth: Array<{
    month: string;
    count: number;
    cost: number;
  }>;
}
