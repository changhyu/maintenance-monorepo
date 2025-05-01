import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteLocation {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  icon?: string; // 아이콘 타입 (집, 회사, 즐겨찾기 등)
  category?: string; // 위치 카테고리 (집, 회사, 친구, 음식점 등)
  address?: string; // 주소 정보
  createdAt: number; // 생성 시간 타임스탬프
}

class FavoritesService {
  private readonly STORAGE_KEY = 'navigation_app_favorites';
  private favorites: FavoriteLocation[] = [];
  private listeners: Array<(favorites: FavoriteLocation[]) => void> = [];
  private initialized = false;

  // Initialization method to be called after construction
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.loadFavorites();
      this.initialized = true;
    }
    return Promise.resolve();
  }

  // AsyncStorage에서 즐겨찾기 불러오기
  private async loadFavorites(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.favorites = JSON.parse(data);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('즐겨찾기 불러오기 실패:', error);
    }
  }

  // 즐겨찾기 저장
  private async saveFavorites(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (error) {
      console.error('즐겨찾기 저장 실패:', error);
    }
  }

  // 모든 즐겨찾기 목록 가져오기
  async getAllFavorites(): Promise<FavoriteLocation[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return [...this.favorites];
  }

  // 카테고리별 즐겨찾기 필터링
  async getFavoritesByCategory(category: string): Promise<FavoriteLocation[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.favorites.filter(favorite => favorite.category === category);
  }

  // 특정 즐겨찾기 가져오기
  async getFavoriteById(id: string): Promise<FavoriteLocation | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.favorites.find(favorite => favorite.id === id);
  }

  // 새 즐겨찾기 추가
  async addFavorite(favorite: Omit<FavoriteLocation, 'id' | 'createdAt'>): Promise<FavoriteLocation> {
    if (!this.initialized) {
      await this.initialize();
    }

    const newFavorite: FavoriteLocation = {
      ...favorite,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    this.favorites.push(newFavorite);
    await this.saveFavorites();
    this.notifyListeners();

    return newFavorite;
  }

  // 즐겨찾기 수정
  async updateFavorite(updatedFavorite: FavoriteLocation): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const index = this.favorites.findIndex(fav => fav.id === updatedFavorite.id);
    if (index === -1) {
      return false;
    }
    this.favorites[index] = updatedFavorite;
    await this.saveFavorites();
    this.notifyListeners();

    return true;
  }

  // 즐겨찾기 삭제
  async deleteFavorite(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const initialLength = this.favorites.length;
    this.favorites = this.favorites.filter(favorite => favorite.id !== id);

    if (initialLength !== this.favorites.length) {
      await this.saveFavorites();
      this.notifyListeners();
      return true;
    }

    return false;
  }

  // 즐겨찾기 순서 변경
  async reorderFavorites(newOrder: string[]): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (newOrder.length !== this.favorites.length) {
      return false;
    }

    // 새 순서에 따라 즐겨찾기 재정렬
    const reordered = newOrder.map(id => {
      const favorite = this.favorites.find(fav => fav.id === id);
      if (!favorite) {
        throw new Error(`Favorite with id ${id} not found`);
      }
      return favorite;
    });

    this.favorites = reordered;
    await this.saveFavorites();
    this.notifyListeners();

    return true;
  }

  // 리스너 등록 (상태 변화 감지)
  async addListener(listener: (favorites: FavoriteLocation[]) => void): Promise<() => void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.listeners.push(listener);

    // 현재 상태 즉시 전달
    listener([...this.favorites]);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 모든 리스너에게 상태 변화 알림
  private notifyListeners(): void {
    const favoritesCopy = [...this.favorites];
    this.listeners.forEach(listener => {
      listener(favoritesCopy);
    });
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const favoritesService = new FavoritesService();
// Initialize the service right away
favoritesService.initialize().catch(error => {
  console.error('Failed to initialize favorites service:', error);
});

export default favoritesService;