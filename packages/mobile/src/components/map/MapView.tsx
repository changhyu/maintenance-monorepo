import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { LocationPoint } from '../../services/LocationService';

interface CustomMapViewProps {
  initialRegion?: Region;
  markers?: LocationPoint[];
  currentLocation?: LocationPoint;
  route?: LocationPoint[];
  onMarkerPress?: (marker: LocationPoint) => void;
  onMapPress?: (location: LocationPoint) => void;
  onMapReady?: () => void;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
}

const CustomMapView: React.FC<CustomMapViewProps> = ({
  initialRegion = {
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  markers = [],
  currentLocation,
  route = [],
  onMarkerPress,
  onMapPress,
  onMapReady,
  showsUserLocation = true,
  followsUserLocation = false,
  zoomEnabled = true,
  rotateEnabled = true,
}) => {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);

  // 현재 위치가 변경되면 지도 중심 이동
  useEffect(() => {
    if (mapReady && mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [currentLocation, mapReady]);

  // 지도가 준비되면 콜백 호출
  const handleMapReady = () => {
    setMapReady(true);
    if (onMapReady) {
      onMapReady();
    }
  };

  // 지도 터치 이벤트 처리
  const handleMapPress = (e: any) => {
    if (onMapPress) {
      const { coordinate } = e.nativeEvent;
      onMapPress({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
    }
  };

  // 지도를 현재 위치로 이동
  const centerOnCurrentLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  // 경로가 있으면 경로에 맞게 지도 영역 조정
  const fitToRoute = () => {
    if (mapRef.current && route.length > 0) {
      mapRef.current.fitToCoordinates(route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // 경로가 변경되면 경로에 맞게 지도 영역 조정
  useEffect(() => {
    if (mapReady && route.length > 0) {
      fitToRoute();
    }
  }, [route, mapReady]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={showsUserLocation}
        followsUserLocation={followsUserLocation}
        zoomEnabled={zoomEnabled}
        rotateEnabled={rotateEnabled}
        onMapReady={handleMapReady}
        onPress={handleMapPress}
      >
        {/* 마커 표시 */}
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}-${marker.latitude}-${marker.longitude}`}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.name}
            onPress={() => onMarkerPress && onMarkerPress(marker)}
          />
        ))}

        {/* 경로 표시 */}
        {route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeWidth={5}
            strokeColor="#2196F3"
          />
        )}
      </MapView>

      {/* 현재 위치로 이동 버튼 */}
      {currentLocation && (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={centerOnCurrentLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#0066FF" />
        </TouchableOpacity>
      )}

      {/* 경로 전체 보기 버튼 */}
      {route.length > 0 && (
        <TouchableOpacity style={styles.fitRouteButton} onPress={fitToRoute}>
          <MaterialIcons name="zoom-out-map" size={24} color="#0066FF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fitRouteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default CustomMapView; 