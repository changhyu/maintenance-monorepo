import { ApiClient } from '../client';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  fax?: string;
}

export interface BusinessHours {
  monday: { open: string; close: string } | null;
  tuesday: { open: string; close: string } | null;
  wednesday: { open: string; close: string } | null;
  thursday: { open: string; close: string } | null;
  friday: { open: string; close: string } | null;
  saturday: { open: string; close: string } | null;
  sunday: { open: string; close: string } | null;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  location: Location;
  contactInfo: ContactInfo;
  ownerId: string;
  businessHours: BusinessHours;
  specialties?: string[];
  serviceTypes?: string[];
  ratings?: {
    average: number;
    count: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopCreateRequest {
  name: string;
  description?: string;
  location: Location;
  contactInfo: ContactInfo;
  ownerId: string;
  businessHours: BusinessHours;
  specialties?: string[];
  serviceTypes?: string[];
}

export interface ShopUpdateRequest {
  name?: string;
  description?: string;
  location?: Partial<Location>;
  contactInfo?: Partial<ContactInfo>;
  businessHours?: Partial<BusinessHours>;
  specialties?: string[];
  serviceTypes?: string[];
  isActive?: boolean;
}

export interface ShopSearchParams {
  name?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  specialties?: string[];
  serviceTypes?: string[];
  isActive?: boolean;
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShopReview {
  id: string;
  shopId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopReviewCreateRequest {
  shopId: string;
  userId: string;
  rating: number;
  comment?: string;
}

export interface ShopReviewUpdateRequest {
  rating?: number;
  comment?: string;
}

export class ShopService {
  private client: ApiClient;
  private basePath = '/shops';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 모든 정비소 조회
  async getAllShops(params?: ShopSearchParams): Promise<Shop[]> {
    return this.client.get<Shop[]>(this.basePath, { params });
  }

  // 특정 정비소 조회
  async getShopById(id: string): Promise<Shop> {
    return this.client.get<Shop>(`${this.basePath}/${id}`);
  }

  // 정비소 생성
  async createShop(shopData: ShopCreateRequest): Promise<Shop> {
    return this.client.post<Shop>(this.basePath, shopData);
  }

  // 정비소 정보 업데이트
  async updateShop(id: string, shopData: ShopUpdateRequest): Promise<Shop> {
    return this.client.put<Shop>(`${this.basePath}/${id}`, shopData);
  }

  // 정비소 삭제
  async deleteShop(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 정비소 활성화/비활성화
  async toggleShopActive(id: string, isActive: boolean): Promise<Shop> {
    return this.client.patch<Shop>(`${this.basePath}/${id}/status`, { isActive });
  }

  // 특정 지역의 정비소 검색
  async searchNearbyShops(latitude: number, longitude: number, radiusKm: number): Promise<Shop[]> {
    return this.client.get<Shop[]>(`${this.basePath}/nearby`, { 
      params: { latitude, longitude, radiusKm }
    });
  }

  // 정비소 리뷰 조회
  async getShopReviews(shopId: string): Promise<ShopReview[]> {
    return this.client.get<ShopReview[]>(`${this.basePath}/${shopId}/reviews`);
  }

  // 정비소 리뷰 추가
  async addShopReview(reviewData: ShopReviewCreateRequest): Promise<ShopReview> {
    return this.client.post<ShopReview>(`${this.basePath}/${reviewData.shopId}/reviews`, reviewData);
  }

  // 정비소 리뷰 수정
  async updateShopReview(shopId: string, reviewId: string, reviewData: ShopReviewUpdateRequest): Promise<ShopReview> {
    return this.client.put<ShopReview>(`${this.basePath}/${shopId}/reviews/${reviewId}`, reviewData);
  }

  // 정비소 리뷰 삭제
  async deleteShopReview(shopId: string, reviewId: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${shopId}/reviews/${reviewId}`);
  }

  // 특정 사용자의 정비소 조회
  async getUserShops(userId: string): Promise<Shop[]> {
    return this.client.get<Shop[]>(`/users/${userId}/shops`);
  }
} 