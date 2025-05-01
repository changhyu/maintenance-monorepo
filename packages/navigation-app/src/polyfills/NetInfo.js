/**
 * React Native NetInfo 폴리필
 * 웹 환경에서 네트워크 상태 정보를 제공합니다.
 */

// 연결 상태 상수 정의
export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

// 연결 세부 정보 타입
export const NetInfoCellularGeneration = {
  '2g': '2g',
  '3g': '3g',
  '4g': '4g',
  '5g': '5g',
};

// 기본 네트워크 상태
const defaultState = {
  type: NetInfoStateType.wifi,
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    cellularGeneration: null,
  },
};

// 이벤트 리스너 관리
const listeners = new Set();

// 브라우저의 Navigator.connection 객체 접근
const getConnectionInfo = () => {
  if (typeof navigator !== 'undefined' && navigator.connection) {
    const { effectiveType, type, downlink, rtt, saveData } = navigator.connection;

    // 연결 타입 매핑
    let netInfoType = NetInfoStateType.unknown;
    if (type === 'wifi' || type === 'ethernet') {
      netInfoType = type;
    } else if (type === 'cellular' || /^[234]g$/.test(effectiveType)) {
      netInfoType = NetInfoStateType.cellular;
    } else if (type === 'none') {
      netInfoType = NetInfoStateType.none;
    } else {
      netInfoType = NetInfoStateType.other;
    }

    // 셀룰러 세대 매핑
    let cellularGeneration = null;
    if (effectiveType === '2g') cellularGeneration = NetInfoCellularGeneration['2g'];
    if (effectiveType === '3g') cellularGeneration = NetInfoCellularGeneration['3g'];
    if (effectiveType === '4g') cellularGeneration = NetInfoCellularGeneration['4g'];
    
    return {
      type: netInfoType,
      isConnected: netInfoType !== NetInfoStateType.none,
      isInternetReachable: netInfoType !== NetInfoStateType.none,
      details: {
        isConnectionExpensive: netInfoType === NetInfoStateType.cellular,
        cellularGeneration,
        downlink: downlink !== undefined ? downlink : null,
        rtt: rtt !== undefined ? rtt : null,
        saveData: saveData !== undefined ? saveData : false,
      },
    };
  }
  
  return defaultState;
};

// 네트워크 상태 변경 이벤트 처리
const handleConnectivityChange = () => {
  const state = getConnectionInfo();
  listeners.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.error('Error in NetInfo listener:', error);
    }
  });
};

// 브라우저 온라인/오프라인 이벤트 리스너 설정
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleConnectivityChange);
  window.addEventListener('offline', handleConnectivityChange);
  
  // Connection API 이벤트 리스너 (지원되는 브라우저)
  if (navigator.connection) {
    navigator.connection.addEventListener('change', handleConnectivityChange);
  }
}

// NetInfo API 구현
const NetInfo = {
  // 현재 네트워크 상태 조회
  fetch: async () => getConnectionInfo(),
  
  // 네트워크 상태 리스너 등록
  addEventListener: (listener) => {
    listeners.add(listener);
    return {
      remove: () => listeners.delete(listener),
    };
  },
  
  // 모든 리스너 제거
  removeAllListeners: () => {
    listeners.clear();
  },
  
  // 네트워크 유형 확인 유틸리티
  isConnected: {
    fetch: async () => getConnectionInfo().isConnected,
    addEventListener: (listener) => {
      const wrappedListener = (state) => {
        listener(state.isConnected);
      };
      listeners.add(wrappedListener);
      return {
        remove: () => listeners.delete(wrappedListener),
      };
    },
    removeAllListeners: () => {},
  },
  
  // 설정 API (웹 환경에서는 아무 작업도 수행하지 않음)
  configure: () => Promise.resolve(),
  
  // 현재 상태를 가져오는 동기 메서드 (웹 환경에서는 비동기와 동일)
  getCurrentState: () => Promise.resolve(getConnectionInfo()),
  
  // 유용한 상수들
  constants: {
    CONNECTIVITY_CHANGE: 'netInfo.networkStatusDidChange',
    CONNECTION_TYPE_UNKNOWN: NetInfoStateType.unknown,
    CONNECTION_TYPE_NONE: NetInfoStateType.none,
    CONNECTION_TYPE_CELLULAR: NetInfoStateType.cellular,
    CONNECTION_TYPE_WIFI: NetInfoStateType.wifi,
    CONNECTION_TYPE_BLUETOOTH: NetInfoStateType.bluetooth,
    CONNECTION_TYPE_ETHERNET: NetInfoStateType.ethernet,
    CONNECTION_TYPE_WIMAX: NetInfoStateType.wimax,
    CONNECTION_TYPE_VPN: NetInfoStateType.vpn,
    CONNECTION_TYPE_OTHER: NetInfoStateType.other,
    CELLULAR_GENERATION_2G: NetInfoCellularGeneration['2g'],
    CELLULAR_GENERATION_3G: NetInfoCellularGeneration['3g'],
    CELLULAR_GENERATION_4G: NetInfoCellularGeneration['4g'],
    CELLULAR_GENERATION_5G: NetInfoCellularGeneration['5g'],
  },
};

export default NetInfo;