import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import {
  SearchOutlined,
  CarOutlined,
  ToolOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  InfoCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import {
  LoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  Circle
} from '@react-google-maps/api';
import {
  Input,
  Button,
  Select,
  Spin,
  Card,
  Typography,
  Badge,
  Space,
  message,
  Tooltip
} from 'antd';

import { ApiClient } from '../../api-client';
import { RepairShop } from '../../types/repairShop';
import { Vehicle, convertServiceVehicleToFrontend } from '../../types/vehicle';

const { Option } = Select;
const { Text, Title } = Typography;

// 지도 스타일 (낮/밤 모드 또는 커스텀 스타일)
const mapStyles = {
  default: [],
  night: [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#263c3f' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#2f3948' }]
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#515c6d' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#17263c' }]
    }
  ]
};

// 마커 아이콘
const icons = {
  vehicle: {
    url: '/assets/vehicle-marker.png',
    scaledSize: new google.maps.Size(32, 32)
  },
  shop: {
    url: '/assets/shop-marker.png',
    scaledSize: new google.maps.Size(32, 32)
  },
  selected: {
    url: '/assets/selected-marker.png',
    scaledSize: new google.maps.Size(40, 40)
  }
};

export interface VehicleLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  lastUpdated: Date;
  status: 'active' | 'maintenance' | 'inactive';
}

interface VehicleMapViewProps {
  apiClient: ApiClient;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicleId: string) => void;
  showRepairShops?: boolean;
  distanceUnit?: 'km' | 'mi';
  mapTheme?: 'default' | 'night';
}

