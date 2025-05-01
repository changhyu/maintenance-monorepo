import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LocationPoint, getCurrentLocation, getSavedLocations, getRecentLocations } from '../../services/LocationService';
import CustomMapView from '../../components/map/MapView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Navigation'>;

const NavigationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedLocations, setSavedLocations] = useState<LocationPoint[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationPoint[]>([]);

  // 현재 위치 가져오기
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        // 저장된 위치와 최근 방문 위치 가져오기
        setSavedLocations(getSavedLocations());
        setRecentLocations(getRecentLocations());
      } catch (error) {
        console.error('위치 정보를 가져오는 중 오류 발생:', error);
        Alert.alert('오류', '위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.');
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
  }, []);

  // 경로 검색 화면으로 이동
  const handleNavigate = () => {
    navigation.navigate('NavigationRoute', {
      origin: currentLocation || undefined,
    });
  };

  // 위치 검색 화면으로 이동
  const handleSearchLocation = () => {
    navigation.navigate('SearchLocation', { purpose: 'destination' });
  };

  // 저장된 위치를 선택하여 경로 검색
  const handleSelectSavedLocation = (location: LocationPoint) => {
    if (!currentLocation) {
      Alert.alert('현재 위치를 찾을 수 없습니다', '출발지를 먼저 설정해주세요.');
      return;
    }
    navigation.navigate('NavigationRoute', {
      origin: currentLocation,
      destination: location,
    });
  };

  // 로딩 표시
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>위치 정보를 가져오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 지도 표시 영역 */}
      <View style={styles.mapContainer}>
        <CustomMapView
          currentLocation={currentLocation || undefined}
          markers={[...(currentLocation ? [currentLocation] : []), ...savedLocations]}
          showsUserLocation={true}
          followsUserLocation={true}
        />
      </View>

      {/* 하단 검색 및 컨트롤 영역 */}
      <View style={styles.bottomSheet}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={handleSearchLocation}
        >
          <MaterialIcons name="search" size={24} color="#666" />
          <Text style={styles.searchText}>어디로 가시나요?</Text>
        </TouchableOpacity>

        <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>저장된 장소</Text>
          {savedLocations.map((location, index) => (
            <TouchableOpacity
              key={`saved-${index}`}
              style={styles.locationItem}
              onPress={() => handleSelectSavedLocation(location)}
            >
              <MaterialIcons name="place" size={24} color="#0066FF" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationAddress}>
                  {`위도: ${location.latitude.toFixed(4)}, 경도: ${location.longitude.toFixed(4)}`}
                </Text>
              </View>
              <MaterialIcons name="navigate-next" size={24} color="#999" />
            </TouchableOpacity>
          ))}

          {recentLocations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>최근 방문 장소</Text>
              {recentLocations.map((location, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  style={styles.locationItem}
                  onPress={() => handleSelectSavedLocation(location)}
                >
                  <MaterialIcons name="history" size={24} color="#0066FF" />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationAddress}>
                      {`위도: ${location.latitude.toFixed(4)}, 경도: ${location.longitude.toFixed(4)}`}
                    </Text>
                  </View>
                  <MaterialIcons name="navigate-next" size={24} color="#999" />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
          <MaterialIcons name="directions" size={24} color="white" />
          <Text style={styles.navigateButtonText}>경로 검색</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '60%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  locationList: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  navigateButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NavigationScreen; 