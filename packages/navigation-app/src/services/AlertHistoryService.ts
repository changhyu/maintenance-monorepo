import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationAlert } from './LocationAlertService';

export interface AlertHistoryItem {
  id: string;
  alertId: string;
  alertName: string;
  alertType: string;
  category?: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  userLatitude: number;
  userLongitude: number;
  distance: number; // 발생 당시 거리 (m)
  dismissed: boolean;
  dismissedAt?: number;
}

class AlertHistoryService {
  private historyItems: AlertHistoryItem[] = [];
  private readonly storageKey = 'alert_history';
  private readonly maxHistoryItems = 100; // 최대 히스토리 항목 수

  constructor() {
    this.loadHistory();
  }

  /**
   * 알림 히스토리 불러오기
   */
  private async loadHistory(): Promise<void> {
    try {
      const historyJson = await AsyncStorage.getItem(this.storageKey);
      if (historyJson) {
        this.historyItems = JSON.parse(historyJson);
      }
    } catch (error) {
      console.error('알림 히스토리 로드 중 오류:', error);
    }
  }

  /**
   * 알림 히스토리 저장
   */
  private async saveHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.historyItems));
    } catch (error) {
      console.error('알림 히스토리 저장 중 오류:', error);
    }
  }

  /**
   * 알림 기록 추가
   */
  public async addHistoryItem(
    alert: LocationAlert,
    userLocation: { latitude: number; longitude: number },
    distance: number
  ): Promise<void> {
    const historyItem: AlertHistoryItem = {
      id: Date.now().toString(),
      alertId: alert.id,
      alertName: alert.name,
      alertType: alert.type,
      category: alert.category,
      timestamp: Date.now(),
      latitude: alert.location.latitude,
      longitude: alert.location.longitude,
      userLatitude: userLocation.latitude,
      userLongitude: userLocation.longitude,
      distance,
      dismissed: false,
    };

    // 새 항목을 추가하고 최대 개수를 초과하면 가장 오래된 항목 제거
    this.historyItems.unshift(historyItem);
    if (this.historyItems.length > this.maxHistoryItems) {
      this.historyItems.pop();
    }

    await this.saveHistory();
  }

  /**
   * 알림 기록 확인으로 표시
   */
  public async markAsDismissed(historyId: string): Promise<boolean> {
    const index = this.historyItems.findIndex(item => item.id === historyId);
    if (index === -1) {
      return false;
    }

    this.historyItems[index] = {
      ...this.historyItems[index],
      dismissed: true,
      dismissedAt: Date.now(),
    };

    await this.saveHistory();
    return true;
  }

  /**
   * 모든 알림 기록 가져오기
   */
  public getAllHistory(): AlertHistoryItem[] {
    return [...this.historyItems];
  }

  /**
   * 특정 알림에 대한 기록 가져오기
   */
  public getHistoryByAlertId(alertId: string): AlertHistoryItem[] {
    return this.historyItems.filter(item => item.alertId === alertId);
  }

  /**
   * 특정 카테고리의 알림 기록 가져오기
   */
  public getHistoryByCategory(category: string): AlertHistoryItem[] {
    return this.historyItems.filter(item => item.category === category);
  }

  /**
   * 날짜별 알림 기록 가져오기
   * @param date 특정 날짜 (Date 객체)
   * @returns 해당 날짜의 알림 기록 목록
   */
  public getHistoryByDate(date: Date): AlertHistoryItem[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.historyItems.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= startOfDay && itemDate <= endOfDay;
    });
  }

  /**
   * 지정된 기간의 알림 기록 가져오기
   */
  public getHistoryByDateRange(startDate: Date, endDate: Date): AlertHistoryItem[] {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return this.historyItems.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= start && itemDate <= end;
    });
  }

  /**
   * 알림 기록 삭제
   */
  public async deleteHistoryItem(historyId: string): Promise<boolean> {
    const initialLength = this.historyItems.length;
    this.historyItems = this.historyItems.filter(item => item.id !== historyId);
    
    if (this.historyItems.length < initialLength) {
      await this.saveHistory();
      return true;
    }
    
    return false;
  }

  /**
   * 모든 알림 기록 삭제
   */
  public async clearAllHistory(): Promise<void> {
    this.historyItems = [];
    await this.saveHistory();
  }

  /**
   * 특정 일수보다 오래된 기록 삭제
   */
  public async deleteOldHistory(days: number): Promise<number> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const initialLength = this.historyItems.length;
    
    this.historyItems = this.historyItems.filter(item => item.timestamp >= cutoffTime);
    
    const deletedCount = initialLength - this.historyItems.length;
    if (deletedCount > 0) {
      await this.saveHistory();
    }
    
    return deletedCount;
  }
}

// 싱글톤 인스턴스
export default new AlertHistoryService();