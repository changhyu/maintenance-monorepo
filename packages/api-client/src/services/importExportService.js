export var ImportExportFormat;
(function (ImportExportFormat) {
    ImportExportFormat["CSV"] = "csv";
    ImportExportFormat["EXCEL"] = "excel";
    ImportExportFormat["JSON"] = "json";
    ImportExportFormat["XML"] = "xml";
    ImportExportFormat["PDF"] = "pdf";
})(ImportExportFormat || (ImportExportFormat = {}));
export var ImportExportEntityType;
(function (ImportExportEntityType) {
    ImportExportEntityType["VEHICLE"] = "vehicle";
    ImportExportEntityType["MAINTENANCE"] = "maintenance";
    ImportExportEntityType["SHOP"] = "shop";
    ImportExportEntityType["USER"] = "user";
    ImportExportEntityType["REPORT"] = "report";
    ImportExportEntityType["INVOICE"] = "invoice";
    ImportExportEntityType["BOOKING"] = "booking";
    ImportExportEntityType["EXPENSE"] = "expense";
    ImportExportEntityType["TODO"] = "todo";
    ImportExportEntityType["TELEMETRY"] = "telemetry";
    ImportExportEntityType["SETTINGS"] = "settings";
    ImportExportEntityType["ALL"] = "all";
})(ImportExportEntityType || (ImportExportEntityType = {}));
export var ImportStatus;
(function (ImportStatus) {
    ImportStatus["PENDING"] = "pending";
    ImportStatus["PROCESSING"] = "processing";
    ImportStatus["COMPLETED"] = "completed";
    ImportStatus["FAILED"] = "failed";
    ImportStatus["PARTIALLY_COMPLETED"] = "partially_completed";
    ImportStatus["CANCELLED"] = "cancelled";
})(ImportStatus || (ImportStatus = {}));
export class ImportExportService {
    constructor(apiClient) {
        this.importPath = '/import';
        this.exportPath = '/export';
        this.templatesPath = '/import-templates';
        this.mappingsPath = '/column-mappings';
        this.migrationsPath = '/data-migrations';
        this.client = apiClient;
    }
    // 가져오기 관련 메서드
    // 파일 가져오기
    async importFile(options) {
        const formData = new FormData();
        formData.append('file', options.file);
        formData.append('entityType', options.entityType);
        if (options.format) {
            formData.append('format', options.format);
        }
        if (options.skipFirstRow !== undefined) {
            formData.append('skipFirstRow', options.skipFirstRow.toString());
        }
        if (options.validationOnly !== undefined) {
            formData.append('validationOnly', options.validationOnly.toString());
        }
        if (options.updateExisting !== undefined) {
            formData.append('updateExisting', options.updateExisting.toString());
        }
        if (options.identifierField) {
            formData.append('identifierField', options.identifierField);
        }
        if (options.batchSize) {
            formData.append('batchSize', options.batchSize.toString());
        }
        if (options.notifyOnCompletion !== undefined) {
            formData.append('notifyOnCompletion', options.notifyOnCompletion.toString());
        }
        if (options.columnMapping) {
            formData.append('columnMapping', JSON.stringify(options.columnMapping));
        }
        if (options.additionalData) {
            formData.append('additionalData', JSON.stringify(options.additionalData));
        }
        return this.client.post(`${this.importPath}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 가져오기 작업 상태 조회
    async getImportStatus(importId) {
        return this.client.get(`${this.importPath}/${importId}`);
    }
    // 가져오기 작업 취소
    async cancelImport(importId) {
        return this.client.post(`${this.importPath}/${importId}/cancel`, {});
    }
    // 가져오기 작업 목록 조회
    async getImportHistory(page = 1, limit = 20, filters) {
        return this.client.get(`${this.importPath}/history`, {
            params: {
                page,
                limit,
                ...filters
            }
        });
    }
    // 가져오기 오류 로그 다운로드
    async downloadImportErrorLog(importId) {
        return this.client.get(`${this.importPath}/${importId}/error-log`, {
            responseType: 'blob'
        });
    }
    // 내보내기 관련 메서드
    // 데이터 내보내기
    async exportData(options) {
        return this.client.post(`${this.exportPath}`, options);
    }
    // 내보내기 파일 다운로드
    async downloadExport(exportId) {
        return this.client.get(`${this.exportPath}/${exportId}/download`, {
            responseType: 'blob'
        });
    }
    // 내보내기 작업 목록 조회
    async getExportHistory(page = 1, limit = 20, filters) {
        return this.client.get(`${this.exportPath}/history`, {
            params: {
                page,
                limit,
                ...filters
            }
        });
    }
    // 차량 데이터 내보내기
    async exportVehicles(format, filters, options) {
        return this.exportData({
            entityType: ImportExportEntityType.VEHICLE,
            format,
            filters,
            ...options
        });
    }
    // 정비 데이터 내보내기
    async exportMaintenance(format, filters, options) {
        return this.exportData({
            entityType: ImportExportEntityType.MAINTENANCE,
            format,
            filters,
            ...options
        });
    }
    // 템플릿 관련 메서드
    // 가져오기 템플릿 목록 조회
    async getImportTemplates(entityType) {
        return this.client.get(this.templatesPath, {
            params: { entityType }
        });
    }
    // 가져오기 템플릿 상세 조회
    async getImportTemplate(templateId) {
        return this.client.get(`${this.templatesPath}/${templateId}`);
    }
    // 템플릿 샘플 파일 다운로드
    async downloadTemplateSample(templateId, format = ImportExportFormat.CSV) {
        return this.client.get(`${this.templatesPath}/${templateId}/sample`, {
            params: { format },
            responseType: 'blob'
        });
    }
    // 커스텀 가져오기 템플릿 생성
    async createImportTemplate(template) {
        return this.client.post(this.templatesPath, template);
    }
    // 가져오기 템플릿 업데이트
    async updateImportTemplate(templateId, updates) {
        return this.client.put(`${this.templatesPath}/${templateId}`, updates);
    }
    // 가져오기 템플릿 삭제
    async deleteImportTemplate(templateId) {
        return this.client.delete(`${this.templatesPath}/${templateId}`);
    }
    // 컬럼 매핑 관련 메서드
    // 컬럼 매핑 템플릿 목록 조회
    async getColumnMappingTemplates(entityType, format) {
        return this.client.get(this.mappingsPath, {
            params: { entityType, format }
        });
    }
    // 컬럼 매핑 템플릿 생성
    async createColumnMappingTemplate(template) {
        return this.client.post(this.mappingsPath, template);
    }
    // 컬럼 매핑 템플릿 업데이트
    async updateColumnMappingTemplate(templateId, updates) {
        return this.client.put(`${this.mappingsPath}/${templateId}`, updates);
    }
    // 컬럼 매핑 템플릿 삭제
    async deleteColumnMappingTemplate(templateId) {
        return this.client.delete(`${this.mappingsPath}/${templateId}`);
    }
    // 기본 컬럼 매핑 템플릿 설정
    async setDefaultColumnMappingTemplate(templateId) {
        return this.client.post(`${this.mappingsPath}/${templateId}/set-default`, {});
    }
    // 컬럼 매핑 추천
    async suggestColumnMapping(entityType, file, format) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        if (format) {
            formData.append('format', format);
        }
        return this.client.post(`${this.mappingsPath}/suggest`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 데이터 마이그레이션 관련 메서드
    // 데이터 마이그레이션 설정 목록 조회
    async getDataMigrationConfigs() {
        return this.client.get(this.migrationsPath);
    }
    // 데이터 마이그레이션 설정 상세 조회
    async getDataMigrationConfig(configId) {
        return this.client.get(`${this.migrationsPath}/${configId}`);
    }
    // 데이터 마이그레이션 설정 생성
    async createDataMigrationConfig(config) {
        return this.client.post(this.migrationsPath, config);
    }
    // 데이터 마이그레이션 설정 업데이트
    async updateDataMigrationConfig(configId, updates) {
        return this.client.put(`${this.migrationsPath}/${configId}`, updates);
    }
    // 데이터 마이그레이션 설정 삭제
    async deleteDataMigrationConfig(configId) {
        return this.client.delete(`${this.migrationsPath}/${configId}`);
    }
    // 데이터 마이그레이션 실행
    async runDataMigration(configId, options) {
        return this.client.post(`${this.migrationsPath}/${configId}/run`, options || {});
    }
    // 데이터 마이그레이션 상태 조회
    async getDataMigrationStatus(migrationId) {
        return this.client.get(`${this.migrationsPath}/results/${migrationId}`);
    }
    // 데이터 마이그레이션 취소
    async cancelDataMigration(migrationId) {
        return this.client.post(`${this.migrationsPath}/results/${migrationId}/cancel`, {});
    }
    // 데이터 마이그레이션 결과 목록 조회
    async getDataMigrationResults(page = 1, limit = 20, configId) {
        return this.client.get(`${this.migrationsPath}/results`, {
            params: {
                page,
                limit,
                configId
            }
        });
    }
    // 유틸리티 메서드
    // 파일 유효성 검사
    async validateFile(entityType, file, options) {
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
        return this.client.post(`${this.importPath}/validate`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 데이터 복사/이동
    async copyOrMoveData(sourceType, targetType, ids, options) {
        return this.client.post(`${this.importPath}/copy-move`, {
            sourceType,
            targetType,
            ids,
            ...options
        });
    }
    // 데이터 백업
    async backupData(entityTypes, format = ImportExportFormat.JSON, options) {
        return this.client.post(`${this.exportPath}/backup`, {
            entityTypes,
            format,
            ...options
        });
    }
    // 데이터 복원
    async restoreData(backupFile, options) {
        const formData = new FormData();
        formData.append('backupFile', backupFile);
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                if (key === 'entityTypes') {
                    formData.append(key, JSON.stringify(value));
                }
                else {
                    formData.append(key, String(value));
                }
            });
        }
        return this.client.post(`${this.importPath}/restore`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
}
