/**
 * 정비 관련 공통 타입 정의
 */

/**
 * 정비 상태 열거형
 */
export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',    // 예약됨
  IN_PROGRESS = 'in_progress', // 진행 중
  COMPLETED = 'completed',    // 완료됨
  CANCELLED = 'cancelled',    // 취소됨
  DELAYED = 'delayed'         // 지연됨
}

/**
 * 정비 유형 열거형
 */
export enum MaintenanceType {
  REGULAR_SERVICE = 'regular_service',  // 정기 점검
  REPAIR = 'repair',                   // 수리
  INSPECTION = 'inspection',           // 검사
  OIL_CHANGE = 'oil_change',           // 오일 교환
  TIRE_SERVICE = 'tire_service',       // 타이어 서비스
  BATTERY_SERVICE = 'battery_service', // 배터리 서비스
  BRAKE_SERVICE = 'brake_service',     // 브레이크 서비스
  FILTER_CHANGE = 'filter_change',     // 필터 교체
  DIAGNOSTICS = 'diagnostics',         // 진단
  RECALL_SERVICE = 'recall_service',   // 리콜 서비스
  BODY_REPAIR = 'body_repair',         // 바디 수리
  ENGINE_SERVICE = 'engine_service',   // 엔진 서비스
  ELECTRICAL = 'electrical',           // 전기 시스템
  OTHER = 'other'                      // 기타
}

/**
 * 정비 우선순위 열거형
 */
export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 정비 기록 인터페이스
 */
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  shopId?: string;
  technicianId?: string;
  title: string;
  description: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority?: MaintenancePriority;
  scheduledDate?: string;
  startDate?: string;
  completionDate?: string;
  odometer?: number;
  cost?: {
    parts: number;
    labor: number;
    tax: number;
    total: number;
    currency: string;
  };
  parts?: MaintenancePart[];
  recommendations?: string[];
  notes?: string;
  documents?: MaintenanceDocument[];
  images?: string[];
  invoice?: string;
  warranty?: {
    provider: string;
    expiryDate: string;
    terms: string;
    covered: boolean;
  };
  followUpNeeded?: boolean;
  followUpDate?: string;
  diagnosisResults?: DiagnosisResult[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 정비 기록 생성 인터페이스
 */
export interface MaintenanceRecordCreate {
  vehicleID: string;
  description: string;
  date: string;
  mileage?: number;
  cost?: number;
  performedBy?: string;
  status?: MaintenanceStatus;
  notes?: string;
}

/**
 * 정비 기록 업데이트 인터페이스
 */
export interface MaintenanceRecordUpdate {
  description?: string;
  date?: string;
  mileage?: number;
  cost?: number;
  performedBy?: string;
  status?: MaintenanceStatus;
  notes?: string;
}

/**
 * 정비 부품 인터페이스
 */
export interface MaintenancePart {
  id?: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  manufacturer?: string;
  category?: string;
  warranty?: {
    months: number;
    kilometers: number;
  };
  isReplaced?: boolean;
  condition?: 'new' | 'used' | 'refurbished';
}

/**
 * 정비 부품 생성 인터페이스
 */
export interface MaintenancePartCreate {
  maintenanceID: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
}

/**
 * 정비 문서 인터페이스
 */
export interface MaintenanceDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
  size: number;
  description?: string;
  previewUrl?: string;
}

/**
 * 정비 생성 인터페이스
 */
export interface MaintenanceCreate {
  vehicleId: string;
  shopId?: string;
  technicianId?: string;
  title: string;
  description: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority?: MaintenancePriority;
  scheduledDate?: string;
  startDate?: string;
  odometer?: number;
  cost?: {
    parts?: number;
    labor?: number;
    tax?: number;
    total?: number;
    currency: string;
  };
  parts?: Omit<MaintenancePart, 'id'>[];
  recommendations?: string[];
  notes?: string;
  images?: string[];
  followUpNeeded?: boolean;
  followUpDate?: string;
}

/**
 * 정비 업데이트 인터페이스
 */
export interface MaintenanceUpdate {
  title?: string;
  description?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  shopId?: string;
  technicianId?: string;
  scheduledDate?: string;
  startDate?: string;
  completionDate?: string;
  odometer?: number;
  cost?: {
    parts?: number;
    labor?: number;
    tax?: number;
    total?: number;
    currency?: string;
  };
  parts?: Omit<MaintenancePart, 'id'>[];
  recommendations?: string[];
  notes?: string;
  images?: string[];
  invoice?: string;
  warranty?: {
    provider?: string;
    expiryDate?: string;
    terms?: string;
    covered?: boolean;
  };
  followUpNeeded?: boolean;
  followUpDate?: string;
  diagnosisResults?: Omit<DiagnosisResult, 'id'>[];
}

/**
 * 정비 필터 인터페이스
 */
export interface MaintenanceFilter {
  vehicleId?: string;
  shopId?: string;
  technicianId?: string;
  status?: MaintenanceStatus | MaintenanceStatus[];
  type?: MaintenanceType | MaintenanceType[];
  priority?: MaintenancePriority | MaintenancePriority[];
  startDate?: string;
  endDate?: string;
  minCost?: number;
  maxCost?: number;
  search?: string;
  sortBy?: 'scheduledDate' | 'status' | 'type' | 'priority' | 'cost' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * 정비 통계 인터페이스
 */
export interface MaintenanceStats {
  totalRecords: number;
  totalCost: number;
  byStatus: Record<MaintenanceStatus, number>;
  byType: Record<MaintenanceType, number>;
  averageCompletionTime?: number;
  mostCommonIssues?: { issue: string; count: number }[];
  costTrend?: { date: string; cost: number }[];
}

/**
 * 권장 정비 인터페이스
 */
export interface RecommendedMaintenance {
  id: string;
  vehicleId: string;
  description: string;
  mileageInterval: number;
  timeInterval: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCost?: number;
  nextDueDate?: string;
  nextDueMileage?: number;
  isDue: boolean;
}

/**
 * 진단 결과 인터페이스
 */
export interface DiagnosisResult {
  id?: string;
  code: string;
  description: string;
  system: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction?: string;
  detectedAt: string;
  resolvedAt?: string;
  status: 'detected' | 'in_progress' | 'resolved' | 'ignored';
} 