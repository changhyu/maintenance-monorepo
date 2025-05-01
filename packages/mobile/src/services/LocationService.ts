import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  name?: string;
}

// 현재 위치 정보 가져오기
export const getCurrentLocation = async (): Promise<LocationPoint | null> => {
  try {
    // 위치 권한 요청
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('위치 권한이 필요합니다', '앱에서 현재 위치를 가져오려면 위치 접근 권한이 필요합니다.');
      return null;
    }
    
    // 현재 위치 가져오기
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('현재 위치를 가져오는 중 오류 발생:', error);
    return null;
  }
};

// 위치 역변환 (좌표 -> 주소)
export const reverseGeocode = async (
  location: LocationPoint
): Promise<string> => {
  try {
    const geocodeResult = await Location.reverseGeocodeAsync({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    
    if (geocodeResult.length > 0) {
      const address = geocodeResult[0];
      return `${address.city || ''} ${address.district || ''} ${address.street || ''} ${address.name || ''}`.trim();
    }
    
    return '주소를 찾을 수 없습니다';
  } catch (error) {
    console.error('역지오코딩 중 오류 발생:', error);
    return '주소를 찾을 수 없습니다';
  }
};

// 위치 검색 (주소로 검색)
export const searchLocationByText = async (
  searchText: string
): Promise<LocationPoint[]> => {
  try {
    const geocodeResult = await Location.geocodeAsync(searchText);
    
    return geocodeResult.map((item, index) => ({
      latitude: item.latitude,
      longitude: item.longitude,
      name: `검색 결과 ${index + 1}`,
    }));
  } catch (error) {
    console.error('위치 검색 중 오류 발생:', error);
    return [];
  }
};

// 더미 위치 데이터 (실제 앱에서는 API 연동 필요)
export const getSavedLocations = (): LocationPoint[] => {
  return [
    {
      latitude: 37.5665,
      longitude: 126.9780,
      name: '서울 시청',
    },
    {
      latitude: 37.5113,
      longitude: 127.0980,
      name: '잠실 롯데타워',
    },
    {
      latitude: 35.1796,
      longitude: 129.0756,
      name: '부산 해운대',
    },
    {
      latitude: 33.450701,
      longitude: 126.570667,
      name: '제주 시청',
    },
  ];
};

// 최근 방문 위치 (실제 앱에서는 DB나 AsyncStorage에 저장 필요)
export const getRecentLocations = (): LocationPoint[] => {
  return [
    {
      latitude: 37.5830,
      longitude: 126.9850,
      name: '경복궁',
    },
    {
      latitude: 37.5115,
      longitude: 127.0227,
      name: '코엑스',
    },
  ];
}; 