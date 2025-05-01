import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { GeoPoint } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertHistoryService from './AlertHistoryService';

// 위치 알림 설정 타입
export interface LocationAlert {
  id: string;
  name: string;
  description: string;
  location: GeoPoint;
  radius: number; // 미터 단위
  active: boolean;
  oneTime: boolean; // 한 번만 알림 여부
  notified: boolean; // 알림 발생 여부
  createdAt: number;
  type: 'proximity' | 'geofence' | 'destination'; // 알림 유형
  category?: string; // 알림 카테고리 추가
  notificationTitle?: string;
  notificationBody?: string;
  silentNotification?: boolean; // 소리 없는 알림 여부
  icon?: string; // 아이콘 (예: 'pin', 'car', 'alert', 'star', 'home', 'work')
  color?: string; // 아이콘 색상
  actions?: Array<{
    title: string;
    action: string;
    data?: any;
  }>; // 알림 작업
}

// 기본 카테고리 정의
export const DEFAULT_CATEGORIES = [
  '집', '직장', '학교', '쇼핑', '여행', '즐겨찾기', '기타'
];

// 항목 간 거리 계산 (하버사인 공식)
const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
  const R = 6371000; // 지구 반지름 (미터)
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

class LocationAlertService {
  private alerts: Map<string, LocationAlert> = new Map();
  private storageKey = 'location_alerts';
  private categoriesKey = 'location_alert_categories';
  private watchId: any = null;
  private isWatching = false;
  private alertListeners: ((alert: LocationAlert) => void)[] = [];
  private readonly notificationDistance = 10; // 알림 트리거 거리 (미터)
  private readonly watchInterval = 10000; // 위치 추적 간격 (밀리초)
  private readonly locationOptions = {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 10, // 10미터마다 업데이트
    timeInterval: 10000, // 10초마다 업데이트
    mayShowUserSettingsDialog: false,
  };
  private categories: string[] = [...DEFAULT_CATEGORIES]; // 카테고리 목록

  constructor() {
    this.loadAlerts();
    this.loadCategories();
  }

  /**
   * 위치 알림 목록 불러오기
   */
  private async loadAlerts(): Promise<void> {
    try {
      const alertsJson = await AsyncStorage.getItem(this.storageKey);
      if (alertsJson) {
        const alertsArray: LocationAlert[] = JSON.parse(alertsJson);
        alertsArray.forEach((alert) => {
          this.alerts.set(alert.id, alert);
        });
      }
    } catch (error) {
      console.error('위치 알림 로드 중 오류:', error);
    }
  }

