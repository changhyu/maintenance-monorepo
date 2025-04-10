import { ApiClient } from '../client';

// 보고서 내용 데이터 타입 정의
export type ReportContent = Record<string, unknown>;
// 보고서 파라미터 타입 정의
export type ReportParameters = Record<string, unknown>;
// 커스텀 필터 타입 정의
export type CustomFilters = Record<string, unknown>;

export enum ReportType {
  VEHICLE = 'VEHICLE',
  MAINTENANCE = 'MAINTENANCE',
  COST = 'COST',
  USAGE = 'USAGE',
  SUMMARY = 'SUMMARY',
  CUSTOM = 'CUSTOM'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON'
}

export enum ReportFrequency {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY'
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  createdBy: string;
  isPublic: boolean;
  content: ReportContent;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  generatedBy: string;
  generatedAt: string;
  parameters: ReportParameters;
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  parameters: ReportParameters;
  recipientEmails?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface GenerateReportRequest {
  type: ReportType;
  name: string;
  description?: string;
  format: ReportFormat;
  parameters: {
    startDate?: string;
    endDate?: string;
    vehicleIds?: string[];
    shopIds?: string[];
    userIds?: string[];
    includeDetails?: boolean;
    includeCosts?: boolean;
    includeCharts?: boolean;
    customFilters?: CustomFilters;
    templateId?: string;
  };
}

export interface CreateReportScheduleRequest {
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  parameters: {
    startDate?: string;
    endDate?: string;
    vehicleIds?: string[];
    shopIds?: string[];
    userIds?: string[];
    includeDetails?: boolean;
    includeCosts?: boolean;
    includeCharts?: boolean;
    customFilters?: CustomFilters;
    templateId?: string;
  };
  recipientEmails?: string[];
}

export interface UpdateReportScheduleRequest {
  name?: string;
  description?: string;
  format?: ReportFormat;
  frequency?: ReportFrequency;
  parameters?: {
    startDate?: string;
    endDate?: string;
    vehicleIds?: string[];
    shopIds?: string[];
    userIds?: string[];
    includeDetails?: boolean;
    includeCosts?: boolean;
    includeCharts?: boolean;
    customFilters?: CustomFilters;
    templateId?: string;
  };
  recipientEmails?: string[];
  isActive?: boolean;
}

export interface CreateReportTemplateRequest {
  name: string;
  description?: string;
  type: ReportType;
  isPublic?: boolean;
  content: ReportContent;
}

export interface UpdateReportTemplateRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  content?: ReportContent;
}

export interface ReportFilter {
  type?: ReportType | ReportType[];
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  format?: ReportFormat;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ReportService {
  private client: ApiClient;
  private basePath = '/reports';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 보고서 생성
  async generateReport(request: GenerateReportRequest): Promise<Report> {
    return this.client.post<Report>(`${this.basePath}/generate`, request);
  }

  // 생성된 보고서 조회
  async getReports(filter?: ReportFilter): Promise<Report[]> {
    return this.client.get<Report[]>(this.basePath, { params: filter });
  }

  // 특정 보고서 조회
  async getReportById(id: string): Promise<Report> {
    return this.client.get<Report>(`${this.basePath}/${id}`);
  }

  // 보고서 다운로드 URL 가져오기
  async getReportDownloadUrl(id: string): Promise<string> {
    const response = await this.client.get<{ url: string }>(`${this.basePath}/${id}/download`);
    return response.url;
  }

  // 보고서 삭제
  async deleteReport(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 보고서 템플릿 목록 조회
  async getReportTemplates(filter?: { type?: ReportType; createdBy?: string; isPublic?: boolean }): Promise<ReportTemplate[]> {
    return this.client.get<ReportTemplate[]>(`${this.basePath}/templates`, { params: filter });
  }

  // 특정 보고서 템플릿 조회
  async getReportTemplateById(id: string): Promise<ReportTemplate> {
    return this.client.get<ReportTemplate>(`${this.basePath}/templates/${id}`);
  }

  // 보고서 템플릿 생성
  async createReportTemplate(template: CreateReportTemplateRequest): Promise<ReportTemplate> {
    return this.client.post<ReportTemplate>(`${this.basePath}/templates`, template);
  }

  // 보고서 템플릿 업데이트
  async updateReportTemplate(id: string, template: UpdateReportTemplateRequest): Promise<ReportTemplate> {
    return this.client.put<ReportTemplate>(`${this.basePath}/templates/${id}`, template);
  }

  // 보고서 템플릿 삭제
  async deleteReportTemplate(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/templates/${id}`);
  }

  // 보고서 스케줄 목록 조회
  async getReportSchedules(filter?: { type?: ReportType; createdBy?: string; isActive?: boolean }): Promise<ReportSchedule[]> {
    return this.client.get<ReportSchedule[]>(`${this.basePath}/schedules`, { params: filter });
  }

  // 특정 보고서 스케줄 조회
  async getReportScheduleById(id: string): Promise<ReportSchedule> {
    return this.client.get<ReportSchedule>(`${this.basePath}/schedules/${id}`);
  }

  // 보고서 스케줄 생성
  async createReportSchedule(schedule: CreateReportScheduleRequest): Promise<ReportSchedule> {
    return this.client.post<ReportSchedule>(`${this.basePath}/schedules`, schedule);
  }

  // 보고서 스케줄 업데이트
  async updateReportSchedule(id: string, schedule: UpdateReportScheduleRequest): Promise<ReportSchedule> {
    return this.client.put<ReportSchedule>(`${this.basePath}/schedules/${id}`, schedule);
  }

  // 보고서 스케줄 삭제
  async deleteReportSchedule(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/schedules/${id}`);
  }

  // 보고서 스케줄 활성화/비활성화
  async toggleReportScheduleActive(id: string, isActive: boolean): Promise<ReportSchedule> {
    return this.client.patch<ReportSchedule>(`${this.basePath}/schedules/${id}/status`, { isActive });
  }

  // 보고서 스케줄 수동 실행
  async runReportSchedule(id: string): Promise<Report> {
    return this.client.post<Report>(`${this.basePath}/schedules/${id}/run`, {});
  }

  // 차량별 보고서 생성
  async generateVehicleReport(vehicleId: string, options: Omit<GenerateReportRequest, 'type' | 'parameters'> & { parameters?: Partial<GenerateReportRequest['parameters']> }): Promise<Report> {
    const request: GenerateReportRequest = {
      type: ReportType.VEHICLE,
      name: options.name,
      description: options.description,
      format: options.format,
      parameters: {
        ...(options.parameters || {}),
        vehicleIds: [vehicleId]
      }
    };
    return this.generateReport(request);
  }

  // 정비소별 보고서 생성
  async generateShopReport(shopId: string, options: Omit<GenerateReportRequest, 'type' | 'parameters'> & { parameters?: Partial<GenerateReportRequest['parameters']> }): Promise<Report> {
    const request: GenerateReportRequest = {
      type: ReportType.MAINTENANCE,
      name: options.name,
      description: options.description,
      format: options.format,
      parameters: {
        ...(options.parameters || {}),
        shopIds: [shopId]
      }
    };
    return this.generateReport(request);
  }
} 