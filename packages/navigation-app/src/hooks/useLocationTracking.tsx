import { useEffect, useState, useRef, useCallback } from 'react';
import { LocationTrackingService, EnhancedLocation, TrackingOptions } from '../services/LocationTrackingService';
import { GeoPoint } from '../types';

/**
 * 향상된 위치 트래킹 기능을 위한 React Hook
 */
export function useLocationTracking() {
  const serviceRef = useRef<LocationTrackingService | null>(null);
  const [currentLocation, setCurrentLocation] = useState<EnhancedLocation | null>(null);
  const [locationHistory, setLocationHistory] = useState<EnhancedLocation[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [activity, setActivity] = useState<string>('stationary');
  
  // 서비스 초기화
  useEffect(() => {
    const service = new LocationTrackingService();
    serviceRef.current = service;
    
    // 권한 확인
    service.initialize().then(granted => {
      setPermissionGranted(granted);
    });
    
    // 위치 업데이트 리스너
    const locationListener = (location: EnhancedLocation) => {
      setCurrentLocation(location);
      setLocationHistory(prev => [...prev, location].slice(-20)); // 최대 20개 항목 유지
      
      // 활동 유형 추정 업데이트
      if (serviceRef.current) {
        setActivity(serviceRef.current.estimateUserActivity());
      }
    };
    
    service.addLocationUpdateListener(locationListener);
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.removeLocationUpdateListener(locationListener);
        serviceRef.current.stopTracking();
      }
    };
  }, []);
  
  /**
   * 트래킹 시작
   */
  const startTracking = useCallback(async () => {
    if (!serviceRef.current || !permissionGranted) {
      return false;
    }
    
    const success = await serviceRef.current.startTracking();
    setIsTracking(success);
    return success;
  }, [permissionGranted]);
  
  /**
   * 트래킹 중지
   */
  const stopTracking = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopTracking();
      setIsTracking(false);
    }
  }, []);
  
  /**
   * 트래킹 설정 업데이트
   */
  const updateOptions = useCallback((options: Partial<TrackingOptions>) => {
    if (serviceRef.current) {
      serviceRef.current.updateOptions(options);
    }
  }, []);
  
  /**
   * 현재 트래킹 설정 가져오기
   */
  const getOptions = useCallback((): TrackingOptions | null => {
    if (serviceRef.current) {
      return serviceRef.current.getOptions();
    }
    return null;
  }, []);
  
  /**
   * 두 지점 간의 거리 계산
   */
  const calculateDistance = useCallback((point1: GeoPoint, point2: GeoPoint): number => {
    if (serviceRef.current) {
      return serviceRef.current.calculateDistance(point1, point2);
    }
    return 0;
  }, []);
  
  /**
   * 현재 평균 속도 계산
   */
  const getAverageSpeed = useCallback((sampleCount: number = 5): number | null => {
    if (serviceRef.current) {
      return serviceRef.current.calculateAverageSpeed(sampleCount);
    }
    return null;
  }, []);
  
  /**
   * 이동 방향 (각도) 가져오기
   */
  const getHeading = useCallback((): number | null => {
    return currentLocation?.heading || null;
  }, [currentLocation]);
  
  /**
   * 최근 위치 기록 가져오기
   */
  const getLocationHistory = useCallback((): EnhancedLocation[] => {
    if (serviceRef.current) {
      return serviceRef.current.getLocationHistory();
    }
    return [];
  }, []);
  
  return {
    currentLocation,
    locationHistory,
    isTracking,
    permissionGranted,
    activity,
    startTracking,
    stopTracking,
    updateOptions,
    getOptions,
    calculateDistance,
    getAverageSpeed,
    getHeading,
    getLocationHistory,
  };
}