import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import * as FileSystem from 'expo-file-system';
import offlineMapService, { MapTile, OfflineRegion } from '../services/OfflineMapService';
import { GeoPoint } from '../types';

interface OfflineMapViewerProps {
  regionId: string;
  initialPosition?: GeoPoint;
  width?: number | string;
  height?: number | string;
  onMapReady?: () => void;
  onMarkerPress?: (point: GeoPoint) => void;
  showMarkers?: boolean;
}

export const OfflineMapViewer: React.FC<OfflineMapViewerProps> = ({
  regionId,
  initialPosition,
  width = '100%',
  height = 300,
  onMapReady,
  onMarkerPress,
  showMarkers = false,
}) => {
  const [region, setRegion] = useState<OfflineRegion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<MapTile[]>([]);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  // 지역 정보 및 타일 로드
  useEffect(() => {
    const loadRegionData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 지역 정보 로드
        const regionData = offlineMapService.getRegion(regionId);
        if (!regionData) {
          throw new Error('지역 정보를 찾을 수 없습니다.');
        }

        setRegion(regionData);

        // 지도 초기 영역 설정
        const bounds = regionData.bounds;
        const centerLat = (bounds.northeast.latitude + bounds.southwest.latitude) / 2;
        const centerLng = (bounds.northeast.longitude + bounds.southwest.longitude) / 2;
        const latDelta = Math.abs(bounds.northeast.latitude - bounds.southwest.latitude);
        const lngDelta = Math.abs(bounds.northeast.longitude - bounds.southwest.longitude);

        setMapRegion({
          latitude: initialPosition?.latitude || centerLat,
          longitude: initialPosition?.longitude || centerLng,
          latitudeDelta: latDelta * 1.1, // 여백을 주기 위해 10% 더 크게
          longitudeDelta: lngDelta * 1.1,
        });

        // 타일 데이터 로드
        const tileData = offlineMapService.loadTileData(regionId);
        
        // 타일 파일 존재 확인
        const availableTiles: MapTile[] = [];
        for (const tile of tileData) {
          if (tile.path) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(tile.path);
              if (fileInfo.exists) {
                availableTiles.push(tile);
              }
            } catch (e) {
              console.warn(`타일 확인 실패: ${tile.path}`, e);
            }
          }
        }
        
        setTiles(availableTiles);
        setLoading(false);
      } catch (err) {
        console.error('오프라인 지도 로드 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
        setLoading(false);
      }
    };

    loadRegionData();
  }, [regionId, initialPosition]);

  // 지도 영역 변경 핸들러
  const handleRegionChange = (newRegion: Region) => {
    // 필요시 지도 영역 변화에 대응하는 로직
    // 예: 새로운 지역으로 이동했을 때 관련 데이터 로드
  };

  // 마커 클릭 핸들러
  const handleMarkerPress = (point: GeoPoint) => {
    if (onMarkerPress) {
      onMarkerPress(point);
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>지도를 로드하는 중...</Text>
      </View>
    );
  }

  // 오류 표시
  if (error || !region || !mapRegion) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>
          {error || '지도를 로드할 수 없습니다.'}
        </Text>
      </View>
    );
  }

  // 오프라인 지도 표시
  return (
    <View style={[styles.container, { width, height }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={onMapReady}
        showsUserLocation
        showsMyLocationButton
      >
        {/* 경계 표시 */}
        {/* 다양한 줌 레벨에 대응해 오프라인 타일을 표시하는 커스텀 오버레이가 필요하지만 
            여기서는 영역 표시를 위해 간단하게 경계만 표시 */}
        
        {/* 관심 지점 마커 표시 */}
        {showMarkers && region.points?.map((point, index) => (
          <Marker
            key={index}
            coordinate={point}
            onPress={() => handleMarkerPress(point)}
          />
        ))}
      </MapView>
      
      <View style={styles.regionInfoOverlay}>
        <Text style={styles.regionName}>{region.name}</Text>
        <Text style={styles.tileInfo}>
          {tiles.length > 0 
            ? `오프라인 타일: ${tiles.length}개` 
            : '오프라인 타일 없음'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3498db',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    padding: 16,
  },
  regionInfoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 6,
  },
  regionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tileInfo: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});

export default OfflineMapViewer;