const VehicleMapView: React.FC<VehicleMapViewProps> = ({
  apiClient,
  initialCenter = { lat: 37.5665, lng: 126.978 }, // 서울 중심
  initialZoom = 12,
  selectedVehicleId,
  onVehicleSelect,
  showRepairShops = true,
  distanceUnit = 'km',
  mapTheme = 'default'
}) => {
  // 상태 관리
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);
  const [repairShops, setRepairShops] = useState<RepairShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<RepairShop | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5); // km 단위
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(initialCenter);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // 서비스 객체들에 대한 참조
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // km를 mi로 변환
  const convertToMiles = (km: number): number => {
    return km * 0.621371;
  };

  // 거리 표시 단위에 따라 변환
  const formatDistance = (meters: number | undefined): string => {
    if (meters === undefined) return '알 수 없음';

    const km = meters / 1000;
    if (distanceUnit === 'mi') {
      const miles = convertToMiles(km);
      return `${miles.toFixed(1)} mi`;
    }
    return `${km.toFixed(1)} km`;
  };

  // 테스트용 더미 데이터 생성 함수들을 useMemo로 감싸서 안정적인 의존성 제공
  const generateDummyVehicles = useMemo(
    () => (): Vehicle[] => {
      return [
        { id: '1', name: '트럭 A-101', type: '화물트럭', status: 'active', healthScore: 92 },
        { id: '2', name: '버스 B-202', type: '버스', status: 'maintenance', healthScore: 65 },
        { id: '3', name: '밴 C-303', type: '밴', status: 'active', healthScore: 88 },
        { id: '4', name: '트럭 A-104', type: '화물트럭', status: 'inactive', healthScore: 45 },
        { id: '5', name: '택시 D-505', type: '택시', status: 'active', healthScore: 79 }
      ];
    },
    []
  );

  const generateDummyLocations = useMemo(
    () =>
      (vehicles: Vehicle[]): VehicleLocation[] => {
        // 서울 중심에서 약간의 랜덤한 오프셋 추가
        return vehicles.map(vehicle => ({
          vehicleId: vehicle.id,
          latitude: initialCenter.lat + (Math.random() - 0.5) * 0.1,
          longitude: initialCenter.lng + (Math.random() - 0.5) * 0.1,
          lastUpdated: new Date(),
          status: vehicle.status as 'active' | 'maintenance' | 'inactive'
        }));
      },
    [initialCenter]
  );

  const generateDummyRepairShops = useMemo(
    () => (): RepairShop[] => {
      return [
        {
          id: '1',
          name: '서울 중앙 정비소',
          address: '서울시 중구 123',
          latitude: initialCenter.lat + 0.02,
          longitude: initialCenter.lng + 0.02,
          rating: 4.5,
          specialties: ['트럭', '버스']
        },
        {
          id: '2',
          name: '강남 모터스',
          address: '서울시 강남구 456',
          latitude: initialCenter.lat - 0.03,
          longitude: initialCenter.lng + 0.01,
          rating: 4.2,
          specialties: ['승용차', '밴']
        },
        {
          id: '3',
          name: '종로 자동차 센터',
          address: '서울시 종로구 789',
          latitude: initialCenter.lat + 0.01,
          longitude: initialCenter.lng - 0.03,
          rating: 4.7,
          specialties: ['트럭', '버스', '밴']
        },
        {
          id: '4',
          name: '마포 정비 공장',
          address: '서울시 마포구 101',
          latitude: initialCenter.lat - 0.02,
          longitude: initialCenter.lng - 0.02,
          rating: 3.9,
          specialties: ['트럭', '특수차량']
        }
      ];
    },
    [initialCenter]
  );

  // 지도 로드 시 초기화
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    directionsServiceRef.current = new google.maps.DirectionsService();
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  // 차량 데이터 로드
  useEffect(() => {
    const loadVehiclesData = async () => {
      try {
        setLoading(true);
        const vehiclesData = await apiClient.get('/api/vehicles');
        setVehicles(vehiclesData.data);

        const locationsData = await apiClient.get('/api/vehicle-locations');
        setVehicleLocations(locationsData.data);
        setLoading(false);
      } catch (error) {
        console.error('차량 데이터 로드 실패:', error);
        message.error('차량 데이터를 로드하는 중 오류가 발생했습니다.');
        setLoading(false);

        // 테스트용 더미 데이터
        const dummyVehicles = generateDummyVehicles();
        setVehicles(dummyVehicles);
        setVehicleLocations(generateDummyLocations(dummyVehicles));
      }
    };

    loadVehiclesData();
  }, [apiClient, generateDummyVehicles, generateDummyLocations]);

  // 수리점 데이터 로드
  useEffect(() => {
    if (showRepairShops) {
      const loadRepairShops = async () => {
        try {
          const shopsData = await apiClient.get('/api/repair-shops');
          setRepairShops(shopsData.data);
        } catch (error) {
          console.error('수리점 데이터 로드 실패:', error);

          // 테스트용 더미 데이터
          setRepairShops(generateDummyRepairShops());
        }
      };

      loadRepairShops();
    }
  }, [apiClient, showRepairShops, generateDummyRepairShops]);

  // 선택된 차량 ID가 변경될 때 해당 차량 정보 업데이트
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);

        // 지도 중심을 선택된 차량 위치로 이동
        const location = vehicleLocations.find(loc => loc.vehicleId === selectedVehicleId);
        if (location && mapInstance) {
          setMapCenter({ lat: location.latitude, lng: location.longitude });
          mapInstance.setZoom(15);
        }
      }
    }
  }, [selectedVehicleId, vehicles, vehicleLocations, mapInstance]);

  // 차량 선택 시 호출되는 함수
  const handleVehicleSelect = useCallback(
    (vehicle: Vehicle) => {
      if (!vehicle) return;

      setSelectedVehicle(vehicle);
      setSelectedShop(null); // 수리점 선택 해제
      setDirections(null); // 경로 정보 지우기

      if (onVehicleSelect) {
        onVehicleSelect(vehicle.id);
      }

      // 선택된 차량의 위치로 지도 이동
      const location = vehicleLocations.find(loc => loc.vehicleId === vehicle.id);
      if (location && mapInstance) {
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        mapInstance.setZoom(15);
      }
    },
    [vehicleLocations, onVehicleSelect, mapInstance]
  );

  // 수리점 선택 시 호출되는 함수
  const handleShopSelect = useCallback(
    (shop: RepairShop) => {
      setSelectedShop(shop);

      // 선택된 차량이 있으면 경로 계산
      if (selectedVehicle) {
        const vehicleLocation = vehicleLocations.find(loc => loc.vehicleId === selectedVehicle.id);
        if (vehicleLocation && directionsServiceRef.current) {
          directionsServiceRef.current.route(
            {
              origin: { lat: vehicleLocation.latitude, lng: vehicleLocation.longitude },
              destination: { lat: shop.latitude, lng: shop.longitude },
              travelMode: google.maps.TravelMode.DRIVING
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK) {
                setDirections(result);
              } else {
                console.error(`경로 계산 실패: ${status}`);
                message.error('경로를 계산할 수 없습니다.');
              }
            }
          );
        }
      }
    },
    [selectedVehicle, vehicleLocations]
  );

  // 주소 검색
  const handleSearch = useCallback(() => {
    if (!searchQuery || !geocoderRef.current) return;

    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
        const location = results[0].geometry.location;
        setMapCenter({ lat: location.lat(), lng: location.lng() });
        mapInstance?.setZoom(15);
      } else {
        message.error('검색 결과를 찾을 수 없습니다.');
      }
    });
  }, [searchQuery, mapInstance]);

  // 반경 내 수리점 찾기
  const findNearbyShops = useCallback(() => {
    if (!selectedVehicle || !mapInstance) return;

    const vehicleLocation = vehicleLocations.find(loc => loc.vehicleId === selectedVehicle.id);
    if (!vehicleLocation) return;

    // 차량 위치 주변에 Circle을 그리고 지도를 조정
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(vehicleLocation.latitude, vehicleLocation.longitude));

    // 반경 내 수리점 찾기
    const nearbyShops = repairShops.filter(shop => {
      const shopLocation = new google.maps.LatLng(shop.latitude, shop.longitude);
      const vehicleLatLng = new google.maps.LatLng(
        vehicleLocation.latitude,
        vehicleLocation.longitude
      );

      // 지구 반경 (km)
      const earthRadius = 6371;

      // 라디안으로 변환
      const lat1 = (vehicleLatLng.lat() * Math.PI) / 180;
      const lat2 = (shopLocation.lat() * Math.PI) / 180;
      const lon1 = (vehicleLatLng.lng() * Math.PI) / 180;
      const lon2 = (shopLocation.lng() * Math.PI) / 180;

      // Haversine 공식
      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = earthRadius * c;

      // 반경 내에 있는지 확인
      if (distance <= searchRadius) {
        bounds.extend(shopLocation);
        return true;
      }
      return false;
    });

    if (nearbyShops.length > 0) {
      message.success(`${nearbyShops.length}개의 수리점을 찾았습니다.`);
      mapInstance.fitBounds(bounds);
    } else {
      message.info('주변에 수리점이 없습니다.');
    }
  }, [selectedVehicle, vehicleLocations, repairShops, searchRadius, mapInstance]);

  // 차량 상태에 따른 마커 색상
  const getVehicleMarkerIcon = (vehicle: Vehicle, isSelected: boolean) => {
    if (isSelected) {
      return icons.selected;
    }

    // 상태별 아이콘 또는 색상 변경
    return icons.vehicle;
  };

  return (
    <LoadScript
      googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY" // 실제 API 키로 교체 필요
      id="vehicle-map-script"
      language="ko"
    >
      <div style={{ position: 'relative', width: '100%', height: '600px' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={initialZoom}
          onLoad={onMapLoad}
          options={{
            styles: mapTheme === 'night' ? mapStyles.night : mapStyles.default,
            fullscreenControl: true,
            streetViewControl: true,
            mapTypeControl: true
          }}
        >
          {/* 차량 마커 */}
          {vehicleLocations.map(location => {
            const vehicle = vehicles.find(v => v.id === location.vehicleId);
            const isSelected = selectedVehicle?.id === location.vehicleId;

            if (!vehicle) return null;

            return (
              <Marker
                key={`vehicle-${location.vehicleId}`}
                position={{ lat: location.latitude, lng: location.longitude }}
                onClick={() => handleVehicleSelect(vehicle)}
                icon={getVehicleMarkerIcon(vehicle, isSelected)}
              >
                {isSelected && (
                  <InfoWindow
                    position={{ lat: location.latitude, lng: location.longitude }}
                    onCloseClick={() => setSelectedVehicle(null)}
                  >
                    <div style={{ padding: '5px' }}>
                      <Title level={5}>{vehicle.name}</Title>
                      <Space direction="vertical" size="small">
                        <Text>
                          <CarOutlined /> 종류: {vehicle.type}
                        </Text>
                        <Text>
                          상태:{' '}
                          <Badge
                            status={
                              vehicle.status === 'active'
                                ? 'success'
                                : vehicle.status === 'maintenance'
                                  ? 'warning'
                                  : 'error'
                            }
                            text={
                              vehicle.status === 'active'
                                ? '운행 중'
                                : vehicle.status === 'maintenance'
                                  ? '정비 중'
                                  : '비활성'
                            }
                          />
                        </Text>
                        <Text>상태 점수: {vehicle.healthScore}%</Text>
                        <Text>
                          최근 업데이트: {new Date(location.lastUpdated).toLocaleString()}
                        </Text>
                        {showRepairShops && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<ToolOutlined />}
                            onClick={findNearbyShops}
                          >
                            주변 정비소 찾기
                          </Button>
                        )}
                      </Space>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}

          {/* 수리점 마커 */}
          {showRepairShops &&
            repairShops.map(shop => (
              <Marker
                key={`shop-${shop.id}`}
                position={{ lat: shop.latitude, lng: shop.longitude }}
                onClick={() => handleShopSelect(shop)}
                icon={icons.shop}
              >
                {selectedShop?.id === shop.id && (
                  <InfoWindow
                    position={{ lat: shop.latitude, lng: shop.longitude }}
                    onCloseClick={() => setSelectedShop(null)}
                  >
                    <div style={{ padding: '5px' }}>
                      <Title level={5}>{shop.name}</Title>
                      <Space direction="vertical" size="small">
                        <Text>
                          <EnvironmentOutlined /> 주소: {shop.address}
                        </Text>
                        <Text>평점: {shop.rating}/5.0</Text>
                        <Text>전문 분야: {shop.specialties.join(', ')}</Text>
                        {directions &&
                          directions.routes &&
                          directions.routes.length > 0 &&
                          directions.routes[0].legs &&
                          directions.routes[0].legs.length > 0 && (
                            <>
                              <Text>
                                거리: {formatDistance(directions.routes[0].legs[0].distance?.value)}
                              </Text>
                              <Text>
                                예상 시간:{' '}
                                {directions.routes[0].legs[0].duration?.text || '알 수 없음'}
                              </Text>
                            </>
                          )}
                      </Space>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}

          {/* 경로 표시 */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#4285F4',
                  strokeWeight: 5
                }
              }}
            />
          )}

          {/* 검색 반경 표시 */}
          {selectedVehicle && searchRadius > 0 && (
            <Circle
              center={(() => {
                const location = vehicleLocations.find(loc => loc.vehicleId === selectedVehicle.id);
                return {
                  lat: location ? location.latitude : initialCenter.lat,
                  lng: location ? location.longitude : initialCenter.lng
                };
              })()}
              radius={searchRadius * 1000} // m 단위로 변환
              options={{
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.1
              }}
            />
          )}
        </GoogleMap>

        {/* 컨트롤 패널 */}
        <Card
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            width: '300px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 검색 상자 */}
            <div className="flex flex-row">
              <Input
                style={{ width: 'calc(100% - 50px)' }}
                placeholder="주소 또는 위치 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onPressEnter={handleSearch}
              />
              <Button icon={<SearchOutlined />} onClick={handleSearch} />
            </div>

            {/* 차량 선택 */}
            <Select
              style={{ width: '100%' }}
              placeholder="차량 선택"
              onChange={value => {
                const vehicle = vehicles.find(v => v.id === value);
                if (vehicle) handleVehicleSelect(vehicle);
              }}
              value={selectedVehicle?.id}
            >
              {vehicles.map(vehicle => (
                <Option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} -{' '}
                  {vehicle.status === 'active'
                    ? '운행 중'
                    : vehicle.status === 'maintenance'
                      ? '정비 중'
                      : '비활성'}
                </Option>
              ))}
            </Select>

            {/* 검색 반경 설정 */}
            {showRepairShops && (
              <Space>
                <Text>검색 반경:</Text>
                <Select style={{ width: '80px' }} value={searchRadius} onChange={setSearchRadius}>
                  <Option value={1}>1 {distanceUnit}</Option>
                  <Option value={5}>5 {distanceUnit}</Option>
                  <Option value={10}>10 {distanceUnit}</Option>
                  <Option value={20}>20 {distanceUnit}</Option>
                  <Option value={50}>50 {distanceUnit}</Option>
                </Select>
                <Tooltip title="선택한 차량 주변에서 정비소를 찾을 반경을 설정합니다.">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            )}

            {/* 현재 위치 버튼 */}
            <Button
              icon={<CompassOutlined />}
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    position => {
                      const currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                      };
                      setMapCenter(currentLocation);
                      mapInstance?.setZoom(15);
                    },
                    () => {
                      message.error('현재 위치를 가져올 수 없습니다.');
                    }
                  );
                } else {
                  message.error('브라우저가 위치 정보를 지원하지 않습니다.');
                }
              }}
            >
              현재 위치로 이동
            </Button>

            <div className="flex flex-row">
              <Select
                style={{ width: '35%' }}
                placeholder="필터"
                value={filterType}
                onChange={value => setFilterType(value)}
              >
                <Option value="all">전체</Option>
                <Option value="available">이용 가능</Option>
                <Option value="maintenance">정비 중</Option>
              </Select>
            </div>
          </Space>
        </Card>

        {/* 로딩 표시 */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20
            }}
          >
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
              tip="지도 로딩 중..."
            />
          </div>
        )}
      </div>
    </LoadScript>
  );
};

export default VehicleMapView;
