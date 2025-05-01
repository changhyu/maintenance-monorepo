import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { LocationPoint } from './LocationService';
import { RouteInfo } from './NavigationService';

// 캐시 스토리지 키
const KEYS = {
  MAP_TILES: 'navapp:map_tiles',
  RECENT_ROUTES: 'navapp:recent_routes',
  FAVORITE_LOCATIONS: 'navapp:favorite_locations',
  LAST_SYNC: 'navapp:last_sync'
};

// 캐시 가능한 맵 타일 범위
const CACHE_ZOOM_LEVELS = [12, 13, 14, 15, 16];

// 타일 참조 인터페이스
interface TileReference {
  x: number;
  y: number;
  z: number;
  url: string;
  timestamp: number;
  size?: number;
}

// 위치 즐겨찾기 인터페이스
export interface FavoriteLocation extends LocationPoint {
  id: string;
  name: string;
  address?: string;
  category?: string;
  timestamp: number;
}

// 최근 경로 캐시 인터페이스
export interface CachedRoute {
  id: string;
  origin: LocationPoint;
  destination: LocationPoint;
  routeInfo: RouteInfo;
  timestamp: number;
  title?: string;
}

class OfflineCacheService {
  private initialized: boolean = false;
  private cacheDir: string = `${FileSystem.cacheDirectory}nav_tiles/`;
  private isOnline: boolean = true;
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  private statusChangeListeners: Array<(isOnline: boolean) => void> = [];
  private networkStateDebounceTimeout: NodeJS.Timeout | null = null;
  private lastStateChangeTime: number = 0;

