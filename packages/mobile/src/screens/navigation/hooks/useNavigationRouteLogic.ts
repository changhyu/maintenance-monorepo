import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import { LocationPoint, reverseGeocode } from '../../../services/LocationService';
import { RouteInfo, RouteStep, calculateRoute } from '../../../services/NavigationService';
import VoiceGuidanceService from '../../../services/VoiceGuidanceService';
import OfflineCacheService from '../../../services/OfflineCacheService';
import RouteHistoryService, { RouteHistoryEntry } from '../../../services/RouteHistoryService';

// Utils
import { calculateDistance } from '../utils/formatUtils';

/**
 * 두 위치가 서로 가까운지 확인하는 함수
 */
const isLocationNear = (loc1: LocationPoint, loc2: LocationPoint, thresholdKm: number = 0.5): boolean => {
  if (!loc1 || !loc2) {
    return false;
  }
  
  const distance = calculateDistance(
    loc1.latitude, 
    loc1.longitude, 
    loc2.latitude, 
    loc2.longitude
  );
  
  return distance < thresholdKm;
};

/**
 * 네비게이션 화면의 모든 상태와 로직을 관리하는 커스텀 훅
 */
export const useNavigationRouteLogic = (
  initialOrigin: LocationPoint | null, 
  initialDestination: LocationPoint | null
) => {
  // 기본 상태
  const [origin, setOrigin] = useState<LocationPoint | null>(initialOrigin);
  const [destination, setDestination] = useState<LocationPoint | null>(initialDestination);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [navigationStarted, setNavigationStarted] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isSavingRoute, setIsSavingRoute] = useState<boolean>(false);
  const [routeTitle, setRouteTitle] = useState<string>('');
  const [initError, setInitError] = useState<string | null>(null);
  
  // 네트워크 리스너 참조
  const networkListenerRemoveRef = useRef<(() => void) | null>(null);
  
  /**
   * 서비스 초기화 함수
   */
  const initializeServices = useCallback(async (retryCount = 3): Promise<boolean> => {
    try {
      console.log('서비스 초기화 시작...');

      await OfflineCacheService.initialize();
      setIsOffline(!OfflineCacheService.isNetworkAvailable());

      // 이전 리스너 정리
      if (networkListenerRemoveRef.current) {
        const removeFunc = networkListenerRemoveRef.current;
        removeFunc();
      }

      // 새 리스너 설정
      const listenerRemoveFunction = OfflineCacheService.addNetworkStatusChangeListener((isOnline) => {
        console.log('네트워크 상태 변경:', isOnline ? '온라인' : '오프라인');
        setIsOffline(!isOnline);
      });
      
      // 참조 업데이트
      networkListenerRemoveRef.current = listenerRemoveFunction;

      await VoiceGuidanceService.initialize();
      await RouteHistoryService.initialize();
      await loadRouteHistory();

      console.log('서비스 초기화 완료');
      setInitError(null);
      return true;
    } catch (error) {
      console.error('서비스 초기화 오류:', error);

      if (retryCount > 0) {
        console.log(`서비스 초기화 재시도 (${retryCount})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return initializeServices(retryCount - 1);
      }

      setInitError('서비스 초기화에 실패했습니다. 앱을 다시 시작해주세요.');
      return false;
    }
  }, []);

  /**
   * 경로 기록 로드 함수
   */
  const loadRouteHistory = async () => {
    try {
      const history = await RouteHistoryService.getRouteHistory();
      setRouteHistory(history);
    } catch (error) {
      console.error('경로 히스토리 로딩 오류:', error);
    }
  };

  /**
   * 위치 정보 업데이트 함수
   */
  const handleLocationUpdates = async (originPoint: LocationPoint, destinationPoint: LocationPoint) => {
    // 새 객체들 생성
    const initialOrigin = { ...originPoint };
    const initialDestination = { ...destinationPoint };
    
    // 결과 객체
    const result = {
      updatedOrigin: initialOrigin,
      updatedDestination: initialDestination
    };
    
    // 출발지 정보 업데이트
    if (!originPoint.name) {
      try {
        const originAddress = await reverseGeocode(initialOrigin);
        // 새 객체를 별도로 생성
        const newOrigin = { 
          latitude: initialOrigin.latitude,
          longitude: initialOrigin.longitude,
          name: originAddress 
        };
        
        // 결과와 상태 업데이트
        result.updatedOrigin = newOrigin;
        setOrigin(newOrigin);
      } catch (e) {
        console.error('출발지 역지오코딩 오류:', e);
      }
    }

    // 목적지 정보 업데이트
    if (!destinationPoint.name) {
      try {
        const destAddress = await reverseGeocode(initialDestination);
        // 새 객체를 별도로 생성
        const newDestination = {
          latitude: initialDestination.latitude,
          longitude: initialDestination.longitude,
          name: destAddress
        };
        
        // 결과와 상태 업데이트
        result.updatedDestination = newDestination;
        setDestination(newDestination);
      } catch (e) {
        console.error('목적지 역지오코딩 오류:', e);
      }
    }

    return result;
  };

  /**
   * 경로 캐싱 함수
   */
  const cacheCalculatedRoute = (originPoint: LocationPoint, destinationPoint: LocationPoint, routeData: RouteInfo) => {
    const routeToCache = {
      id: Date.now().toString(),
      origin: originPoint,
      destination: destinationPoint,
      routeInfo: routeData,
      timestamp: Date.now(),
      title: `${originPoint.name ?? '출발'} → ${destinationPoint.name ?? '도착'}`
    };

    OfflineCacheService.cacheRoute(routeToCache).catch(e =>
      console.error('경로 캐싱 오류:', e)
    );
  };

  /**
   * 경로 계산 함수
   */
  const calculateRouteInfo = async (retryCount = 2) => {
    if (!origin || !destination) {
      Alert.alert('경로를 계산할 수 없습니다', '출발지와 목적지를 모두 설정해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      // 오프라인 상태 처리
      if (isOffline) {
        const recentRoutes = await OfflineCacheService.getRecentRoutes();
        const cachedRoute = recentRoutes.find(r =>
          isLocationNear(r.origin, origin) && isLocationNear(r.destination, destination)
        );
        
        if (cachedRoute) {
          setRouteInfo(cachedRoute.routeInfo);
          Alert.alert('오프라인 모드', '캐시된 경로를 사용합니다.');
        } else {
          Alert.alert('오프라인 경로 없음', '이 경로에 대한 캐시 데이터가 없습니다.');
        }
        
        setLoading(false);
        return;
      }

      // 위치 정보 업데이트
      const { updatedOrigin, updatedDestination } = await handleLocationUpdates(origin, destination);
      
      try {
        // 경로 계산 API 호출
        const route = await calculateRoute(updatedOrigin, updatedDestination);
        setRouteInfo(route);
        
        // 계산된 경로 캐싱
        cacheCalculatedRoute(updatedOrigin, updatedDestination, route);
      } catch (routeError) {
        console.error('경로 계산 오류:', routeError);
        
        // 재시도 처리
        if (retryCount > 0) {
          console.log(`경로 계산 재시도 (${retryCount})...`);
          setTimeout(() => calculateRouteInfo(retryCount - 1), 1000);
          return;
        }
        
        Alert.alert('오류', '경로를 계산하는 중 문제가 발생했습니다.');
      }
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      Alert.alert('오류', '경로를 계산하는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 음성 안내 재생 함수
   */
  const playVoiceGuidance = async (step: RouteStep) => {
    if (!step) {
      console.error('유효하지 않은 경로 단계 정보');
      return;
    }
    
    try {
      if (isMuted) {
        return;
      }
      await VoiceGuidanceService.playRouteGuidance(step);
    } catch (error) {
      console.error('음성 안내 재생 오류:', error);
    }
  };

  /**
   * 토스트 표시 함수 (실제 구현은 앱에 맞게 수정 필요)
   */
  const showToast = (message: string) => {
    console.log('토스트:', message);
  };

  /**
   * 음소거 토글 함수
   */
  const toggleMute = () => {
    try {
      const newMuteState = VoiceGuidanceService.toggleMute();
      setIsMuted(newMuteState);
      showToast(newMuteState ? '음성 안내가 음소거되었습니다.' : '음성 안내가 활성화되었습니다.');
    } catch (error) {
      console.error('음성 안내 음소거 토글 오류:', error);
    }
  };

  /**
   * 경로 저장 함수
   */
  const saveRoute = async () => {
    if (!routeInfo) {
      return;
    }
    
    try {
      setIsSavingRoute(true);
      
      if (isOffline) {
        showToast('오프라인 상태에서는 임시로 저장됩니다. 온라인 상태가 되면 자동으로 동기화됩니다.');
      }
      
      const defaultTitle = `${origin?.name ?? '출발'} → ${destination?.name ?? '도착'} (${new Date().toLocaleString()})`;
      const title = routeTitle || defaultTitle;
      
      const savedRoute = await RouteHistoryService.saveRoute(routeInfo, title);
      
      if (savedRoute) {
        const isTemp = savedRoute.id.startsWith('temp_');
        Alert.alert(
          '저장 완료',
          isTemp
            ? '경로가 임시로 저장되었습니다. 온라인 상태가 되면 자동으로 동기화됩니다.'
            : '경로가 성공적으로 저장되었습니다.'
        );
        
        await loadRouteHistory();
      } else {
        Alert.alert('저장 실패', '경로를 저장하는데 문제가 발생했습니다.');
      }
    } catch (error) {
      console.error('경로 저장 중 오류 발생:', error);
      Alert.alert('오류', '경로를 저장하는 중 문제가 발생했습니다.');
    } finally {
      setIsSavingRoute(false);
      setRouteTitle('');
    }
  };

  /**
   * 저장된 경로 로드 함수
   */
  const loadRoute = (entry: RouteHistoryEntry) => {
    try {
      setShowHistory(false);
      
      if (!entry.routeInfo?.polyline || entry.routeInfo.polyline.length < 2) {
        Alert.alert('오류', '유효하지 않은 경로 데이터입니다.');
        return;
      }
      
      const entryOrigin = {
        latitude: entry.routeInfo.polyline[0].latitude,
        longitude: entry.routeInfo.polyline[0].longitude,
        name: entry.routeInfo.startAddress
      };
      
      const entryDestination = {
        latitude: entry.routeInfo.polyline[entry.routeInfo.polyline.length - 1].latitude,
        longitude: entry.routeInfo.polyline[entry.routeInfo.polyline.length - 1].longitude,
        name: entry.routeInfo.endAddress
      };
      
      setOrigin(entryOrigin);
      setDestination(entryDestination);
      setRouteInfo(entry.routeInfo);
      
      if (navigationStarted) {
        stopNavigation();
      }
      
      showToast('저장된 경로를 불러왔습니다.');
    } catch (error) {
      console.error('경로 로드 오류:', error);
      Alert.alert('오류', '저장된 경로를 불러오는 중 문제가 발생했습니다.');
    }
  };

  /**
   * 내비게이션 시작 함수
   */
  const startNavigation = () => {
    if (!routeInfo) {
      return;
    }
    
    try {
      setNavigationStarted(true);
      setCurrentStepIndex(0);
      
      if (routeInfo.steps.length > 0) {
        const firstStep = routeInfo.steps[0];
        playVoiceGuidance(firstStep);
      }
    } catch (error) {
      console.error('내비게이션 시작 오류:', error);
      Alert.alert('오류', '내비게이션을 시작하는 중 문제가 발생했습니다.');
      setNavigationStarted(false);
    }
  };

  /**
   * 내비게이션 중지 함수
   */
  const stopNavigation = async () => {
    try {
      setNavigationStarted(false);
      setCurrentStepIndex(0);
      await VoiceGuidanceService.stop();
    } catch (error) {
      console.error('내비게이션 중지 오류:', error);
    }
  };

  /**
   * 현재 경로 안내 단계 정보 반환 함수
   */
  const getCurrentStepInfo = (): RouteStep | null => {
    if (!routeInfo || !navigationStarted || routeInfo.steps.length === 0) {
      return null;
    }
    return routeInfo.steps[currentStepIndex];
  };

  /**
   * 다음 경로 안내 단계로 이동
   */
  const goToNextStep = () => {
    if (!routeInfo || currentStepIndex >= routeInfo.steps.length - 1) {
      return;
    }
    
    const newIndex = currentStepIndex + 1;
    setCurrentStepIndex(newIndex);
    playVoiceGuidance(routeInfo.steps[newIndex]);
  };

  /**
   * 이전 경로 안내 단계로 이동
   */
  const goToPreviousStep = () => {
    if (!routeInfo || currentStepIndex <= 0) {
      return;
    }
    
    const newIndex = currentStepIndex - 1;
    setCurrentStepIndex(newIndex);
    playVoiceGuidance(routeInfo.steps[newIndex]);
  };

  // 초기화 및 정리
  useEffect(() => {
    const initialize = async () => {
      await initializeServices();
    };

    initialize();

    return () => {
      // 리스너 정리
      if (networkListenerRemoveRef.current) {
        const removeFunc = networkListenerRemoveRef.current;
        removeFunc();
        networkListenerRemoveRef.current = null;
      }
      
      // 내비게이션 정지
      if (navigationStarted) {
        stopNavigation();
      }
      
      // 음성 가이드 정리
      VoiceGuidanceService.cleanup().catch(e => 
        console.error('VoiceGuidanceService 정리 중 오류:', e)
      );
    };
  }, []);

  // 리턴 값은 컴포넌트에서 사용할 상태와 액션들
  return {
    // 상태
    origin,
    destination,
    routeInfo,
    loading,
    navigationStarted,
    currentStepIndex,
    isMuted,
    isOffline,
    routeHistory,
    showHistory,
    isSavingRoute,
    routeTitle,
    initError,
    
    // 상태 설정자
    setOrigin,
    setDestination,
    setRouteInfo,
    setShowHistory,
    setRouteTitle,
    
    // 액션
    calculateRouteInfo,
    saveRoute,
    loadRoute,
    startNavigation,
    stopNavigation,
    toggleMute,
    initializeServices,
    goToNextStep,
    goToPreviousStep,
    
    // 유틸리티
    getCurrentStepInfo,
  };
};