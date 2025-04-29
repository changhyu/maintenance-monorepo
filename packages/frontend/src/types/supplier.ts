/**
 * 공급업체 상태 enum
 */
export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * 공급업체 유형 enum
 */
export enum SupplierType {
  PARTS = 'parts',
  SERVICE = 'service',
  BOTH = 'both'
}

/**
 * 공급업체 등급 enum
 */
export enum SupplierGrade {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D'
}

/**
 * 부품 카테고리 enum
 */
export enum PartCategory {
  ENGINE = 'engine',           // 엔진 부품
  TRANSMISSION = 'transmission', // 변속기 부품
  BRAKE = 'brake',            // 브레이크 부품
  SUSPENSION = 'suspension',   // 서스펜션
  ELECTRICAL = 'electrical',   // 전기 부품
  BODY = 'body',              // 차체 부품
  INTERIOR = 'interior',      // 내장 부품
  HVAC = 'hvac',              // 공조 부품
  FUEL = 'fuel',              // 연료 시스템
  OTHER = 'other'             // 기타
}

/**
 * 공급업체 인터페이스
 */
export interface Supplier {
  id: string;
  name: string;
  code: string;
  type: SupplierType;
  status: SupplierStatus;
  grade: SupplierGrade;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  registrationNumber: string;
  contractStartDate: string;
  contractEndDate?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  partCategories?: PartCategory[]; // 취급하는 부품 카테고리
  qualityCertifications?: string[]; // 품질 인증
  paymentTerms?: string; // 결제 조건
  returnPolicy?: string; // 반품 정책
  minimumOrderAmount?: number; // 최소 주문 금액
}

/**
 * 공급업체 성과 인터페이스
 */
export interface SupplierPerformance {
  id: string;
  supplierId: string;
  supplierName: string;
  evaluationPeriod: string;
  deliveryRate: number;
  qualityScore: number;
  responseTime: number;
  costEfficiency: number;
  totalScore: number;
  evaluatedAt: string;
  evaluatedBy: string;
  comments?: string;
}

/**
 * 공급업체 성과 필터 인터페이스
 */
export interface SupplierPerformanceFilter {
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  minScore?: number;
  maxScore?: number;
  grade?: SupplierGrade;
}

/**
 * 공급업체 부품 정보 인터페이스
 */
export interface SupplierPart {
  id: string;
  supplierId: string;
  partNumber: string;
  name: string;
  category: PartCategory;
  description?: string;
  unitPrice: number;
  minOrderQuantity: number;
  leadTime: number; // 리드타임 (일)
  warranty: number; // 보증기간 (개월)
  isOriginal: boolean; // 순정부품 여부
  alternativePartNumbers?: string[]; // 대체 가능한 부품 번호
}

/**
 * 공급업체 서비스 인터페이스
 */
export interface SupplierService {
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier>;
  getSupplierPerformance(filter: SupplierPerformanceFilter): Promise<SupplierPerformance[]>;
  createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  getSupplierParts(supplierId: string): Promise<SupplierPart[]>;
  getPartsByCategory(category: PartCategory): Promise<SupplierPart[]>;
  addSupplierPart(supplierId: string, part: Omit<SupplierPart, 'id' | 'supplierId'>): Promise<SupplierPart>;
  updateSupplierPart(partId: string, part: Partial<SupplierPart>): Promise<SupplierPart>;
  deleteSupplierPart(partId: string): Promise<void>;
} 