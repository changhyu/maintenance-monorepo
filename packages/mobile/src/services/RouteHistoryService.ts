import { RouteInfo } from './NavigationService';
import { NavigationRoute } from '../types/navigation';
import axios from 'axios';

export interface RouteHistoryEntry {
  id: string; // 커밋 ID
  routeInfo: RouteInfo;
  timestamp: number;
  title: string;
  description?: string;
}

class RouteHistoryService {
  private readonly historyFilePath: string = 'navigation_history.json';
  private readonly baseApiUrl: string = '/api/v1/route-history';
  
  /**
   * 경로 히스토리 서비스를 초기화합니다.
   */
  public async initialize(): Promise<void> {
    try {
      await this.initializeHistory();
    } catch (error) {
      console.error('경로 히스토리 초기화 오류:', error);
      throw error;
    }
  }
  
  /**
   * 경로 히스토리를 초기화합니다.
   */
  private async initializeHistory(): Promise<void> {
    try {
      // 서버 API를 통해 저장소 상태 확인
      const response = await axios.get(`${this.baseApiUrl}/status`);
      
      if (!response.data.exists) {
        // 히스토리 파일이 없으면 생성 요청
        await axios.post(`${this.baseApiUrl}/initialize`);
      }
    } catch (error) {
      console.error('경로 히스토리 초기화 오류:', error);
      throw error;
    }
  }
  
  /**
   * 새 경로를 기록합니다.
   * 
   * @param route 기록할 경로 정보
   */
  public async addRoute(route: NavigationRoute): Promise<void> {
    try {
      await axios.post(`${this.baseApiUrl}/routes`, route);
    } catch (error) {
      console.error('경로 추가 오류:', error);
      throw error;
    }
  }
  
  /**
   * 경로를 저장합니다.
   * 
   * @param routeInfo 저장할 경로 정보
   * @param title 경로 제목
   * @returns 저장된 경로 항목
   */
  public async saveRoute(routeInfo: RouteInfo, title: string): Promise<RouteHistoryEntry | null> {
    try {
      const entry: RouteHistoryEntry = {
        id: `route_${Date.now()}`,
        routeInfo,
        timestamp: Date.now(),
        title
      };
      await this.addRoute({
        id: entry.id,
        title: entry.title,
        timestamp: entry.timestamp,
        routeInfo: entry.routeInfo
      } as NavigationRoute);
      return entry;
    } catch (error) {
      console.error('경로 저장 오류:', error);
      return null;
    }
  }
  
  /**
   * 모든 경로 이력을 가져옵니다.
   * 
   * @returns 경로 이력 목록
   */
  public async getRoutes(): Promise<NavigationRoute[]> {
    try {
      const response = await axios.get(`${this.baseApiUrl}/routes`);
      return response.data;
    } catch (error) {
      console.error('경로 이력 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 모든 경로 히스토리를 가져옵니다.
   * 
   * @returns 경로 히스토리 목록
   */
  public async getRouteHistory(): Promise<RouteHistoryEntry[]> {
    try {
      const routes = await this.getRoutes();
      return routes.map(route => ({
        id: route.id,
        routeInfo: route.routeInfo,
        timestamp: route.timestamp,
        title: route.title,
        description: route.description
      }));
    } catch (error) {
      console.error('경로 히스토리 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 특정 경로로 되돌립니다.
   * 
   * @param id 되돌릴 경로 ID
   */
  public async rollbackToRoute(id: string): Promise<void> {
    try {
      await axios.post(`${this.baseApiUrl}/rollback/${id}`);
    } catch (error) {
      console.error('경로 롤백 오류:', error);
      throw error;
    }
  }
  
  /**
   * 특정 경로를 삭제합니다.
   * 
   * @param id 삭제할 경로 ID
   */
  public async deleteRoute(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseApiUrl}/routes/${id}`);
    } catch (error) {
      console.error('경로 삭제 오류:', error);
      throw error;
    }
  }
  // 싱글톤 인스턴스 생성
  private static instance: RouteHistoryService;
  
  public static getInstance(): RouteHistoryService {
    if (!RouteHistoryService.instance) {
      RouteHistoryService.instance = new RouteHistoryService();
    }
    return RouteHistoryService.instance;
  }
}

// Export the class and the instance separately to preserve typing
export { RouteHistoryService };

const routeHistoryServiceInstance = RouteHistoryService.getInstance();

// 초기화를 별도로 실행
routeHistoryServiceInstance.initialize().catch(err => {
  console.error('경로 히스토리 서비스 초기화 실패:', err);
});

export default routeHistoryServiceInstance;