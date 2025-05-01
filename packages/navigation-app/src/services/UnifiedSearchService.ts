import { GeoPoint } from '../types';

// 검색 결과 타입 정의
export enum SearchResultType {
  POI = 'poi',           // 관심 지점 (Point of Interest)
  ADDRESS = 'address',   // 주소
  COORDINATE = 'coordinate',  // 좌표
  CATEGORY = 'category', // 카테고리
}

// 카테고리 타입 정의
export enum CategoryType {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  HOSPITAL = 'hospital',
  HOTEL = 'hotel',
  PARKING = 'parking',
  GAS_STATION = 'gasStation',
  CONVENIENCE_STORE = 'convenienceStore',
  SHOPPING_MALL = 'shoppingMall',
  BANK = 'bank',
  SCHOOL = 'school',
  PHARMACY = 'pharmacy',
}

// 검색 결과 인터페이스
export interface SearchResult {
  id: string;
  name: string;
  type: SearchResultType;
  location: GeoPoint;
  distance?: number;
  rating?: number;
  address?: string;
  category?: CategoryType;
  description?: string;
  phone?: string;
  openingHours?: string;
  tags?: string[];
}

// 검색 필터 옵션 인터페이스
export interface SearchFilter {
  types?: SearchResultType[];
  categories?: CategoryType[];
  maxDistance?: number;
  minRating?: number;
  openNow?: boolean;
  sortBy?: 'distance' | 'rating' | 'relevance';
}

// 검색 서비스 클래스
class UnifiedSearchService {
  private recentSearches: string[] = [];
  private favoriteSearches: string[] = [];
  private mockData: SearchResult[] = [];

  constructor() {
    // 초기 목업 데이터 생성
    this.initializeMockData();
    
    // 저장된 최근 검색어 및 즐겨찾기 불러오기
    this.loadRecentSearches();
    this.loadFavoriteSearches();
  }

  // 목업 데이터 초기화
  private initializeMockData(): void {
    this.mockData = [
      {
        id: 'poi1',
        name: '서울특별시청',
        type: SearchResultType.POI,
        location: { latitude: 37.566, longitude: 126.978 },
        rating: 4.5,
        address: '서울특별시 중구 세종대로 110',
        category: CategoryType.BANK,
        description: '서울시 행정 중심',
        phone: '02-120',
        openingHours: '09:00 - 18:00',
        tags: ['공공기관', '행정', '시청'],
      },
      {
        id: 'poi2',
        name: '경복궁',
        type: SearchResultType.POI,
        location: { latitude: 37.579, longitude: 126.977 },
        rating: 4.8,
        address: '서울특별시 종로구 사직로 161',
        category: CategoryType.HOTEL,
        description: '조선시대 왕궁',
        phone: '02-3700-3900',
        openingHours: '09:00 - 18:00',
        tags: ['관광', '역사', '궁궐'],
      },
      {
        id: 'poi3',
        name: '남산서울타워',
        type: SearchResultType.POI,
        location: { latitude: 37.551, longitude: 126.988 },
        rating: 4.6,
        address: '서울특별시 용산구 남산공원길 105',
        category: CategoryType.RESTAURANT,
        description: '서울의 랜드마크',
        phone: '02-3455-9277',
        openingHours: '10:00 - 23:00',
        tags: ['관광', '전망대', '랜드마크'],
      },
      {
        id: 'poi4',
        name: '스타벅스 광화문점',
        type: SearchResultType.POI,
        location: { latitude: 37.572, longitude: 126.976 },
        rating: 4.2,
        address: '서울특별시 종로구 세종대로 175',
        category: CategoryType.CAFE,
        description: '스타벅스 커피 매장',
        phone: '02-2124-9100',
        openingHours: '07:00 - 22:00',
        tags: ['카페', '커피', '음료'],
      },
      {
        id: 'poi5',
        name: '롯데월드',
        type: SearchResultType.POI,
        location: { latitude: 37.511, longitude: 127.098 },
        rating: 4.7,
        address: '서울특별시 송파구 올림픽로 240',
        category: CategoryType.SHOPPING_MALL,
        description: '실내 테마파크',
        phone: '02-1661-2000',
        openingHours: '09:30 - 22:00',
        tags: ['놀이공원', '쇼핑', '엔터테인먼트'],
      },
      {
        id: 'addr1',
        name: '서울특별시 강남구 삼성동 159',
        type: SearchResultType.ADDRESS,
        location: { latitude: 37.513, longitude: 127.056 },
        address: '서울특별시 강남구 삼성동 159',
      },
      {
        id: 'addr2',
        name: '서울특별시 서초구 서초동 1303-37',
        type: SearchResultType.ADDRESS,
        location: { latitude: 37.504, longitude: 127.024 },
        address: '서울특별시 서초구 서초동 1303-37',
      },
      {
        id: 'coord1',
        name: '37.541, 127.001',
        type: SearchResultType.COORDINATE,
        location: { latitude: 37.541, longitude: 127.001 },
      },
    ];
  }

