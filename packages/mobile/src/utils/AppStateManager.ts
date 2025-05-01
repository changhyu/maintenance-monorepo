import { AppState, AppStateStatus } from 'react-native';
import VoiceGuidanceService from '../services/VoiceGuidanceService';
import OfflineCacheService from '../services/OfflineCacheService';
import RouteHistoryService from '../services/RouteHistoryService';

/**
 * 앱 상태 변경을 관리하고 리소스를 정리하는 매니저 클래스
 */
class AppStateManager {
  private isInitialized: boolean = false;
  private appStateSubscription: any = null;
  private listeners: Array<(nextState: AppStateStatus) => void> = [];
  private lastAppState: AppStateStatus = AppState.currentState;
  private backgroundTaskTimeouts: {[key: string]: NodeJS.Timeout} = {};

  /**
   * 앱 상태 매니저 초기화
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 앱 상태 변경 구독
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    this.isInitialized = true;
    console.log('앱 상태 매니저 초기화 완료');
  }

  /**
   * 앱 상태 변경 핸들러
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log(`앱 상태 변경: ${this.lastAppState} -> ${nextAppState}`);

    // 백그라운드로 전환될 때
    if (this.lastAppState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
      console.log('앱이 백그라운드로 전환됩니다.');
      this.handleAppBackground();
    }
    
    // 포그라운드로 복귀할 때
    if ((this.lastAppState === 'background' || this.lastAppState === 'inactive') && nextAppState === 'active') {
      console.log('앱이 포그라운드로 복귀합니다.');
      this.handleAppForeground();
    }

    // 리스너들에게 상태 변경 알림
    this.notifyListeners(nextAppState);
    
    // 현재 상태 저장
    this.lastAppState = nextAppState;
  };

  /**
   * 앱이 백그라운드로 전환될 때 필요한 작업 수행
   */
  private handleAppBackground(): void {
    try {
      // 음성 안내 일시정지
      VoiceGuidanceService.stop().catch(e => 
        console.error('백그라운드 전환 시 음성 안내 중지 오류:', e)
      );

      // 주기적인 정리 작업 예약 (30초 후)
      this.backgroundTaskTimeouts['cleanup'] = setTimeout(() => {
        console.log('백그라운드 상태에서 리소스 정리 수행');
        this.cleanupResources().catch(e => 
          console.error('백그라운드 리소스 정리 오류:', e)
        );
      }, 30000);
    } catch (e) {
      console.error('백그라운드 전환 작업 오류:', e);
    }
  }

  /**
   * 앱이 포그라운드로 복귀할 때 필요한 작업 수행
   */
  private handleAppForeground(): void {
    try {
      // 백그라운드 작업 취소
      Object.keys(this.backgroundTaskTimeouts).forEach(key => {
        clearTimeout(this.backgroundTaskTimeouts[key]);
        delete this.backgroundTaskTimeouts[key];
      });

      // 네트워크 상태 확인
      OfflineCacheService.initialize().catch(e => 
        console.error('포그라운드 전환 시 오프라인 캐시 초기화 오류:', e)
      );

      // 필요한 경우 다시 음성 안내 초기화
      VoiceGuidanceService.initialize().catch(e => 
        console.error('포그라운드 전환 시 음성 안내 초기화 오류:', e)
      );
    } catch (e) {
      console.error('포그라운드 전환 작업 오류:', e);
    }
  }

  /**
   * 앱 상태 리스너 등록
   */
  addStateChangeListener(listener: (nextState: AppStateStatus) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 모든 등록된 리스너에게 상태 변경 알림
   */
  private notifyListeners(nextState: AppStateStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(nextState);
      } catch (e) {
        console.error('앱 상태 리스너 호출 오류:', e);
      }
    });
  }

  /**
   * 앱 종료 전 리소스 정리
   */
  async cleanupResources(): Promise<void> {
    try {
      console.log('앱 리소스 정리 시작...');
      
      // 음성 안내 서비스 정리
      await VoiceGuidanceService.cleanup();
      
      // 오프라인 캐시 서비스 정리
      OfflineCacheService.cleanup();

      // Git 기록 서비스 - 오프라인 캐싱된 작업 처리 시도
      if (OfflineCacheService.isNetworkAvailable()) {
        try {
          await RouteHistoryService.initialize();
        } catch (e) {
          console.error('앱 종료 전 경로 히스토리 초기화 오류:', e);
        }
      }
      
      console.log('앱 리소스 정리 완료');
    } catch (e) {
      console.error('앱 리소스 정리 오류:', e);
    }
  }

  /**
   * 인스턴스 정리
   */
  dispose(): void {
    if (!this.isInitialized) {
      return;
    }
    
    // 앱 상태 구독 해제
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // 백그라운드 작업 취소
    Object.keys(this.backgroundTaskTimeouts).forEach(key => {
      clearTimeout(this.backgroundTaskTimeouts[key]);
    });
    
    this.backgroundTaskTimeouts = {};
    this.listeners = [];
    this.isInitialized = false;
  }

  // 싱글톤 인스턴스
  private static instance: AppStateManager;
  
  public static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }
}

export default AppStateManager.getInstance(); 