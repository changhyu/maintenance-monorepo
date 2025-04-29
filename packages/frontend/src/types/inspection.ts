/**
 * 차량 법정검사 관련 타입 정의
 */
import { Vehicle } from './vehicle';

/**
 * 법정검사 상태 열거형
 */
export enum InspectionStatus {
  PENDING = 'pending',         // 대기 중
  SCHEDULED = 'scheduled',     // 예정됨
  COMPLETED = 'completed',     // 완료됨
  EXPIRED = 'expired',         // 기한 만료
  FAILED = 'failed'            // 검사 불합격
}

/**
 * 법정검사 유형 열거형
 */
export enum InspectionType {
  REGULAR = 'regular',         // 정기검사
  EMISSION = 'emission',       // 배출가스 검사
  SAFETY = 'safety',           // 안전검사
  COMPREHENSIVE = 'comprehensive'  // 종합검사
}

/**
 * 법정검사 기본 인터페이스
 */
export interface Inspection {
  id: string;
  vehicleId: string;
  inspectionType: InspectionType;
  dueDate: Date | string;
  inspectionDate?: Date | string;
  status: InspectionStatus;
  location?: string;
  inspector?: string;
  fee?: number;
  passed?: boolean;
  certificateNumber?: string;
  nextDueDate?: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  vehicle?: Vehicle; // 관련 차량 정보
}

/**
 * 법정검사 생성 요청 인터페이스
 */
export interface InspectionCreateRequest {
  vehicleId: string;
  inspectionType: InspectionType;
  dueDate: string;
  location?: string;
  inspector?: string;
  notes?: string;
}

/**
 * 법정검사 업데이트 요청 인터페이스
 */
export interface InspectionUpdateRequest {
  inspectionType?: InspectionType;
  dueDate?: string;
  inspectionDate?: string;
  status?: InspectionStatus;
  location?: string;
  inspector?: string;
  fee?: number;
  passed?: boolean;
  certificateNumber?: string;
  nextDueDate?: string;
  notes?: string;
}

/**
 * 법정검사 완료 요청 인터페이스
 */
export interface InspectionCompleteRequest {
  inspectionDate: string;
  passed: boolean;
  fee: number;
  certificateNumber?: string;
  nextDueDate?: string;
  notes?: string;
}

/**
 * 법정검사 필터 인터페이스
 */
export interface InspectionFilter {
  vehicleId?: string;
  status?: InspectionStatus;
  dueBefore?: string;
  dueAfter?: string;
}

/**
 * 다가오는 법정검사 인터페이스
 */
export interface UpcomingInspection extends Omit<Inspection, 'vehicle'> {
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
    vin?: string;
  };
  daysRemaining?: number;
}