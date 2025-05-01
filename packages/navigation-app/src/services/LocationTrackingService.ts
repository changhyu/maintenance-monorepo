import * as Location from 'expo-location';
import { GeoPoint } from '../types';

export interface EnhancedLocation {
  position: GeoPoint;
  timestamp: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;  // 방향 (0-359도, 북쪽이 0도)
  speed: number | null;    // 속도 (초당 미터)
}

export interface LocationHistoryPoint extends EnhancedLocation {
  distanceToPrev?: number; // 이전 위치와의 거리(미터)
  timeSincePrev?: number; // 이전 위치로부터 경과 시간(밀리초)
}

export interface TrackingOptions {
  accuracyLevel: Location.Accuracy;
  updateInterval: number; // 밀리초 단위
  distanceFilter: number; // 미터 단위 (이 거리 이상 이동하면 업데이트)
  maxHistoryLength: number; // 히스토리에 보관할 최대 위치 수
  smoothing: boolean; // 위치 스무딩 적용 여부
  smoothingFactor: number; // 스무딩 강도 (0-1, 0.5가 중간)
  predictiveTracking: boolean; // 예측 트래킹 사용 여부
}

export type LocationUpdateListener = (location: EnhancedLocation) => void;

/**
 * 향상된 위치 트래킹 서비스
 * 사용자 위치를 더 정확히 추적하고, 방향 및 속도 계산하여 내비게이션 정확도 향상
 */
export class LocationTrackingService {
  private locationWatcher: Location.LocationSubscription | null = null;
  private readonly locationHistory: LocationHistoryPoint[] = [];
  private lastKnownLocation: EnhancedLocation | null = null;
  private updateListeners: LocationUpdateListener[] = [];
  private isTracking = false;
  
  private options: TrackingOptions = {
    accuracyLevel: Location.Accuracy.BestForNavigation,
    updateInterval: 1000, // 1초
    distanceFilter: 5, // 5미터
    maxHistoryLength: 20,
    smoothing: true,
    smoothingFactor: 0.3,
    predictiveTracking: true,
  };
  
  /**
   * 서비스 초기화 (권한 획득)
   * @returns 위치 권한 획득 성공 여부
   */
  public async initialize(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('위치 권한이 거부되었습니다.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('위치 권한 요청 중 오류:', error);
      return false;
    }
  }
  
  /**
   * 설정 업데이트
   * @param options 새로운 트래킹 옵션
   */
  public updateOptions(options: Partial<TrackingOptions>): void {
    this.options = { ...this.options, ...options };
    
    // 이미 트래킹 중이면 재시작
    if (this.isTracking) {
      this.stopTracking();
      this.startTracking();
    }
  }
  
  /**
   * 현재 트래킹 설정 가져오기
   */
  public getOptions(): TrackingOptions {
    return { ...this.options };
  }
  
