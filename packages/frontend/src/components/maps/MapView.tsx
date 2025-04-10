import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  InfoWindow, 
  DirectionsRenderer,
  Circle
} from '@react-google-maps/api';
import { Card, Spin, Button, Typography, Tabs, Space, Badge, Rate } from 'antd';
import { 
  MapService, 
  ShopLocation, 
  VehicleLocation,
  Coordinates,
  Route
} from '../../services/mapService';
import { ApiClient } from '../../../../api-client/src/client';
import { 
  CarOutlined, 
  ToolOutlined, 
  EnvironmentOutlined, 
  SearchOutlined,
  RightOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

// 지도 컨테이너 스타일
const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

// 기본 지도 옵션
const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
};

// 차량 마커 아이콘
const vehicleIcon = {
  url: '/images/vehicle-marker.png', // 실제 프로젝트에 맞는 경로로 수정 필요
  scaledSize: { width: 32, height: 32 },
};

// 정비소 마커 아이콘
const shopIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  scaledSize: new window.google.maps.Size(32, 32)
};

interface MapViewProps {
  apiClient: ApiClient;
  googleMapsApiKey: string;
  initialCenter?: Coordinates;
  initialZoom?: number;
  vehicleId?: string;
  userId?: string;
  showShops?: boolean;
  showVehicles?: boolean;
  onSelectShop?: (shop: ShopLocation) => void;
  onSelectVehicle?: (vehicle: VehicleLocation) => void;
}

