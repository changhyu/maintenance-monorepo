import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeoPoint } from '../types';

// 위치 검색 결과 타입
export interface SearchResult {
  id: string;
  name: string;
  address: string;
  category?: string;
  location: GeoPoint;
  distance?: number;
  rating?: number;
  isFavorite?: boolean;
  meta?: Record<string, any>;
}

// 최근 검색어 타입
export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  category?: string;
}

// 검색 필터 옵션
export interface SearchFilter {
  category?: string;
  distanceMax?: number;
  ratingMin?: number;
  openNow?: boolean;
}

class SearchService {
  private recentSearches: RecentSearch[] = [];
  private readonly storageKey = 'recent_searches';
  private readonly maxRecentSearches = 20;
  private mockData: SearchResult[] = [];

  constructor() {
    this.loadRecentSearches();
    this.initializeMockData();
  }

  /**
   * 최근 검색어 로드
   */
  private async loadRecentSearches(): Promise<void> {
    try {
      const searchesJson = await AsyncStorage.getItem(this.storageKey);
      if (searchesJson) {
        this.recentSearches = JSON.parse(searchesJson);
      }
    } catch (error) {
      console.error('최근 검색어 로드 중 오류:', error);
    }
  }

  /**
   * 최근 검색어 저장
   */
  private async saveRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.storageKey,
        JSON.stringify(this.recentSearches)
      );
    } catch (error) {
      console.error('최근 검색어 저장 중 오류:', error);
    }
  }

  /**
   * 검색 수행
   */
  public async search(
    query: string,
    currentLocation?: GeoPoint,
    filter?: SearchFilter
  ): Promise<SearchResult[]> {
    // 검색어가 비어있으면 빈 배열 반환
    if (!query.trim()) {
      return [];
    }

    // 검색어 저장
    await this.addRecentSearch(query);

    // 실제 구현에서는 API 호출 등을 통해 검색 결과를 가져옴
    // 현재는 mock 데이터를 사용
    return this.filterResults(this.mockData, query, currentLocation, filter);
  }

  /**
   * 검색 결과 필터링
   */
  private filterResults(
    results: SearchResult[],
    query: string,
    currentLocation?: GeoPoint,
    filter?: SearchFilter
  ): SearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    // 검색어로 필터링
    let filtered = results.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.address.toLowerCase().includes(normalizedQuery)
    );

    // 카테고리 필터
    if (filter?.category) {
      filtered = filtered.filter(
        (item) => item.category === filter.category
      );
    }

    // 거리 필터
    if (filter?.distanceMax && currentLocation) {
      filtered = filtered.filter((item) => {
        const distance = this.calculateDistance(
          currentLocation,
          item.location
        );
        item.distance = distance;
        return distance <= filter.distanceMax;
      });
    }

    // 평점 필터
    if (filter?.ratingMin) {
      filtered = filtered.filter(
        (item) => (item.rating || 0) >= filter.ratingMin
      );
    }

    // 결과에 거리 정보 추가
    if (currentLocation) {
      filtered.forEach((item) => {
        item.distance = this.calculateDistance(
          currentLocation,
          item.location
        );
      });

      // 거리순 정렬
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filtered;
  }

  /**
   * 지오코딩 (주소 -> 좌표)
   * 실제 구현에서는 API 호출로 대체
   */
  public async geocode(address: string): Promise<GeoPoint | null> {
    // 실제 구현에서는 API를 호출하여 지오코딩
    // 현재는 mock 데이터에서 일치하는 주소를 찾아 반환
    const result = this.mockData.find(
      (item) => item.address.toLowerCase().includes(address.toLowerCase())
    );

    return result ? result.location : null;
  }

  /**
   * 역지오코딩 (좌표 -> 주소)
   * 실제 구현에서는 API 호출로 대체
   */
  public async reverseGeocode(location: GeoPoint): Promise<string | null> {
    // 실제 구현에서는 API를 호출하여 역지오코딩
    // 현재는 mock 위치와의 거리가 가장 가까운 장소를 찾음
    const nearest = this.mockData
      .map((item) => ({
        ...item,
        distance: this.calculateDistance(location, item.location),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    return nearest ? nearest.address : null;
  }

  /**
   * 최근 검색어 추가
   */
  public async addRecentSearch(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // 이미 있는 검색어라면 제거
    this.recentSearches = this.recentSearches.filter(
      (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
    );

    // 새 검색어 추가
    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      query: trimmedQuery,
      timestamp: Date.now(),
    };

    this.recentSearches.unshift(newSearch);

    // 최대 개수 제한
    if (this.recentSearches.length > this.maxRecentSearches) {
      this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
    }

    await this.saveRecentSearches();
  }

  /**
   * 최근 검색어 삭제
   */
  public async removeRecentSearch(id: string): Promise<void> {
    this.recentSearches = this.recentSearches.filter((item) => item.id !== id);
    await this.saveRecentSearches();
  }

  /**
   * 모든 최근 검색어 삭제
   */
  public async clearRecentSearches(): Promise<void> {
    this.recentSearches = [];
    await this.saveRecentSearches();
  }

  /**
   * 모든 최근 검색어 가져오기
   */
  public getRecentSearches(): RecentSearch[] {
    return [...this.recentSearches];
  }

  /**
   * 즐겨찾기 상태 업데이트
   */
  public updateFavoriteStatus(id: string, isFavorite: boolean): void {
    const item = this.mockData.find((item) => item.id === id);
    if (item) {
      item.isFavorite = isFavorite;
    }
  }

  /**
   * 두 지점 간의 거리 계산 (하버사인 공식)
   */
  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371000; // 지구 반지름 (미터)
    const lat1 = (point1.latitude * Math.PI) / 180;
    const lat2 = (point2.latitude * Math.PI) / 180;
    const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 모의 데이터 초기화
   */
  private initializeMockData(): void {
    this.mockData = [
      {
        id: '1',
        name: '서울역',
        address: '서울특별시 용산구 한강대로 405',
        category: '교통',
        location: { latitude: 37.5559, longitude: 126.9723 },
        rating: 4.5,
      },
      {
        id: '2',
        name: '강남역',
        address: '서울특별시 강남구 강남대로 396',
        category: '교통',
        location: { latitude: 37.4982, longitude: 127.0276 },
        rating: 4.3,
      },
      {
        id: '3',
        name: '롯데월드',
        address: '서울특별시 송파구 올림픽로 240',
        category: '관광',
        location: { latitude: 37.5111, longitude: 127.0980 },
        rating: 4.6,
      },
      {
        id: '4',
        name: '명동 쇼핑거리',
        address: '서울특별시 중구 명동길',
        category: '쇼핑',
        location: { latitude: 37.5635, longitude: 126.9850 },
        rating: 4.4,
      },
      {
        id: '5',
        name: '인천국제공항',
        address: '인천광역시 중구 공항로 272',
        category: '교통',
        location: { latitude: 37.4602, longitude: 126.4407 },
        rating: 4.7,
      },
      {
        id: '6',
        name: '북한산국립공원',
        address: '서울특별시 강북구 삼양로 181',
        category: '자연',
        location: { latitude: 37.7016, longitude: 126.9840 },
        rating: 4.8,
      },
      {
        id: '7',
        name: '스타벅스 강남점',
        address: '서울특별시 강남구 강남대로 402',
        category: '여가',
        location: { latitude: 37.4975, longitude: 127.0268 },
        rating: 4.1,
      },
      {
        id: '8',
        name: '경복궁',
        address: '서울특별시 종로구 사직로 161',
        category: '관광',
        location: { latitude: 37.5796, longitude: 126.9770 },
        rating: 4.7,
      },
      {
        id: '9',
        name: '여의도 한강공원',
        address: '서울특별시 영등포구 여의동로 330',
        category: '자연',
        location: { latitude: 37.5288, longitude: 126.9339 },
        rating: 4.5,
      },
      {
        id: '10',
        name: 'COEX',
        address: '서울특별시 강남구 영동대로 513',
        category: '쇼핑',
        location: { latitude: 37.5112, longitude: 127.0581 },
        rating: 4.4,
      },
    ];
  }

  /**
   * 검색어 제안 기능 - 검색어를 입력하면 연관 검색어 제안
   */
  public getSuggestions(query: string): string[] {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: string[] = [];
    
    // 모든 검색 결과에서 이름과 주소에서 연관된 것을 찾아서 추천
    this.mockData.forEach(item => {
      if (item.name.toLowerCase().includes(normalizedQuery) && 
          !suggestions.includes(item.name)) {
        suggestions.push(item.name);
      }
      
      // 주소에서 동/구 등의 키워드를 추출하여 추가
      const addressParts = item.address.split(' ');
      for (const part of addressParts) {
        if (part.toLowerCase().includes(normalizedQuery) && 
            !suggestions.includes(part) &&
            part.length > 1) {
          suggestions.push(part);
        }
      }
    });
    
    // 최근 검색어에서도 연관 검색어 찾기
    this.recentSearches.forEach(item => {
      if (item.query.toLowerCase().includes(normalizedQuery) && 
          !suggestions.includes(item.query)) {
        suggestions.push(item.query);
      }
    });
    
    // 자주 검색되는 POI(관심지점) 키워드 추가
    const commonPOIs = ['역', '공원', '마트', '병원', '약국', '카페', '은행', '학교', '주차장'];
    for (const poi of commonPOIs) {
      if (poi.includes(normalizedQuery) && !suggestions.includes(poi)) {
        suggestions.push(poi);
      }
      
      // 검색어 + POI 조합 추천
      const combinedSuggestion = `${normalizedQuery} ${poi}`;
      if (!suggestions.includes(combinedSuggestion)) {
        suggestions.push(combinedSuggestion);
      }
    }
    
    // 최대 5개까지만 반환
    return suggestions.slice(0, 5);
  }
  
  /**
   * 즐겨찾기 상태 가져오기
   */
  public async getFavoriteStatus(ids: string[]): Promise<Record<string, boolean>> {
    // 실제 구현에서는 로컬 스토리지나 DB에서 가져오기
    const result: Record<string, boolean> = {};
    for (const id of ids) {
      const item = this.mockData.find(item => item.id === id);
      result[id] = item?.isFavorite || false;
    }
    return result;
  }
  
  /**
   * 카테고리별 장소 검색
   */
  public async searchByCategory(category: string, currentLocation?: GeoPoint): Promise<SearchResult[]> {
    // 카테고리로 필터링
    const results = this.mockData.filter(item => item.category === category);
    
    // 현재 위치가 있으면 거리 계산 및 정렬
    if (currentLocation) {
      results.forEach(item => {
        item.distance = this.calculateDistance(currentLocation, item.location);
      });
      
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return results;
  }
}

// 싱글톤 인스턴스
export default new SearchService();