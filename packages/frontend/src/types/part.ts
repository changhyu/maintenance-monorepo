import { PartCategory } from './supplier';

/**
 * 부품 상태 enum
 */
export enum PartStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

/**
 * 부품 인터페이스
 */
export interface Part {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: PartCategory;
  manufacturer: string;
  price: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: PartStatus;
  location?: string;
  unitOfMeasure: string;
  leadTime: number;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  supplier?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 부품 필터 인터페이스
 */
export interface PartFilter {
  search?: string;
  category?: PartCategory;
  manufacturer?: string;
  status?: PartStatus;
  minStock?: boolean;
  supplier?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 부품 재고 이력 인터페이스
 */
export interface PartStockHistory {
  id: string;
  partId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  currentStock: number;
  unitPrice?: number;
  totalPrice?: number;
  reference?: string;
  note?: string;
  performedBy: string;
  performedAt: string;
}

/**
 * 부품 서비스 인터페이스
 */
export interface PartService {
  getParts(filter: PartFilter): Promise<{ parts: Part[]; total: number }>;
  getPartById(id: string): Promise<Part>;
  createPart(part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Promise<Part>;
  updatePart(id: string, part: Partial<Part>): Promise<Part>;
  deletePart(id: string): Promise<void>;
  getPartStockHistory(partId: string): Promise<PartStockHistory[]>;
  adjustStock(partId: string, quantity: number, note?: string): Promise<void>;
} 