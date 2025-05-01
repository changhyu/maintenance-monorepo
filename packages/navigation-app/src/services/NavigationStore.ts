import { create } from 'zustand';
import { GeoPoint, MapView, NavigationState, Route, RouteStep, Settings } from '../types';
import { calculateDistance, getClosestNode } from '../utils/mapUtils';
import { calculateRoute, RouteOptions } from './NavigationService';
import voiceGuidanceService, { getVoiceGuidanceMessage, getDistanceBasedGuidance } from './VoiceGuidanceService';
import locationTrackingService, { LocationAccuracy } from './LocationTrackingService';

interface NavigationStore {
  // 내비게이션 상태
  navigationState: NavigationState;
  // 지도 뷰 상태
  mapView: MapView;
  // 사용자 설정
  settings: Settings;
  // 최근 검색 위치
  recentSearches: GeoPoint[];
  // 저장된 위치
  savedLocations: { name: string; location: GeoPoint }[];
  // 최근 경로
  recentRoutes: Route[];
  
  // 액션: 경로 검색 및 설정
  calculateRoute: (origin: GeoPoint, destination: GeoPoint, options?: RouteOptions) => Promise<Route>;
  setCurrentRoute: (route: Route | undefined) => void;
  
  // 액션: 내비게이션 제어
  startNavigation: () => void;
  stopNavigation: () => void;
  pauseNavigation: () => void;
  resumeNavigation: () => void;
  
  // 액션: 내비게이션 상태 업데이트
  updateCurrentPosition: (position: GeoPoint) => void;
  moveToNextStep: () => void;
  moveToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  
  // 액션: 지도 뷰 제어
  setMapCenter: (center: GeoPoint) => void;
  setMapZoom: (zoom: number) => void;
  setMapBearing: (bearing: number) => void;
  setMapTilt: (tilt: number) => void;
  toggleFollowUser: () => void;
  
  // 액션: 설정 관리
  updateSettings: (newSettings: Partial<Settings>) => void;
  toggleVoiceGuidance: () => void;
  
  // 액션: 저장된 위치 관리
  saveLocation: (name: string, location: GeoPoint) => void;
  deleteLocation: (name: string) => void;
  
  // 액션: 최근 검색 관리
  addRecentSearch: (location: GeoPoint) => void;
  clearRecentSearches: () => void;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  // 초기 상태
  navigationState: {
    currentPosition: undefined,
    currentRoute: undefined,
    currentStepIndex: 0,
    navigationMode: 'idle',
    remainingDistance: 0,
    remainingDuration: 0,
    userOffRoute: false,
  },
  
  mapView: {
    center: { latitude: 37.566, longitude: 126.9784 }, // 서울시청 기준
    zoom: 15,
    bearing: 0,
    tilt: 0,
    followUser: true,
  },
  
  settings: {
    voiceEnabled: true,
    units: 'metric',
    trafficEnabled: true,
    nightMode: false,
    language: 'ko-KR',
    zoomLevel: 15,
  },
  
  recentSearches: [],
  savedLocations: [],
  recentRoutes: [],
  
  // 경로 계산 및 설정
  calculateRoute: async (origin: GeoPoint, destination: GeoPoint, options?: RouteOptions) => {
    try {
      const route = await calculateRoute(origin, destination, options);
      set(state => ({
        navigationState: {
          ...state.navigationState,
          currentRoute: route,
          currentStepIndex: 0,
          remainingDistance: route.totalDistance,
          remainingDuration: route.totalDuration,
        },
        recentRoutes: [route, ...state.recentRoutes.slice(0, 9)], // 최대 10개 보관
      }));

      return route;
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      throw error;
    }
  },
  
