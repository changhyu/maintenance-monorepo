import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EnvironmentOutlined, EditOutlined, SaveOutlined, UndoOutlined, AimOutlined } from '@ant-design/icons';
import { Card, Button, Space, Tooltip, message, Typography, Radio } from 'antd';
import { MapService, GeofenceType } from '../../services/mapService';
import './GeofenceMapView.css';
const { Text } = Typography;
/**
 * 지오펜스 맵 뷰 컴포넌트
 * 지도에 지오펜스를 표시하고 편집할 수 있는 인터페이스 제공
 */
const GeofenceMapView = ({ apiClient, selectedGeofence, onGeofenceCreate, onGeofenceUpdate, onGeofenceSelect, onCoordinatesChange, googleMapsApiKey, center = { latitude: 37.5665, longitude: 126.978 }, // 서울 중심
zoom = 12, readOnly = false }) => {
    // 서비스 초기화 - useMemo로 감싸서 재렌더링 시 새로 생성되지 않도록 함
    const mapService = useMemo(() => new MapService(apiClient), [apiClient]);
    // Refs
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const drawingManagerRef = useRef(null);
    const geofenceShapesRef = useRef(new Map());
    const activeShapeRef = useRef(null);
    // 상태 변수들
    const [geofences, setGeofences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState(GeofenceType.CIRCLE);
    const [editMode, setEditMode] = useState(false);
    const [loadingScript, setLoadingScript] = useState(true);
    // Google Maps 스크립트 로드
    useEffect(() => {
        if (!window.google && !document.getElementById('google-maps-script')) {
            setLoadingScript(true);
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=drawing,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                setLoadingScript(false);
                initializeMap();
            };
            document.head.appendChild(script);
        }
        else if (window.google) {
            setLoadingScript(false);
            initializeMap();
        }
    }, [googleMapsApiKey]);
    // 지도 초기화
    const initializeMap = useCallback(() => {
        if (!mapRef.current || !window.google)
            return;
        const mapOptions = {
            center: { lat: center.latitude, lng: center.longitude },
            zoom,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeId: window.google.maps.MapTypeId.ROADMAP
        };
        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        // 지오펜스 데이터 로드
        loadGeofences();
        // 읽기 전용이 아닌 경우 그리기 관리자 설정
        if (!readOnly) {
            setupDrawingManager();
        }
        // 지도 클릭 이벤트
        googleMapRef.current.addListener('click', (event) => {
            if (onCoordinatesChange) {
                onCoordinatesChange({
                    latitude: event.latLng.lat(),
                    longitude: event.latLng.lng()
                });
            }
        });
    }, [center, zoom, readOnly]);
    // 그리기 관리자 설정
    const setupDrawingManager = () => {
        if (!window.google || !googleMapRef.current)
            return;
        // 기존 그리기 관리자 제거
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setMap(null);
        }
        // 그리기 관리자 생성
        drawingManagerRef.current = new window.google.maps.drawing.DrawingManager({
            drawingMode: null, // 초기에는 그리기 모드 비활성화
            drawingControl: false, // 기본 그리기 컨트롤 비활성화 (커스텀 컨트롤 사용)
            circleOptions: {
                fillColor: '#1890ff',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#1890ff',
                editable: true,
                zIndex: 1
            },
            polygonOptions: {
                fillColor: '#1890ff',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#1890ff',
                editable: true,
                zIndex: 1
            },
            rectangleOptions: {
                fillColor: '#1890ff',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#1890ff',
                editable: true,
                zIndex: 1
            }
        });
        drawingManagerRef.current.setMap(googleMapRef.current);
        // 도형 완료 이벤트 처리
        window.google.maps.event.addListener(drawingManagerRef.current, 'overlaycomplete', (event) => {
            // 그리기 모드 끄기
            drawingManagerRef.current.setDrawingMode(null);
            setIsDrawing(false);
            const shape = event.overlay;
            activeShapeRef.current = shape;
            // 도형 정보 추출
            const shapeData = extractShapeData(shape, event.type);
            // 새 지오펜스 생성을 위한 콜백 호출
            if (onGeofenceCreate) {
                const geofenceData = {
                    name: `새 ${getGeofenceTypeLabel(convertGoogleTypeToGeofenceType(event.type))}`,
                    description: '',
                    type: convertGoogleTypeToGeofenceType(event.type),
                    coordinates: shapeData.coordinates,
                    radius: shapeData.radius,
                    color: '#1890ff',
                    alerts: []
                };
                onGeofenceCreate(geofenceData);
            }
        });
    };
    // Google Maps 도형 타입을 GeofenceType으로 변환
    const convertGoogleTypeToGeofenceType = (googleType) => {
        switch (googleType.toLowerCase()) {
            case 'circle':
                return GeofenceType.CIRCLE;
            case 'polygon':
                return GeofenceType.POLYGON;
            case 'rectangle':
                return GeofenceType.RECTANGLE;
            default:
                return GeofenceType.CIRCLE;
        }
    };
    // GeofenceType을 Google Maps 도형 타입으로 변환
    const convertGeofenceTypeToGoogleType = (geofenceType) => {
        switch (geofenceType) {
            case GeofenceType.CIRCLE:
                return 'circle';
            case GeofenceType.POLYGON:
                return 'polygon';
            case GeofenceType.RECTANGLE:
                return 'rectangle';
            default:
                return 'circle';
        }
    };
    // 지오펜스 유형 라벨 가져오기
    const getGeofenceTypeLabel = (type) => {
        switch (type) {
            case GeofenceType.CIRCLE:
                return '원형 지오펜스';
            case GeofenceType.POLYGON:
                return '다각형 지오펜스';
            case GeofenceType.RECTANGLE:
                return '사각형 지오펜스';
            default:
                return '지오펜스';
        }
    };
    // 도형 데이터 추출
    const extractShapeData = (shape, type) => {
        let coordinates = { latitude: 0, longitude: 0 };
        let radius;
        const typeLC = type.toLowerCase();
        if (typeLC === 'circle' && shape.getCenter && shape.getRadius) {
            const center = shape.getCenter();
            coordinates = {
                latitude: center.lat(),
                longitude: center.lng()
            };
            radius = shape.getRadius();
        }
        else if (typeLC === 'polygon' && shape.getPath) {
            const path = shape.getPath().getArray();
            coordinates = path.map((point) => ({
                latitude: point.lat(),
                longitude: point.lng()
            }));
        }
        else if (typeLC === 'rectangle' && shape.getBounds) {
            const bounds = shape.getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            coordinates = [
                { latitude: ne.lat(), longitude: ne.lng() },
                { latitude: ne.lat(), longitude: sw.lng() },
                { latitude: sw.lat(), longitude: sw.lng() },
                { latitude: sw.lat(), longitude: ne.lng() }
            ];
        }
        return {
            coordinates,
            radius
        };
    };
    // 지오펜스 목록 로드
    const loadGeofences = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mapService.getGeofences();
            setGeofences(data);
            // 지도에 지오펜스 표시
            if (googleMapRef.current) {
                clearGeofenceShapes();
                data.forEach(geofence => {
                    drawGeofenceOnMap(geofence);
                });
            }
        }
        catch (error) {
            console.error('지오펜스 목록 로드 중 오류 발생:', error);
            message.error('지오펜스 목록을 로드하는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    }, [mapService]);
    // 지도에 지오펜스 그리기
    const drawGeofenceOnMap = (geofence) => {
        if (!window.google || !googleMapRef.current)
            return;
        let shape;
        switch (geofence.type) {
            case GeofenceType.CIRCLE: {
                const center = new window.google.maps.LatLng(geofence.coordinates.latitude, geofence.coordinates.longitude);
                shape = new window.google.maps.Circle({
                    map: googleMapRef.current,
                    center,
                    radius: geofence.radius || 1000,
                    fillColor: geofence.color || '#1890ff',
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    strokeColor: geofence.color || '#1890ff',
                    editable: false,
                    zIndex: 1
                });
                break;
            }
            case GeofenceType.POLYGON: {
                const path = geofence.coordinates.map(coord => new window.google.maps.LatLng(coord.latitude, coord.longitude));
                shape = new window.google.maps.Polygon({
                    map: googleMapRef.current,
                    paths: path,
                    fillColor: geofence.color || '#1890ff',
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    strokeColor: geofence.color || '#1890ff',
                    editable: false,
                    zIndex: 1
                });
                break;
            }
            case GeofenceType.RECTANGLE: {
                // 사각형의 경우 좌표는 북동, 북서, 남서, 남동 순서로 가정
                if (geofence.coordinates.length >= 4) {
                    const coords = geofence.coordinates;
                    const bounds = new window.google.maps.LatLngBounds(new window.google.maps.LatLng(coords[2].latitude, coords[2].longitude), // 남서
                    new window.google.maps.LatLng(coords[0].latitude, coords[0].longitude) // 북동
                    );
                    shape = new window.google.maps.Rectangle({
                        map: googleMapRef.current,
                        bounds,
                        fillColor: geofence.color || '#1890ff',
                        fillOpacity: 0.3,
                        strokeWeight: 2,
                        strokeColor: geofence.color || '#1890ff',
                        editable: false,
                        zIndex: 1
                    });
                }
                break;
            }
            default:
                break;
        }
        if (shape) {
            // 클릭 이벤트 추가
            window.google.maps.event.addListener(shape, 'click', () => {
                if (onGeofenceSelect) {
                    onGeofenceSelect(geofence);
                }
                setEditMode(false);
            });
            // 지오펜스 ID로 도형 객체 저장
            geofenceShapesRef.current.set(geofence.id, shape);
            // 선택된 지오펜스인 경우 강조 표시
            if (selectedGeofence && selectedGeofence.id === geofence.id) {
                shape.setOptions({
                    fillOpacity: 0.5,
                    strokeWeight: 3,
                    zIndex: 2
                });
                // 지도 중심 이동
                centerMapOnGeofence(geofence);
            }
        }
    };
    // 지오펜스에 지도 중심 이동
    const centerMapOnGeofence = (geofence) => {
        if (!window.google || !googleMapRef.current)
            return;
        switch (geofence.type) {
            case GeofenceType.CIRCLE: {
                const center = new window.google.maps.LatLng(geofence.coordinates.latitude, geofence.coordinates.longitude);
                googleMapRef.current.setCenter(center);
                break;
            }
            case GeofenceType.POLYGON:
            case GeofenceType.RECTANGLE: {
                // 모든 좌표의 중심을 계산
                const coords = geofence.coordinates;
                if (coords.length > 0) {
                    const bounds = new window.google.maps.LatLngBounds();
                    coords.forEach(coord => {
                        bounds.extend(new window.google.maps.LatLng(coord.latitude, coord.longitude));
                    });
                    googleMapRef.current.fitBounds(bounds);
                }
                break;
            }
            default:
                break;
        }
    };
    // 지오펜스 도형 모두 제거
    const clearGeofenceShapes = () => {
        geofenceShapesRef.current.forEach(shape => {
            shape.setMap(null);
        });
        geofenceShapesRef.current.clear();
    };
    // 선택된 지오펜스가 변경되면 지도에 표시
    useEffect(() => {
        if (selectedGeofence && googleMapRef.current) {
            // 모든 도형의 스타일 초기화
            geofenceShapesRef.current.forEach(shape => {
                shape.setOptions({
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    zIndex: 1,
                    editable: false
                });
            });
            // 선택된 지오펜스 강조 표시
            const selectedShape = geofenceShapesRef.current.get(selectedGeofence.id);
            if (selectedShape) {
                selectedShape.setOptions({
                    fillOpacity: 0.5,
                    strokeWeight: 3,
                    zIndex: 2,
                    editable: editMode
                });
                // 편집 모드일 경우 선택된 도형 저장
                if (editMode) {
                    activeShapeRef.current = selectedShape;
                }
                // 지도 중심 이동
                centerMapOnGeofence(selectedGeofence);
            }
        }
    }, [selectedGeofence, editMode]);
    // 그리기 시작
    const startDrawing = (mode) => {
        if (!window.google || !drawingManagerRef.current)
            return;
        setDrawingMode(mode);
        setIsDrawing(true);
        setEditMode(false);
        // 활성 도형 저장
        if (activeShapeRef.current) {
            activeShapeRef.current.setMap(null);
            activeShapeRef.current = null;
        }
        // 그리기 모드 설정
        let googleDrawingMode;
        switch (mode) {
            case GeofenceType.CIRCLE:
                googleDrawingMode = window.google.maps.drawing.OverlayType.CIRCLE;
                break;
            case GeofenceType.POLYGON:
                googleDrawingMode = window.google.maps.drawing.OverlayType.POLYGON;
                break;
            case GeofenceType.RECTANGLE:
                googleDrawingMode = window.google.maps.drawing.OverlayType.RECTANGLE;
                break;
            default:
                googleDrawingMode = window.google.maps.drawing.OverlayType.CIRCLE;
        }
        drawingManagerRef.current.setDrawingMode(googleDrawingMode);
        message.info(`${getGeofenceTypeLabel(mode)} 그리기를 시작합니다. 지도를 클릭하여 그리세요.`);
    };
    // 그리기 취소
    const cancelDrawing = () => {
        if (!drawingManagerRef.current)
            return;
        drawingManagerRef.current.setDrawingMode(null);
        setIsDrawing(false);
        // 임시 도형 제거
        if (activeShapeRef.current) {
            activeShapeRef.current.setMap(null);
            activeShapeRef.current = null;
        }
        message.info('그리기가 취소되었습니다.');
    };
    // 편집 모드 토글
    const toggleEditMode = () => {
        if (!selectedGeofence) {
            message.warning('편집할 지오펜스를 먼저 선택하세요.');
            return;
        }
        const newEditMode = !editMode;
        setEditMode(newEditMode);
        // 선택된 도형 편집 가능 상태 설정
        const selectedShape = geofenceShapesRef.current.get(selectedGeofence.id);
        if (selectedShape) {
            selectedShape.setOptions({ editable: newEditMode });
            activeShapeRef.current = selectedShape;
        }
        message.info(`지오펜스 편집 모드 ${newEditMode ? '활성화' : '비활성화'}`);
    };
    // 편집 저장
    const saveEdits = () => {
        if (!selectedGeofence || !activeShapeRef.current) {
            message.warning('저장할 편집 내용이 없습니다.');
            return;
        }
        // 도형 정보 추출
        const googleType = convertGeofenceTypeToGoogleType(selectedGeofence.type);
        const shapeData = extractShapeData(activeShapeRef.current, googleType);
        // 업데이트 콜백 호출
        if (onGeofenceUpdate) {
            const updatedGeofence = {
                ...selectedGeofence,
                coordinates: shapeData.coordinates,
                radius: shapeData.radius
            };
            onGeofenceUpdate(updatedGeofence);
        }
        setEditMode(false);
        message.success('지오펜스 변경사항이 저장되었습니다.');
    };
    // 그리기 모드 변경 처리
    const handleDrawingModeChange = (e) => {
        const mode = e.target.value;
        startDrawing(mode);
    };
    // 현재 위치로 이동
    const moveToCurrentLocation = () => {
        if (!googleMapRef.current)
            return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                googleMapRef.current.setCenter(currentLocation);
                googleMapRef.current.setZoom(15);
                // 현재 위치 마커 추가
                new window.google.maps.Marker({
                    position: currentLocation,
                    map: googleMapRef.current,
                    title: '현재 위치',
                    animation: window.google.maps.Animation.DROP
                });
                if (onCoordinatesChange) {
                    onCoordinatesChange({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                }
            }, error => {
                console.error('현재 위치를 가져오는 중 오류 발생:', error);
                message.error('현재 위치를 가져오는 데 실패했습니다.');
            });
        }
        else {
            message.error('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
        }
    };
    return (_jsx("div", { className: "geofence-map-view", children: _jsx(Card, { title: _jsxs(Space, { children: [_jsx(EnvironmentOutlined, {}), _jsx("span", { children: "\uC9C0\uC624\uD39C\uC2A4 \uC9C0\uB3C4" })] }), extra: !readOnly && (_jsxs(Space, { children: [isDrawing ? (_jsx(Button, { icon: _jsx(UndoOutlined, {}), onClick: cancelDrawing, children: "\uADF8\uB9AC\uAE30 \uCDE8\uC18C" })) : (_jsxs(_Fragment, { children: [selectedGeofence && (_jsx(Space, { children: editMode ? (_jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), onClick: saveEdits, children: "\uC800\uC7A5" })) : (_jsx(Button, { icon: _jsx(EditOutlined, {}), onClick: toggleEditMode, children: "\uD3B8\uC9D1" })) })), _jsxs(Radio.Group, { value: drawingMode, onChange: handleDrawingModeChange, buttonStyle: "solid", size: "small", children: [_jsx(Tooltip, { title: "\uC6D0\uD615 \uC9C0\uC624\uD39C\uC2A4 \uADF8\uB9AC\uAE30", children: _jsx(Radio.Button, { value: GeofenceType.CIRCLE, children: "\uC6D0\uD615" }) }), _jsx(Tooltip, { title: "\uB2E4\uAC01\uD615 \uC9C0\uC624\uD39C\uC2A4 \uADF8\uB9AC\uAE30", children: _jsx(Radio.Button, { value: GeofenceType.POLYGON, children: "\uB2E4\uAC01\uD615" }) }), _jsx(Tooltip, { title: "\uC0AC\uAC01\uD615 \uC9C0\uC624\uD39C\uC2A4 \uADF8\uB9AC\uAE30", children: _jsx(Radio.Button, { value: GeofenceType.RECTANGLE, children: "\uC0AC\uAC01\uD615" }) })] })] })), _jsx(Tooltip, { title: "\uD604\uC7AC \uC704\uCE58\uB85C \uC774\uB3D9", children: _jsx(Button, { icon: _jsx(AimOutlined, {}), onClick: moveToCurrentLocation }) })] })), children: _jsx("div", { className: "map-container", children: loadingScript ? (_jsx("div", { className: "map-loading", children: _jsx(Text, { children: "\uC9C0\uB3C4 \uB85C\uB529 \uC911..." }) })) : (_jsx("div", { ref: mapRef, className: "google-map" })) }) }) }));
};
export default GeofenceMapView;
