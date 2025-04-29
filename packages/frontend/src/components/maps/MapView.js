import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer, Circle } from '@react-google-maps/api';
import { Card, Spin, Button, Typography, Tabs, Space, Badge, Rate } from 'antd';
import { MapService } from '../../services/mapService';
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
    fullscreenControl: true
};
// 차량 마커 아이콘 생성 함수
const getVehicleIcon = () => {
    if (window.google) {
        return {
            url: '/images/vehicle-marker.png', // 실제 프로젝트에 맞는 경로로 수정 필요
            scaledSize: new window.google.maps.Size(32, 32)
        };
    }
    return null;
};
// 정비소 마커 아이콘 생성 함수
const getShopIcon = () => {
    if (window.google) {
        return {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new window.google.maps.Size(32, 32)
        };
    }
    return null;
};
const MapView = ({ apiClient, googleMapsApiKey, initialCenter = { latitude: 37.5665, longitude: 126.978 }, // 서울 중심
initialZoom = 13, vehicleId, userId, showShops = true, showVehicles = true, onSelectShop, onSelectVehicle }) => {
    // 지도 서비스 초기화 - useMemo로 감싸서 재렌더링 시 새로 생성되지 않도록 함
    const mapService = useMemo(() => new MapService(apiClient), [apiClient]);
    // Google Maps API 로드
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey,
        libraries: ['places', 'geometry', 'drawing']
    });
    // 상태 관리
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [center, setCenter] = useState({
        lat: initialCenter.latitude,
        lng: initialCenter.longitude
    });
    // 데이터 상태
    const [shops, setShops] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [searchRadius] = useState(5); // km
    const [directions, setDirections] = useState(null);
    const [route, setRoute] = useState(null);
    // 인풋 포커스 상태
    const directionsServiceRef = useRef(null);
    // 지도 로드 완료 핸들러
    const handleMapLoad = useCallback((mapInstance) => {
        setMap(mapInstance);
        if (!directionsServiceRef.current && window.google) {
            directionsServiceRef.current = new window.google.maps.DirectionsService();
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
    const loadShopsInBounds = async (bounds) => {
        try {
            setLoading(true);
            const shopsData = await mapService.findShopsInBounds(bounds);
            setShops(shopsData);
        }
        catch (error) {
            console.error('경계 내 정비소 로드 중 오류 발생:', error);
        }
        finally {
            setLoading(false);
        }
    };
    // 차량 위치 로드
    const loadVehicles = useCallback(async () => {
        if (!showVehicles) {
            return;
        }
        try {
            setLoading(true);
            if (vehicleId) {
                // 단일 차량 위치 로드
                const vehicleData = await mapService.getVehicleLocation(vehicleId);
                // null 체크 추가
                if (vehicleData) {
                    setVehicles([vehicleData]);
                    // 차량 위치로 지도 이동
                    setCenter({
                        lat: vehicleData.latitude,
                        lng: vehicleData.longitude
                    });
                }
                else {
                    console.error('차량 위치 정보를 찾을 수 없습니다.');
                }
            }
            else if (userId) {
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
        }
        catch (error) {
            console.error('차량 위치 로드 중 오류 발생:', error);
        }
        finally {
            setLoading(false);
        }
    }, [vehicleId, userId, showVehicles, mapService]);
    // 주변 정비소 검색
    const findNearbyShops = useCallback(async (location) => {
        if (!showShops) {
            return;
        }
        try {
            setLoading(true);
            const searchOptions = {
                center: location,
                radius: searchRadius,
                unit: 'km'
            };
            const shopsData = await mapService.findShopsNearby(searchOptions);
            setShops(shopsData);
        }
        catch (error) {
            console.error('주변 정비소 검색 중 오류 발생:', error);
        }
        finally {
            setLoading(false);
        }
    }, [showShops, searchRadius, mapService]);
    // 정비소 선택 핸들러
    const handleShopSelected = useCallback((shop) => {
        setSelectedShop(shop);
        if (onSelectShop) {
            onSelectShop(shop);
        }
        // 지도를 정비소 위치로 이동
        setCenter({
            lat: shop.latitude,
            lng: shop.longitude
        });
    }, [onSelectShop]);
    // 차량 선택 핸들러
    const handleVehicleSelected = useCallback((vehicle) => {
        setSelectedVehicle(vehicle);
        if (onSelectVehicle) {
            onSelectVehicle(vehicle);
        }
        // 지도를 차량 위치로 이동
        setCenter({
            lat: vehicle.latitude,
            lng: vehicle.longitude
        });
    }, [onSelectVehicle]);
    // 경로 계산 핸들러
    const calculateRoute = useCallback(async (origin, destination) => {
        if (!directionsServiceRef.current) {
            return;
        }
        try {
            setLoading(true);
            // Google Maps 방향 서비스로 경로 계산
            directionsServiceRef.current.route({
                origin: { lat: origin.latitude, lng: origin.longitude },
                destination: { lat: destination.latitude, lng: destination.longitude },
                travelMode: google.maps.TravelMode.DRIVING
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                }
                else {
                    console.error('경로 계산에 실패했습니다.');
                }
            });
            // 백엔드 API를 통한 경로 계산 (추가 정보용)
            const routeData = await mapService.calculateRoute(origin, destination);
            setRoute(routeData);
        }
        catch (error) {
            console.error('경로 계산 중 오류 발생:', error);
        }
        finally {
            setLoading(false);
        }
    }, [mapService]);
    // 차량에서 정비소까지 경로 계산
    const calculateRouteToShop = useCallback(() => {
        if (selectedVehicle && selectedShop) {
            calculateRoute({
                latitude: selectedVehicle.latitude,
                longitude: selectedVehicle.longitude
            }, {
                latitude: selectedShop.latitude,
                longitude: selectedShop.longitude
            });
        }
    }, [selectedVehicle, selectedShop, calculateRoute]);
    // 차량 최근 위치에서 가장 가까운 정비소 검색
    const findNearestShops = useCallback(async () => {
        if (!vehicleId) {
            return;
        }
        try {
            setLoading(true);
            const nearestShops = await mapService.findNearestShopsToVehicle(vehicleId, 5);
            setShops(nearestShops);
            if (nearestShops.length > 0) {
                setSelectedShop(nearestShops[0]);
            }
        }
        catch (error) {
            console.error('가장 가까운 정비소 검색 중 오류 발생:', error);
        }
        finally {
            setLoading(false);
        }
    }, [vehicleId, mapService]);
    // 컴포넌트 마운트 시 차량 및 정비소 데이터 로드
    useEffect(() => {
        if (isLoaded) {
            loadVehicles();
        }
    }, [isLoaded, loadVehicles]);
    // 로딩 중 또는 에러 시 표시
    if (loadError) {
        return (_jsx(Card, { children: _jsxs(Text, { type: "danger", children: ["\uC9C0\uB3C4\uB97C \uB85C\uB4DC\uD558\uB294 \uB370 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4: ", loadError.message] }) }));
    }
    if (!isLoaded) {
        return (_jsx(Card, { children: _jsx(Spin, { tip: "\uC9C0\uB3C4 \uB85C\uB4DC \uC911..." }) }));
    }
    return (_jsx("div", { className: "map-view", children: _jsxs(Card, { loading: loading, children: [_jsx("div", { className: "map-container", children: _jsxs(GoogleMap, { id: "map", mapContainerStyle: mapContainerStyle, zoom: initialZoom, center: center, options: defaultMapOptions, onLoad: handleMapLoad, onBoundsChanged: handleBoundsChanged, children: [showVehicles &&
                                vehicles.map(vehicle => (_jsx(Marker, { position: { lat: vehicle.latitude, lng: vehicle.longitude }, icon: getVehicleIcon(), title: vehicle.name ?? `차량 ${vehicle.vehicleId}`, onClick: () => handleVehicleSelected(vehicle) }, vehicle.vehicleId))), selectedVehicle && (_jsx(InfoWindow, { position: { lat: selectedVehicle.latitude, lng: selectedVehicle.longitude }, onCloseClick: () => setSelectedVehicle(null), options: { content: '' }, children: _jsxs("div", { children: [_jsx(Title, { level: 5, children: selectedVehicle.name ?? `차량 ${selectedVehicle.vehicleId}` }), _jsxs("p", { children: [_jsx("strong", { children: "\uC0C1\uD0DC:" }), " ", selectedVehicle.status] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC8FC\uC18C:" }), " ", selectedVehicle.address] }), _jsxs("p", { children: [_jsx("strong", { children: "\uB9C8\uC9C0\uB9C9 \uC5C5\uB370\uC774\uD2B8:" }), ' ', new Date(selectedVehicle.lastUpdated).toLocaleString()] }), selectedVehicle.speed !== undefined && (_jsxs("p", { children: [_jsx("strong", { children: "\uC18D\uB3C4:" }), " ", selectedVehicle.speed, " km/h"] })), _jsx(Button, { type: "primary", onClick: findNearestShops, children: "\uADFC\uCC98 \uC815\uBE44\uC18C \uCC3E\uAE30" })] }) })), showShops &&
                                shops.map(shop => (_jsx(Marker, { position: { lat: shop.latitude, lng: shop.longitude }, icon: getShopIcon(), title: shop.name, onClick: () => handleShopSelected(shop) }, shop.shopId))), selectedShop && (_jsx(InfoWindow, { position: { lat: selectedShop.latitude, lng: selectedShop.longitude }, onCloseClick: () => setSelectedShop(null), options: { content: '' }, children: _jsxs("div", { children: [_jsx(Title, { level: 5, children: selectedShop.name }), _jsxs("p", { children: [_jsx("strong", { children: "\uC8FC\uC18C:" }), " ", selectedShop.address] }), _jsxs("p", { children: [_jsx("strong", { children: "\uD3C9\uC810:" }), " ", _jsx(Rate, { disabled: true, defaultValue: selectedShop.rating }), " (", selectedShop.rating, ")"] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC601\uC5C5\uC2DC\uAC04:" }), " ", selectedShop.openHours] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC5F0\uB77D\uCC98:" }), " ", selectedShop.contactNumber] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC11C\uBE44\uC2A4:" }), " ", selectedShop.services.join(', ')] }), selectedShop.website && (_jsxs("p", { children: [_jsx("strong", { children: "\uC6F9\uC0AC\uC774\uD2B8:" }), ' ', _jsx("a", { href: selectedShop.website, target: "_blank", rel: "noopener noreferrer", children: selectedShop.website })] })), selectedVehicle && (_jsx(Button, { type: "primary", onClick: calculateRouteToShop, children: "\uACBD\uB85C \uACC4\uC0B0\uD558\uAE30" }))] }) })), selectedVehicle && (_jsx(Circle, { center: { lat: selectedVehicle.latitude, lng: selectedVehicle.longitude }, radius: searchRadius * 1000, options: {
                                    strokeColor: '#0088FF',
                                    strokeOpacity: 0.8,
                                    strokeWeight: 2,
                                    fillColor: '#0088FF',
                                    fillOpacity: 0.1
                                } })), directions && (_jsx(DirectionsRenderer, { directions: directions, options: {
                                    polylineOptions: {
                                        strokeColor: '#0088FF',
                                        strokeWeight: 4
                                    },
                                    suppressMarkers: true
                                } }))] }) }), route && (_jsx(Card, { title: "\uACBD\uB85C \uC815\uBCF4", className: "mt-4", children: _jsxs(Space, { direction: "vertical", children: [_jsxs(Text, { children: [_jsx("strong", { children: "\uCD9C\uBC1C\uC9C0:" }), " ", route.origin.address] }), _jsxs(Text, { children: [_jsx("strong", { children: "\uBAA9\uC801\uC9C0:" }), " ", route.destination.address] }), _jsxs(Text, { children: [_jsx("strong", { children: "\uCD1D \uAC70\uB9AC:" }), " ", route.distance, " km"] }), _jsxs(Text, { children: [_jsx("strong", { children: "\uC608\uC0C1 \uC18C\uC694 \uC2DC\uAC04:" }), " ", Math.floor(route.duration / 60), "\uBD84"] }), _jsx(Tabs, { defaultActiveKey: "1", children: _jsx(TabPane, { tab: "\uB2E8\uACC4\uBCC4 \uC548\uB0B4", children: route.steps.map((step, index) => (_jsxs("div", { className: "route-step", children: [_jsx(Badge, { count: index + 1 }), _jsx("div", { dangerouslySetInnerHTML: { __html: step.instructions } }), _jsxs(Text, { type: "secondary", children: [step.distance, " km"] })] }, `step-${route.origin.address}-${index}`))) }, "1") })] }) }))] }) }));
};
export default MapView;
