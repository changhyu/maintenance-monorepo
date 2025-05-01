import { create } from 'zustand';
import { Node, RoadSegment, GeoPoint, MapView, NavigationState, Route, RouteCalculationOptions } from '../types';
import { getClosestNode } from '../utils/mapUtils';
import { calculateRoute } from '../services/NavigationService';
import { RouteRecalculationService } from '../services/RouteRecalculationService';
import { MultiRouteService } from '../services/route/MultiRouteService';

interface NavigationStore {
  // 맵 데이터 상태
  nodes: Node[];
  roadSegments: RoadSegment[];
  
  // 맵 관련 액션
  setMapData: (data: { nodes: Node[], roadSegments: RoadSegment[] }) => void;
  addNode: (node: Node) => void;
  addRoadSegment: (roadSegment: RoadSegment) => void;
  clearMapData: () => void;
  
  // 지도 뷰 관련
  mapView: MapView;
  setMapCenter: (center: GeoPoint) => void;
  setMapZoom: (zoom: number) => void;
  setMapBearing: (bearing: number) => void;
  setMapTilt: (tilt: number) => void;
  toggleFollowUser: () => void;
  
  // 내비게이션 상태
  navigationState: NavigationState;
  
  // 경로 계산 및 설정
  calculateRoute: (origin: GeoPoint, destination: GeoPoint, options?: RouteCalculationOptions) => Promise<Route>;
  setCurrentRoute: (route: Route | undefined) => void;
  
  // 다중 경유지 관련
  waypoints: GeoPoint[];
  addWaypoint: (waypoint: GeoPoint) => void;
  removeWaypoint: (index: number) => void;
  clearWaypoints: () => void;
  reorderWaypoint: (fromIndex: number, toIndex: number) => void;
  optimizeWaypoints: () => void;
  calculateMultiWaypointRoute: (origin: GeoPoint, destination: GeoPoint, options?: RouteCalculationOptions) => Promise<Route>;
  
  // 내비게이션 제어
  startNavigation: () => void;
  stopNavigation: () => void;
  pauseNavigation: () => void;
  resumeNavigation: () => void;
  
  // 경로 재계산 관련
  autoRecalculateRouteEnabled: boolean;
  routeRecalculationOptions: RouteCalculationOptions;
  setAutoRecalculateRoute: (enabled: boolean) => void;
  setRouteRecalculationOptions: (options: RouteCalculationOptions) => void;
  
  // 내비게이션 상태 업데이트
  updateCurrentPosition: (position: GeoPoint) => void;
}

// 경로 재계산 서비스 인스턴스 생성
const routeRecalculationService = new RouteRecalculationService();