  // 캐시 서비스 초기화
  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        return;
      }
      
      // 기존 네트워크 리스너 해제
      this.unsubscribeNetworkListener();
      
      // 네트워크 상태 모니터링 설정 (디바운스 처리 추가)
      this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
        const newIsOnline = !!state.isConnected && !!state.isInternetReachable;
        
        // 네트워크 상태 변경 디바운스 처리
        if (this.networkStateDebounceTimeout) {
          clearTimeout(this.networkStateDebounceTimeout);
        }
        
        // 너무 빈번한 상태 변경 방지 (500ms 이내 변경 무시)
        const now = Date.now();
        if (now - this.lastStateChangeTime < 500) {
          return;
        }
        
        // 300ms 후에 상태 변경 적용
        this.networkStateDebounceTimeout = setTimeout(() => {
          if (this.isOnline !== newIsOnline) {
            this.isOnline = newIsOnline;
            this.lastStateChangeTime = Date.now();
            console.log(`네트워크 상태 변경: ${newIsOnline ? '온라인' : '오프라인'}`);
            
            // 리스너에 상태 변경 알림
            this.notifyNetworkStatusChange();
          }
        }, 300);
      });
      
      // 초기 네트워크 상태 확인
      const state = await NetInfo.fetch();
      this.isOnline = !!state.isConnected && !!state.isInternetReachable;
      
      // 캐시 디렉토리 생성
      try {
        const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
        }
      } catch (dirError) {
        console.error('캐시 디렉토리 생성 오류:', dirError);
        // 디렉토리 생성 실패해도 계속 진행
      }
      
      this.initialized = true;
      console.log('오프라인 캐시 서비스 초기화 완료');
    } catch (error) {
      console.error('오프라인 캐시 서비스 초기화 오류:', error);
    }
  }

  // 네트워크 리스너 구독 해제
  private unsubscribeNetworkListener(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    if (this.networkStateDebounceTimeout) {
      clearTimeout(this.networkStateDebounceTimeout);
      this.networkStateDebounceTimeout = null;
    }
  }

  // 네트워크 상태 변경 알림
  private notifyNetworkStatusChange(): void {
    for (const listener of this.statusChangeListeners) {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error('네트워크 상태 변경 리스너 호출 오류:', error);
      }
    }
  }

  // 네트워크 상태 변경 리스너 등록
  addNetworkStatusChangeListener(listener: (isOnline: boolean) => void): () => void {
    this.statusChangeListeners.push(listener);
    
    // 현재 상태로 즉시 호출
    try {
      listener(this.isOnline);
    } catch (error) {
      console.error('네트워크 상태 변경 리스너 초기 호출 오류:', error);
    }
    
    // 제거 함수 반환
    return () => {
      const index = this.statusChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.statusChangeListeners.splice(index, 1);
      }
    };
  }

  // 네트워크 상태 확인
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  // 맵 타일 캐싱
  async cacheTileForLocation(
    location: LocationPoint, 
    radiusKm: number = 2,
    maxTiles: number = 500
  ): Promise<number> {
    try {
      await this.initialize();
      
      if (!this.isOnline) {
        console.log('오프라인 상태에서는 타일을 캐시할 수 없습니다.');
        return 0;
      }
      
      // 캐시할 타일 URL 목록 가져오기
      const tiles = this.getTilesAroundLocation(location, radiusKm, maxTiles);
      let cachedCount = 0;
      let failedCount = 0;
      
      // 저장된 타일 참조 가져오기
      const cachedTiles = await this.getCachedTileReferences();
      
      // 각 타일 다운로드 및 캐싱
      for (const tile of tiles) {
        // 중간에 네트워크가 끊어진 경우 중단
        if (!this.isOnline) {
          console.log('네트워크 연결이 끊어져 타일 캐싱을 중단합니다.');
          break;
        }
        
        const tileKey = `${tile.z}_${tile.x}_${tile.y}`;
        const existingTile = cachedTiles[tileKey];
        
        // 이미 캐시된 타일은 건너뛰기 (7일 이상 지난 경우 재다운로드)
        if (existingTile && (Date.now() - existingTile.timestamp) < 7 * 24 * 60 * 60 * 1000) {
          continue;
        }
        
        try {
          // 타일 다운로드 및 저장
          const localUri = `${this.cacheDir}${tileKey}.png`;
          const downloadResult = await FileSystem.downloadAsync(tile.url, localUri);
          
          if (downloadResult.status === 200) {
            cachedTiles[tileKey] = {
              ...tile,
              timestamp: Date.now(),
              size: downloadResult.headers['content-length']
            };
            cachedCount++;
          } else {
            failedCount++;
          }
        } catch (downloadError) {
          console.error(`타일 다운로드 오류 (${tile.url}):`, downloadError);
          failedCount++;
          // 개별 타일 실패해도 계속 진행
        }
        
        // 연속 실패가 많으면 네트워크 문제로 간주하고 중단
        if (failedCount >= 5) {
          console.log('연속 다운로드 실패로 타일 캐싱을 중단합니다.');
          break;
        }
      }
      
      // 캐시된 타일 참조 저장
      await this.saveCachedTileReferences(cachedTiles);
      
      return cachedCount;
    } catch (error) {
      console.error('타일 캐싱 오류:', error);
      return 0;
    }
  }

  // 경로 캐싱
  async cacheRoute(route: CachedRoute): Promise<boolean> {
    try {
      await this.initialize();
      
      // 최근 경로 가져오기
      const recentRoutes = await this.getRecentRoutes();
      
      // 이미 존재하는 경로는 제거
      const filteredRoutes = recentRoutes.filter(r => r.id !== route.id);
      
      // 새 경로 추가
      filteredRoutes.unshift({
        ...route,
        timestamp: Date.now()
      });
      
      // 최대 20개만 유지
      const updatedRoutes = filteredRoutes.slice(0, 20);
      
      // 저장
      await AsyncStorage.setItem(KEYS.RECENT_ROUTES, JSON.stringify(updatedRoutes));
      
      // 온라인 상태에서만 타일 캐싱 시도
      if (this.isOnline) {
        try {
          // 경로의 시작점과 종료점 주변 타일 캐싱
          await this.cacheTileForLocation(route.origin, 1, 200);
          await this.cacheTileForLocation(route.destination, 1, 200);
          
          // 경로를 따라 몇 개의 포인트 선택하여 캐싱
          const polyline = route.routeInfo.polyline;
          if (polyline && polyline.length > 2) {
            const interval = Math.max(1, Math.floor(polyline.length / 5));
            for (let i = interval; i < polyline.length - interval; i += interval) {
              // 네트워크 연결이 끊어진 경우 중단
              if (!this.isOnline) {
                break;
              }
              await this.cacheTileForLocation(polyline[i], 0.5, 100);
            }
          }
        } catch (cacheError) {
          console.error('경로 타일 캐싱 오류:', cacheError);
          // 타일 캐싱 실패해도 경로 저장은 성공으로 처리
        }
      }
      
      return true;
    } catch (error) {
      console.error('경로 캐싱 오류:', error);
      return false;
    }
  }

  // 최근 경로 가져오기
  async getRecentRoutes(): Promise<CachedRoute[]> {
    try {
      await this.initialize();
      
      const data = await AsyncStorage.getItem(KEYS.RECENT_ROUTES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('최근 경로 가져오기 오류:', error);
      return [];
    }
  }

  // 즐겨찾기 위치 추가
  async addFavoriteLocation(location: FavoriteLocation): Promise<boolean> {
    try {
      await this.initialize();
      
      const favorites = await this.getFavoriteLocations();
      
      // 이미 존재하는 위치는 제거
      const filteredFavorites = favorites.filter(f => f.id !== location.id);
      
      // 새 위치 추가
      filteredFavorites.push({
        ...location,
        timestamp: Date.now()
      });
      
      // 저장
      await AsyncStorage.setItem(KEYS.FAVORITE_LOCATIONS, JSON.stringify(filteredFavorites));
      
      // 온라인 상태에서만 타일 캐싱 시도
      if (this.isOnline) {
        try {
          // 위치 주변 타일 캐싱
          await this.cacheTileForLocation(location, 1, 200);
        } catch (cacheError) {
          console.error('즐겨찾기 타일 캐싱 오류:', cacheError);
          // 타일 캐싱 실패해도 즐겨찾기 저장은 성공으로 처리
        }
      }
      
      return true;
    } catch (error) {
      console.error('즐겨찾기 위치 추가 오류:', error);
      return false;
    }
  }

  // 즐겨찾기 위치 삭제
  async removeFavoriteLocation(id: string): Promise<boolean> {
    try {
      await this.initialize();
      
      const favorites = await this.getFavoriteLocations();
      const filteredFavorites = favorites.filter(f => f.id !== id);
      
      await AsyncStorage.setItem(KEYS.FAVORITE_LOCATIONS, JSON.stringify(filteredFavorites));
      return true;
    } catch (error) {
      console.error('즐겨찾기 위치 삭제 오류:', error);
      return false;
    }
  }

  // 즐겨찾기 위치 목록 가져오기
  async getFavoriteLocations(): Promise<FavoriteLocation[]> {
    try {
      await this.initialize();
      
      const data = await AsyncStorage.getItem(KEYS.FAVORITE_LOCATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('즐겨찾기 위치 가져오기 오류:', error);
      return [];
    }
  }

  // 캐시 사용량 계산 (바이트)
  async getCacheSize(): Promise<number> {
    try {
      await this.initialize();
      
      // 저장된 타일 참조 가져오기
      const cachedTiles = await this.getCachedTileReferences();
      
      // 모든 타일 크기 합산
      let totalSize = 0;
      for (const key in cachedTiles) {
        if (cachedTiles[key].size) {
          totalSize += Number(cachedTiles[key].size);
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('캐시 사용량 계산 오류:', error);
      return 0;
    }
  }

  // 캐시 정리 (오래된 항목부터)
  async cleanCache(maxSizeMB: number = 100): Promise<number> {
    try {
      await this.initialize();
      
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const currentSize = await this.getCacheSize();
      
      if (currentSize <= maxSizeBytes) {
        return 0;
      }
      
      // 저장된 타일 참조 가져오기
      const cachedTiles = await this.getCachedTileReferences();
      
      // 타임스탬프로 정렬하여 가장 오래된 것부터 삭제
      const sortedTiles = Object.entries(cachedTiles)
        .map(([key, tile]) => ({ key, ...tile }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      let clearedSize = 0;
      let removedCount = 0;
      
      for (const tile of sortedTiles) {
        if (currentSize - clearedSize <= maxSizeBytes) {
          break;
        }
        
        try {
          const localUri = `${this.cacheDir}${tile.key}.png`;
          await FileSystem.deleteAsync(localUri);
          
          clearedSize += Number(tile.size || 0);
          delete cachedTiles[tile.key];
          removedCount++;
        } catch (e) {
          // 파일 삭제 오류는 무시하고 계속 진행
        }
      }
      
      // 업데이트된 참조 저장
      await this.saveCachedTileReferences(cachedTiles);
      
      return removedCount;
    } catch (error) {
      console.error('캐시 정리 오류:', error);
      return 0;
    }
  }

  // 특정 위치 주변 타일 목록 계산
  private getTilesAroundLocation(
    location: LocationPoint,
    radiusKm: number,
    maxTiles: number
  ): TileReference[] {
    const result: TileReference[] = [];
    
    // 위치 검증
    if (!this.isValidCoordinate(location.latitude, location.longitude)) {
      console.error('유효하지 않은 좌표:', location);
      return result;
    }
    
    // 각 줌 레벨에 대해 타일 계산
    for (const z of CACHE_ZOOM_LEVELS) {
      // 위치를 타일 좌표로 변환
      const tileX = this.lon2tile(location.longitude, z);
      const tileY = this.lat2tile(location.latitude, z);
      
      // 반경에 포함될 타일 수 계산
      const tileDelta = Math.ceil(radiusKm / (78.271 * Math.pow(2, -z)));
      
      // 생성할 타일 수 제한
      const tileRadius = Math.min(tileDelta, 5);
      
      // 주변 타일 추가
      for (let x = tileX - tileRadius; x <= tileX + tileRadius; x++) {
        for (let y = tileY - tileRadius; y <= tileY + tileRadius; y++) {
          // 타일 URL 생성 (OpenStreetMap 형식 - 실제 앱에서는 사용 중인 지도 제공자에 맞게 수정)
          const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
          
          result.push({
            x, y, z, url,
            timestamp: Date.now()
          });
          
          // 최대 타일 수 제한
          if (result.length >= maxTiles) {
            return result;
          }
        }
      }
    }
    
    return result;
  }

  // 좌표 유효성 검사
  private isValidCoordinate(lat: number, lon: number): boolean {
    return !isNaN(lat) && !isNaN(lon) && 
           lat >= -90 && lat <= 90 && 
           lon >= -180 && lon <= 180;
  }

  // 캐시된 타일 참조 가져오기
  private async getCachedTileReferences(): Promise<Record<string, TileReference>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MAP_TILES);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('캐시된 타일 참조 가져오기 오류:', error);
      return {};
    }
  }

  // 캐시된 타일 참조 저장
  private async saveCachedTileReferences(references: Record<string, TileReference>): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.MAP_TILES, JSON.stringify(references));
    } catch (error) {
      console.error('캐시된 타일 참조 저장 오류:', error);
    }
  }

  // 경도를 타일 X 좌표로 변환
  private lon2tile(lon: number, zoom: number): number {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }

  // 위도를 타일 Y 좌표로 변환
  private lat2tile(lat: number, zoom: number): number {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  // 서비스 정리 (앱 종료 시 호출)
  cleanup(): void {
    this.unsubscribeNetworkListener();
    this.statusChangeListeners = [];
  }

  // 싱글톤 인스턴스
  private static instance: OfflineCacheService;
  
  public static getInstance(): OfflineCacheService {
    if (!OfflineCacheService.instance) {
      OfflineCacheService.instance = new OfflineCacheService();
    }
    return OfflineCacheService.instance;
  }
}

export default OfflineCacheService.getInstance(); 