const MapView: React.FC<MapViewProps> = ({
  apiClient,
  googleMapsApiKey,
  initialCenter = { latitude: 37.5665, longitude: 126.9780 }, // 서울 중심
  initialZoom = 13,
  vehicleId,
  userId,
  showShops = true,
  showVehicles = true,
  onSelectShop,
  onSelectVehicle
}) => {
  // 지도 서비스 초기화
  const mapService = new MapService(apiClient);
  
  // Google Maps API 로드
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places', 'geometry', 'drawing'],
  });

  // 상태 관리
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({
    lat: initialCenter.latitude,
    lng: initialCenter.longitude
  });

  // 데이터 상태
  const [shops, setShops] = useState<ShopLocation[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopLocation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5); // km
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [route, setRoute] = useState<Route | null>(null);

  // 인풋 포커스 상태
  const searchBoxRef = useRef<HTMLInputElement>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  
  // 지도 로드 완료 핸들러
  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }
  }, []);

  // 지도 영역 변경 핸들러
  const handleBoundsChanged = useCallback(() => {
    if (map && showShops) {
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const mapBounds = {
          northeast: { latitude: ne.lat(), longitude: ne.lng() },
          southwest: { latitude: sw.lat(), longitude: sw.lng() }
        };
        
        loadShopsInBounds(mapBounds);
      }
    }
  }, [map, showShops]);

  // 경계 내 정비소 로드
  const loadShopsInBounds = async (bounds: any) => {
    try {
      setLoading(true);
      const shopsData = await mapService.findShopsInBounds(bounds);
      setShops(shopsData);
    } catch (error) {
      console.error('경계 내 정비소 로드 중 오류 발생:', error);
      setError('정비소 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 차량 위치 로드
  const loadVehicles = useCallback(async () => {
    if (!showVehicles) return;
    
    try {
      setLoading(true);
      
      if (vehicleId) {
        // 단일 차량 위치 로드
        const vehicleData = await mapService.getVehicleLocation(vehicleId);
        setVehicles([vehicleData]);
        
        // 차량 위치로 지도 이동
        setCenter({
          lat: vehicleData.latitude,
          lng: vehicleData.longitude
        });
        
      } else if (userId) {
        // 사용자의 모든 차량 위치 로드
        const vehiclesData = await mapService.getUserVehiclesLocations(userId);
        setVehicles(vehiclesData);
        
        // 첫 번째 차량 위치로 지도 이동 (차량이 있는 경우)
        if (vehiclesData.length > 0) {
          setCenter({
            lat: vehiclesData[0].latitude,
            lng: vehiclesData[0].longitude
          });
        }
      }
    } catch (error) {
      console.error('차량 위치 로드 중 오류 발생:', error);
      setError('차량 위치 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, userId, showVehicles, mapService]);

  // 주변 정비소 검색
  const findNearbyShops = useCallback(async (location: Coordinates) => {
    if (!showShops) return;
    
    try {
      setLoading(true);
      const shopsData = await mapService.findShopsNearby({
        center: location,
        radius: searchRadius,
        unit: 'km'
      });
      setShops(shopsData);
    } catch (error) {
      console.error('주변 정비소 검색 중 오류 발생:', error);
      setError('주변 정비소 정보를 검색하는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [showShops, searchRadius, mapService]);

  // 정비소 선택 핸들러
  const handleShopSelected = useCallback((shop: ShopLocation) => {
    setSelectedShop(shop);
    if (onSelectShop) onSelectShop(shop);
    
    // 지도를 정비소 위치로 이동
    setCenter({
      lat: shop.latitude,
      lng: shop.longitude
    });
  }, [onSelectShop]);

  // 차량 선택 핸들러
  const handleVehicleSelected = useCallback((vehicle: VehicleLocation) => {
    setSelectedVehicle(vehicle);
    if (onSelectVehicle) onSelectVehicle(vehicle);
    
    // 지도를 차량 위치로 이동
    setCenter({
      lat: vehicle.latitude,
      lng: vehicle.longitude
    });
  }, [onSelectVehicle]);

  // 경로 계산 핸들러
  const calculateRoute = useCallback(async (
    origin: Coordinates,
    destination: Coordinates
  ) => {
    if (!directionsServiceRef.current) return;
    
    try {
      setLoading(true);
      
      // Google Maps 방향 서비스로 경로 계산
      directionsServiceRef.current.route(
        {
          origin: { lat: origin.latitude, lng: origin.longitude },
          destination: { lat: destination.latitude, lng: destination.longitude },
          travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            setError('경로 계산에 실패했습니다.');
          }
        }
      );
      
      // 백엔드 API를 통한 경로 계산 (추가 정보용)
      const routeData = await mapService.calculateRoute(origin, destination);
      setRoute(routeData);
      
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      setError('경로 계산에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [mapService]);

  // 차량에서 정비소까지 경로 계산
  const calculateRouteToShop = useCallback(() => {
    if (selectedVehicle && selectedShop) {
      calculateRoute(
        {
          latitude: selectedVehicle.latitude,
          longitude: selectedVehicle.longitude
        },
        {
          latitude: selectedShop.latitude,
          longitude: selectedShop.longitude
        }
      );
    }
  }, [selectedVehicle, selectedShop, calculateRoute]);

  // 차량 최근 위치에서 가장 가까운 정비소 검색
  const findNearestShops = useCallback(async () => {
    if (!vehicleId) return;
    
    try {
      setLoading(true);
      const nearestShops = await mapService.findNearestShopsToVehicle(vehicleId, 5);
      setShops(nearestShops);
      
      if (nearestShops.length > 0) {
        setSelectedShop(nearestShops[0]);
      }
    } catch (error) {
      console.error('가장 가까운 정비소 검색 중 오류 발생:', error);
      setError('가장 가까운 정비소를 검색하는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, mapService]);

  // 주소 검색 핸들러
  const handleAddressSearch = useCallback(async (address: string) => {
    try {
      setLoading(true);
      const locations = await mapService.searchLocation(address);
      
      if (locations.length > 0) {
        const location = locations[0];
        setCenter({
          lat: location.latitude,
          lng: location.longitude
        });
        
        // 위치 주변 정비소 검색
        findNearbyShops(location);
      } else {
        setError('검색 결과가 없습니다.');
      }
    } catch (error) {
      console.error('주소 검색 중 오류 발생:', error);
      setError('주소 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [mapService, findNearbyShops]);

  // 컴포넌트 마운트 시 차량 및 정비소 데이터 로드
  useEffect(() => {
    if (isLoaded) {
      loadVehicles();
    }
  }, [isLoaded, loadVehicles]);

  // 로딩 중 또는 에러 시 표시
  if (loadError) {
    return <Card><Text type="danger">지도를 로드하는 데 실패했습니다: {loadError.message}</Text></Card>;
  }

  if (!isLoaded) {
    return <Card><Spin tip="지도 로드 중..." /></Card>;
  }

  return (
    <div className="map-view">
      <Card loading={loading}>
        <div className="map-container">
          <GoogleMap
            id="map"
            mapContainerStyle={mapContainerStyle}
            zoom={initialZoom}
            center={center}
            options={defaultMapOptions}
            onLoad={handleMapLoad}
            onBoundsChanged={handleBoundsChanged}
          >
            {/* 차량 마커 */}
            {showVehicles && vehicles.map(vehicle => (
              <Marker
                key={vehicle.vehicleId}
                position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
                icon={vehicleIcon}
                title={vehicle.name || `차량 ${vehicle.vehicleId}`}
                onClick={() => handleVehicleSelected(vehicle)}
              />
            ))}

            {/* 선택된 차량 정보 창 */}
            {selectedVehicle && (
              <InfoWindow
                position={{ lat: selectedVehicle.latitude, lng: selectedVehicle.longitude }}
                onCloseClick={() => setSelectedVehicle(null)}
                options={{ content: '' }}
              >
                <div>
                  <Title level={5}>{selectedVehicle.name || `차량 ${selectedVehicle.vehicleId}`}</Title>
                  <p><strong>상태:</strong> {selectedVehicle.status}</p>
                  <p><strong>주소:</strong> {selectedVehicle.address}</p>
                  <p><strong>마지막 업데이트:</strong> {new Date(selectedVehicle.lastUpdated).toLocaleString()}</p>
                  {selectedVehicle.speed !== undefined && (
                    <p><strong>속도:</strong> {selectedVehicle.speed} km/h</p>
                  )}
                  <Button type="primary" onClick={findNearestShops}>
                    근처 정비소 찾기
                  </Button>
                </div>
              </InfoWindow>
            )}

            {/* 정비소 마커 */}
            {showShops && shops.map(shop => (
              <Marker
                key={shop.shopId}
                position={{ lat: shop.latitude, lng: shop.longitude }}
                icon={'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'}
                title={shop.name}
                onClick={() => handleShopSelected(shop)}
              />
            ))}

            {/* 선택된 정비소 정보 창 */}
            {selectedShop && (
              <InfoWindow
                position={{ lat: selectedShop.latitude, lng: selectedShop.longitude }}
                onCloseClick={() => setSelectedShop(null)}
                options={{ content: '' }}
              >
                <div>
                  <Title level={5}>{selectedShop.name}</Title>
                  <p><strong>주소:</strong> {selectedShop.address}</p>
                  <p><strong>평점:</strong> <Rate disabled defaultValue={selectedShop.rating} /> ({selectedShop.rating})</p>
                  <p><strong>영업시간:</strong> {selectedShop.openHours}</p>
                  <p><strong>연락처:</strong> {selectedShop.contactNumber}</p>
                  <p><strong>서비스:</strong> {selectedShop.services.join(', ')}</p>
                  {selectedShop.website && (
                    <p><strong>웹사이트:</strong> <a href={selectedShop.website} target="_blank" rel="noopener noreferrer">{selectedShop.website}</a></p>
                  )}
                  {selectedVehicle && (
                    <Button type="primary" onClick={calculateRouteToShop}>
                      경로 계산하기
                    </Button>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* 검색 반경 표시 */}
            {selectedVehicle && (
              <Circle
                center={{ lat: selectedVehicle.latitude, lng: selectedVehicle.longitude }}
                radius={searchRadius * 1000} // m 단위로 변환
                options={{
                  strokeColor: '#0088FF',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: '#0088FF',
                  fillOpacity: 0.1,
                }}
              />
            )}

            {/* 경로 표시 */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  polylineOptions: {
                    strokeColor: '#0088FF',
                    strokeWeight: 4,
                  },
                  suppressMarkers: true,
                }}
              />
            )}
          </GoogleMap>
        </div>

        {/* 경로 정보 */}
        {route && (
          <Card title="경로 정보" className="mt-4">
            <Space direction="vertical">
              <Text><strong>출발지:</strong> {route.origin.address}</Text>
              <Text><strong>목적지:</strong> {route.destination.address}</Text>
              <Text><strong>총 거리:</strong> {route.distance} km</Text>
              <Text><strong>예상 소요 시간:</strong> {Math.floor(route.duration / 60)}분</Text>
              <Tabs defaultActiveKey="1">
                <TabPane tab="단계별 안내" key="1">
                  {route.steps.map((step, index) => (
                    <div key={index} className="route-step">
                      <Badge count={index + 1} />
                      <div dangerouslySetInnerHTML={{ __html: step.instructions }} />
                      <Text type="secondary">{step.distance} km</Text>
                    </div>
                  ))}
                </TabPane>
              </Tabs>
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default MapView; 