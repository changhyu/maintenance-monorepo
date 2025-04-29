import apiClient from '../utils/apiClient';
import { Driver, DriverStats, DriverFilters, DriverCreate, DriverUpdate, PaginatedDrivers, DriverDocument } from '../types/driver';

export class DriverService {
  private static instance: DriverService;
  private readonly baseUrl = '/drivers';

  private constructor() {}

  public static getInstance(): DriverService {
    if (!DriverService.instance) {
      DriverService.instance = new DriverService();
    }
    return DriverService.instance;
  }

  async getAllDrivers(filters?: DriverFilters): Promise<PaginatedDrivers> {
    const response = await apiClient.get<PaginatedDrivers>(this.baseUrl, { params: filters });
    return response.data;
  }

  async getDriverById(id: string): Promise<Driver> {
    const response = await apiClient.get<Driver>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async createDriver(driver: DriverCreate): Promise<Driver> {
    const response = await apiClient.post<Driver>(this.baseUrl, driver);
    return response.data;
  }

  async updateDriver(id: string, driver: DriverUpdate): Promise<Driver> {
    const response = await apiClient.put<Driver>(`${this.baseUrl}/${id}`, driver);
    return response.data;
  }

  async deleteDriver(id: string): Promise<boolean> {
    const response = await apiClient.delete<boolean>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getDriverStats(driverId: string): Promise<DriverStats> {
    const response = await apiClient.get<DriverStats>(`${this.baseUrl}/${driverId}/stats`);
    return response.data;
  }

  async uploadDriverDocument(driverId: string, file: File, documentType: string): Promise<DriverDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await apiClient.post<DriverDocument>(
      `${this.baseUrl}/${driverId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
    const response = await apiClient.get<DriverDocument[]>(`${this.baseUrl}/${driverId}/documents`);
    return response.data;
  }

  async deleteDocument(driverId: string, documentId: string): Promise<boolean> {
    const response = await apiClient.delete<boolean>(`${this.baseUrl}/${driverId}/documents/${documentId}`);
    return response.data;
  }

  async searchDrivers(query: string): Promise<Driver[]> {
    const response = await apiClient.get<Driver[]>(`${this.baseUrl}/search`, {
      params: { q: query },
    });
    return response.data;
  }
}

// DriverService 인스턴스를 생성하고 내보냅니다.
export const driverService = DriverService.getInstance(); 