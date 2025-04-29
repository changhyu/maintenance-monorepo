import axios from 'axios';
import { Part, PartService, PartFilter, PartStockHistory } from '../types/part';

class PartServiceImpl implements PartService {
  private static instance: PartServiceImpl;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  }

  public static getInstance(): PartServiceImpl {
    if (!PartServiceImpl.instance) {
      PartServiceImpl.instance = new PartServiceImpl();
    }
    return PartServiceImpl.instance;
  }

  async getParts(filter: PartFilter): Promise<{ parts: Part[]; total: number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/parts`, {
        params: filter
      });
      return response.data;
    } catch (error) {
      console.error('부품 목록 조회 실패:', error);
      throw error;
    }
  }

  async getPartById(id: string): Promise<Part> {
    try {
      const response = await axios.get(`${this.baseUrl}/parts/${id}`);
      return response.data;
    } catch (error) {
      console.error('부품 상세 조회 실패:', error);
      throw error;
    }
  }

  async createPart(part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Promise<Part> {
    try {
      const response = await axios.post(`${this.baseUrl}/parts`, part);
      return response.data;
    } catch (error) {
      console.error('부품 생성 실패:', error);
      throw error;
    }
  }

  async updatePart(id: string, part: Partial<Part>): Promise<Part> {
    try {
      const response = await axios.put(`${this.baseUrl}/parts/${id}`, part);
      return response.data;
    } catch (error) {
      console.error('부품 수정 실패:', error);
      throw error;
    }
  }

  async deletePart(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/parts/${id}`);
    } catch (error) {
      console.error('부품 삭제 실패:', error);
      throw error;
    }
  }

  async getPartStockHistory(partId: string): Promise<PartStockHistory[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/parts/${partId}/stock-history`);
      return response.data;
    } catch (error) {
      console.error('부품 재고 이력 조회 실패:', error);
      throw error;
    }
  }

  async adjustStock(partId: string, quantity: number, note?: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/parts/${partId}/adjust-stock`, {
        quantity,
        note
      });
    } catch (error) {
      console.error('부품 재고 조정 실패:', error);
      throw error;
    }
  }

  // 모의 데이터 생성 메서드 (개발용)
  getMockParts(): Part[] {
    return [
      {
        id: 'PART001',
        partNumber: 'HM-ENG-001',
        name: '엔진 오일 필터',
        description: '고성능 엔진 오일 필터',
        category: 'engine',
        manufacturer: '현대모비스',
        price: 15000,
        currentStock: 50,
        minStock: 20,
        maxStock: 100,
        status: 'active',
        location: 'A-1-1',
        unitOfMeasure: 'EA',
        leadTime: 3,
        lastPurchaseDate: '2024-03-15',
        lastPurchasePrice: 14500,
        supplier: {
          id: 'SUP001',
          name: '현대모비스'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-03-15T00:00:00Z'
      },
      {
        id: 'PART002',
        partNumber: 'HM-BRK-001',
        name: '브레이크 패드',
        description: '고성능 세라믹 브레이크 패드',
        category: 'brake',
        manufacturer: '만도',
        price: 45000,
        currentStock: 30,
        minStock: 10,
        maxStock: 50,
        status: 'active',
        location: 'B-2-1',
        unitOfMeasure: 'SET',
        leadTime: 2,
        lastPurchaseDate: '2024-03-10',
        lastPurchasePrice: 43000,
        supplier: {
          id: 'SUP002',
          name: '만도'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-03-10T00:00:00Z'
      }
    ];
  }
}

export default PartServiceImpl; 