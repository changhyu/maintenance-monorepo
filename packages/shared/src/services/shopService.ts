import { api } from '../utils/api';
import { Shop, ShopCreate, ShopFilter, ShopReview, ShopUpdate } from '../types/shop';

/**
 * 정비소 관련 API 서비스
 */
export const shopService = {
  /**
   * 정비소 목록 조회
   * @param filter 필터 옵션
   * @returns 정비소 목록
   */
  async getShops(filter?: ShopFilter): Promise<Shop[]> {
    const params = filter ? { ...filter } : {};
    const response = await api.get('/shops', { params });
    return response.data;
  },

  /**
   * 정비소 상세 조회
   * @param shopId 정비소 ID
   * @returns 정비소 정보
   */
  async getShopById(shopId: string): Promise<Shop> {
    const response = await api.get(`/shops/${shopId}`);
    return response.data;
  },

  /**
   * 정비소 생성
   * @param shopData 정비소 생성 데이터
   * @returns 생성된 정비소 정보
   */
  async createShop(shopData: ShopCreate): Promise<Shop> {
    const response = await api.post('/shops', shopData);
    return response.data;
  },

  /**
   * 정비소 정보 업데이트
   * @param shopId 정비소 ID
   * @param updateData 업데이트할 정보
   * @returns 업데이트된 정비소 정보
   */
  async updateShop(shopId: string, updateData: ShopUpdate): Promise<Shop> {
    const response = await api.put(`/shops/${shopId}`, updateData);
    return response.data;
  },

  /**
   * 정비소 삭제
   * @param shopId 정비소 ID
   * @returns 삭제 성공 여부
   */
  async deleteShop(shopId: string): Promise<boolean> {
    const response = await api.delete(`/shops/${shopId}`);
    return response.data.success;
  },

  /**
   * 정비소 리뷰 목록 조회
   * @param shopId 정비소 ID
   * @param params 조회 옵션 (페이지, 정렬 등)
   * @returns 리뷰 목록
   */
  async getShopReviews(shopId: string, params?: { page?: number; limit?: number; sort?: string }): Promise<ShopReview[]> {
    const response = await api.get(`/shops/${shopId}/reviews`, { params });
    return response.data;
  },

  /**
   * 정비소 리뷰 작성
   * @param shopId 정비소 ID
   * @param reviewData 리뷰 데이터
   * @returns 생성된 리뷰 정보
   */
  async createShopReview(shopId: string, reviewData: Omit<ShopReview, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>): Promise<ShopReview> {
    const response = await api.post(`/shops/${shopId}/reviews`, reviewData);
    return response.data;
  },

  /**
   * 근처 정비소 찾기
   * @param latitude 위도
   * @param longitude 경도
   * @param radius 반경 (km)
   * @param filter 필터 옵션
   * @returns 정비소 목록
   */
  async findNearbyShops(latitude: number, longitude: number, radius: number = 10, filter?: Partial<ShopFilter>): Promise<Shop[]> {
    const params = { latitude, longitude, radius, ...filter };
    const response = await api.get('/shops/nearby', { params });
    return response.data;
  },

  /**
   * 추천 정비소 목록 조회
   * @param limit 조회할 정비소 수
   * @returns 추천 정비소 목록
   */
  async getFeaturedShops(limit: number = 5): Promise<Shop[]> {
    const response = await api.get('/shops/featured', { params: { limit } });
    return response.data;
  },

  /**
   * 정비소 서비스 가능 여부 확인
   * @param shopId 정비소 ID
   * @param serviceDate 서비스 예약 날짜 (YYYY-MM-DD)
   * @param serviceTime 서비스 예약 시간 (HH:MM)
   * @returns 서비스 가능 여부 및 시간대 정보
   */
  async checkShopAvailability(shopId: string, serviceDate: string, serviceTime?: string): Promise<{ available: boolean; availableSlots?: string[] }> {
    const params = { serviceDate, serviceTime };
    const response = await api.get(`/shops/${shopId}/availability`, { params });
    return response.data;
  },

  /**
   * 정비소 이미지 업로드
   * @param shopId 정비소 ID
   * @param imageFile 이미지 파일
   * @returns 업로드된 이미지 URL
   */
  async uploadShopImage(shopId: string, imageFile: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post(`/shops/${shopId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.imageUrl;
  },

  /**
   * 정비소 검색
   * @param query 검색어
   * @param filter 필터 옵션
   * @returns 정비소 목록
   */
  async searchShops(query: string, filter?: Partial<ShopFilter>): Promise<Shop[]> {
    const params = { query, ...filter };
    const response = await api.get('/shops/search', { params });
    return response.data;
  },

  /**
   * 정비소 통계 조회
   * @param shopId 정비소 ID
   * @param period 기간 (day, week, month, year)
   * @returns 통계 데이터
   */
  async getShopStatistics(shopId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    revenue: number;
    serviceCount: number;
    averageRating: number;
    customerCount: number;
    periodData: Array<{ date: string; revenue: number; serviceCount: number }>;
  }> {
    const response = await api.get(`/shops/${shopId}/statistics`, { params: { period } });
    return response.data;
  }
}; 