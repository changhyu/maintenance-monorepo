import { useState, useEffect, useCallback } from 'react';
import navigationService, { 
  Coordinates, 
  Route, 
  RouteRequest, 
  NavigationAlert 
} from '../services/navigationService';

interface NavigationState {
  currentLocation: Coordinates | null;
  destination: Coordinates | null;
  route: Route | null;
  alerts: NavigationAlert[];
  isNavigating: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseNavigationOptions {
  alertRadius?: number;
  trafficUpdateInterval?: number; // in milliseconds
  sidoCode?: string; // 시도코드 for protected areas
}

/**
 * Custom hook for navigation functionality
 * 내비게이션 기능을 위한 커스텀 훅
 */
export const useNavigation = (options: UseNavigationOptions = {}) => {
  // Default options
  const {
    alertRadius = 5000,
    trafficUpdateInterval = 60000, // 1 minute
    sidoCode = '11' // Default to Seoul
  } = options;
  
  // Navigation state
  const [state, setState] = useState<NavigationState>({
    currentLocation: null,
    destination: null,
    route: null,
    alerts: [],
    isNavigating: false,
    isLoading: false,
    error: null
  });
  
  // Geolocation watcher ID
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // Traffic update interval ID
  const [trafficIntervalId, setTrafficIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  /**
   * Start watching user's current location
   * 사용자의 현재 위치 추적 시작
   */
  const startLocationTracking = useCallback(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState(prev => ({
            ...prev,
            currentLocation: { latitude, longitude },
            error: null
          }));
        },
        (error) => {
          setState(prev => ({
            ...prev,
            error: `위치 정보를 가져올 수 없습니다: ${error.message}`
          }));
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
      setWatchId(id);
    } else {
      setState(prev => ({
        ...prev,
        error: '이 브라우저는 위치 정보를 지원하지 않습니다.'
      }));
    }
  }, []);
  
  /**
   * Stop watching user's location
   * 사용자 위치 추적 중지
   */
  const stopLocationTracking = useCallback(() => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);
  
  /**
   * Start navigation to a destination
   * 목적지까지 내비게이션 시작
   */
  const startNavigation = useCallback(async (destination: Coordinates) => {
    try {
      setState(prev => ({
        ...prev,
        destination,
        isLoading: true,
        isNavigating: true,
        error: null
      }));
      
      // Ensure we have current location
      if (!state.currentLocation) {
        throw new Error('현재 위치를 찾을 수 없습니다.');
      }
      
      // Calculate initial route
      const routeRequest: RouteRequest = {
        origin: state.currentLocation,
        destination
      };
      
      const route = await navigationService.calculateRoute(routeRequest);
      
      setState(prev => ({
        ...prev,
        route,
        isLoading: false
      }));
      
      // Start periodic traffic updates
      if (trafficIntervalId) {
        clearInterval(trafficIntervalId);
      }
      
      const intervalId = setInterval(async () => {
        if (state.route) {
          try {
            const updatedRoute = await navigationService.updateRouteWithTraffic(state.route);
            setState(prev => ({
              ...prev,
              route: updatedRoute
            }));
          } catch (error) {
            console.error('Failed to update traffic:', error);
          }
        }
      }, trafficUpdateInterval);
      
      setTrafficIntervalId(intervalId);
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '경로를 계산할 수 없습니다.'
      }));
    }
  }, [state.currentLocation, trafficIntervalId, trafficUpdateInterval]);
  
  /**
   * Stop the current navigation
   * 현재 내비게이션 중지
   */
  const stopNavigation = useCallback(() => {
    // Clear traffic update interval
    if (trafficIntervalId) {
      clearInterval(trafficIntervalId);
      setTrafficIntervalId(null);
    }
    
    setState(prev => ({
      ...prev,
      destination: null,
      route: null,
      alerts: [],
      isNavigating: false
    }));
  }, [trafficIntervalId]);
  
  /**
   * Fetch and update alerts based on current location and route
   * 현재 위치와 경로에 따라 알림을 가져오고 업데이트
   */
  const updateAlerts = useCallback(async () => {
    if (!state.currentLocation) return;
    
    try {
      // Get general traffic alerts
      const trafficAlerts = await navigationService.getNearbyAlerts(
        state.currentLocation,
        state.route || undefined,
        alertRadius
      );
      
      // Check for protected areas
      const protectedAreaAlerts = await navigationService.checkProtectedAreas(
        state.currentLocation,
        sidoCode
      );
      
      // Combine all alerts
      setState(prev => ({
        ...prev,
        alerts: [...trafficAlerts, ...protectedAreaAlerts]
      }));
    } catch (error) {
      console.error('Error updating alerts:', error);
    }
  }, [state.currentLocation, state.route, alertRadius, sidoCode]);
  
  // Start location tracking when the hook is initialized
  useEffect(() => {
    startLocationTracking();
    
    // Cleanup function
    return () => {
      stopLocationTracking();
      if (trafficIntervalId) {
        clearInterval(trafficIntervalId);
      }
    };
  }, [startLocationTracking, stopLocationTracking, trafficIntervalId]);
  
  // Update alerts whenever location or route changes
  useEffect(() => {
    if (state.isNavigating && state.currentLocation) {
      updateAlerts();
    }
  }, [state.isNavigating, state.currentLocation, state.route, updateAlerts]);
  
  /**
   * Recalculate route if needed (e.g. when user deviates from the path)
   * 필요한 경우 경로 재계산 (예: 사용자가 경로를 벗어난 경우)
   */
  const recalculateRoute = useCallback(async () => {
    if (!state.currentLocation || !state.destination || !state.isNavigating) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const routeRequest: RouteRequest = {
        origin: state.currentLocation,
        destination: state.destination
      };
      
      const route = await navigationService.calculateRoute(routeRequest);
      
      setState(prev => ({
        ...prev,
        route,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '경로를 재계산할 수 없습니다.'
      }));
    }
  }, [state.currentLocation, state.destination, state.isNavigating]);
  
  /**
   * Calculate ETA (Estimated Time of Arrival) in minutes
   * 도착 예상 시간을 분 단위로 계산
   */
  const getETA = useCallback((): number | null => {
    if (!state.route) return null;
    
    const now = new Date();
    return Math.round((state.route.expectedArrivalTime.getTime() - now.getTime()) / 60000);
  }, [state.route]);
  
  /**
   * Format distance for display
   * 표시를 위한 거리 포맷팅
   */
  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }, []);
  
  /**
   * Format duration for display
   * 표시를 위한 시간 포맷팅
   */
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  }, []);
  
  return {
    // State
    currentLocation: state.currentLocation,
    destination: state.destination,
    route: state.route,
    alerts: state.alerts,
    isNavigating: state.isNavigating,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    startNavigation,
    stopNavigation,
    recalculateRoute,
    
    // Utility functions
    getETA,
    formatDistance,
    formatDuration
  };
};

export default useNavigation;