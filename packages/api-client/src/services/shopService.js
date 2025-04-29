export class ShopService {
    constructor(apiClient) {
        this.basePath = '/shops';
        this.client = apiClient;
    }
    // 모든 정비소 조회
    async getAllShops(params) {
        return this.client.get(this.basePath, { params });
    }
    // 특정 정비소 조회
    async getShopById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 정비소 생성
    async createShop(shopData) {
        return this.client.post(this.basePath, shopData);
    }
    // 정비소 정보 업데이트
    async updateShop(id, shopData) {
        return this.client.put(`${this.basePath}/${id}`, shopData);
    }
    // 정비소 삭제
    async deleteShop(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 정비소 활성화/비활성화
    async toggleShopActive(id, isActive) {
        return this.client.patch(`${this.basePath}/${id}/status`, { isActive });
    }
    // 특정 지역의 정비소 검색
    async searchNearbyShops(latitude, longitude, radiusKm) {
        return this.client.get(`${this.basePath}/nearby`, {
            params: { latitude, longitude, radiusKm }
        });
    }
    // 정비소 리뷰 조회
    async getShopReviews(shopId) {
        return this.client.get(`${this.basePath}/${shopId}/reviews`);
    }
    // 정비소 리뷰 추가
    async addShopReview(reviewData) {
        return this.client.post(`${this.basePath}/${reviewData.shopId}/reviews`, reviewData);
    }
    // 정비소 리뷰 수정
    async updateShopReview(shopId, reviewId, reviewData) {
        return this.client.put(`${this.basePath}/${shopId}/reviews/${reviewId}`, reviewData);
    }
    // 정비소 리뷰 삭제
    async deleteShopReview(shopId, reviewId) {
        return this.client.delete(`${this.basePath}/${shopId}/reviews/${reviewId}`);
    }
    // 특정 사용자의 정비소 조회
    async getUserShops(userId) {
        return this.client.get(`/users/${userId}/shops`);
    }
}
