import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE, MapPressEvent, Polygon } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import offlineMapService, { OfflineRegion } from '../services/OfflineMapService';
import { GeoPoint } from '../types';
import { generateRegionId } from '../utils/idGenerator';

// 지도 선택 화면에 필요한 파라미터 타입
type MapSelectionRouteParams = {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
};

export const MapSelectionScreen = () => {
  // 네비게이션 및 라우트 파라미터
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, MapSelectionRouteParams>, string>>();

  // 초기 지도 영역 설정
  const initialRegion = route.params?.initialRegion || {
    latitude: 37.566, // 서울시청 기본값
    longitude: 126.9784,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1
  };

  // 상태 관리
  const [mapRegion, setMapRegion] = useState<Region>(initialRegion);
  const [selectedBounds, setSelectedBounds] = useState<{
    northeast: GeoPoint;
    southwest: GeoPoint;
  } | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectionPoints, setSelectionPoints] = useState<GeoPoint[]>([]);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const mapRef = useRef<MapView>(null);

  // 선택 모드 토글
  const toggleSelectionMode = () => {
    if (selectionMode && selectionPoints.length > 0) {
      setSelectionPoints([]);
    }
    setSelectionMode(!selectionMode);
  };

  // 지도 탭 이벤트 처리
  const handleMapPress = (e: MapPressEvent) => {
    if (!selectionMode) return;
    
    const { latitude, longitude } = e.nativeEvent.coordinate;
    
    // 점 추가
    if (selectionPoints.length < 4) {
      setSelectionPoints([...selectionPoints, { latitude, longitude }]);
    }
    
    // 4개 점을 모두 선택했을 때 경계 계산
    if (selectionPoints.length === 3) {
      // 마지막 점 추가
      const fullPoints = [...selectionPoints, { latitude, longitude }];
      
      // 경계 계산
      let minLat = Number.MAX_VALUE;
      let maxLat = -Number.MAX_VALUE;
      let minLng = Number.MAX_VALUE;
      let maxLng = -Number.MAX_VALUE;
      
      for (const point of fullPoints) {
        minLat = Math.min(minLat, point.latitude);
        maxLat = Math.max(maxLat, point.latitude);
        minLng = Math.min(minLng, point.longitude);
        maxLng = Math.max(maxLng, point.longitude);
      }
      
      const newBounds = {
        northeast: { latitude: maxLat, longitude: maxLng },
        southwest: { latitude: minLat, longitude: minLng }
      };
      
      setSelectedBounds(newBounds);
      
      // 크기 예측 (0.01도당 대략 1MB로 가정)
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const estSize = Math.ceil(latDiff * lngDiff * 10000); // 추정 크기 계산
      setEstimatedSize(estSize);
      
      // 선택 모드 종료
      setSelectionMode(false);
    }
  };

  // 지도 경계 변경 이벤트 처리
  const handleRegionChange = (region: Region) => {
    setMapRegion(region);
  };

  // 현재 보이는 영역 선택
  const selectVisibleRegion = () => {
    if (!mapRef.current) return;
    
    const region = mapRegion;
    const newBounds = {
      northeast: { 
        latitude: region.latitude + (region.latitudeDelta / 2), 
        longitude: region.longitude + (region.longitudeDelta / 2)
      },
      southwest: {
        latitude: region.latitude - (region.latitudeDelta / 2),
        longitude: region.longitude - (region.longitudeDelta / 2)
      }
    };
    
    setSelectedBounds(newBounds);
    
    // 크기 예측 (0.01도당 대략 1MB로 가정)
    const latDiff = region.latitudeDelta;
    const lngDiff = region.longitudeDelta;
    const estSize = Math.ceil(latDiff * lngDiff * 10000); // 추정 크기 계산
    setEstimatedSize(estSize);
  };

  // 영역 다운로드 처리
  const downloadSelectedRegion = async () => {
    if (!selectedBounds) {
      Alert.alert('오류', '다운로드할 영역을 먼저 선택해주세요.');
      return;
    }
    
    if (!regionName.trim()) {
      Alert.alert('오류', '지역 이름을 입력해주세요.');
      return;
    }
    
    try {
      // 지역 ID 생성 (이름 기반)
      const regionId = generateRegionId(regionName);
      
      // 지역 정보 생성
      const region: Omit<OfflineRegion, 'status' | 'downloadProgress'> = {
        id: regionId,
        name: regionName,
        bounds: selectedBounds,
        sizeInMB: estimatedSize,
        lastUpdated: Date.now()
      };
      
      // 다운로드 시작
      Alert.alert(
        '다운로드 확인', 
        `"${regionName}" 지역을 다운로드하시겠습니까? (예상 크기: ${estimatedSize}MB)`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '다운로드',
            onPress: async () => {
              try {
                await offlineMapService.downloadRegion(region);
                Alert.alert('성공', '지역 다운로드가 시작되었습니다.');
                navigation.goBack();
              } catch (error) {
                Alert.alert('오류', `다운로드 실패: ${error}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('다운로드 설정 중 오류:', error);
      Alert.alert('오류', '다운로드 요청 중 문제가 발생했습니다.');
    }
  };

  // 초기화 함수
  const resetSelection = () => {
    setSelectedBounds(null);
    setSelectionPoints([]);
    setRegionName('');
    setEstimatedSize(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>오프라인 지도 영역 선택</Text>
      
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChange}
          onPress={handleMapPress}
        >
          {/* 선택한 영역 보여주기 */}
          {selectedBounds && (
            <Polygon
              coordinates={[
                { latitude: selectedBounds.northeast.latitude, longitude: selectedBounds.southwest.longitude },
                { latitude: selectedBounds.northeast.latitude, longitude: selectedBounds.northeast.longitude },
                { latitude: selectedBounds.southwest.latitude, longitude: selectedBounds.northeast.longitude },
                { latitude: selectedBounds.southwest.latitude, longitude: selectedBounds.southwest.longitude },
              ]}
              strokeColor="rgba(0, 150, 255, 0.8)"
              fillColor="rgba(0, 150, 255, 0.3)"
              strokeWidth={2}
            />
          )}
          
          {/* 사용자가 선택 중인 점들 */}
          {selectionPoints.map((point, index) => (
            <Marker
              key={index}
              coordinate={point}
              title={`점 ${index + 1}`}
              pinColor={index === selectionPoints.length - 1 ? 'red' : 'blue'}
            />
          ))}
        </MapView>
      </View>
      
      <View style={styles.controlPanel}>
        {/* 사용자 안내 메시지 */}
        {selectionMode && (
          <Text style={styles.instructions}>
            {selectionPoints.length === 0
              ? '지도에서 첫 번째 모서리 점을 선택하세요'
              : selectionPoints.length < 3
              ? `모서리 점 ${selectionPoints.length + 1}/4를 선택하세요`
              : '마지막 모서리 점을 선택하세요'}
          </Text>
        )}
        
        {/* 선택 영역 정보 */}
        {selectedBounds && (
          <View style={styles.selectionInfo}>
            <TextInput
              style={styles.nameInput}
              placeholder="지역 이름을 입력하세요"
              value={regionName}
              onChangeText={setRegionName}
            />
            <Text style={styles.sizeText}>예상 크기: {estimatedSize}MB</Text>
          </View>
        )}
        
        {/* 컨트롤 버튼들 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, selectionMode && styles.activeButton]} 
            onPress={toggleSelectionMode}
          >
            <Text style={styles.buttonText}>
              {selectionMode ? '선택 취소' : '영역 직접 선택'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={selectVisibleRegion}
          >
            <Text style={styles.buttonText}>현재 화면 선택</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={resetSelection}
          >
            <Text style={styles.buttonText}>초기화</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.downloadButton]} 
            onPress={downloadSelectedRegion}
            disabled={!selectedBounds || !regionName.trim()}
          >
            <Text style={styles.buttonText}>다운로드</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  mapContainer: {
    height: '50%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controlPanel: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#3498db',
    fontWeight: '500',
  },
  selectionInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  sizeText: {
    fontSize: 14,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#e74c3c',
  },
  downloadButton: {
    backgroundColor: '#27ae60',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MapSelectionScreen;