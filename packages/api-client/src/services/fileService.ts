import { ApiClient } from '../client';

export enum FileCategory {
  VEHICLE_IMAGE = 'VEHICLE_IMAGE',
  MAINTENANCE_DOCUMENT = 'MAINTENANCE_DOCUMENT',
  MAINTENANCE_PHOTO = 'MAINTENANCE_PHOTO',
  REPORT = 'REPORT',
  INVOICE = 'INVOICE',
  INSURANCE = 'INSURANCE',
  USER_PROFILE = 'USER_PROFILE',
  OTHER = 'OTHER'
}

export enum FileStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED'
}

export interface FileMetadata {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  status: FileStatus;
  url?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  entityType?: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other';
  entityId?: string;
  description?: string;
  tags?: string[];
  expiresAt?: string;
}

export interface FileUploadResponse {
  success: boolean;
  files: FileMetadata[];
  failedUploads?: {
    filename: string;
    error: string;
  }[];
}

export interface FileUploadRequest {
  file: File | Blob;
  category: FileCategory;
  entityType?: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other';
  entityId?: string;
  description?: string;
  tags?: string[];
}

export interface FilesUploadRequest {
  files: File[] | Blob[];
  category: FileCategory;
  entityType?: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other';
  entityId?: string;
  description?: string;
  tags?: string[];
}

export interface FileUpdateRequest {
  filename?: string;
  category?: FileCategory;
  description?: string;
  tags?: string[];
  entityType?: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other';
  entityId?: string;
}

export interface FileFilter {
  category?: FileCategory | FileCategory[];
  status?: FileStatus;
  entityType?: string;
  entityId?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PresignedUrlResponse {
  url: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  expires: number;
}

export class FileService {
  private client: ApiClient;
  private basePath = '/files';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 파일 메타데이터 조회
  async getFiles(filter?: FileFilter): Promise<FileMetadata[]> {
    return this.client.get<FileMetadata[]>(this.basePath, { params: filter });
  }

  // 특정 파일 메타데이터 조회
  async getFileById(id: string): Promise<FileMetadata> {
    return this.client.get<FileMetadata>(`${this.basePath}/${id}`);
  }

  // 엔티티 관련 파일 목록 조회
  async getEntityFiles(
    entityType: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other',
    entityId: string,
    filter?: Omit<FileFilter, 'entityType' | 'entityId'>
  ): Promise<FileMetadata[]> {
    return this.client.get<FileMetadata[]>(`/${entityType}s/${entityId}/files`, { params: filter });
  }

  // 파일 업로드 (클라이언트 측 직접 업로드)
  async uploadFile(request: FileUploadRequest): Promise<FileMetadata> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('category', request.category);
    
    if (request.entityType) formData.append('entityType', request.entityType);
    if (request.entityId) formData.append('entityId', request.entityId);
    if (request.description) formData.append('description', request.description);
    if (request.tags) formData.append('tags', JSON.stringify(request.tags));

    return this.client.post<FileMetadata>(`${this.basePath}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 여러 파일 업로드 (클라이언트 측 직접 업로드)
  async uploadFiles(request: FilesUploadRequest): Promise<FileUploadResponse> {
    const formData = new FormData();
    
    request.files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    formData.append('category', request.category);
    
    if (request.entityType) formData.append('entityType', request.entityType);
    if (request.entityId) formData.append('entityId', request.entityId);
    if (request.description) formData.append('description', request.description);
    if (request.tags) formData.append('tags', JSON.stringify(request.tags));

    return this.client.post<FileUploadResponse>(`${this.basePath}/upload-multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // 서명된 업로드 URL 가져오기 (S3 등의 스토리지 직접 업로드용)
  async getPresignedUploadUrl(
    filename: string,
    mimeType: string,
    size: number,
    category: FileCategory,
    metadata?: {
      entityType?: string;
      entityId?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<PresignedUrlResponse> {
    return this.client.post<PresignedUrlResponse>(`${this.basePath}/presigned-upload`, {
      filename,
      mimeType,
      size,
      category,
      ...metadata
    });
  }

  // 서명된 다운로드 URL 가져오기
  async getPresignedDownloadUrl(fileId: string, expiresInSeconds: number = 300): Promise<string> {
    const response = await this.client.get<{ url: string }>(`${this.basePath}/${fileId}/download-url`, {
      params: { expiresIn: expiresInSeconds }
    });
    return response.url;
  }

  // 파일 메타데이터 업데이트
  async updateFile(id: string, updateData: FileUpdateRequest): Promise<FileMetadata> {
    return this.client.put<FileMetadata>(`${this.basePath}/${id}`, updateData);
  }

  // 파일 삭제
  async deleteFile(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 여러 파일 삭제
  async deleteFiles(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    return this.client.post<{ success: boolean; deletedCount: number }>(`${this.basePath}/delete-multiple`, { ids });
  }

  // 파일을 특정 엔티티와 연결
  async attachFileToEntity(
    fileId: string,
    entityType: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other',
    entityId: string
  ): Promise<FileMetadata> {
    return this.client.post<FileMetadata>(`${this.basePath}/${fileId}/attach`, { entityType, entityId });
  }

  // 파일과 엔티티의 연결 해제
  async detachFileFromEntity(fileId: string): Promise<FileMetadata> {
    return this.client.post<FileMetadata>(`${this.basePath}/${fileId}/detach`, {});
  }

  // 특정 정비 기록에 문서 첨부
  async attachDocumentToMaintenance(maintenanceId: string, fileId: string): Promise<FileMetadata> {
    return this.client.post<FileMetadata>(`/maintenance/${maintenanceId}/documents`, { fileId });
  }

  // 차량 이미지 업로드
  async uploadVehicleImage(vehicleId: string, imageFile: File | Blob, description?: string): Promise<FileMetadata> {
    const request: FileUploadRequest = {
      file: imageFile,
      category: FileCategory.VEHICLE_IMAGE,
      entityType: 'vehicle',
      entityId: vehicleId,
      description
    };
    return this.uploadFile(request);
  }

  // 정비 사진 업로드
  async uploadMaintenancePhotos(maintenanceId: string, photos: File[] | Blob[]): Promise<FileUploadResponse> {
    const request: FilesUploadRequest = {
      files: photos,
      category: FileCategory.MAINTENANCE_PHOTO,
      entityType: 'maintenance',
      entityId: maintenanceId
    };
    return this.uploadFiles(request);
  }
  
  // 파일 복사
  async copyFile(
    fileId: string, 
    targetEntityType?: 'vehicle' | 'maintenance' | 'shop' | 'user' | 'report' | 'invoice' | 'other',
    targetEntityId?: string
  ): Promise<FileMetadata> {
    return this.client.post<FileMetadata>(`${this.basePath}/${fileId}/copy`, {
      targetEntityType,
      targetEntityId
    });
  }
} 