  // 최근 검색어 로드
  private loadRecentSearches(): void {
    // 로컬 스토리지나 파일에서 로드하는 로직 구현
    // 지금은 목업 데이터로 설정
    this.recentSearches = ['서울역', '강남역', '김포공항'];
  }

  // 즐겨찾기 검색어 로드
  private loadFavoriteSearches(): void {
    // 로컬 스토리지나 파일에서 로드하는 로직 구현
    // 지금은 목업 데이터로 설정
    this.favoriteSearches = ['집', '회사', '학교'];
  }

  // 검색어로 검색하기
  public async search(query: string, filter?: SearchFilter, userLocation?: GeoPoint): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // 검색 수행 로직 (실제로는 API 호출 등)
    let results = this.mockData.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.address && item.address.toLowerCase().includes(query.toLowerCase())) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );

    // 필터 적용
    if (filter) {
      if (filter.types && filter.types.length > 0) {
        results = results.filter(item => filter.types!.includes(item.type));
      }

      if (filter.categories && filter.categories.length > 0) {
        results = results.filter(item => 
          item.category && filter.categories!.includes(item.category)
        );
      }

      if (filter.maxDistance !== undefined && userLocation) {
        results = results.filter(item => {
          const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            item.location.latitude,
            item.location.longitude
          );
          item.distance = distance;
          return distance <= filter.maxDistance!;
        });
      }

      if (filter.minRating !== undefined) {
        results = results.filter(item => item.rating && item.rating >= filter.minRating!);
      }

      if (filter.openNow) {
        // OpenNow 필터 로직 구현
        // 실제로는 현재 시간과 영업시간을 비교해야 함
      }

      // 정렬 적용
      if (filter.sortBy === 'distance' && userLocation) {
        results.sort((a, b) => {
          const distA = a.distance !== undefined ? a.distance : this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            a.location.latitude,
            a.location.longitude
          );
          
          const distB = b.distance !== undefined ? b.distance : this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            b.location.latitude,
            b.location.longitude
          );
          
          return distA - distB;
        });
      } else if (filter.sortBy === 'rating') {
        results.sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });
      }
    }

    // 검색어가 최근 검색어에 없으면 추가
    if (!this.recentSearches.includes(query)) {
      this.recentSearches.unshift(query);
      // 최근 검색어 10개만 유지
      if (this.recentSearches.length > 10) {
        this.recentSearches.pop();
      }
      // 변경된 최근 검색어 저장
      this.saveRecentSearches();
    }

    return results;
  }

  // 카테고리로 검색하기
  public async searchByCategory(category: CategoryType, userLocation?: GeoPoint): Promise<SearchResult[]> {
    let results = this.mockData.filter(item => item.category === category);

    // 사용자 위치가 있으면 거리 계산
    if (userLocation) {
      results.forEach(item => {
        item.distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.location.latitude,
          item.location.longitude
        );
      });

      // 거리순으로 정렬
      results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return results;
  }

  // 자동완성 추천 검색어
  public async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) {
      return [];
    }

    // 실제로는 API 호출 등의 로직
    // 여기서는 목업 데이터에서 필터링
    const allNames = this.mockData.map(item => item.name);
    const allAddresses = this.mockData
      .filter(item => item.address)
      .map(item => item.address!);

    const allStrings = [...allNames, ...allAddresses];
    
    return allStrings.filter(str => 
      str.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // 최대 5개까지만 반환
  }

  // 최근 검색어 가져오기
  public getRecentSearches(): string[] {
    return this.recentSearches;
  }

  // 즐겨찾기 검색어 가져오기
  public getFavoriteSearches(): string[] {
    return this.favoriteSearches;
  }

  // 즐겨찾기에 검색어 추가
  public addToFavorites(query: string): void {
    if (!this.favoriteSearches.includes(query)) {
      this.favoriteSearches.push(query);
      this.saveFavoriteSearches();
    }
  }

  // 즐겨찾기에서 검색어 제거
  public removeFromFavorites(query: string): void {
    const index = this.favoriteSearches.indexOf(query);
    if (index !== -1) {
      this.favoriteSearches.splice(index, 1);
      this.saveFavoriteSearches();
    }
  }

  // 최근 검색어 저장
  private saveRecentSearches(): void {
    // 로컬 스토리지나 파일에 저장하는 로직 구현
    console.log('최근 검색어가 저장되었습니다:', this.recentSearches);
  }

  // 즐겨찾기 검색어 저장
  private saveFavoriteSearches(): void {
    // 로컬 스토리지나 파일에 저장하는 로직 구현
    console.log('즐겨찾기가 저장되었습니다:', this.favoriteSearches);
  }

  // 거리 계산 (Haversine 공식)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반경 (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // 거리 (km)
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const unifiedSearchService = new UnifiedSearchService();
export default unifiedSearchService;