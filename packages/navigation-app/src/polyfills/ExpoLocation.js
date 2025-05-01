/**
 * Expo Location 폴리필
 * 웹 환경에서 Geolocation API를 사용하여 위치 서비스를 제공합니다.
 */

// 상수 정의
export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export const ActivityType = {
  Other: 1,
  AutomotiveNavigation: 2,
  Fitness: 3,
  OtherNavigation: 4,
  Airborne: 5,
};

export const GeofencingEventType = {
  Enter: 1,
  Exit: 2,
};

export const GeofencingRegionState = {
  Unknown: 0,
  Inside: 1,
  Outside: 2,
};

// 권한 상태 상수
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

// 이벤트 리스너 배열
const watchCallbacks = new Map();
let nextWatchId = 0;

// 헤드케이스 변환 함수 (브라우저와 expo 위치 객체 간 변환)
const transformPosition = (position) => {
  if (!position) {
    return {
      coords: {
        latitude: 0,
        longitude: 0,
        altitude: null,
        accuracy: 0,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
  }

  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    },
    timestamp: position.timestamp,
  };
};

// 웹 브라우저 위치 API 접근성 확인
const isLocationAvailable = () => {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
};

// Location 모듈 구현
const Location = {
  // 권한 확인
  getPermissionsAsync: async () => {
    if (!isLocationAvailable()) {
      return { status: PermissionStatus.DENIED, granted: false, canAskAgain: false };
    }

    try {
      // 권한을 직접 확인하려면 실제로 위치를 한 번 요청해봄
      await new Promise((resolve, reject) => {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then(permissionStatus => {
            if (permissionStatus.state === 'granted') {
              resolve({ status: PermissionStatus.GRANTED, granted: true });
            } else if (permissionStatus.state === 'prompt') {
              resolve({ status: PermissionStatus.UNDETERMINED, granted: false, canAskAgain: true });
            } else {
              resolve({ status: PermissionStatus.DENIED, granted: false, canAskAgain: false });
            }
          })
          .catch(err => {
            // permissions API가 지원되지 않는 경우
            resolve({ status: PermissionStatus.UNDETERMINED, granted: false, canAskAgain: true });
          });
      });

      return { status: PermissionStatus.GRANTED, granted: true };
    } catch (error) {
      console.warn('Error checking location permissions:', error);
      return { status: PermissionStatus.UNDETERMINED, granted: false, canAskAgain: true };
    }
  },

  // 권한 요청
  requestPermissionsAsync: async () => {
    if (!isLocationAvailable()) {
      return { status: PermissionStatus.DENIED, granted: false, canAskAgain: false };
    }

    try {
      // 실제 위치 요청으로 권한 프롬프트 표시
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          position => resolve(position),
          error => {
            if (error.code === 1) {
              // 사용자가 위치 권한을 거부한 경우
              reject({ status: PermissionStatus.DENIED, granted: false });
            } else {
              // 다른 오류 (타임아웃 등)
              resolve({ status: PermissionStatus.UNDETERMINED, granted: false });
            }
          },
          { timeout: 10000 }
        );
      });

      return { status: PermissionStatus.GRANTED, granted: true };
    } catch (error) {
      return {
        status: error.status || PermissionStatus.DENIED,
        granted: false,
        canAskAgain: true,
      };
    }
  },

  // 현재 위치 조회
  getCurrentPositionAsync: async (options = {}) => {
    if (!isLocationAvailable()) {
      throw new Error('Location service is not available');
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve(pos),
          err => reject(err),
          {
            timeout: options.timeout || 15000,
            maximumAge: options.maximumAge || 10000,
            enableHighAccuracy: options.accuracy >= Accuracy.High,
          }
        );
      });

      return transformPosition(position);
    } catch (error) {
      throw new Error(`Error getting current position: ${error.message}`);
    }
  },

  // 위치 변경 감시 시작
  watchPositionAsync: async (options = {}, callback) => {
    if (!isLocationAvailable()) {
      throw new Error('Location service is not available');
    }

    try {
      const watchId = nextWatchId++;
      const webWatchId = navigator.geolocation.watchPosition(
        position => {
          const transformedPosition = transformPosition(position);
          callback(transformedPosition);
        },
        error => {
          console.error('Error watching position:', error);
        },
        {
          timeout: options.timeout || 15000,
          maximumAge: options.maximumAge || 10000,
          enableHighAccuracy: options.accuracy >= Accuracy.High,
        }
      );

      watchCallbacks.set(watchId, webWatchId);

      return {
        remove: () => {
          if (watchCallbacks.has(watchId)) {
            navigator.geolocation.clearWatch(watchCallbacks.get(watchId));
            watchCallbacks.delete(watchId);
          }
        },
      };
    } catch (error) {
      throw new Error(`Error setting up location watcher: ${error.message}`);
    }
  },

  // 모든 위치 감시 해제
  removeAllWatchers: async () => {
    for (const webWatchId of watchCallbacks.values()) {
      navigator.geolocation.clearWatch(webWatchId);
    }
    watchCallbacks.clear();
  },

  // 지오코딩 (주소 -> 좌표)
  geocodeAsync: async (address) => {
    console.warn('geocodeAsync is not fully implemented in web environment');
    return [
      {
        latitude: 0,
        longitude: 0,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
    ];
  },

  // 역지오코딩 (좌표 -> 주소)
  reverseGeocodeAsync: async (location) => {
    console.warn('reverseGeocodeAsync is not fully implemented in web environment');
    return [
      {
        city: 'Unknown City',
        country: 'Unknown Country',
        district: null,
        isoCountryCode: 'ZZ',
        name: 'Unknown Location',
        postalCode: null,
        region: null,
        street: null,
        subregion: null,
        timezone: null,
      },
    ];
  },

  // 위치 추적 설정 (웹 환경에서는 더미 구현)
  startLocationUpdatesAsync: async (taskName, options = {}) => {
    console.warn('startLocationUpdatesAsync is not implemented in web environment');
  },

  // 위치 추적 중지
  stopLocationUpdatesAsync: async (taskName) => {
    console.warn('stopLocationUpdatesAsync is not implemented in web environment');
  },

  // 위치 추적 여부 확인
  hasStartedLocationUpdatesAsync: async (taskName) => {
    return false;
  },

  // 지오펜싱 기능 (웹 환경에서는 더미 구현)
  startGeofencingAsync: async (taskName, regions = []) => {
    console.warn('startGeofencingAsync is not implemented in web environment');
  },

  stopGeofencingAsync: async (taskName) => {
    console.warn('stopGeofencingAsync is not implemented in web environment');
  },

  hasStartedGeofencingAsync: async (taskName) => {
    return false;
  },

  // 위치 정확도 변환
  getProviderStatusAsync: async () => {
    return {
      locationServicesEnabled: isLocationAvailable(),
      backgroundModeEnabled: false,
      gpsAvailable: isLocationAvailable(),
      networkAvailable: navigator.onLine,
      passiveAvailable: isLocationAvailable(),
    };
  },

  // Heading(방향) 정보 (웹 환경에서는 더미 구현)
  watchHeadingAsync: async (callback) => {
    console.warn('watchHeadingAsync is not fully implemented in web environment');
    
    // 방향 센서가 있는 경우 사용 시도
    if (typeof DeviceOrientationEvent !== 'undefined') {
      const listener = (event) => {
        if (typeof event.webkitCompassHeading !== 'undefined') {
          callback({
            trueHeading: event.webkitCompassHeading,
            magHeading: event.webkitCompassHeading,
            accuracy: event.webkitCompassAccuracy,
          });
        } else if (typeof event.alpha !== 'undefined') {
          // DeviceOrientationEvent.alpha는 북쪽에서부터 시계 반대 방향으로의 회전
          // (나침반 헤딩의 반대 방향)
          const heading = 360 - event.alpha;
          callback({
            trueHeading: heading,
            magHeading: heading,
            accuracy: 3,
          });
        }
      };
      
      window.addEventListener('deviceorientation', listener);
      
      return {
        remove: () => {
          window.removeEventListener('deviceorientation', listener);
        },
      };
    }
    
    // DeviceOrientation이 지원되지 않는 경우 더미 데이터
    callback({
      trueHeading: 0,
      magHeading: 0,
      accuracy: 0,
    });
    
    return {
      remove: () => {},
    };
  },

  // 상수 내보내기
  Accuracy,
  ActivityType,
  GeofencingEventType,
  GeofencingRegionState,
};

export default Location;