  setCurrentRoute: (route: Route | undefined) => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        currentRoute: route,
        currentStepIndex: 0,
        remainingDistance: route?.totalDistance || 0,
        remainingDuration: route?.totalDuration || 0,
      },
    }));
  },
  
  // 내비게이션 제어
  startNavigation: () => {
    const { navigationState, settings } = get();
    const { currentRoute } = navigationState;
    
    if (!currentRoute) return;
    
    const firstStep = currentRoute.steps[0];
    
    // 음성 안내 시작
    if (settings.voiceEnabled) {
      voiceGuidanceService.speak(getVoiceGuidanceMessage(firstStep));
    }
    
    // 위치 추적 시작
    if (!locationTrackingService.isCurrentlyTracking()) {
      locationTrackingService.startTracking({
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }).catch(error => {
        console.error('위치 추적 시작 실패:', error);
        if (settings.voiceEnabled) {
          voiceGuidanceService.speak('위치 정보를 사용할 수 없습니다. 위치 권한을 확인해주세요.');
        }
      });
      
      // 위치 업데이트 리스너 등록
      locationTrackingService.addLocationListener((position, accuracy, timestamp) => {
        // 위치 업데이트 처리
        get().updateCurrentPosition(position);
        
        // 예측 모드인 경우 낮은 정확도 알림
        if (locationTrackingService.isPredictionMode() && settings.voiceEnabled) {
          voiceGuidanceService.speak('GPS 신호가 약합니다. 위치 정보의 정확도가 떨어질 수 있습니다.');
        }
      });
    }
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: 'navigating',
        currentStepIndex: 0,
        remainingDistance: currentRoute.totalDistance,
        remainingDuration: currentRoute.totalDuration,
        userOffRoute: false,
      },
    }));
  },
  
  stopNavigation: () => {
    // 음성 안내 중지
    voiceGuidanceService.cancelAll();
    
    // 위치 추적 중지
    locationTrackingService.stopTracking();
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: 'idle',
        currentStepIndex: 0,
      },
    }));
  },
  
  pauseNavigation: () => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: state.navigationState.navigationMode === 'navigating' ? 'idle' : state.navigationState.navigationMode,
      },
    }));
  },
  
  resumeNavigation: () => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: state.navigationState.navigationMode === 'idle' && state.navigationState.currentRoute ? 'navigating' : state.navigationState.navigationMode,
      },
    }));
  },
  
  // 내비게이션 상태 업데이트
  updateCurrentPosition: (position: GeoPoint) => {
    const { navigationState, settings } = get();
    const { currentRoute, currentStepIndex, navigationMode } = navigationState;
    
    if (!currentRoute || navigationMode !== 'navigating') {
      set(state => ({
        navigationState: {
          ...state.navigationState,
          currentPosition: position,
        },
        mapView: state.mapView.followUser ? {
          ...state.mapView,
          center: position,
        } : state.mapView,
      }));
      return;
    }
    
    // 현재 단계와 다음 단계 정보
    const currentStep = currentRoute.steps[currentStepIndex];
    const nextStep = currentStepIndex < currentRoute.steps.length - 1 ? currentRoute.steps[currentStepIndex + 1] : null;
    
    if (!currentStep) return;
    
    // 현재 위치와 목적지 간의 거리 계산
    const distanceToEndPoint = calculateDistance(position, currentStep.endPoint);
    
    // 남은 거리 및 시간 계산
    let remainingDistance = distanceToEndPoint;
    let remainingDuration = distanceToEndPoint / (currentStep.distance / currentStep.duration || 1);
    
    // 다음 단계부터 마지막 단계까지의 거리 및 시간 추가
    for (let i = currentStepIndex + 1; i < currentRoute.steps.length; i++) {
      remainingDistance += currentRoute.steps[i].distance;
      remainingDuration += currentRoute.steps[i].duration;
    }
    
    // 경로 이탈 확인
    const closestNode = getClosestNode(position);
    const userOffRoute = closestNode ? !currentRoute.roadSegmentIds.some(segId => {
      const roadSegment = closestNode.connections.includes(segId);
      return roadSegment;
    }) : false;
    
    // 다음 단계로 진행할지 확인
    let nextStepIndex = currentStepIndex;
    
    if (distanceToEndPoint < 20 && nextStep) {
      // 다음 단계로 이동
      nextStepIndex = currentStepIndex + 1;
      
      // 음성 안내 재생
      if (settings.voiceEnabled) {
        voiceGuidanceService.speak(getVoiceGuidanceMessage(nextStep));
      }
    } else if (currentStepIndex === currentRoute.steps.length - 1 && distanceToEndPoint < 20) {
      // 목적지 도착
      set(state => ({
        navigationState: {
          ...state.navigationState,
          navigationMode: 'arrived',
          remainingDistance: 0,
          remainingDuration: 0,
        },
      }));
      
      // 도착 음성 안내
      if (settings.voiceEnabled) {
        voiceGuidanceService.speak('목적지에 도착했습니다.');
      }
      
      return;
    } else if (nextStep && settings.voiceEnabled) {
      // 거리 기반 안내 메시지 확인
      const distanceMessage = getDistanceBasedGuidance(distanceToEndPoint, nextStep);
      if (distanceMessage) {
        voiceGuidanceService.speak(distanceMessage);
      }
    }
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        currentPosition: position,
        currentStepIndex: nextStepIndex,
        remainingDistance,
        remainingDuration,
        userOffRoute,
        navigationMode: userOffRoute && state.navigationState.navigationMode === 'navigating' ? 'rerouting' : state.navigationState.navigationMode,
      },
      mapView: state.mapView.followUser ? {
        ...state.mapView,
        center: position,
        bearing: state.mapView.followUser ? calculateBearing(
          state.navigationState.currentPosition || position,
          position
        ) : state.mapView.bearing,
      } : state.mapView,
    }));
    
    // 경로 이탈 시 재탐색
    if (userOffRoute && navigationMode === 'navigating') {
      // 재라우팅 로직 구현
      setTimeout(async () => {
        try {
          // 재라우팅 상태로 변경
          set(state => ({
            navigationState: {
              ...state.navigationState,
              navigationMode: 'rerouting',
            }
          }));
          
          // 음성 안내
          if (settings.voiceEnabled) {
            voiceGuidanceService.speak('경로를 재계산합니다.');
          }
          
          // 현재 목적지를 유지한 채 현재 위치에서 새 경로 계산
          const destination = currentRoute.destination;
          const newRoute = await calculateRoute(position, destination, {
            considerTraffic: settings.trafficEnabled,
            preferFasterRoute: true,
          });
          
          // 새 경로 설정
          set(state => ({
            navigationState: {
              ...state.navigationState,
              currentRoute: newRoute,
              currentStepIndex: 0,
              remainingDistance: newRoute.totalDistance,
              remainingDuration: newRoute.totalDuration,
              navigationMode: 'navigating', // 다시 내비게이션 모드로 전환
              userOffRoute: false,
            }
          }));
          
          // 새 경로에 대한 음성 안내
          if (settings.voiceEnabled) {
            voiceGuidanceService.speak('새로운 경로로 안내합니다.');
            // 첫 번째 단계 안내
            if (newRoute.steps.length > 0) {
              setTimeout(() => {
                voiceGuidanceService.speak(getVoiceGuidanceMessage(newRoute.steps[0]));
              }, 1500); // 1.5초 후 첫 단계 안내
            }
          }
        } catch (error) {
          console.error('경로 재계산 중 오류 발생:', error);
          
          // 재라우팅 실패 처리
          set(state => ({
            navigationState: {
              ...state.navigationState,
              navigationMode: 'navigating', // 다시 내비게이션 모드로 전환
            }
          }));
          
          if (settings.voiceEnabled) {
            voiceGuidanceService.speak('경로 재계산에 실패했습니다. 경로로 복귀해 주세요.');
          }
        }
      }, 3000); // 3초 대기 후 재계산 (불필요한 재계산 방지)
    }
  },
  
  moveToNextStep: () => {
    const { navigationState, settings } = get();
    const { currentRoute, currentStepIndex } = navigationState;
    
    if (!currentRoute || currentStepIndex >= currentRoute.steps.length - 1) return;
    
    const nextStepIndex = currentStepIndex + 1;
    const nextStep = currentRoute.steps[nextStepIndex];
    
    // 음성 안내
    if (settings.voiceEnabled) {
      voiceGuidanceService.speak(getVoiceGuidanceMessage(nextStep));
    }
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        currentStepIndex: nextStepIndex,
      },
    }));
  },
  
  moveToPreviousStep: () => {
    const { navigationState, settings } = get();
    const { currentRoute, currentStepIndex } = navigationState;
    
    if (!currentRoute || currentStepIndex <= 0) return;
    
    const prevStepIndex = currentStepIndex - 1;
    const prevStep = currentRoute.steps[prevStepIndex];
    
    // 음성 안내
    if (settings.voiceEnabled) {
      voiceGuidanceService.speak(getVoiceGuidanceMessage(prevStep));
    }
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        currentStepIndex: prevStepIndex,
      },
    }));
  },
  
  goToStep: (stepIndex: number) => {
    const { navigationState, settings } = get();
    const { currentRoute } = navigationState;
    
    if (!currentRoute || stepIndex < 0 || stepIndex >= currentRoute.steps.length) return;
    
    const step = currentRoute.steps[stepIndex];
    
    // 음성 안내
    if (settings.voiceEnabled) {
      voiceGuidanceService.speak(getVoiceGuidanceMessage(step));
    }
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        currentStepIndex: stepIndex,
      },
    }));
  },
  
  // 지도 뷰 제어
  setMapCenter: (center: GeoPoint) => {
    set(state => ({
      mapView: {
        ...state.mapView,
        center,
        followUser: false, // 수동으로 지도 이동 시 팔로우 모드 해제
      },
    }));
  },
  
  setMapZoom: (zoom: number) => {
    set(state => ({
      mapView: {
        ...state.mapView,
        zoom: Math.max(1, Math.min(20, zoom)), // 줌 레벨 제한
      },
    }));
  },
  
  setMapBearing: (bearing: number) => {
    set(state => ({
      mapView: {
        ...state.mapView,
        bearing: (bearing + 360) % 360, // 0-360 범위로 정규화
      },
    }));
  },
  
  setMapTilt: (tilt: number) => {
    set(state => ({
      mapView: {
        ...state.mapView,
        tilt: Math.max(0, Math.min(60, tilt)), // 틸트 범위 제한
      },
    }));
  },
  
  toggleFollowUser: () => {
    const { navigationState } = get();
    
    // 현재 위치가 있는 경우만 중심 변경
    if (navigationState.currentPosition) {
      set(state => ({
        mapView: {
          ...state.mapView,
          followUser: !state.mapView.followUser,
          center: state.mapView.followUser ? state.mapView.center : navigationState.currentPosition!,
        },
      }));
    } else {
      set(state => ({
        mapView: {
          ...state.mapView,
          followUser: !state.mapView.followUser,
        },
      }));
    }
  },
  
  // 설정 관리
  updateSettings: (newSettings: Partial<Settings>) => {
    set(state => ({
      settings: {
        ...state.settings,
        ...newSettings,
      },
    }));
    
    // 음성 안내 설정 업데이트
    const { settings } = get();
    if ('voiceEnabled' in newSettings) {
      if (!newSettings.voiceEnabled) {
        voiceGuidanceService.cancelAll();
      }
    }
    
    voiceGuidanceService.setMuted(!settings.voiceEnabled);
    if (settings.language) {
      voiceGuidanceService.setLanguage(settings.language);
    }
  },
  
  toggleVoiceGuidance: () => {
    const { settings } = get();
    const newVoiceEnabled = !settings.voiceEnabled;
    
    set(state => ({
      settings: {
        ...state.settings,
        voiceEnabled: newVoiceEnabled,
      },
    }));
    
    voiceGuidanceService.setMuted(!newVoiceEnabled);
    if (!newVoiceEnabled) {
      voiceGuidanceService.cancelAll();
    }
  },
  
  // 저장된 위치 관리
  saveLocation: (name: string, location: GeoPoint) => {
    set(state => ({
      savedLocations: [
        { name, location },
        ...state.savedLocations.filter(item => item.name !== name), // 중복 이름 제거
      ],
    }));
  },
  
  deleteLocation: (name: string) => {
    set(state => ({
      savedLocations: state.savedLocations.filter(item => item.name !== name),
    }));
  },
  
  // 최근 검색 관리
  addRecentSearch: (location: GeoPoint) => {
    // 동일한 위치 중복 방지
    const isDuplicate = get().recentSearches.some(
      item => Math.abs(item.latitude - location.latitude) < 0.0001 && 
              Math.abs(item.longitude - location.longitude) < 0.0001
    );
    
    if (!isDuplicate) {
      set(state => ({
        recentSearches: [location, ...state.recentSearches].slice(0, 10), // 최대 10개 보관
      }));
    }
  },
  
  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));

// 방향 계산 유틸리티 함수
const calculateBearing = (start: GeoPoint, end: GeoPoint): number => {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const bearing = Math.atan2(y, x);

  // 라디안에서 각도로 변환하고 0-360 범위로 조정
  return ((bearing * 180) / Math.PI + 360) % 360;
};