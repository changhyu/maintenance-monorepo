import { NativeModules, Platform } from 'react-native';

/**
 * 메모리 사용량을 모니터링하고 앱이 과도한 메모리를 사용할 때 필요한 작업을 수행하는 유틸리티
 */
class MemoryWatcher {
  private isMonitoring: boolean = false;
  private memoryInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(memoryInfo: MemoryInfo) => void> = [];
  private memoryThreshold: number = 80; // 기본 메모리 임계값 (%)
  private memoryCheckIntervalMs: number = 10000; // 10초마다 확인

  // 마지막으로 측정된 메모리 사용량 정보
  private lastMemoryInfo: MemoryInfo = {
    totalMemory: 0,
    usedMemory: 0,
    usagePercentage: 0,
    freeMemory: 0,
    isHighUsage: false,
    timestamp: Date.now()
  };

  /**
   * 메모리 모니터링 시작
   */
  startMonitoring(checkIntervalMs: number = this.memoryCheckIntervalMs): void {
    if (this.isMonitoring) {
      return;
    }

    this.memoryCheckIntervalMs = checkIntervalMs;
    console.log(`메모리 모니터링 시작 (${this.memoryCheckIntervalMs}ms 간격)`);
    
    // 초기 메모리 상태 확인
    this.checkMemoryUsage();
    
    // 주기적인 메모리 확인 설정
    this.memoryInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.memoryCheckIntervalMs);
    
    this.isMonitoring = true;
  }

  /**
   * 메모리 모니터링 중지
   */
  stopMonitoring(): void {
    if (!this.isMonitoring || !this.memoryInterval) {
      return;
    }
    
    clearInterval(this.memoryInterval);
    this.memoryInterval = null;
    this.isMonitoring = false;
    console.log('메모리 모니터링 중지');
  }

  /**
   * 현재 메모리 사용량 확인 및 필요한 경우 리스너에게 알림
   */
  async checkMemoryUsage(): Promise<MemoryInfo> {
    try {
      const memoryInfo = await this.getMemoryInfo();
      this.lastMemoryInfo = memoryInfo;
      
      // 메모리 사용량이 임계값을 초과하는 경우
      if (memoryInfo.isHighUsage) {
        console.warn(`높은 메모리 사용량 감지: ${memoryInfo.usagePercentage.toFixed(2)}%`);
        this.notifyHighMemoryUsage(memoryInfo);
      }
      
      return memoryInfo;
    } catch (error) {
      console.error('메모리 사용량 확인 오류:', error);
      return this.lastMemoryInfo;
    }
  }

  /**
   * 메모리 사용량 정보 얻기
   */
  private async getMemoryInfo(): Promise<MemoryInfo> {
    try {
      // 플랫폼별로 다른 메모리 정보 가져오기 구현
      // 실제 구현에서는 NativeModules를 통해 각 플랫폼의 메모리 정보를 가져와야 함
      
      // 여기서는 더미 데이터를 반환 (실제 구현 필요)
      let totalMemory = 0;
      let usedMemory = 0;
      
      if (Platform.OS === 'ios') {
        // iOS 구현
        // NativeModules.MemoryInfo.getMemoryInfo() 같은 네이티브 모듈 호출 필요
        totalMemory = 4 * 1024 * 1024 * 1024; // 더미 데이터: 4GB
        usedMemory = Math.random() * totalMemory * 0.7; // 더미 데이터
      } else if (Platform.OS === 'android') {
        // Android 구현
        // NativeModules.MemoryInfo.getMemoryInfo() 같은 네이티브 모듈 호출 필요
        totalMemory = 6 * 1024 * 1024 * 1024; // 더미 데이터: 6GB
        usedMemory = Math.random() * totalMemory * 0.7; // 더미 데이터
      }
      
      const freeMemory = totalMemory - usedMemory;
      const usagePercentage = (usedMemory / totalMemory) * 100;
      const isHighUsage = usagePercentage >= this.memoryThreshold;
      
      return {
        totalMemory,
        usedMemory,
        freeMemory,
        usagePercentage,
        isHighUsage,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('메모리 정보 가져오기 오류:', error);
      return this.lastMemoryInfo;
    }
  }

  /**
   * 메모리 임계값 설정
   */
  setMemoryThreshold(thresholdPercentage: number): void {
    if (thresholdPercentage < 0 || thresholdPercentage > 100) {
      console.error('유효하지 않은 메모리 임계값:', thresholdPercentage);
      return;
    }
    
    this.memoryThreshold = thresholdPercentage;
    console.log(`메모리 임계값 업데이트: ${this.memoryThreshold}%`);
  }

  /**
   * 높은 메모리 사용량 리스너 등록
   */
  addMemoryListener(listener: (memoryInfo: MemoryInfo) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 높은 메모리 사용량 감지 시 리스너에게 알림
   */
  private notifyHighMemoryUsage(memoryInfo: MemoryInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(memoryInfo);
      } catch (error) {
        console.error('메모리 리스너 호출 오류:', error);
      }
    });
  }

  /**
   * 불필요한 객체 정리하여 가비지 컬렉션 유도
   */
  attemptMemoryCleanup(): void {
    console.log('메모리 정리 시도 중...');
    
    try {
      // 중요: 이 함수는 단순히 가비지 컬렉션이 발생할 가능성을 높이기 위한 것으로,
      // JavaScript에서 직접 가비지 컬렉션을 강제할 수는 없음
      // 큰 객체들을 null로 설정하여 참조를 제거
      
      // 네이티브 모듈이 사용 가능한 경우 해당 모듈을 통해 메모리 정리 요청
      if (Platform.OS === 'android' && NativeModules.MemoryManager) {
        NativeModules.MemoryManager.requestGarbageCollection();
      }
      
      // global 객체 캐시 정리 (있다고 가정)
      global.gc && global.gc();
      
      console.log('메모리 정리 완료');
    } catch (error) {
      console.error('메모리 정리 시도 중 오류:', error);
    }
  }

  /**
   * 인스턴스 정리
   */
  dispose(): void {
    this.stopMonitoring();
    this.listeners = [];
  }

  // 싱글톤 인스턴스
  private static instance: MemoryWatcher;
  
  public static getInstance(): MemoryWatcher {
    if (!MemoryWatcher.instance) {
      MemoryWatcher.instance = new MemoryWatcher();
    }
    return MemoryWatcher.instance;
  }
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  totalMemory: number;      // 총 메모리 (바이트)
  usedMemory: number;       // 사용 메모리 (바이트)
  freeMemory: number;       // 여유 메모리 (바이트)
  usagePercentage: number;  // 메모리 사용 비율 (%)
  isHighUsage: boolean;     // 높은 사용량 여부
  timestamp: number;        // 측정 시간 타임스탬프
}

export default MemoryWatcher.getInstance(); 