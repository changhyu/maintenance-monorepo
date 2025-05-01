import axios from 'axios';
import { Supplier, SupplierService, SupplierPerformance, SupplierPerformanceFilter, SupplierPart, PartCategory } from '../types/supplier';

class SupplierServiceImpl implements SupplierService {
  private static instance: SupplierServiceImpl;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  }

  public static getInstance(): SupplierServiceImpl {
    if (!SupplierServiceImpl.instance) {
      SupplierServiceImpl.instance = new SupplierServiceImpl();
    }
    return SupplierServiceImpl.instance;
  }

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/suppliers`);
      return response.data;
    } catch (error) {
      console.error('공급업체 목록 조회 실패:', error);
      throw error;
    }
  }

  async getSupplierById(id: string): Promise<Supplier> {
    try {
      const response = await axios.get(`${this.baseUrl}/suppliers/${id}`);
      return response.data;
    } catch (error) {
      console.error('공급업체 상세 조회 실패:', error);
      throw error;
    }
  }

  async getSupplierPerformance(filter: SupplierPerformanceFilter): Promise<SupplierPerformance[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/suppliers/performance`, {
        params: filter
      });
      return response.data;
    } catch (error) {
      console.error('공급업체 성과 조회 실패:', error);
      throw error;
    }
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    try {
      const response = await axios.post(`${this.baseUrl}/suppliers`, supplier);
      return response.data;
    } catch (error) {
      console.error('공급업체 생성 실패:', error);
      throw error;
    }
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    try {
      const response = await axios.put(`${this.baseUrl}/suppliers/${id}`, supplier);
      return response.data;
    } catch (error) {
      console.error('공급업체 수정 실패:', error);
      throw error;
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/suppliers/${id}`);
    } catch (error) {
      console.error('공급업체 삭제 실패:', error);
      throw error;
    }
  }

  async getSupplierParts(supplierId: string): Promise<SupplierPart[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/suppliers/${supplierId}/parts`);
      return response.data;
    } catch (error) {
      console.error('공급업체 부품 목록 조회 실패:', error);
      throw error;
    }
  }

  async getPartsByCategory(category: PartCategory): Promise<SupplierPart[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/parts`, {
        params: { category }
      });
      return response.data;
    } catch (error) {
      console.error('카테고리별 부품 목록 조회 실패:', error);
      throw error;
    }
  }

  async addSupplierPart(supplierId: string, part: Omit<SupplierPart, 'id' | 'supplierId'>): Promise<SupplierPart> {
    try {
      const response = await axios.post(`${this.baseUrl}/suppliers/${supplierId}/parts`, part);
      return response.data;
    } catch (error) {
      console.error('부품 추가 실패:', error);
      throw error;
    }
  }

  async updateSupplierPart(partId: string, part: Partial<SupplierPart>): Promise<SupplierPart> {
    try {
      const response = await axios.put(`${this.baseUrl}/parts/${partId}`, part);
      return response.data;
    } catch (error) {
      console.error('부품 정보 수정 실패:', error);
      throw error;
    }
  }

  async deleteSupplierPart(partId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/parts/${partId}`);
    } catch (error) {
      console.error('부품 삭제 실패:', error);
      throw error;
    }
  }

  // 모의 데이터 생성 메서드 (개발용)
  getMockPerformanceData(): SupplierPerformance[] {
    return [
      {
        id: '1',
        supplierId: 'SUP001',
        supplierName: '현대모비스',
        evaluationPeriod: '2024-03',
        deliveryRate: 98.5,
        qualityScore: 4.8,
        responseTime: 12,
        costEfficiency: 4.5,
        totalScore: 4.7,
        evaluatedAt: '2024-03-20T00:00:00Z',
        evaluatedBy: '김평가',
        comments: '우수한 품질과 신속한 납기'
      },
      {
        id: '2',
        supplierId: 'SUP002',
        supplierName: '만도',
        evaluationPeriod: '2024-03',
        deliveryRate: 95.0,
        qualityScore: 4.5,
        responseTime: 24,
        costEfficiency: 4.2,
        totalScore: 4.4,
        evaluatedAt: '2024-03-20T00:00:00Z',
        evaluatedBy: '이평가',
        comments: '안정적인 공급망 유지'
      },
      {
        id: '3',
        supplierId: 'SUP003',
        supplierName: '한온시스템',
        evaluationPeriod: '2024-03',
        deliveryRate: 92.0,
        qualityScore: 4.2,
        responseTime: 36,
        costEfficiency: 4.0,
        totalScore: 4.1,
        evaluatedAt: '2024-03-20T00:00:00Z',
        evaluatedBy: '박평가',
        comments: '품질 개선 필요'
      }
    ];
  }

  getMockSupplierParts(): SupplierPart[] {
    return [
      {
        id: 'PART001',
        supplierId: 'SUP001',
        partNumber: 'HM-ENG-001',
        name: '엔진 오일 필터',
        category: PartCategory.ENGINE,
        description: '고성능 엔진 오일 필터',
        unitPrice: 15000,
        minOrderQuantity: 10,
        leadTime: 3,
        warranty: 12,
        isOriginal: true,
        alternativePartNumbers: ['KIA-ENG-001', 'HYU-ENG-001']
      },
      {
        id: 'PART002',
        supplierId: 'SUP001',
        partNumber: 'HM-BRK-001',
        name: '브레이크 패드',
        category: PartCategory.BRAKE,
        description: '고성능 세라믹 브레이크 패드',
        unitPrice: 45000,
        minOrderQuantity: 4,
        leadTime: 2,
        warranty: 24,
        isOriginal: true
      },
      {
        id: 'PART003',
        supplierId: 'SUP002',
        partNumber: 'MN-SUS-001',
        name: '쇽업소버',
        category: PartCategory.SUSPENSION,
        description: '고급 가스 쇽업소버',
        unitPrice: 80000,
        minOrderQuantity: 2,
        leadTime: 5,
        warranty: 24,
        isOriginal: true,
        alternativePartNumbers: ['HM-SUS-001']
      }
    ];
  }
}

export default SupplierServiceImpl;