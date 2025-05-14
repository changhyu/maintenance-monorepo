export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenanceType = 'regular' | 'repair' | 'inspection' | 'other';

export interface Maintenance {
  id: string;
  vehicleId: string;
  vehicle?: any; // 차량 정보 (필요에 따라 타입 확장)
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  scheduledDate: string;
  startDate?: string;
  completedDate?: string;
  cancelledDate?: string;
  mileage?: number;
  notes?: string;
  costDetails?: MaintenanceCostDetail[];
  costSummary?: MaintenanceCostSummary;
  createdAt: string;
  updatedAt: string;
  shopId?: string;
  technicianId?: string;
  technician?: {
    id: string;
    name: string;
    position?: string;
  };
}

export interface MaintenanceFormData extends Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'> {}

export interface MaintenanceFilters {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  searchQuery?: string;
  minCost?: number;
  maxCost?: number;
  shopId?: string;
  technicianId?: string;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number; // 시간 단위
  type: MaintenanceType;
}

// 정비 항목 예시 데이터
export const MAINTENANCE_ITEMS: MaintenanceItem[] = [
  {
    id: '1',
    name: '정기 점검',
    description: '엔진 오일 교체, 필터 교체, 브레이크 점검 등',
    estimatedCost: 200000,
    estimatedDuration: 2,
    type: 'regular',
  },
  {
    id: '2',
    name: '타이어 교체',
    description: '타이어 4개 교체 및 휠 밸런스 조정',
    estimatedCost: 400000,
    estimatedDuration: 1,
    type: 'repair',
  },
  {
    id: '3',
    name: '에어컨 점검',
    description: '에어컨 가스 충전 및 필터 교체',
    estimatedCost: 150000,
    estimatedDuration: 1,
    type: 'inspection',
  },
  {
    id: '4',
    name: '브레이크 패드 교체',
    description: '브레이크 패드 교체 및 디스크 점검',
    estimatedCost: 300000,
    estimatedDuration: 2,
    type: 'repair',
  },
  {
    id: '5',
    name: '배터리 교체',
    description: '배터리 상태 점검 및 교체',
    estimatedCost: 150000,
    estimatedDuration: 0.5,
    type: 'repair',
  },
  {
    id: '6',
    name: '차량 검사',
    description: '정기 검사 및 배출가스 검사',
    estimatedCost: 50000,
    estimatedDuration: 1,
    type: 'inspection',
  },
];

/**
 * 정비 비용 상세 인터페이스
 */
export interface MaintenanceCost {
  id: string;
  maintenanceId: string;
  type: 'labor' | 'parts' | 'additional';
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
  finalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 정비 비용 요약 인터페이스
 */
export interface MaintenanceCostSummary {
  laborTotal: number;
  partsTotal: number;
  otherTotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  finalTotal: number;
}

/**
 * 정비 예상 비용 인터페이스
 */
export interface MaintenanceEstimate {
  id: string;
  maintenanceId: string;
  estimatedCosts: MaintenanceCost[];
  summary: MaintenanceCostSummary;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  validUntil: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartControls {
  startDate: Date | null;
  endDate: Date | null;
  costTypes: string[];
  showEstimates: boolean;
  zoomLevel: number;
}

export interface ChartSettings {
  trendChart: {
    enabled: boolean;
    height: number;
    showLegend: boolean;
    sortBy: 'date' | 'amount';
    order: 'asc' | 'desc';
  };
  pieChart: {
    enabled: boolean;
    height: number;
    showLegend: boolean;
    innerRadius: number;
  };
  barChart: {
    enabled: boolean;
    height: number;
    showLegend: boolean;
    layout: 'vertical' | 'horizontal';
  };
  heatmapChart: {
    enabled: boolean;
    height: number;
    showLegend: boolean;
    colorScheme: string;
  };
  calendarChart: {
    enabled: boolean;
    height: number;
    showLegend: boolean;
  };
  radarChart: {
    enabled: boolean;
    height: number;
    showLegend: boolean;
    fillOpacity: number;
  };
}

export interface DrilldownData {
  type: string;
  date: string;
  data: MaintenanceCost[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between' | 'contains';
  value: any;
  value2?: any;
}

export interface SortOptions {
  field: 'date' | 'amount' | 'type' | 'frequency';
  order: 'asc' | 'desc';
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface FilterOptions {
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  costTypes?: string[];
  amountRange?: {
    min?: number;
    max?: number;
  };
  frequency?: {
    min?: number;
    max?: number;
  };
  customFilters: FilterCondition[];
}

export interface ExportOptions {
  format: 'excel' | 'pdf';
  includeCharts: boolean;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  costTypes: string[];
}

export interface ChartPreset {
  id: string;
  name: string;
  description?: string;
  controls: ChartControls;
  chartSettings: ChartSettings;
  createdAt: string;
  updatedAt: string;
}

// 정비 비용 세부 정보
export interface MaintenanceCostDetail {
  id: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  type: 'labor' | 'parts' | 'other';
}

// 정비 생성 입력 데이터
export interface MaintenanceCreateInput {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
  startDate?: string;
  mileage?: number;
  notes?: string;
  shopId?: string;
  technicianId?: string;
  costDetails?: Omit<MaintenanceCostDetail, 'id'>[];
}

// 정비 수정 입력 데이터
export interface MaintenanceUpdateInput {
  type?: MaintenanceType;
  description?: string;
  scheduledDate?: string;
  startDate?: string;
  completedDate?: string;
  mileage?: number;
  notes?: string;
  status?: MaintenanceStatus;
  shopId?: string;
  technicianId?: string;
  costDetails?: Omit<MaintenanceCostDetail, 'id'>[];
}

// 정비 완료 입력 데이터
export interface MaintenanceCompleteInput {
  completedDate: string;
  mileage: number;
  notes?: string;
}

// 정비 취소 입력 데이터
export interface MaintenanceCancelInput {
  reason?: string;
}

/**
 * 페이지네이션 정보 인터페이스
 */
export interface PaginationInfo {
  total: number;
  page: number;
  size: number;
  pages?: number;
  next_page?: number;
  prev_page?: number;
}

/**
 * 페이지네이션된 API 응답 인터페이스
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationInfo;
} 