  /**
   * 위치 트래킹 시작
   * @returns 트래킹 시작 성공 여부
   */
  public async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      return true;
    }
    
    try {
      // 위치 업데이트 구독
      this.locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: this.options.accuracyLevel,
          timeInterval: this.options.updateInterval,
          distanceInterval: this.options.distanceFilter,
        },
        (location) => this.handleLocationUpdate(location)
      );
      
      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('위치 트래킹 시작 오류:', error);
      return false;
    }
  }
  
  /**
   * 위치 트래킹 중단
   */
  public stopTracking(): void {
    if (this.locationWatcher) {
      this.locationWatcher.remove();
      this.locationWatcher = null;
    }
    
    this.isTracking = false;
  }
  
  /**
   * 현재 위치 조회
   * @returns 마지막으로 알려진 위치 또는 null
   */
  public getLastKnownLocation(): EnhancedLocation | null {
    return this.lastKnownLocation;
  }
  
  /**
   * 위치 이력 데이터 가져오기
   * @returns 저장된 위치 이력 데이터
   */
  public getLocationHistory(): LocationHistoryPoint[] {
    return [...this.locationHistory];
  }
  
  /**
   * 트래킹 상태 확인
   * @returns 현재 트래킹 중인지 여부
   */
  public isActive(): boolean {
    return this.isTracking;
  }
  
  /**
   * 위치 업데이트 이벤트 리스너 등록
   * @param listener 위치 업데이트시 호출할 콜백 함수
   */
  public addLocationUpdateListener(listener: LocationUpdateListener): void {
    if (!this.updateListeners.includes(listener)) {
      this.updateListeners.push(listener);
    }
  }
  
  /**
   * 위치 업데이트 이벤트 리스너 제거
   * @param listener 제거할 리스너
   */
  public removeLocationUpdateListener(listener: LocationUpdateListener): void {
    this.updateListeners = this.updateListeners.filter(l => l !== listener);
  }
  
  /**
   * 새로운 위치 정보 처리
   * @param location Expo Location API에서 받은 위치 정보
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    // 위치 데이터 변환
    const newLocation: EnhancedLocation = {
      position: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy ?? null,
      altitude: location.coords.altitude ?? null,
      heading: location.coords.heading ?? null,
      speed: location.coords.speed ?? null,
    };
    
    // 위치 스무딩 적용
    const smoothedLocation = this.options.smoothing 
      ? this.applySmoothing(newLocation) 
      : newLocation;
    
    const historyPoint: LocationHistoryPoint = { ...smoothedLocation };
    
    // 이전 위치와 비교 정보 계산
    if (this.lastKnownLocation) {
      const prevLocation = this.lastKnownLocation;
      historyPoint.distanceToPrev = this.calculateDistance(
        prevLocation.position,
        smoothedLocation.position
      );
      historyPoint.timeSincePrev = smoothedLocation.timestamp - prevLocation.timestamp;
    }
    
    // 위치 히스토리 업데이트
    this.locationHistory.push(historyPoint);
    
    // 히스토리 크기 제한
    if (this.locationHistory.length > this.options.maxHistoryLength) {
      this.locationHistory.shift();
    }
    
    // 마지막 위치 저장
    this.lastKnownLocation = smoothedLocation;
    
    // 예측 트래킹 적용
    const predictedLocation = this.options.predictiveTracking 
      ? this.calculatePredictedLocation() 
      : smoothedLocation;
    
    // 리스너 호출
    this.notifyListeners(predictedLocation);
  }
  
  /**
   * 리스너들에게 위치 업데이트 알림
   * @param location 업데이트된 위치
   */
  private notifyListeners(location: EnhancedLocation): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(location);
      } catch (error) {
        console.error('위치 업데이트 리스너 오류:', error);
      }
    });
  }
  
  /**
   * 두 지점 간의 거리 계산 (Haversine 공식)
   * @param point1 첫 번째 지점
   * @param point2 두 번째 지점
   * @returns 두 지점 간의 거리 (미터)
   */
  public calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // 지구 반경 (미터)
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
  
  /**
   * 위치 스무딩 적용 (이동 평균 필터)
   * @param newLocation 새로 수신된 위치
   * @returns 스무딩된 위치
   */
  private applySmoothing(newLocation: EnhancedLocation): EnhancedLocation {
    if (!this.lastKnownLocation) {
      return newLocation;
    }
    
    const alpha = this.options.smoothingFactor;
    const lastLoc = this.lastKnownLocation;
    
    // 위치 스무딩
    const smoothedPosition: GeoPoint = {
      latitude: alpha * newLocation.position.latitude + (1 - alpha) * lastLoc.position.latitude,
      longitude: alpha * newLocation.position.longitude + (1 - alpha) * lastLoc.position.longitude,
    };
    
    // 방향 스무딩 (각도 보간)
    let smoothedHeading = newLocation.heading;
    if (lastLoc.heading != null && newLocation.heading != null) {
      smoothedHeading = this.smoothAngle(lastLoc.heading, newLocation.heading, alpha);
    }
    
    // 속도 스무딩
    let smoothedSpeed = newLocation.speed;
    if (lastLoc.speed != null && newLocation.speed != null) {
      smoothedSpeed = alpha * newLocation.speed + (1 - alpha) * lastLoc.speed;
    }
    
    return {
      ...newLocation,
      position: smoothedPosition,
      heading: smoothedHeading,
      speed: smoothedSpeed,
    };
  }
  
  /**
   * 각도 스무딩 (각도는 0-360 범위를 가지므로 특별한 처리 필요)
   * @param angle1 첫 번째 각도
   * @param angle2 두 번째 각도
   * @param alpha 가중치 (0-1)
   * @returns 스무딩된 각도
   */
  private smoothAngle(angle1: number, angle2: number, alpha: number): number {
    let diff = angle2 - angle1;
    
    // 각도 차이를 -180 ~ 180 범위로 조정
    if (diff > 180) {
      diff -= 360;
    }
    if (diff < -180) {
      diff += 360;
    }
    
    // 스무딩 적용
    let smoothed = angle1 + alpha * diff;
    
    // 결과를 0 ~ 360 범위로 조정
    smoothed = (smoothed + 360) % 360;
    
    return smoothed;
  }
  
  /**
   * 현재 속도와 방향을 기반으로 예측된 위치 계산
   * @returns 예측된 위치
   */
  private calculatePredictedLocation(): EnhancedLocation {
    const last = this.lastKnownLocation;
    if (!last || last.speed === null || last.heading === null) {
      return last || {
        position: { latitude: 0, longitude: 0 },
        timestamp: Date.now(),
        accuracy: null,
        altitude: null,
        heading: null,
        speed: null
      };
    }
    
    // Speed and heading values are definitely not null at this point
    const speed = last.speed;
    const heading = last.heading;
    
    // 현재 시간 기준으로 경과 시간 계산 (초)
    const elapsedSeconds = (Date.now() - last.timestamp) / 1000;
    
    // 낮은 속도나 짧은 시간은 예측 위치 계산 안함
    if (speed < 1 || elapsedSeconds < 0.5) {
      return last;
    }
    
    // 예측 거리 계산 (미터) - 현재 속도 기반
    const predictDistance = speed * elapsedSeconds;
    
    // 방향 라디안 변환
    const headingRad = (heading * Math.PI) / 180;
    
    // 위도, 경도 변화량 계산 (근사값)
    const latChange = predictDistance * Math.cos(headingRad) / 111111; // 위도 1도 = 약 111,111미터
    const lngChange = predictDistance * Math.sin(headingRad) / (111111 * Math.cos(last.position.latitude * Math.PI / 180));
    
    // 예측 위치
    const predictedPosition: GeoPoint = {
      latitude: last.position.latitude + latChange,
      longitude: last.position.longitude + lngChange,
    };
    
    return {
      ...last,
      position: predictedPosition,
      timestamp: Date.now(),
    };
  }
  
  /**
   * 현재 평균 속도 계산 (최근 n개 위치 기준)
   * @param sampleCount 계산에 사용할 최근 위치 개수
   * @returns 평균 속도 (m/s) 또는 null
   */
  public calculateAverageSpeed(sampleCount: number = 5): number | null {
    if (this.locationHistory.length < 2) {
      return this.lastKnownLocation?.speed ?? null;
    }
    
    const recentLocations = this.locationHistory.slice(-Math.min(sampleCount, this.locationHistory.length));
    
    // 각 위치 사이의 속도 계산 후 평균 계산
    let speedSum = 0;
    let count = 0;
    
    for (let i = 1; i < recentLocations.length; i++) {
      const prev = recentLocations[i - 1];
      
      if (prev.distanceToPrev !== undefined && prev.timeSincePrev !== undefined && prev.timeSincePrev > 0) {
        const speed = prev.distanceToPrev / (prev.timeSincePrev / 1000); // m/s
        speedSum += speed;
        count++;
      }
    }
    
    // 마지막으로 보고된 속도도 포함
    if (this.lastKnownLocation?.speed !== null && this.lastKnownLocation?.speed !== undefined) {
      speedSum += this.lastKnownLocation.speed;
      count++;
    }
    
    return count > 0 ? speedSum / count : null;
  }
  
  /**
   * 사용자 활동 유형 추정 (속도 기반)
   * @returns 사용자 활동 추정 ('stationary', 'walking', 'running', 'cycling', 'driving')
   */
  public estimateUserActivity(): string {
    const avgSpeed = this.calculateAverageSpeed();
    
    if (avgSpeed === null || avgSpeed < 0.5) {
      return 'stationary';
    } else if (avgSpeed < 2) {
      return 'walking';
    } else if (avgSpeed < 4) {
      return 'running';
    } else if (avgSpeed < 8) {
      return 'cycling';
    } else {
      return 'driving';
    }
  }
}

// Create a default instance and export it
const locationTrackingService = new LocationTrackingService();
export default locationTrackingService;