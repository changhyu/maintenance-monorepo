import SupplierServiceImpl from '../SupplierService';
import { SupplierType, SupplierStatus, SupplierGrade } from '../../types/supplier';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SupplierService', () => {
  let service: SupplierServiceImpl;

  beforeEach(() => {
    service = SupplierServiceImpl.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuppliers', () => {
    it('should fetch suppliers successfully', async () => {
      const mockSuppliers = [
        {
          id: '1',
          name: '현대모비스',
          code: 'SUP001',
          type: SupplierType.PARTS,
          status: SupplierStatus.ACTIVE,
          grade: SupplierGrade.A,
          contactPerson: '김담당',
          email: 'contact@mobis.com',
          phone: '02-1234-5678',
          address: '서울시 강남구',
          registrationNumber: '123-45-67890',
          contractStartDate: '2024-01-01',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockSuppliers });

      const result = await service.getSuppliers();

      expect(result).toEqual(mockSuppliers);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/suppliers'));
    });

    it('should handle error when fetching suppliers fails', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(service.getSuppliers()).rejects.toThrow('Network error');
    });
  });

  describe('getSupplierById', () => {
    it('should fetch supplier by id successfully', async () => {
      const mockSupplier = {
        id: '1',
        name: '현대모비스',
        code: 'SUP001',
        type: SupplierType.PARTS,
        status: SupplierStatus.ACTIVE,
        grade: SupplierGrade.A,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockSupplier });

      const result = await service.getSupplierById('1');

      expect(result).toEqual(mockSupplier);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/suppliers/1'));
    });
  });

  describe('getMockPerformanceData', () => {
    it('should return mock performance data', () => {
      const mockData = service.getMockPerformanceData();

      expect(mockData).toHaveLength(3);
      expect(mockData[0]).toHaveProperty('supplierName', '현대모비스');
      expect(mockData[1]).toHaveProperty('supplierName', '만도');
      expect(mockData[2]).toHaveProperty('supplierName', '한온시스템');
    });

    it('should have correct data structure', () => {
      const mockData = service.getMockPerformanceData();
      const firstItem = mockData[0];

      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('supplierId');
      expect(firstItem).toHaveProperty('deliveryRate');
      expect(firstItem).toHaveProperty('qualityScore');
      expect(firstItem).toHaveProperty('responseTime');
      expect(firstItem).toHaveProperty('costEfficiency');
      expect(firstItem).toHaveProperty('totalScore');
      expect(firstItem).toHaveProperty('evaluatedAt');
      expect(firstItem).toHaveProperty('evaluatedBy');
      expect(firstItem).toHaveProperty('comments');
    });
  });
}); 