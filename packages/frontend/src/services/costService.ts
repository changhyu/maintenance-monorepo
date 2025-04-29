import { apiClient } from '../utils/apiClient';
import { Cost, CostSummary, CostAnalysis } from '../types/cost';

class CostService {
  private readonly baseUrl = '/api/v1/costs';

  async getAllCosts(): Promise<Cost[]> {
    const response = await apiClient.get<Cost[]>(this.baseUrl);
    return response.data;
  }

  async getCostById(id: string): Promise<Cost> {
    const response = await apiClient.get<Cost>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async createCost(cost: Omit<Cost, 'id'>): Promise<Cost> {
    const response = await apiClient.post<Cost>(this.baseUrl, cost);
    return response.data;
  }

  async updateCost(id: string, cost: Partial<Cost>): Promise<Cost> {
    const response = await apiClient.put<Cost>(`${this.baseUrl}/${id}`, cost);
    return response.data;
  }

  async deleteCost(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async getCostSummary(params?: {
    startDate?: string;
    endDate?: string;
    vehicleId?: string;
  }): Promise<CostSummary> {
    const response = await apiClient.get<CostSummary>(`${this.baseUrl}/summary`, { params });
    return response.data;
  }

  async getCostAnalysis(params?: {
    startDate?: string;
    endDate?: string;
    vehicleId?: string;
  }): Promise<CostAnalysis> {
    const response = await apiClient.get<CostAnalysis>(`${this.baseUrl}/analysis`, { params });
    return response.data;
  }

  async uploadReceipt(costId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('receipt', file);
    const response = await apiClient.post<{ url: string }>(
      `${this.baseUrl}/${costId}/receipt`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.url;
  }

  async getCostsByVehicle(vehicleId: string): Promise<Cost[]> {
    const response = await apiClient.get<Cost[]>(`${this.baseUrl}/vehicle/${vehicleId}`);
    return response.data;
  }

  async getCostsByCategory(category: string): Promise<Cost[]> {
    const response = await apiClient.get<Cost[]>(`${this.baseUrl}/category/${category}`);
    return response.data;
  }

  async exportCosts(params?: {
    format?: 'csv' | 'excel' | 'pdf';
    startDate?: string;
    endDate?: string;
    vehicleId?: string;
  }): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
}

export const costService = new CostService(); 