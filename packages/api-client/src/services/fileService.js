export var FileCategory;
(function (FileCategory) {
    FileCategory["VEHICLE_IMAGE"] = "VEHICLE_IMAGE";
    FileCategory["MAINTENANCE_DOCUMENT"] = "MAINTENANCE_DOCUMENT";
    FileCategory["MAINTENANCE_PHOTO"] = "MAINTENANCE_PHOTO";
    FileCategory["REPORT"] = "REPORT";
    FileCategory["INVOICE"] = "INVOICE";
    FileCategory["INSURANCE"] = "INSURANCE";
    FileCategory["USER_PROFILE"] = "USER_PROFILE";
    FileCategory["OTHER"] = "OTHER";
})(FileCategory || (FileCategory = {}));
export var FileStatus;
(function (FileStatus) {
    FileStatus["PENDING"] = "PENDING";
    FileStatus["ACTIVE"] = "ACTIVE";
    FileStatus["DELETED"] = "DELETED";
})(FileStatus || (FileStatus = {}));
export class FileService {
    constructor(apiClient) {
        this.basePath = '/files';
        this.client = apiClient;
    }
    // 파일 메타데이터 조회
    async getFiles(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 특정 파일 메타데이터 조회
    async getFileById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 엔티티 관련 파일 목록 조회
    async getEntityFiles(entityType, entityId, filter) {
        return this.client.get(`/${entityType}s/${entityId}/files`, { params: filter });
    }
    // 파일 업로드 (클라이언트 측 직접 업로드)
    async uploadFile(request) {
        const formData = new FormData();
        formData.append('file', request.file);
        formData.append('category', request.category);
        if (request.entityType) {
            formData.append('entityType', request.entityType);
        }
        if (request.entityId) {
            formData.append('entityId', request.entityId);
        }
        if (request.description) {
            formData.append('description', request.description);
        }
        if (request.tags) {
            formData.append('tags', JSON.stringify(request.tags));
        }
        return this.client.post(`${this.basePath}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 여러 파일 업로드 (클라이언트 측 직접 업로드)
    async uploadFiles(request) {
        const formData = new FormData();
        request.files.forEach((file, index) => {
            formData.append(`files[${index}]`, file);
        });
        formData.append('category', request.category);
        if (request.entityType) {
            formData.append('entityType', request.entityType);
        }
        if (request.entityId) {
            formData.append('entityId', request.entityId);
        }
        if (request.description) {
            formData.append('description', request.description);
        }
        if (request.tags) {
            formData.append('tags', JSON.stringify(request.tags));
        }
        return this.client.post(`${this.basePath}/upload-multiple`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    // 서명된 업로드 URL 가져오기 (S3 등의 스토리지 직접 업로드용)
    async getPresignedUploadUrl(filename, mimeType, size, category, metadata) {
        return this.client.post(`${this.basePath}/presigned-upload`, {
            filename,
            mimeType,
            size,
            category,
            ...metadata
        });
    }
    // 서명된 다운로드 URL 가져오기
    async getPresignedDownloadUrl(fileId, expiresInSeconds = 300) {
        const response = await this.client.get(`${this.basePath}/${fileId}/download-url`, {
            params: { expiresIn: expiresInSeconds }
        });
        return response.url;
    }
    // 파일 메타데이터 업데이트
    async updateFile(id, updateData) {
        return this.client.put(`${this.basePath}/${id}`, updateData);
    }
    // 파일 삭제
    async deleteFile(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 여러 파일 삭제
    async deleteFiles(ids) {
        return this.client.post(`${this.basePath}/delete-multiple`, { ids });
    }
    // 파일을 특정 엔티티와 연결
    async attachFileToEntity(fileId, entityType, entityId) {
        return this.client.post(`${this.basePath}/${fileId}/attach`, { entityType, entityId });
    }
    // 파일과 엔티티의 연결 해제
    async detachFileFromEntity(fileId) {
        return this.client.post(`${this.basePath}/${fileId}/detach`, {});
    }
    // 특정 정비 기록에 문서 첨부
    async attachDocumentToMaintenance(maintenanceId, fileId) {
        return this.client.post(`/maintenance/${maintenanceId}/documents`, { fileId });
    }
    // 차량 이미지 업로드
    async uploadVehicleImage(vehicleId, imageFile, description) {
        const request = {
            file: imageFile,
            category: FileCategory.VEHICLE_IMAGE,
            entityType: 'vehicle',
            entityId: vehicleId,
            description
        };
        return this.uploadFile(request);
    }
    // 정비 사진 업로드
    async uploadMaintenancePhotos(maintenanceId, photos) {
        const request = {
            files: photos,
            category: FileCategory.MAINTENANCE_PHOTO,
            entityType: 'maintenance',
            entityId: maintenanceId
        };
        return this.uploadFiles(request);
    }
    // 파일 복사
    async copyFile(fileId, targetEntityType, targetEntityId) {
        return this.client.post(`${this.basePath}/${fileId}/copy`, {
            targetEntityType,
            targetEntityId
        });
    }
}