// 다중 경유지 서비스 인스턴스 생성
const multiRouteService = new MultiRouteService();

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  // 맵 데이터 초기 상태
  nodes: [],
  roadSegments: [],
  
  // 맵 관련 액션
  setMapData: (data: { nodes: Node[], roadSegments: RoadSegment[] }) => {
    set({
      nodes: data.nodes,
      roadSegments: data.roadSegments
    });
  },
  
  addNode: (node: Node) => {
    set(state => ({
      nodes: [...state.nodes, node]
    }));
  },
  
  addRoadSegment: (roadSegment: RoadSegment) => {
    set(state => ({
      roadSegments: [...state.roadSegments, roadSegment]
    }));
  },
  
  clearMapData: () => {
    set({
      nodes: [],
      roadSegments: []
    });
  },
  
  // 지도 뷰 상태
  mapView: {
    center: { latitude: 37.566, longitude: 126.9784 }, // 서울시청 기준
    zoom: 15,
    bearing: 0,
    tilt: 0,
    followUser: true,
  },
  
  // 내비게이션 상태
  navigationState: {
    currentPosition: undefined,
    currentRoute: undefined,
    currentStepIndex: 0,
    navigationMode: 'idle',
    remainingDistance: 0,
    remainingDuration: 0,
    userOffRoute: false,
  },
  
  // 경로 재계산 관련 상태
  autoRecalculateRouteEnabled: true,
  routeRecalculationOptions: { algorithm: 'astar' },
  
  // 경유지 상태
  waypoints: [],
  
  // 지도 뷰 제어 액션
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
  
  // 경로 계산 및 설정
  calculateRoute: async (origin: GeoPoint, destination: GeoPoint, options?: RouteCalculationOptions) => {
    const { nodes, roadSegments } = get();
    
    if (nodes.length === 0 || roadSegments.length === 0) {
      throw new Error('지도 데이터가 로드되지 않았습니다.');
    }
    
    try {
      // Navigation Service의 calculateRoute 함수 사용
      const routeOptions: RouteCalculationOptions = {
        algorithm: options?.algorithm || 'astar',
        avoidHighways: options?.avoidHighways || false,
        considerTraffic: options?.considerTraffic || false,
        routeType: options?.routeType || 'fastest'
      };
      
      const route = await calculateRoute(origin, destination, routeOptions);
      
      if (!route) {
        throw new Error('경로를 찾을 수 없습니다.');
      }
      
      // 경로 설정
      set(state => ({
        navigationState: {
          ...state.navigationState,
          currentRoute: route,
          currentStepIndex: 0,
          remainingDistance: route.totalDistance,
          remainingDuration: route.totalDuration,
        },
        routeRecalculationOptions: routeOptions
      }));
      
      return route;
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      throw error;
    }
  },
  
  // 다중 경유지 경로 계산
  calculateMultiWaypointRoute: async (origin: GeoPoint, destination: GeoPoint, options: RouteCalculationOptions = {}) => {
    const { waypoints } = get();
    
    try {
      // 경유지가 없으면 일반 경로 계산
      if (waypoints.length === 0) {
        return await calculateRoute(origin, destination, options);
      }
      
      // 다중 경유지 경로 계산
      const routes = await multiRouteService.calculateMultiWaypointRoute(
        origin,
        waypoints,
        destination,
        options
      );
      
      // 경로 병합
      const mergedRoute = multiRouteService.mergeRoutes(routes);
      
      if (!mergedRoute) {
        throw new Error('경로 병합에 실패했습니다.');
      }
      
      // 경로 설정
      set(state => ({
        navigationState: {
          ...state.navigationState,
          currentRoute: mergedRoute,
          currentStepIndex: 0,
          remainingDistance: mergedRoute.totalDistance,
          remainingDuration: mergedRoute.totalDuration,
        },
        routeRecalculationOptions: options
      }));
      
      return mergedRoute;
    } catch (error) {
      console.error('다중 경유지 경로 계산 중 오류 발생:', error);
      throw error;
    }
  },
  
  // 경유지 관리
  addWaypoint: (waypoint: GeoPoint) => {
    set(state => ({
      waypoints: [...state.waypoints, waypoint]
    }));
  },
  
  removeWaypoint: (index: number) => {
    set(state => ({
      waypoints: state.waypoints.filter((_, i) => i !== index)
    }));
  },
  
  clearWaypoints: () => {
    set({ waypoints: [] });
  },
  
  reorderWaypoint: (fromIndex: number, toIndex: number) => {
    set(state => {
      const newWaypoints = [...state.waypoints];
      const [movedWaypoint] = newWaypoints.splice(fromIndex, 1);
      newWaypoints.splice(toIndex, 0, movedWaypoint);
      return { waypoints: newWaypoints };
    });
  },
  
  optimizeWaypoints: () => {
    const { waypoints, navigationState } = get();
    
    if (!navigationState.currentPosition || !navigationState.currentRoute) {
      return;
    }
    
    const optimizedWaypoints = multiRouteService.optimizeWaypoints(
      navigationState.currentPosition,
      waypoints,
      navigationState.currentRoute.destination
    );
    
    set({ waypoints: optimizedWaypoints });
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
  
  // 경로 재계산 관련 액션
  setAutoRecalculateRoute: (enabled: boolean) => {
    set({ autoRecalculateRouteEnabled: enabled });
  },
  
  setRouteRecalculationOptions: (options: RouteCalculationOptions) => {
    set({ routeRecalculationOptions: options });
  },
  
  // 내비게이션 제어
  startNavigation: () => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: 'navigating'
      }
    }));
  },
  
  stopNavigation: () => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: 'idle',
        currentStepIndex: 0
      }
    }));
  },
  
  pauseNavigation: () => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: state.navigationState.navigationMode === 'navigating' ? 'idle' : state.navigationState.navigationMode
      }
    }));
  },
  
  resumeNavigation: () => {
    set(state => ({
      navigationState: {
        ...state.navigationState,
        navigationMode: state.navigationState.navigationMode === 'idle' && state.navigationState.currentRoute ? 'navigating' : state.navigationState.navigationMode
      }
    }));
  },
  
  // 내비게이션 상태 업데이트
  updateCurrentPosition: (position: GeoPoint) => {
    const { 
      navigationState, 
      autoRecalculateRouteEnabled, 
      routeRecalculationOptions 
    } = get();
    
    const { currentRoute, navigationMode } = navigationState;
    
    if (!currentRoute || navigationMode !== 'navigating') {
      set(state => ({
        navigationState: {
          ...state.navigationState,
          currentPosition: position
        },
        mapView: state.mapView.followUser ? {
          ...state.mapView,
          center: position
        } : state.mapView
      }));
      return;
    }
    
    // 경로 이탈 확인 및 재계산 검토
    const closestNode = getClosestNode(position);
    const userOffRoute = closestNode ? !currentRoute.roadSegmentIds.some(segId => {
      return closestNode.connections.includes(segId);
    }) : false;
    
    if (userOffRoute && autoRecalculateRouteEnabled) {
      // 경로 이탈 확인 및 재계산
      routeRecalculationService.checkRouteDeviation(
        position,
        currentRoute,
        routeRecalculationOptions
      ).then(newRoute => {
        if (newRoute) {
          console.log('경로 재계산됨');
          set(state => ({
            navigationState: {
              ...state.navigationState,
              currentRoute: newRoute,
              currentStepIndex: 0,
              remainingDistance: newRoute.totalDistance,
              remainingDuration: newRoute.totalDuration,
              userOffRoute: false
            }
          }));
        }
      }).catch(error => {
        console.error('경로 재계산 실패:', error);
      });
    }
    
    set(state => ({
      navigationState: {
        ...state.navigationState,
        currentPosition: position,
        userOffRoute
      },
      mapView: state.mapView.followUser ? {
        ...state.mapView,
        center: position
      } : state.mapView
    }));
  }
}));