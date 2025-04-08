import { ApiClient } from '../client';

export enum ImportExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  XML = 'xml',
  PDF = 'pdf'
}

export enum ImportExportEntityType {
  VEHICLE = 'vehicle',
  MAINTENANCE = 'maintenance',
  SHOP = 'shop',
  USER = 'user',
  REPORT = 'report',
  INVOICE = 'invoice',
  BOOKING = 'booking',
  EXPENSE = 'expense',
  TODO = 'todo',
  TELEMETRY = 'telemetry',
  SETTINGS = 'settings',
  ALL = 'all'
}

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIALLY_COMPLETED = 'partially_completed',
  CANCELLED = 'cancelled'
}

export interface ImportResult {
  id: string;
  entityType: ImportExportEntityType;
  format: ImportExportFormat;
  filename: string;
  status: ImportStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors?: Array<{
    row?: number;
    column?: string;
    message: string;
    data?: any;
  }>;
  warnings?: Array<{
    row?: number;
    column?: string;
    message: string;
    data?: any;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userId: string;
  importedIds?: string[];
  logs?: string[];
  duration?: number;
  validationOnly?: boolean;
}

export interface ExportResult {
  id: string;
  entityType: ImportExportEntityType;
  format: ImportExportFormat;
  filename: string;
  url: string;
  totalRecords: number;
  fileSize: number;
  filters?: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
  userId: string;
  duration?: number;
}

export interface ImportOptions {
  entityType: ImportExportEntityType;
  format?: ImportExportFormat;
  file: File | Blob;
  filename?: string;
  skipFirstRow?: boolean;
  columnMapping?: Record<string, string>;
  validationOnly?: boolean;
  updateExisting?: boolean;
  identifierField?: string;
  batchSize?: number;
  notifyOnCompletion?: boolean;
  additionalData?: Record<string, any>;
}

export interface ExportOptions {
  entityType: ImportExportEntityType;
  format: ImportExportFormat;
  filters?: Record<string, any>;
  includeRelations?: string[];
  customFields?: string[];
  excludeFields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filename?: string;
  password?: string;
  pageSize?: number;
  maxRecords?: number;
  notifyOnCompletion?: boolean;
}

export interface ColumnMappingTemplate {
  id: string;
  name: string;
  entityType: ImportExportEntityType;
  format: ImportExportFormat;
  mapping: Record<string, string>;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface DataMigrationConfig {
  id?: string;
  name: string;
  description?: string;
  sourceType: 'csv' | 'excel' | 'json' | 'api' | 'database';
  sourceConfig: {
    fileUrl?: string;
    apiEndpoint?: string;
    connectionString?: string;
    credentials?: Record<string, string>;
    options?: Record<string, any>;
  };
  targetEntities: Array<{
    entityType: ImportExportEntityType;
    mappingRules: Record<string, string | ((sourceData: any) => any)>;
    validationRules?: Record<string, (value: any) => boolean | string>;
    dependencies?: Array<{
      entityType: ImportExportEntityType;
      lookupField: string;
    }>;
  }>;
  schedule?: {
    type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate?: string;
    time?: string;
    weekDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    dayOfMonth?: number;
  };
  status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  options?: {
    skipExisting?: boolean;
    batchSize?: number;
    notifyOnCompletion?: boolean;
    rollbackOnFailure?: boolean;
    maxRetries?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  userId: string;
}

export interface DataMigrationResult {
  id: string;
  configId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stats: Record<ImportExportEntityType, {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  }>;
  errors?: Array<{
    entityType: ImportExportEntityType;
    sourceIndex?: number;
    message: string;
    data?: any;
  }>;
  logs?: string[];
  duration?: number;
}

export interface TemplateField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object' | 'array';
  required: boolean;
  description?: string;
  enumValues?: string[];
  defaultValue?: any;
  example?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ImportTemplate {
  id: string;
  entityType: ImportExportEntityType;
  name: string;
  description?: string;
  format: ImportExportFormat;
  fields: TemplateField[];
  sampleFileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export class ImportExportService {
  private client: ApiClient;
  private importPath = '/import';
  private exportPath = '/export';
  private templatesPath = '/import-templates';
  private mappingsPath = '/column-mappings';
  private migrationsPath = '/data-migrations';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 가져오기 관련 메서드

  // 파일 가져오기
  async importFile(options: ImportOptions): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', options.file);
    formData.append('entityType', options.entityType);
    
    if (options.format) formData.append('format', options.format);
    if (options.skipFirstRow !== undefined) formData.append('skipFirstRow', options.skipFirstRow.toString());
    if (options.validationOnly !== undefined) formData.append('validationOnly', options.validationOnly.toString());
    if (options.updateExisting !== undefined) formData.append('updateExisting', options.updateExisting.toString());
    if (options.identifierField) formData.append('identifierField', options.identifierField);
    if (options.batchSize) formData.append('batchSize', options.batchSize.toString());
    if (options.notifyOnCompletion !== undefined) formData.append('notifyOnCompletion', options.notifyOnCompletion.toString());
    
    if (options.columnMapping) {
      formData.append('columnMapping', JSON.stringify(options.columnMapping));
    }
    
    if (options.additionalData) {
      formData.append('additionalData', JSON.stringify(options.additionalData));
    }

    return this.client.post<ImportResult>(`${this.importPath}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 가져오기 작업 상태 조회
  async getImportStatus(importId: string): Promise<ImportResult> {
    return this.client.get<ImportResult>(`${this.importPath}/${importId}`);
  }

  // 가져오기 작업 취소
  async cancelImport(importId: string): Promise<{ success: boolean; message: string }> {
    return this.client.post<{ success: boolean; message: string }>(`${this.importPath}/${importId}/cancel`, {});
  }

  // 가져오기 작업 목록 조회
  async getImportHistory(
    page: number = 1,
    limit: number = 20,
    filters?: {
      entityType?: ImportExportEntityType;
      status?: ImportStatus;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    results: ImportResult[];
  }> {
    return this.client.get<{
      total: number;
      page: number;
      limit: number;
      results: ImportResult[];
    }>(`${this.importPath}/history`, {
      params: {
        page,
        limit,
        ...filters
      }
    });
  }

  // 가져오기 오류 로그 다운로드
  async downloadImportErrorLog(importId: string): Promise<Blob> {
    return this.client.get<Blob>(`${this.importPath}/${importId}/error-log`, {
      responseType: 'blob'
    });
  }

  // 내보내기 관련 메서드

  // 데이터 내보내기
  async exportData(options: ExportOptions): Promise<ExportResult> {
    return this.client.post<ExportResult>(`${this.exportPath}`, options);
  }

  // 내보내기 파일 다운로드
  async downloadExport(exportId: string): Promise<Blob> {
    return this.client.get<Blob>(`${this.exportPath}/${exportId}/download`, {
      responseType: 'blob'
    });
  }

  // 내보내기 작업 목록 조회
  async getExportHistory(
    page: number = 1,
    limit: number = 20,
    filters?: {
      entityType?: ImportExportEntityType;
      format?: ImportExportFormat;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    results: ExportResult[];
  }> {
    return this.client.get<{
      total: number;
      page: number;
      limit: number;
      results: ExportResult[];
    }>(`${this.exportPath}/history`, {
      params: {
        page,
        limit,
        ...filters
      }
    });
  }

  // 차량 데이터 내보내기
  async exportVehicles(
    format: ImportExportFormat,
    filters?: Record<string, any>,
    options?: Omit<ExportOptions, 'entityType' | 'format'>
  ): Promise<ExportResult> {
    return this.exportData({
      entityType: ImportExportEntityType.VEHICLE,
      format,
      filters,
      ...options
    });
  }

  // 정비 데이터 내보내기
  async exportMaintenance(
    format: ImportExportFormat,
    filters?: Record<string, any>,
    options?: Omit<ExportOptions, 'entityType' | 'format'>
  ): Promise<ExportResult> {
    return this.exportData({
      entityType: ImportExportEntityType.MAINTENANCE,
      format,
      filters,
      ...options
    });
  }

  // 템플릿 관련 메서드

  // 가져오기 템플릿 목록 조회
  async getImportTemplates(
    entityType?: ImportExportEntityType
  ): Promise<ImportTemplate[]> {
    return this.client.get<ImportTemplate[]>(this.templatesPath, {
      params: { entityType }
    });
  }

  // 가져오기 템플릿 상세 조회
  async getImportTemplate(templateId: string): Promise<ImportTemplate> {
    return this.client.get<ImportTemplate>(`${this.templatesPath}/${templateId}`);
  }

  // 템플릿 샘플 파일 다운로드
  async downloadTemplateSample(
    templateId: string,
    format: ImportExportFormat = ImportExportFormat.CSV
  ): Promise<Blob> {
    return this.client.get<Blob>(`${this.templatesPath}/${templateId}/sample`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // 커스텀 가져오기 템플릿 생성
  async createImportTemplate(template: Omit<ImportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImportTemplate> {
    return this.client.post<ImportTemplate>(this.templatesPath, template);
  }

  // 가져오기 템플릿 업데이트
  async updateImportTemplate(
    templateId: string,
    updates: Partial<Omit<ImportTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ImportTemplate> {
    return this.client.put<ImportTemplate>(`${this.templatesPath}/${templateId}`, updates);
  }

  // 가져오기 템플릿 삭제
  async deleteImportTemplate(templateId: string): Promise<void> {
    return this.client.delete(`${this.templatesPath}/${templateId}`);
  }

  // 컬럼 매핑 관련 메서드

  // 컬럼 매핑 템플릿 목록 조회
  async getColumnMappingTemplates(
    entityType?: ImportExportEntityType,
    format?: ImportExportFormat
  ): Promise<ColumnMappingTemplate[]> {
    return this.client.get<ColumnMappingTemplate[]>(this.mappingsPath, {
      params: { entityType, format }
    });
  }

  // 컬럼 매핑 템플릿 생성
  async createColumnMappingTemplate(
    template: Omit<ColumnMappingTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ColumnMappingTemplate> {
    return this.client.post<ColumnMappingTemplate>(this.mappingsPath, template);
  }

  // 컬럼 매핑 템플릿 업데이트
  async updateColumnMappingTemplate(
    templateId: string,
    updates: Partial<Omit<ColumnMappingTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ColumnMappingTemplate> {
    return this.client.put<ColumnMappingTemplate>(`${this.mappingsPath}/${templateId}`, updates);
  }

  // 컬럼 매핑 템플릿 삭제
  async deleteColumnMappingTemplate(templateId: string): Promise<void> {
    return this.client.delete(`${this.mappingsPath}/${templateId}`);
  }

  // 기본 컬럼 매핑 템플릿 설정
  async setDefaultColumnMappingTemplate(templateId: string): Promise<ColumnMappingTemplate> {
    return this.client.post<ColumnMappingTemplate>(`${this.mappingsPath}/${templateId}/set-default`, {});
  }

  // 컬럼 매핑 추천
  async suggestColumnMapping(
    entityType: ImportExportEntityType,
    file: File,
    format?: ImportExportFormat
  ): Promise<Record<string, string>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    if (format) formData.append('format', format);

    return this.client.post<Record<string, string>>(`${this.mappingsPath}/suggest`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 데이터 마이그레이션 관련 메서드

  // 데이터 마이그레이션 설정 목록 조회
  async getDataMigrationConfigs(): Promise<DataMigrationConfig[]> {
    return this.client.get<DataMigrationConfig[]>(this.migrationsPath);
  }

  // 데이터 마이그레이션 설정 상세 조회
  async getDataMigrationConfig(configId: string): Promise<DataMigrationConfig> {
    return this.client.get<DataMigrationConfig>(`${this.migrationsPath}/${configId}`);
  }

  // 데이터 마이그레이션 설정 생성
  async createDataMigrationConfig(
    config: Omit<DataMigrationConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DataMigrationConfig> {
    return this.client.post<DataMigrationConfig>(this.migrationsPath, config);
  }

  // 데이터 마이그레이션 설정 업데이트
  async updateDataMigrationConfig(
    configId: string,
    updates: Partial<Omit<DataMigrationConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<DataMigrationConfig> {
    return this.client.put<DataMigrationConfig>(`${this.migrationsPath}/${configId}`, updates);
  }

  // 데이터 마이그레이션 설정 삭제
  async deleteDataMigrationConfig(configId: string): Promise<void> {
    return this.client.delete(`${this.migrationsPath}/${configId}`);
  }

  // 데이터 마이그레이션 실행
  async runDataMigration(
    configId: string,
    options?: {
      dryRun?: boolean;
      batchSize?: number;
      notifyOnCompletion?: boolean;
    }
  ): Promise<DataMigrationResult> {
    return this.client.post<DataMigrationResult>(`${this.migrationsPath}/${configId}/run`, options || {});
  }

  // 데이터 마이그레이션 상태 조회
  async getDataMigrationStatus(migrationId: string): Promise<DataMigrationResult> {
    return this.client.get<DataMigrationResult>(`${this.migrationsPath}/results/${migrationId}`);
  }

  // 데이터 마이그레이션 취소
  async cancelDataMigration(migrationId: string): Promise<{ success: boolean; message: string }> {
    return this.client.post<{ success: boolean; message: string }>(`${this.migrationsPath}/results/${migrationId}/cancel`, {});
  }

  // 데이터 마이그레이션 결과 목록 조회
  async getDataMigrationResults(
    page: number = 1,
    limit: number = 20,
    configId?: string
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    results: DataMigrationResult[];
  }> {
    return this.client.get<{
      total: number;
      page: number;
      limit: number;
      results: DataMigrationResult[];
    }>(`${this.migrationsPath}/results`, {
      params: {
        page,
        limit,
        configId
      }
    });
  }

  // 유틸리티 메서드

  // 파일 유효성 검사
  async validateFile(
    entityType: ImportExportEntityType,
    file: File,
    options?: {
      columnMapping?: Record<string, string>;
      skipFirstRow?: boolean;
      maxRecords?: number;
    }
  ): Promise<{
    valid: boolean;
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    errors: Array<{
      row: number;
      column?: string;
      message: string;
      value?: any;
    }>;
    warnings: Array<{
      row: number;
      column?: string;
      message: string;
      value?: any;
    }>;
    sampleData?: any[];
    detectedColumns?: string[];
    suggestedMapping?: Record<string, string>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    
    if (options?.columnMapping) {
      formData.append('columnMapping', JSON.stringify(options.columnMapping));
    }
    
    if (options?.skipFirstRow !== undefined) {
      formData.append('skipFirstRow', options.skipFirstRow.toString());
    }
    
    if (options?.maxRecords) {
      formData.append('maxRecords', options.maxRecords.toString());
    }

    return this.client.post<{
      valid: boolean;
      totalRecords: number;
      validRecords: number;
      invalidRecords: number;
      errors: Array<{
        row: number;
        column?: string;
        message: string;
        value?: any;
      }>;
      warnings: Array<{
        row: number;
        column?: string;
        message: string;
        value?: any;
      }>;
      sampleData?: any[];
      detectedColumns?: string[];
      suggestedMapping?: Record<string, string>;
    }>(`${this.importPath}/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 데이터 복사/이동
  async copyOrMoveData(
    sourceType: ImportExportEntityType,
    targetType: ImportExportEntityType,
    ids: string[],
    options: {
      operation: 'copy' | 'move';
      mappingRules?: Record<string, string | ((source: any) => any)>;
      additionalData?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    sourceCount: number;
    targetCount: number;
    targetIds: string[];
    errors?: Array<{
      sourceId: string;
      message: string;
    }>;
  }> {
    return this.client.post<{
      success: boolean;
      sourceCount: number;
      targetCount: number;
      targetIds: string[];
      errors?: Array<{
        sourceId: string;
        message: string;
      }>;
    }>(`${this.importPath}/copy-move`, {
      sourceType,
      targetType,
      ids,
      ...options
    });
  }

  // 데이터 백업
  async backupData(
    entityTypes: ImportExportEntityType[],
    format: ImportExportFormat = ImportExportFormat.JSON,
    options?: {
      includeRelations?: boolean;
      includeAttachments?: boolean;
      password?: string;
      filename?: string;
      compressionLevel?: 'none' | 'low' | 'medium' | 'high';
    }
  ): Promise<{
    success: boolean;
    backupId: string;
    downloadUrl: string;
    expiresAt: string;
    stats: Record<ImportExportEntityType, { count: number }>;
  }> {
    return this.client.post<{
      success: boolean;
      backupId: string;
      downloadUrl: string;
      expiresAt: string;
      stats: Record<ImportExportEntityType, { count: number }>;
    }>(`${this.exportPath}/backup`, {
      entityTypes,
      format,
      ...options
    });
  }

  // 데이터 복원
  async restoreData(
    backupFile: File,
    options?: {
      entityTypes?: ImportExportEntityType[];
      password?: string;
      conflictStrategy?: 'skip' | 'overwrite' | 'rename';
      resetIds?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{
    success: boolean;
    restoreId: string;
    stats: Record<ImportExportEntityType, {
      total: number;
      restored: number;
      skipped: number;
      failed: number;
    }>;
    errors?: Array<{
      entityType: ImportExportEntityType;
      id?: string;
      message: string;
    }>;
  }> {
    const formData = new FormData();
    formData.append('backupFile', backupFile);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (key === 'entityTypes') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
    }

    return this.client.post<{
      success: boolean;
      restoreId: string;
      stats: Record<ImportExportEntityType, {
        total: number;
        restored: number;
        skipped: number;
        failed: number;
      }>;
      errors?: Array<{
        entityType: ImportExportEntityType;
        id?: string;
        message: string;
      }>;
    }>(`${this.importPath}/restore`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
} 