  /**
   * 위치 알림 목록 저장
   */
  private async saveAlerts(): Promise<void> {
    try {
      const alertsArray = Array.from(this.alerts.values());
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(alertsArray));
    } catch (error) {
      console.error('위치 알림 저장 중 오류:', error);
    }
  }

  /**
   * 모든 위치 알림 가져오기
   */
  public getAllAlerts(): LocationAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 카테고리별 위치 알림 가져오기
   */
  public getAlertsByCategory(category?: string): LocationAlert[] {
    if (!category) {
      return this.getAllAlerts();
    }
    return this.getAllAlerts().filter(alert => alert.category === category);
  }

  /**
   * 특정 위치 알림 가져오기
   */
  public getAlert(id: string): LocationAlert | undefined {
    return this.alerts.get(id);
  }

  /**
   * 모든 카테고리 가져오기
   */
  public getAllCategories(): string[] {
    return [...this.categories];
  }

  /**
   * 새 카테고리 추가
   */
  public async addCategory(categoryName: string): Promise<boolean> {
    if (!categoryName || this.categories.includes(categoryName)) {
      return false;
    }

    this.categories.push(categoryName);
    await this.saveCategories();
    return true;
  }

  /**
   * 카테고리 삭제
   */
  public async removeCategory(categoryName: string): Promise<boolean> {
    // 기본 카테고리는 삭제 불가능
    if (DEFAULT_CATEGORIES.includes(categoryName)) {
      return false;
    }

    const index = this.categories.indexOf(categoryName);
    if (index === -1) {
      return false;
    }

    // 해당 카테고리를 사용하는 알림들의 카테고리를 '기타'로 변경
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.category === categoryName) {
        alert.category = '기타';
        this.alerts.set(id, alert);
      }
    }

    this.categories.splice(index, 1);
    await Promise.all([this.saveCategories(), this.saveAlerts()]);
    return true;
  }

  /**
   * 카테고리 목록 불러오기
   */
  private async loadCategories(): Promise<void> {
    try {
      const categoriesJson = await AsyncStorage.getItem(this.categoriesKey);
      if (categoriesJson) {
        const loadedCategories = JSON.parse(categoriesJson) as string[];
        
        // DEFAULT_CATEGORIES에 있는 카테고리는 항상 포함되도록 함
        const combinedCategories = new Set([
          ...DEFAULT_CATEGORIES,
          ...loadedCategories
        ]);
        
        this.categories = Array.from(combinedCategories);
      }
    } catch (error) {
      console.error('카테고리 로드 중 오류:', error);
    }
  }

  /**
   * 카테고리 목록 저장
   */
  private async saveCategories(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.categoriesKey, JSON.stringify(this.categories));
    } catch (error) {
      console.error('카테고리 저장 중 오류:', error);
    }
  }

  /**
   * 새 위치 알림 추가
   */
  public async addAlert(alert: Omit<LocationAlert, 'id' | 'createdAt' | 'notified'>): Promise<string> {
    const id = Date.now().toString();
    const newAlert: LocationAlert = {
      ...alert,
      id,
      createdAt: Date.now(),
      notified: false,
      // 카테고리가 없으면 '기타'로 설정
      category: alert.category || '기타',
    };

    this.alerts.set(id, newAlert);
    await this.saveAlerts();

    // 위치 모니터링이 필요하면 시작
    if (newAlert.active && !this.isWatching) {
      this.startWatchingLocation();
    }

    return id;
  }

  /**
   * 위치 알림 업데이트
   */
  public async updateAlert(id: string, data: Partial<LocationAlert>): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) {
      return false;
    }

    const updatedAlert = {
      ...alert,
      ...data,
    };

    this.alerts.set(id, updatedAlert);
    await this.saveAlerts();

    // 위치 모니터링 상태 업데이트
    this.updateWatchingStatus();

    return true;
  }

  /**
   * 위치 알림 삭제
   */
  public async deleteAlert(id: string): Promise<boolean> {
    const result = this.alerts.delete(id);
    
    if (result) {
      await this.saveAlerts();
      // 위치 모니터링 상태 업데이트
      this.updateWatchingStatus();
    }
    
    return result;
  }

  /**
   * 위치 알림 활성화/비활성화
   */
  public async setAlertActive(id: string, active: boolean): Promise<boolean> {
    return this.updateAlert(id, { active });
  }

  /**
   * 위치 알림 초기화
   */
  public async resetAlert(id: string): Promise<boolean> {
    return this.updateAlert(id, { notified: false });
  }

  /**
   * 위치 추적 시작
   */
  public async startWatchingLocation(): Promise<boolean> {
    if (this.isWatching || this.watchId !== null) {
      return true;
    }

    try {
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('위치 권한이 거부되었습니다.');
        return false;
      }

      // 백그라운드 위치 권한 요청 (iOS만)
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = 
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('백그라운드 위치 권한이 거부되었습니다. 앱이 포그라운드에 있을 때만 알림이 작동합니다.');
        }
      }

      // 위치 추적 시작
      this.watchId = await Location.watchPositionAsync(
        this.locationOptions,
        this.handleLocationUpdate
      );

      this.isWatching = true;
      return true;
    } catch (error) {
      console.error('위치 추적 시작 중 오류:', error);
      return false;
    }
  }

  /**
   * 위치 추적 중지
   */
  public stopWatchingLocation(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
      this.isWatching = false;
    }
  }

  /**
   * 위치 업데이트 처리
   */
  private handleLocationUpdate = (location: Location.LocationObject): void => {
    const currentLocation: GeoPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // 모든 알림에 대해 거리 확인
    for (const [id, alert] of this.alerts.entries()) {
      // 활성화된 알림만 처리
      if (alert.active && !alert.notified) {
        // 현재 위치와 알림 위치 간의 거리 계산
        const distance = calculateDistance(currentLocation, alert.location);

        // 지정된 반경 내에 있는 경우
        if (distance <= alert.radius) {
          // 알림 발생
          this.triggerAlert(alert, currentLocation, distance);

          // 일회성 알림인 경우 비활성화
          if (alert.oneTime) {
            this.updateAlert(id, { notified: true, active: false });
          } else {
            this.updateAlert(id, { notified: true });
          }
        }
      }
    }

    // 위치 모니터링 상태 업데이트
    this.updateWatchingStatus();
  };

  /**
   * 위치 모니터링 상태 업데이트
   * (활성화된 알림이 없으면 모니터링 중지)
   */
  private updateWatchingStatus(): void {
    // 활성화된 알림이 있는지 확인
    const hasActiveAlerts = Array.from(this.alerts.values()).some(
      alert => alert.active && !alert.notified
    );

    if (hasActiveAlerts && !this.isWatching) {
      this.startWatchingLocation();
    } else if (!hasActiveAlerts && this.isWatching) {
      this.stopWatchingLocation();
    }
  }

  /**
   * 알림 발생
   */
  private triggerAlert(alert: LocationAlert, userLocation: GeoPoint, distance: number): void {
    // 알림 리스너 호출
    this.alertListeners.forEach(listener => listener(alert));
    
    // 알림 히스토리에 기록
    AlertHistoryService.addHistoryItem(alert, userLocation, distance);
    
    // 여기에서 실제 알림 표시 로직 구현
    // (예: 로컬 푸시 알림, 소리 재생 등)
    console.log('위치 알림 발생:', alert.name);
  }

  /**
   * 알림 리스너 등록
   */
  public addAlertListener(listener: (alert: LocationAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * 알림 리스너 제거
   */
  public removeAlertListener(listener: (alert: LocationAlert) => void): void {
    this.alertListeners = this.alertListeners.filter(l => l !== listener);
  }

  /**
   * 알림 모두 초기화
   */
  public async resetAllAlerts(): Promise<void> {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.notified) {
        await this.updateAlert(id, { notified: false });
      }
    }
  }
}

// 싱글톤 인스턴스
export default new LocationAlertService();