import { useState, useEffect } from 'react';
import { Storage } from '../utils/storage';

// 사용자 환경설정 타입 정의
export interface UserPreferences {
  darkMode: boolean;
  language: string;
  unit: 'metric' | 'imperial';
  voiceNavigation: boolean;
  trafficAlerts: boolean;
  fontScale: number;
  mapLayerIndex: number;
}

// 기본 사용자 환경설정
const defaultPreferences: UserPreferences = {
  darkMode: false,
  language: 'ko',
  unit: 'metric',
  voiceNavigation: true,
  trafficAlerts: true,
  fontScale: 1.0,
  mapLayerIndex: 0,
};

// 환경설정 저장 키
const PREFERENCES_STORAGE_KEY = 'navigation_app_user_preferences';

/**
 * 사용자 환경설정을 관리하는 훅
 */
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedPreferences = await Storage.getItem(PREFERENCES_STORAGE_KEY);
        if (savedPreferences) {
          setPreferences({ ...defaultPreferences, ...JSON.parse(savedPreferences) });
        }
      } catch (error) {
        console.error('환경설정 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // 환경설정 업데이트 함수
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);
      await Storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updatedPreferences));
      return true;
    } catch (error) {
      console.error('환경설정 저장 오류:', error);
      return false;
    }
  };

  // 환경설정 초기화 함수
  const resetPreferences = async () => {
    try {
      setPreferences(defaultPreferences);
      await Storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(defaultPreferences));
      return true;
    } catch (error) {
      console.error('환경설정 초기화 오류:', error);
      return false;
    }
  };

  return {
    preferences,
    isLoading,
    updatePreferences,
    resetPreferences,
  };
};

export default useUserPreferences;