import { PointOfInterest, Location, Address } from '../../types';

export interface SearchResult {
  id: string;
  name: string;
  type: 'poi' | 'address' | 'location';
  address?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // 현재 위치로부터의 거리 (미터 단위)
  category?: string; // POI 카테고리 (식당, 카페, 주유소 등)
  rating?: number; // POI 평점 (0-5)
}

export interface SearchOptions {
  query: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // 검색 반경 (미터 단위)
  limit?: number; // 검색 결과 제한
  categories?: string[]; // 검색할 카테고리 필터
  country?: string; // 국가 필터
}

class SearchService {
  // 통합 검색 함수
  async search(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // 실제 구현에서는 API 호출을 통해 검색 결과를 가져옵니다
      // 여기서는 모의 데이터를 반환합니다
      
      // 3초 대기 (API 호출 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 검색어가 없으면 빈 배열 반환
      if (!options.query || options.query.trim() === '') {
        return [];
      }
      
      const query = options.query.toLowerCase();
      
      // 모의 데이터 생성
      const mockResults: SearchResult[] = [
        {
          id: 'poi_1',
          name: '서울역',
          type: 'poi',
          address: '서울특별시 중구 소공동 통일로 1',
          coordinates: {
            latitude: 37.5559,
            longitude: 126.9723
          },
          category: '교통',
          rating: 4.2
        },
        {
          id: 'poi_2',
          name: '남산타워',
          type: 'poi',
          address: '서울특별시 중구 남산공원길 105',
          coordinates: {
            latitude: 37.5511,
            longitude: 126.9882
          },
          category: '관광',
          rating: 4.7
        },
        {
          id: 'poi_3',
          name: '강남역',
          type: 'poi',
          address: '서울특별시 강남구 강남대로 지하 396',
          coordinates: {
            latitude: 37.4982,
            longitude: 127.0276
          },
          category: '교통',
          rating: 4.3
        },
        {
          id: 'address_1',
          name: '서울특별시 강남구 삼성동 159',
          type: 'address',
          address: '서울특별시 강남구 삼성동 159',
          coordinates: {
            latitude: 37.5136,
            longitude: 127.0594
          }
        },
        {
          id: 'address_2',
          name: '서울특별시 용산구 한남동 72-1',
          type: 'address',
          address: '서울특별시 용산구 한남동 72-1',
          coordinates: {
            latitude: 37.5326,
            longitude: 127.0088
          }
        },
        {
          id: 'location_1',
          name: '현재 위치',
          type: 'location',
          coordinates: {
            latitude: 37.5665,
            longitude: 126.9780
          }
        }
      ];

      // 검색어로 필터링
      return mockResults.filter(result => 
        result.name.toLowerCase().includes(query) || 
        (result.address && result.address.toLowerCase().includes(query))
      ).slice(0, options.limit || 10);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // 카테고리별 POI 검색
  async searchByCategory(category: string, options: Omit<SearchOptions, 'query'>): Promise<SearchResult[]> {
    try {
      // 3초 대기 (API 호출 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 모의 데이터 생성 - 카테고리별로 다른 결과 반환
      const mockResults: Record<string, SearchResult[]> = {
        '식당': [
          {
            id: 'poi_4',
            name: '맛있는 식당',
            type: 'poi',
            address: '서울특별시 마포구 연남동 568-45',
            coordinates: {
              latitude: 37.5632,
              longitude: 126.9248
            },
            category: '식당',
            rating: 4.8
          },
          {
            id: 'poi_5',
            name: '행복한 식당',
            type: 'poi',
            address: '서울특별시 서초구 서초동 1303-22',
            coordinates: {
              latitude: 37.4909,
              longitude: 127.0058
            },
            category: '식당',
            rating: 4.5
          }
        ],
        '카페': [
          {
            id: 'poi_6',
            name: '스타벅스 강남점',
            type: 'poi',
            address: '서울특별시 강남구 테헤란로 101',
            coordinates: {
              latitude: 37.5025,
              longitude: 127.0261
            },
            category: '카페',
            rating: 4.3
          },
          {
            id: 'poi_7',
            name: '투썸플레이스 홍대점',
            type: 'poi',
            address: '서울특별시 마포구 와우산로 29길 14',
            coordinates: {
              latitude: 37.5534,
              longitude: 126.9233
            },
            category: '카페',
            rating: 4.2
          }
        ],
        '주유소': [
          {
            id: 'poi_8',
            name: 'SK 주유소',
            type: 'poi',
            address: '서울특별시 양천구 목동로 12',
            coordinates: {
              latitude: 37.5263,
              longitude: 126.8756
            },
            category: '주유소',
            rating: 4.0
          }
        ],
        '병원': [
          {
            id: 'poi_9',
            name: '서울대학교병원',
            type: 'poi',
            address: '서울특별시 종로구 대학로 101',
            coordinates: {
              latitude: 37.5838,
              longitude: 127.0060
            },
            category: '병원',
            rating: 4.7
          },
          {
            id: 'poi_10',
            name: '삼성서울병원',
            type: 'poi',
            address: '서울특별시 강남구 일원동 50',
            coordinates: {
              latitude: 37.4881,
              longitude: 127.0855
            },
            category: '병원',
            rating: 4.8
          }
        ],
        '쇼핑': [
          {
            id: 'poi_11',
            name: '롯데백화점 본점',
            type: 'poi',
            address: '서울특별시 중구 소공동 1',
            coordinates: {
              latitude: 37.5657,
              longitude: 126.9817
            },
            category: '쇼핑',
            rating: 4.4
          },
          {
            id: 'poi_12',
            name: '코엑스몰',
            type: 'poi',
            address: '서울특별시 강남구 삼성동 159',
            coordinates: {
              latitude: 37.5130,
              longitude: 127.0586
            },
            category: '쇼핑',
            rating: 4.6
          }
        ]
      };

      // 카테고리에 해당하는 결과가 없으면 빈 배열 반환
      return mockResults[category] || [];
    } catch (error) {
      console.error('Search by category error:', error);
      throw error;
    }
  }

  // 최근 검색 기록
  private recentSearches: SearchResult[] = [];

  // 최근 검색 기록 추가
  addToRecentSearches(result: SearchResult): void {
    // 중복 항목 제거
    this.recentSearches = this.recentSearches.filter(item => item.id !== result.id);
    
    // 최근 항목 맨 앞에 추가
    this.recentSearches.unshift(result);
    
    // 최대 10개만 유지
    if (this.recentSearches.length > 10) {
      this.recentSearches.pop();
    }
  }

  // 최근 검색 기록 가져오기
  getRecentSearches(): SearchResult[] {
    return [...this.recentSearches];
  }

  // 최근 검색 기록 지우기
  clearRecentSearches(): void {
    this.recentSearches = [];
  }
}

export const searchService = new SearchService();