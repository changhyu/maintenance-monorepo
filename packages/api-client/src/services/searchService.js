export var SearchEntityType;
(function (SearchEntityType) {
    SearchEntityType["VEHICLE"] = "vehicle";
    SearchEntityType["MAINTENANCE"] = "maintenance";
    SearchEntityType["SHOP"] = "shop";
    SearchEntityType["USER"] = "user";
    SearchEntityType["REPORT"] = "report";
    SearchEntityType["INVOICE"] = "invoice";
    SearchEntityType["BOOKING"] = "booking";
    SearchEntityType["FILE"] = "file";
    SearchEntityType["NOTE"] = "note";
    SearchEntityType["TASK"] = "task";
    SearchEntityType["ALL"] = "all";
})(SearchEntityType || (SearchEntityType = {}));
export var SearchSortOption;
(function (SearchSortOption) {
    SearchSortOption["RELEVANCE"] = "relevance";
    SearchSortOption["DATE_ASC"] = "date_asc";
    SearchSortOption["DATE_DESC"] = "date_desc";
    SearchSortOption["ALPHABETICAL_ASC"] = "alphabetical_asc";
    SearchSortOption["ALPHABETICAL_DESC"] = "alphabetical_desc";
})(SearchSortOption || (SearchSortOption = {}));
export class SearchService {
    constructor(apiClient) {
        this.basePath = '/search';
        this.savedSearchPath = '/saved-searches';
        this.recentSearchPath = '/recent-searches';
        this.client = apiClient;
    }
    // 기본 검색 기능
    async search(query, filters, options) {
        return this.client.get(this.basePath, {
            params: {
                q: query,
                ...filters,
                ...options
            }
        });
    }
    // 특정 엔티티 타입 검색
    async searchByType(type, query, filters, options) {
        return this.search(query, { ...filters, types: [type] }, options);
    }
    // 차량 검색
    async searchVehicles(query, filters, options) {
        return this.searchByType(SearchEntityType.VEHICLE, query, filters, options);
    }
    // 정비 기록 검색
    async searchMaintenance(query, filters, options) {
        return this.searchByType(SearchEntityType.MAINTENANCE, query, filters, options);
    }
    // 정비소 검색
    async searchShops(query, filters, options) {
        return this.searchByType(SearchEntityType.SHOP, query, filters, options);
    }
    // 사용자 검색
    async searchUsers(query, filters, options) {
        return this.searchByType(SearchEntityType.USER, query, filters, options);
    }
    // 파일 검색
    async searchFiles(query, filters, options) {
        return this.searchByType(SearchEntityType.FILE, query, filters, options);
    }
    // 자동완성
    async autocomplete(query, type, limit = 10) {
        return this.client.get(`${this.basePath}/autocomplete`, {
            params: {
                q: query,
                type,
                limit
            }
        });
    }
    // 태그 자동완성
    async autocompleteTags(query, limit = 10) {
        return this.client.get(`${this.basePath}/autocomplete-tags`, {
            params: {
                q: query,
                limit
            }
        });
    }
    // 최근 검색어 관련 메서드
    // 최근 검색어 가져오기
    async getRecentSearches(limit = 10) {
        return this.client.get(this.recentSearchPath, {
            params: { limit }
        });
    }
    // 최근 검색어 삭제
    async deleteRecentSearch(id) {
        return this.client.delete(`${this.recentSearchPath}/${id}`);
    }
    // 모든 최근 검색어 삭제
    async clearRecentSearches() {
        return this.client.delete(this.recentSearchPath);
    }
    // 저장된 검색어 관련 메서드
    // 저장된 검색어 목록 가져오기
    async getSavedSearches() {
        return this.client.get(this.savedSearchPath);
    }
    // 검색어 저장하기
    async saveSearch(name, query, filters, options) {
        return this.client.post(this.savedSearchPath, {
            name,
            query,
            filters,
            options
        });
    }
    // 저장된 검색어 조회
    async getSavedSearch(id) {
        return this.client.get(`${this.savedSearchPath}/${id}`);
    }
    // 저장된 검색어 실행
    async executeSavedSearch(id) {
        return this.client.get(`${this.savedSearchPath}/${id}/execute`);
    }
    // 저장된 검색어 업데이트
    async updateSavedSearch(id, updates) {
        return this.client.put(`${this.savedSearchPath}/${id}`, updates);
    }
    // 저장된 검색어 삭제
    async deleteSavedSearch(id) {
        return this.client.delete(`${this.savedSearchPath}/${id}`);
    }
    // 페이스트 검색 (실시간 검색)
    async instantSearch(query, limit = 5) {
        return this.client.get(`${this.basePath}/instant`, {
            params: {
                q: query,
                limit
            }
        });
    }
    // 유사 항목 검색
    async findSimilar(entityType, entityId, limit = 10) {
        return this.client.get(`${this.basePath}/similar`, {
            params: {
                type: entityType,
                id: entityId,
                limit
            }
        });
    }
    // 검색 쿼리 추천
    async suggestQueries(partialQuery, limit = 5) {
        return this.client.get(`${this.basePath}/suggest`, {
            params: {
                q: partialQuery,
                limit
            }
        });
    }
    // 고급 검색 (JSON으로 정의된 복잡한 쿼리)
    async advancedSearch(searchConfig) {
        return this.client.post(`${this.basePath}/advanced`, searchConfig);
    }
    // 전체 재색인
    async reindexAll() {
        return this.client.post(`${this.basePath}/reindex`, {});
    }
    // 특정 엔티티 타입 재색인
    async reindexType(type) {
        return this.client.post(`${this.basePath}/reindex/${type}`, {});
    }
    // 색인 상태 확인
    async getIndexStatus() {
        return this.client.get(`${this.basePath}/status`);
    }
    // 검색 내역
    async getSearchHistory(page = 1, limit = 20) {
        return this.client.get(`${this.basePath}/history`, {
            params: { page, limit }
        });
    }
    // 검색 통계
    async getSearchStats(startDate, endDate) {
        return this.client.get(`${this.basePath}/stats`, {
            params: { startDate, endDate }
        });
    }
}
