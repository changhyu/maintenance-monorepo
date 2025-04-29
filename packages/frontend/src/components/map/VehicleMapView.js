import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { SearchOutlined, CarOutlined, ToolOutlined, EnvironmentOutlined, CompassOutlined, InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { LoadScript, GoogleMap, Marker, InfoWindow, DirectionsRenderer, Circle } from '@react-google-maps/api';
import { Input, Button, Select, Spin, Card, Typography, Badge, Space, message, Tooltip } from 'antd';
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
const VehicleMapView = ({ apiClient, initialCenter = { lat: 37.5665, lng: 126.978 }, // 서울 중심
initialZoom = 12, selectedVehicleId, onVehicleSelect, showRepairShops = true, distanceUnit = 'km', mapTheme = 'default' }) => {
    // 상태 관리
    const [vehicles, setVehicles] = useState([]);
    const [vehicleLocations, setVehicleLocations] = useState([]);
    const [repairShops, setRepairShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [directions, setDirections] = useState(null);
    const [searchRadius, setSearchRadius] = useState(5); // km 단위
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [mapCenter, setMapCenter] = useState(initialCenter);
    const [mapInstance, setMapInstance] = useState(null);
    const [filterType, setFilterType] = useState('all');
    // 서비스 객체들에 대한 참조
    const directionsServiceRef = useRef(null);
    const geocoderRef = useRef(null);
    // km를 mi로 변환
    const convertToMiles = (km) => {
        return km * 0.621371;
    };
    // 거리 표시 단위에 따라 변환
    const formatDistance = (meters) => {
        if (meters === undefined)
            return '알 수 없음';
        const km = meters / 1000;
        if (distanceUnit === 'mi') {
            const miles = convertToMiles(km);
            return `${miles.toFixed(1)} mi`;
        }
        return `${km.toFixed(1)} km`;
    };
    // 테스트용 더미 데이터 생성 함수들을 useMemo로 감싸서 안정적인 의존성 제공
    const generateDummyVehicles = useMemo(() => () => {
        return [
            { id: '1', name: '트럭 A-101', type: '화물트럭', status: 'active', healthScore: 92 },
            { id: '2', name: '버스 B-202', type: '버스', status: 'maintenance', healthScore: 65 },
            { id: '3', name: '밴 C-303', type: '밴', status: 'active', healthScore: 88 },
            { id: '4', name: '트럭 A-104', type: '화물트럭', status: 'inactive', healthScore: 45 },
            { id: '5', name: '택시 D-505', type: '택시', status: 'active', healthScore: 79 }
        ];
    }, []);
    const generateDummyLocations = useMemo(() => (vehicles) => {
        // 서울 중심에서 약간의 랜덤한 오프셋 추가
        return vehicles.map(vehicle => ({
            vehicleId: vehicle.id,
            latitude: initialCenter.lat + (Math.random() - 0.5) * 0.1,
            longitude: initialCenter.lng + (Math.random() - 0.5) * 0.1,
            lastUpdated: new Date(),
            status: vehicle.status
        }));
    }, [initialCenter]);
    const generateDummyRepairShops = useMemo(() => () => {
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
    }, [initialCenter]);
    // 지도 로드 시 초기화
    const onMapLoad = useCallback((map) => {
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
            }
            catch (error) {
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
                }
                catch (error) {
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
    const handleVehicleSelect = useCallback((vehicle) => {
        if (!vehicle)
            return;
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
    }, [vehicleLocations, onVehicleSelect, mapInstance]);
    // 수리점 선택 시 호출되는 함수
    const handleShopSelect = useCallback((shop) => {
        setSelectedShop(shop);
        // 선택된 차량이 있으면 경로 계산
        if (selectedVehicle) {
            const vehicleLocation = vehicleLocations.find(loc => loc.vehicleId === selectedVehicle.id);
            if (vehicleLocation && directionsServiceRef.current) {
                directionsServiceRef.current.route({
                    origin: { lat: vehicleLocation.latitude, lng: vehicleLocation.longitude },
                    destination: { lat: shop.latitude, lng: shop.longitude },
                    travelMode: google.maps.TravelMode.DRIVING
                }, (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        setDirections(result);
                    }
                    else {
                        console.error(`경로 계산 실패: ${status}`);
                        message.error('경로를 계산할 수 없습니다.');
                    }
                });
            }
        }
    }, [selectedVehicle, vehicleLocations]);
    // 주소 검색
    const handleSearch = useCallback(() => {
        if (!searchQuery || !geocoderRef.current)
            return;
        geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                const location = results[0].geometry.location;
                setMapCenter({ lat: location.lat(), lng: location.lng() });
                mapInstance?.setZoom(15);
            }
            else {
                message.error('검색 결과를 찾을 수 없습니다.');
            }
        });
    }, [searchQuery, mapInstance]);
    // 반경 내 수리점 찾기
    const findNearbyShops = useCallback(() => {
        if (!selectedVehicle || !mapInstance)
            return;
        const vehicleLocation = vehicleLocations.find(loc => loc.vehicleId === selectedVehicle.id);
        if (!vehicleLocation)
            return;
        // 차량 위치 주변에 Circle을 그리고 지도를 조정
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(vehicleLocation.latitude, vehicleLocation.longitude));
        // 반경 내 수리점 찾기
        const nearbyShops = repairShops.filter(shop => {
            const shopLocation = new google.maps.LatLng(shop.latitude, shop.longitude);
            const vehicleLatLng = new google.maps.LatLng(vehicleLocation.latitude, vehicleLocation.longitude);
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
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
        }
        else {
            message.info('주변에 수리점이 없습니다.');
        }
    }, [selectedVehicle, vehicleLocations, repairShops, searchRadius, mapInstance]);
    // 차량 상태에 따른 마커 색상
    const getVehicleMarkerIcon = (vehicle, isSelected) => {
        if (isSelected) {
            return icons.selected;
        }
        // 상태별 아이콘 또는 색상 변경
        return icons.vehicle;
    };
    return (_jsx(LoadScript, { googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY" // 실제 API 키로 교체 필요
        , id: "vehicle-map-script", language: "ko", children: _jsxs("div", { style: { position: 'relative', width: '100%', height: '600px' }, children: [_jsxs(GoogleMap, { mapContainerStyle: { width: '100%', height: '100%' }, center: mapCenter, zoom: initialZoom, onLoad: onMapLoad, options: {
                        styles: mapTheme === 'night' ? mapStyles.night : mapStyles.default,
                        fullscreenControl: true,
                        streetViewControl: true,
                        mapTypeControl: true
                    }, children: [vehicleLocations.map(location => {
                            const vehicle = vehicles.find(v => v.id === location.vehicleId);
                            const isSelected = selectedVehicle?.id === location.vehicleId;
                            if (!vehicle)
                                return null;
                            return (_jsx(Marker, { position: { lat: location.latitude, lng: location.longitude }, onClick: () => handleVehicleSelect(vehicle), icon: getVehicleMarkerIcon(vehicle, isSelected), children: isSelected && (_jsx(InfoWindow, { position: { lat: location.latitude, lng: location.longitude }, onCloseClick: () => setSelectedVehicle(null), children: _jsxs("div", { style: { padding: '5px' }, children: [_jsx(Title, { level: 5, children: vehicle.name }), _jsxs(Space, { direction: "vertical", size: "small", children: [_jsxs(Text, { children: [_jsx(CarOutlined, {}), " \uC885\uB958: ", vehicle.type] }), _jsxs(Text, { children: ["\uC0C1\uD0DC:", ' ', _jsx(Badge, { status: vehicle.status === 'active'
                                                                    ? 'success'
                                                                    : vehicle.status === 'maintenance'
                                                                        ? 'warning'
                                                                        : 'error', text: vehicle.status === 'active'
                                                                    ? '운행 중'
                                                                    : vehicle.status === 'maintenance'
                                                                        ? '정비 중'
                                                                        : '비활성' })] }), _jsxs(Text, { children: ["\uC0C1\uD0DC \uC810\uC218: ", vehicle.healthScore, "%"] }), _jsxs(Text, { children: ["\uCD5C\uADFC \uC5C5\uB370\uC774\uD2B8: ", new Date(location.lastUpdated).toLocaleString()] }), showRepairShops && (_jsx(Button, { type: "primary", size: "small", icon: _jsx(ToolOutlined, {}), onClick: findNearbyShops, children: "\uC8FC\uBCC0 \uC815\uBE44\uC18C \uCC3E\uAE30" }))] })] }) })) }, `vehicle-${location.vehicleId}`));
                        }), showRepairShops &&
                            repairShops.map(shop => (_jsx(Marker, { position: { lat: shop.latitude, lng: shop.longitude }, onClick: () => handleShopSelect(shop), icon: icons.shop, children: selectedShop?.id === shop.id && (_jsx(InfoWindow, { position: { lat: shop.latitude, lng: shop.longitude }, onCloseClick: () => setSelectedShop(null), children: _jsxs("div", { style: { padding: '5px' }, children: [_jsx(Title, { level: 5, children: shop.name }), _jsxs(Space, { direction: "vertical", size: "small", children: [_jsxs(Text, { children: [_jsx(EnvironmentOutlined, {}), " \uC8FC\uC18C: ", shop.address] }), _jsxs(Text, { children: ["\uD3C9\uC810: ", shop.rating, "/5.0"] }), _jsxs(Text, { children: ["\uC804\uBB38 \uBD84\uC57C: ", shop.specialties.join(', ')] }), directions &&
                                                        directions.routes &&
                                                        directions.routes.length > 0 &&
                                                        directions.routes[0].legs &&
                                                        directions.routes[0].legs.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Text, { children: ["\uAC70\uB9AC: ", formatDistance(directions.routes[0].legs[0].distance?.value)] }), _jsxs(Text, { children: ["\uC608\uC0C1 \uC2DC\uAC04:", ' ', directions.routes[0].legs[0].duration?.text || '알 수 없음'] })] }))] })] }) })) }, `shop-${shop.id}`))), directions && (_jsx(DirectionsRenderer, { directions: directions, options: {
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: '#4285F4',
                                    strokeWeight: 5
                                }
                            } })), selectedVehicle && searchRadius > 0 && (_jsx(Circle, { center: (() => {
                                const location = vehicleLocations.find(loc => loc.vehicleId === selectedVehicle.id);
                                return {
                                    lat: location ? location.latitude : initialCenter.lat,
                                    lng: location ? location.longitude : initialCenter.lng
                                };
                            })(), radius: searchRadius * 1000, options: {
                                strokeColor: '#FF0000',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                                fillColor: '#FF0000',
                                fillOpacity: 0.1
                            } }))] }), _jsx(Card, { style: {
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        width: '300px',
                        zIndex: 10,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }, size: "small", children: _jsxs(Space, { direction: "vertical", style: { width: '100%' }, children: [_jsxs("div", { className: "flex flex-row", children: [_jsx(Input, { style: { width: 'calc(100% - 50px)' }, placeholder: "\uC8FC\uC18C \uB610\uB294 \uC704\uCE58 \uAC80\uC0C9", value: searchQuery, onChange: e => setSearchQuery(e.target.value), onPressEnter: handleSearch }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: handleSearch })] }), _jsx(Select, { style: { width: '100%' }, placeholder: "\uCC28\uB7C9 \uC120\uD0DD", onChange: value => {
                                    const vehicle = vehicles.find(v => v.id === value);
                                    if (vehicle)
                                        handleVehicleSelect(vehicle);
                                }, value: selectedVehicle?.id, children: vehicles.map(vehicle => (_jsxs(Option, { value: vehicle.id, children: [vehicle.name, " -", ' ', vehicle.status === 'active'
                                            ? '운행 중'
                                            : vehicle.status === 'maintenance'
                                                ? '정비 중'
                                                : '비활성'] }, vehicle.id))) }), showRepairShops && (_jsxs(Space, { children: [_jsx(Text, { children: "\uAC80\uC0C9 \uBC18\uACBD:" }), _jsxs(Select, { style: { width: '80px' }, value: searchRadius, onChange: setSearchRadius, children: [_jsxs(Option, { value: 1, children: ["1 ", distanceUnit] }), _jsxs(Option, { value: 5, children: ["5 ", distanceUnit] }), _jsxs(Option, { value: 10, children: ["10 ", distanceUnit] }), _jsxs(Option, { value: 20, children: ["20 ", distanceUnit] }), _jsxs(Option, { value: 50, children: ["50 ", distanceUnit] })] }), _jsx(Tooltip, { title: "\uC120\uD0DD\uD55C \uCC28\uB7C9 \uC8FC\uBCC0\uC5D0\uC11C \uC815\uBE44\uC18C\uB97C \uCC3E\uC744 \uBC18\uACBD\uC744 \uC124\uC815\uD569\uB2C8\uB2E4.", children: _jsx(InfoCircleOutlined, {}) })] })), _jsx(Button, { icon: _jsx(CompassOutlined, {}), onClick: () => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(position => {
                                            const currentLocation = {
                                                lat: position.coords.latitude,
                                                lng: position.coords.longitude
                                            };
                                            setMapCenter(currentLocation);
                                            mapInstance?.setZoom(15);
                                        }, () => {
                                            message.error('현재 위치를 가져올 수 없습니다.');
                                        });
                                    }
                                    else {
                                        message.error('브라우저가 위치 정보를 지원하지 않습니다.');
                                    }
                                }, children: "\uD604\uC7AC \uC704\uCE58\uB85C \uC774\uB3D9" }), _jsx("div", { className: "flex flex-row", children: _jsxs(Select, { style: { width: '35%' }, placeholder: "\uD544\uD130", value: filterType, onChange: value => setFilterType(value), children: [_jsx(Option, { value: "all", children: "\uC804\uCCB4" }), _jsx(Option, { value: "available", children: "\uC774\uC6A9 \uAC00\uB2A5" }), _jsx(Option, { value: "maintenance", children: "\uC815\uBE44 \uC911" })] }) })] }) }), loading && (_jsx("div", { style: {
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20
                    }, children: _jsx(Spin, { indicator: _jsx(LoadingOutlined, { style: { fontSize: 36 }, spin: true }), tip: "\uC9C0\uB3C4 \uB85C\uB529 \uC911..." }) }))] }) }));
};
export default VehicleMapView;
