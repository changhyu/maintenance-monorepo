import { notification } from 'antd';
import { NotificationType } from '../types/notification';
import { notificationService } from './notificationService';
/**
 * 지도 이벤트 타입 열거형
 */
export var MapEventType;
(function (MapEventType) {
    MapEventType["VEHICLE_MOVED"] = "vehicle_moved";
    MapEventType["GEOFENCE_ENTER"] = "geofence_enter";
    MapEventType["GEOFENCE_EXIT"] = "geofence_exit";
    MapEventType["GEOFENCE_DWELL"] = "geofence_dwell";
    MapEventType["ROUTE_DEVIATION"] = "route_deviation";
    MapEventType["BOUNDARY_EXIT"] = "boundary_exit";
    MapEventType["BOUNDARY_ENTER"] = "boundary_enter";
})(MapEventType || (MapEventType = {}));
/**
 * 지오펜스 유형 열거형
 */
export var GeofenceType;
(function (GeofenceType) {
    GeofenceType["CIRCLE"] = "circle";
    GeofenceType["POLYGON"] = "polygon";
    GeofenceType["RECTANGLE"] = "rectangle";
})(GeofenceType || (GeofenceType = {}));
/**
 * 지오펜스 알림 유형 열거형
 */
export var GeofenceAlertType;
(function (GeofenceAlertType) {
    GeofenceAlertType["ENTRY"] = "entry";
    GeofenceAlertType["EXIT"] = "exit";
    GeofenceAlertType["DWELL"] = "dwell";
})(GeofenceAlertType || (GeofenceAlertType = {}));
/**
 * 지도 서비스 클래스
 */
export class MapService {
    /**
     * 생성자
     * @param apiClient API 클라이언트
     */
    constructor(apiClient) {
        this.basePath = '/maps';
        this.geofences = [];
        this.activeGeofences = [];
        this.monitoringIntervals = {};
        this.activeVehicleLocations = {};
        this.lastGeofenceEvents = {};
        this.activeBoundaries = [];
        this.lastBoundaryEvents = {};
        // 지오펜스 모니터링 활성화 상태
        this.monitoringActive = false;
        this.apiClient = apiClient;
    }
    /**
     * 주소로 위치 검색
     * @param address 주소 또는 장소명
     * @returns 위치 목록
     */
    async searchLocation(address) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/geocode`, {
                params: { address }
            });
            return response;
        }
        catch (error) {
            console.error('[mapService] 위치 검색 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 좌표로 주소 검색 (역지오코딩)
     * @param coordinates 좌표
     * @returns 주소 정보
     */
    async reverseGeocode(coordinates) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/reverse-geocode`, {
                params: coordinates
            });
            return response;
        }
        catch (error) {
            console.error('[mapService] 역지오코딩 중 오류 발생:', error);
            return null;
        }
    }
    /**
     * 특정 반경 내 정비소 검색
     * @param search 검색 반경 정보
     * @returns 정비소 위치 목록
     */
    async findShopsNearby(search) {
        try {
            const response = await this.apiClient.post(`${this.basePath}/shops/search/nearby`, search);
            return response;
        }
        catch (error) {
            console.error('[mapService] 주변 정비소 검색 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 경계 영역 내 정비소 검색
     * @param bounds 지도 경계
     * @returns 정비소 위치 목록
     */
    async findShopsInBounds(bounds) {
        try {
            const response = await this.apiClient.post('/api/shops/search/bounds', bounds);
            return response;
        }
        catch (error) {
            console.error('범위 내 정비소 검색 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 차량 현재 위치 조회
     * @param vehicleId 차량 ID
     * @returns 차량 위치
     */
    async getVehicleLocation(vehicleId) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/vehicles/${vehicleId}/location`);
            return response;
        }
        catch (error) {
            console.error(`[mapService] 차량 ID ${vehicleId} 위치 조회 중 오류 발생:`, error);
            notification.error({
                message: '차량 위치 조회 실패',
                description: `차량 ID ${vehicleId}의 위치를 가져올 수 없습니다.`
            });
            return null;
        }
    }
    /**
     * 사용자의 차량 목록 위치 조회
     * @param userId 사용자 ID
     * @returns 차량 위치 목록
     */
    async getUserVehiclesLocations(userId) {
        try {
            const response = await this.apiClient.get(`/api/users/${userId}/vehicles/locations`);
            return response;
        }
        catch (error) {
            console.error(`사용자 ID ${userId}의 차량 위치 조회 중 오류 발생:`, error);
            return [];
        }
    }
    /**
     * 위치 간 경로 계산
     * @param origin 출발지 좌표
     * @param destination 목적지 좌표
     * @param waypoints 경유지 좌표 목록 (선택)
     * @returns 경로 정보
     */
    async calculateRoute(origin, destination, waypoints) {
        try {
            const response = await this.apiClient.post('/api/routes/calculate', {
                origin,
                destination,
                waypoints
            });
            return response;
        }
        catch (error) {
            console.error('경로 계산 중 오류 발생:', error);
            return null;
        }
    }
    /**
     * 두 위치 간 거리 계산
     * @param origin 출발지 좌표
     * @param destination 목적지 좌표
     * @param unit 거리 단위 (기본값: 킬로미터)
     * @returns 거리 (단위에 따라 km 또는 miles)
     */
    async calculateDistance(origin, destination, unit = 'km') {
        try {
            const response = await this.apiClient.post(`${this.basePath}/distance`, {
                origin,
                destination,
                unit
            });
            return response.distance;
        }
        catch (error) {
            console.error('[mapService] 거리 계산 중 오류 발생:', error);
            // Fallback: 직선 거리 계산
            return this.calculateHaversineDistance(origin, destination, unit);
        }
    }
    /**
     * 정비소 상세 정보 조회
     * @param shopId 정비소 ID
     * @returns 정비소 위치 및 상세 정보
     */
    async getShopDetails(shopId) {
        try {
            const response = await this.apiClient.get(`/api/shops/${shopId}`);
            return response;
        }
        catch (error) {
            console.error(`정비소 ID ${shopId} 상세 정보 조회 중 오류 발생:`, error);
            return null;
        }
    }
    /**
     * 차량에서 가장 가까운 정비소 검색
     * @param vehicleId 차량 ID
     * @param limit 결과 제한 수 (기본값: 5)
     * @returns 가까운 정비소 목록
     */
    async findNearestShopsToVehicle(vehicleId, limit = 5) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/vehicles/${vehicleId}/nearest-shops`, {
                params: { limit }
            });
            return response;
        }
        catch (error) {
            console.error(`[mapService] 차량 ID ${vehicleId}에서 가까운 정비소 검색 중 오류 발생:`, error);
            return [];
        }
    }
    /**
     * 특정 서비스를 제공하는 주변 정비소 검색
     * @param search 검색 반경 정보
     * @param services 필요한 서비스 목록
     * @returns 정비소 위치 목록
     */
    async findShopsByServices(search, services) {
        try {
            const response = await this.apiClient.post(`${this.basePath}/shops/by-services`, {
                ...search,
                services
            });
            return response;
        }
        catch (error) {
            console.error('[mapService] 서비스별 정비소 검색 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 정비소 검색 및 정렬
     * @param location 현재 위치
     * @param query 검색어
     * @param filters 필터 (서비스, 평점 등)
     * @param sortBy 정렬 기준 ('distance', 'rating', 'name')
     * @returns 정비소 목록
     */
    async searchShops(location, query, filters, sortBy = 'distance') {
        try {
            const response = await this.apiClient.post(`${this.basePath}/shops/search`, {
                location,
                query,
                filters,
                sortBy
            });
            return response;
        }
        catch (error) {
            console.error('[mapService] 정비소 검색 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 지오펜스 생성
     * @param geofence 지오펜스 생성 데이터
     * @returns 생성된 지오펜스
     */
    async createGeofence(geofence) {
        try {
            const response = await this.apiClient.post(`${this.basePath}/geofences`, geofence);
            return response;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 생성 중 오류 발생:', error);
            return null;
        }
    }
    /**
     * 지오펜스 목록 조회
     * @param active 활성 상태 필터 (선택)
     * @returns 지오펜스 목록
     */
    async getGeofences(active) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/geofences`, {
                params: { active }
            });
            return response;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 목록 조회 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 지오펜스 상세 조회
     * @param geofenceId 지오펜스 ID
     * @returns 지오펜스 상세 정보
     */
    async getGeofence(geofenceId) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/geofences/${geofenceId}`);
            return response;
        }
        catch (error) {
            console.error(`[mapService] 지오펜스 ID ${geofenceId} 조회 중 오류 발생:`, error);
            return null;
        }
    }
    /**
     * 지오펜스 업데이트
     * @param geofenceId 지오펜스 ID
     * @param updates 업데이트할 데이터
     * @returns 업데이트된 지오펜스
     */
    async updateGeofence(geofenceId, updates) {
        try {
            const response = await this.apiClient.put(`${this.basePath}/geofences/${geofenceId}`, updates);
            return response;
        }
        catch (error) {
            console.error(`[mapService] 지오펜스 ID ${geofenceId} 업데이트 중 오류 발생:`, error);
            notification.error({
                message: '지오펜스 업데이트 실패',
                description: `지오펜스 ID ${geofenceId}를 업데이트하는 중 문제가 발생했습니다.`
            });
            return null;
        }
    }
    /**
     * 지오펜스 삭제
     * @param geofenceId 지오펜스 ID
     * @returns 성공 여부
     */
    async deleteGeofence(geofenceId) {
        try {
            await this.apiClient.delete(`${this.basePath}/geofences/${geofenceId}`);
            return true;
        }
        catch (error) {
            console.error(`[mapService] 지오펜스 ID ${geofenceId} 삭제 중 오류 발생:`, error);
            return false;
        }
    }
    /**
     * 차량에 지오펜스 할당
     * @param geofenceId 지오펜스 ID
     * @param vehicleIds 차량 ID 목록
     * @returns 성공 여부
     */
    async assignGeofenceToVehicles(geofenceId, vehicleIds) {
        try {
            await this.apiClient.post(`${this.basePath}/geofences/${geofenceId}/assign`, { vehicleIds });
            return true;
        }
        catch (error) {
            console.error(`[mapService] 지오펜스 ID ${geofenceId} 차량 할당 중 오류 발생:`, error);
            return false;
        }
    }
    /**
     * 차량에서 지오펜스 해제
     * @param geofenceId 지오펜스 ID
     * @param vehicleIds 차량 ID 목록
     * @returns 성공 여부
     */
    async unassignGeofenceFromVehicles(geofenceId, vehicleIds) {
        try {
            await this.apiClient.post(`${this.basePath}/geofences/${geofenceId}/unassign`, {
                vehicleIds
            });
            return true;
        }
        catch (error) {
            console.error(`[mapService] 지오펜스 ID ${geofenceId} 차량 해제 중 오류 발생:`, error);
            return false;
        }
    }
    /**
     * 차량 지오펜스 이벤트 조회
     * @param vehicleId 차량 ID
     * @param startDate 시작 날짜
     * @param endDate 종료 날짜
     * @returns 지오펜스 이벤트 목록
     */
    async getVehicleGeofenceEvents(vehicleId, startDate, endDate) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/vehicles/${vehicleId}/geofence-events`, {
                params: { startDate, endDate }
            });
            return response;
        }
        catch (error) {
            console.error(`[mapService] 차량 ID ${vehicleId} 지오펜스 이벤트 조회 중 오류 발생:`, error);
            return [];
        }
    }
    /**
     * 특정 지오펜스의 이벤트 조회
     * @param geofenceId 지오펜스 ID
     * @param startDate 시작 날짜 (선택)
     * @param endDate 종료 날짜 (선택)
     * @returns 지오펜스 이벤트 목록
     */
    async getGeofenceEvents(geofenceId, startDate, endDate) {
        try {
            // 실제 구현에서는 API 호출
            return []; // 임시 빈 배열 반환
        }
        catch (error) {
            console.error('지오펜스 이벤트 목록 조회 중 오류 발생:', error);
            return [];
        }
    }
    /**
     * 좌표가 지오펜스 내에 있는지 확인
     * @param coordinates 확인할 좌표
     * @param geofence 지오펜스 객체 또는 ID
     * @returns 포함 여부
     */
    async isPointInGeofence(coordinates, geofence) {
        try {
            if (typeof geofence === 'string') {
                // ID가 전달된 경우 API로 확인
                const response = await this.apiClient.post(`${this.basePath}/geofences/${geofence}/check`, coordinates);
                return response.isInside;
            }
            else {
                // 객체가 전달된 경우 클라이언트에서 계산
                switch (geofence.type) {
                    case GeofenceType.CIRCLE: {
                        // 원형 지오펜스
                        const center = Array.isArray(geofence.coordinates)
                            ? geofence.coordinates[0]
                            : geofence.coordinates;
                        const distance = this.calculateHaversineDistance(center, coordinates, 'km');
                        return distance <= (geofence.radius || 0) / 1000; // radius를 km로 변환
                    }
                    case GeofenceType.POLYGON: {
                        // 다각형 지오펜스
                        if (!Array.isArray(geofence.coordinates)) {
                            return false;
                        }
                        return this.isPointInPolygon(coordinates, geofence.coordinates);
                    }
                    default:
                        return false;
                }
            }
        }
        catch (error) {
            console.error('[mapService] 지오펜스 포함 여부 확인 중 오류 발생:', error);
            return false;
        }
    }
    /**
     * 두 좌표 간 거리 계산 (Haversine 공식)
     * @param point1 좌표 1
     * @param point2 좌표 2
     * @param unit 거리 단위
     * @returns 거리
     */
    calculateHaversineDistance(point1, point2, unit = 'km') {
        const R = unit === 'km' ? 6371 : 3959; // 지구 반경 (km 또는 마일)
        const dLat = this.toRadians(point2.latitude - point1.latitude);
        const dLon = this.toRadians(point2.longitude - point1.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(point1.latitude)) *
                Math.cos(this.toRadians(point2.latitude)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    /**
     * 각도를 라디안으로 변환
     * @param degrees 각도
     * @returns 라디안
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * 좌표가 다각형 내에 있는지 확인 (Ray Casting 알고리즘)
     * @param point 좌표
     * @param polygon 다각형 좌표 배열
     * @returns 포함 여부
     */
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].longitude;
            const yi = polygon[i].latitude;
            const xj = polygon[j].longitude;
            const yj = polygon[j].latitude;
            const intersect = yi > point.latitude !== yj > point.latitude &&
                point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
    /**
     * 지오펜스 실시간 모니터링 시작
     * @param options 모니터링 옵션
     * @returns 모니터링 성공 여부
     */
    startGeofenceMonitoring(options = {}) {
        if (this.monitoringActive) {
            console.warn('[mapService] 지오펜스 모니터링이 이미 활성화되어 있습니다.');
            return false;
        }
        const interval = options.refreshInterval || 30000; // 기본 30초
        try {
            // 모든 활성 차량 모니터링 시작
            this.monitoringIntervals['global'] = window.setInterval(async () => {
                try {
                    // 활성 차량 위치 가져오기
                    const vehicles = await this.apiClient.get('/vehicles/active-locations');
                    const activeGeofences = await this.getGeofences(true);
                    // 각 차량에 대해 지오펜스 검사
                    for (const vehicle of vehicles) {
                        const vehicleId = vehicle.id;
                        const currentLocation = {
                            lat: vehicle.latitude,
                            lng: vehicle.longitude
                        };
                        const timestamp = new Date();
                        // 이전 위치 기록 가져오기
                        const previousLocation = this.activeVehicleLocations[vehicleId];
                        this.activeVehicleLocations[vehicleId] = {
                            ...currentLocation,
                            timestamp
                        };
                        // 모든 지오펜스에 대해 검사
                        for (const geofence of activeGeofences) {
                            const geofenceId = geofence.id;
                            // 이전 위치 존재 시 해당 위치가 지오펜스 내부에 있었는지 확인
                            const wasInside = previousLocation
                                ? await this.isPointInGeofence(this.latLngToCoordinates({
                                    lat: previousLocation.lat,
                                    lng: previousLocation.lng
                                }), geofence)
                                : false;
                            const isInside = await this.isPointInGeofence(this.latLngToCoordinates(currentLocation), geofence);
                            // 지오펜스 출입 이벤트 생성
                            if (!wasInside && isInside) {
                                // 진입 이벤트
                                const eventDetails = {
                                    vehicleId,
                                    geofenceId,
                                    timestamp,
                                    eventType: 'ENTER',
                                    location: currentLocation,
                                    speed: vehicle.speed,
                                    direction: vehicle.heading
                                };
                                this.lastGeofenceEvents[vehicleId] = this.lastGeofenceEvents[vehicleId] || {};
                                this.lastGeofenceEvents[vehicleId][geofenceId] = eventDetails;
                                // 이벤트 저장 및 알림
                                this.recordGeofenceEvent(eventDetails);
                                if (options.alertOnEnter) {
                                    this.sendGeofenceAlert(eventDetails, options.notificationChannels).catch(err => {
                                        console.error('[mapService] 지오펜스 알림 전송 실패:', err);
                                    });
                                }
                            }
                            else if (wasInside && !isInside) {
                                // 이탈 이벤트
                                const eventDetails = {
                                    vehicleId,
                                    geofenceId,
                                    timestamp,
                                    eventType: 'EXIT',
                                    location: currentLocation,
                                    speed: vehicle.speed,
                                    direction: vehicle.heading
                                };
                                this.lastGeofenceEvents[vehicleId] = this.lastGeofenceEvents[vehicleId] || {};
                                delete this.lastGeofenceEvents[vehicleId][geofenceId];
                                // 이벤트 저장 및 알림
                                this.recordGeofenceEvent(eventDetails);
                                if (options.alertOnExit) {
                                    this.sendGeofenceAlert(eventDetails, options.notificationChannels).catch(err => {
                                        console.error('[mapService] 지오펜스 알림 전송 실패:', err);
                                    });
                                }
                            }
                            else if (isInside && options.dwellThreshold) {
                                // 체류 이벤트 검사
                                const lastEvent = this.lastGeofenceEvents[vehicleId]?.[geofenceId];
                                if (lastEvent && lastEvent.eventType === 'ENTER') {
                                    const dwellTime = timestamp.getTime() - lastEvent.timestamp.getTime();
                                    if (dwellTime >= options.dwellThreshold) {
                                        // 체류 임계값 초과
                                        const eventDetails = {
                                            vehicleId,
                                            geofenceId,
                                            timestamp,
                                            eventType: 'DWELL',
                                            location: currentLocation,
                                            speed: vehicle.speed,
                                            direction: vehicle.heading
                                        };
                                        // 체류 이벤트로 업데이트
                                        this.lastGeofenceEvents[vehicleId][geofenceId] = eventDetails;
                                        // 이벤트 저장 및 알림
                                        this.recordGeofenceEvent(eventDetails);
                                        if (options.alertOnDwell) {
                                            this.sendGeofenceAlert(eventDetails, options.notificationChannels).catch(err => {
                                                console.error('[mapService] 지오펜스 알림 전송 실패:', err);
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('[mapService] 지오펜스 모니터링 중 오류 발생:', error);
                }
            }, interval);
            this.monitoringActive = true;
            return true;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 모니터링 시작 실패:', error);
            return false;
        }
    }
    /**
     * 지오펜스 실시간 모니터링 중지
     * @returns 중지 성공 여부
     */
    stopGeofenceMonitoring() {
        if (!this.monitoringActive) {
            console.warn('[mapService] 지오펜스 모니터링이 이미 비활성화되어 있습니다.');
            return false;
        }
        try {
            // 모든 모니터링 간격 정리
            Object.values(this.monitoringIntervals).forEach(intervalId => {
                window.clearInterval(intervalId);
            });
            this.monitoringIntervals = {};
            this.monitoringActive = false;
            return true;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 모니터링 중지 실패:', error);
            return false;
        }
    }
    /**
     * 지오펜스 출입 이벤트 기록
     * @param eventDetails 이벤트 상세 정보
     * @returns 저장 성공 여부
     */
    async recordGeofenceEvent(eventDetails) {
        try {
            await this.apiClient.post('/geofence-events', eventDetails);
            return true;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 이벤트 기록 실패:', error);
            return false;
        }
    }
    /**
     * 지오펜스 알림 전송
     * @param eventDetails 이벤트 상세 정보
     * @param channels 알림 채널 목록
     * @returns 알림 전송 성공 여부
     */
    async sendGeofenceAlert(eventDetails, channels = ['SYSTEM']) {
        try {
            // 알림 생성 데이터 준비
            const notificationData = {
                type: NotificationType.GEOFENCE_ALERT,
                title: `지오펜스 알림: ${eventDetails.eventType}`,
                message: `차량(${eventDetails.vehicleId})이 지오펜스(${eventDetails.geofenceId})를 ${eventDetails.eventType === 'ENTER' ? '진입' : eventDetails.eventType === 'EXIT' ? '이탈' : '체류'}했습니다.`,
                severity: 'medium',
                data: {
                    geofenceId: eventDetails.geofenceId,
                    vehicleId: eventDetails.vehicleId,
                    location: eventDetails.location,
                    eventType: eventDetails.eventType,
                    timestamp: eventDetails.timestamp
                },
                channels
            };
            // 실제 알림 생성 요청
            const result = await notificationService.createNotification(notificationData);
            // UI 알림 표시 (SYSTEM 채널인 경우)
            if (channels.includes('SYSTEM')) {
                notification.info({
                    message: notificationData.title,
                    description: notificationData.message
                });
            }
            return !!result;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 알림 전송 실패:', error);
            return false;
        }
    }
    /**
     * 특정 차량의 지오펜스 출입 이벤트 구독하기
     * @param vehicleId 차량 ID
     * @param callback 이벤트 발생 시 호출될 콜백 함수
     * @returns 구독 해제 함수
     */
    subscribeToGeofenceEvents(vehicleId, callback) {
        // 웹소켓 연결 또는 폴링을 통한 이벤트 구독 로직
        // 여기서는 간단한 폴링으로 구현
        const intervalId = window.setInterval(async () => {
            try {
                const lastEvents = await this.getGeofenceEvents(vehicleId, undefined, undefined);
                // 마지막 이벤트 전달
                if (lastEvents.length > 0) {
                    callback(lastEvents[0]);
                }
            }
            catch (error) {
                console.error(`[mapService] 지오펜스 이벤트 구독 중 오류 (차량 ID: ${vehicleId}):`, error);
            }
        }, 10000); // 10초마다 확인
        // 구독 해제 함수 반환
        return () => {
            window.clearInterval(intervalId);
        };
    }
    /**
     * 지오펜스 대량 가져오기 및 배치 처리
     * @param geofences 지오펜스 배열
     * @returns 생성된 지오펜스 ID 배열
     */
    async bulkImportGeofences(geofences) {
        try {
            const response = await this.apiClient.post('/geofences/bulk', { geofences });
            return response.ids;
        }
        catch (error) {
            console.error('[mapService] 지오펜스 대량 가져오기 실패:', error);
            return [];
        }
    }
    /**
     * 지오펜스 내보내기 (GeoJSON 형식)
     * @param geofenceIds 내보낼 지오펜스 ID 배열
     * @returns GeoJSON 형식의 지오펜스 데이터
     */
    async exportGeofencesToGeoJSON(geofenceIds) {
        try {
            const allGeofences = geofenceIds
                ? await Promise.all(geofenceIds.map(id => this.getGeofence(id)))
                : await this.getGeofences(true);
            // GeoJSON FeatureCollection 형식으로 변환
            const features = allGeofences
                .map(geofence => {
                if (!geofence)
                    return null;
                // 지오펜스 타입에 따라 다른 geometry 생성
                let geometry;
                if (geofence.type === GeofenceType.CIRCLE) {
                    const center = Array.isArray(geofence.coordinates)
                        ? geofence.coordinates[0]
                        : geofence.coordinates;
                    geometry = {
                        type: 'Point',
                        coordinates: [center.longitude, center.latitude]
                    };
                }
                else if (geofence.type === GeofenceType.POLYGON) {
                    // 폴리곤의 경우 첫 번째와 마지막 좌표가 동일해야 함
                    if (!Array.isArray(geofence.coordinates)) {
                        return null;
                    }
                    const geoCoords = [...geofence.coordinates];
                    if (geoCoords.length > 0 &&
                        (geoCoords[0].latitude !== geoCoords[geoCoords.length - 1].latitude ||
                            geoCoords[0].longitude !== geoCoords[geoCoords.length - 1].longitude)) {
                        geoCoords.push(geoCoords[0]);
                    }
                    geometry = {
                        type: 'Polygon',
                        coordinates: [geoCoords.map(v => [v.longitude, v.latitude])]
                    };
                }
                else {
                    return null;
                }
                return {
                    type: 'Feature',
                    geometry,
                    properties: {
                        id: geofence.id,
                        name: geofence.name,
                        description: geofence.description,
                        type: geofence.type,
                        radius: geofence.radius,
                        color: geofence.color,
                        alertSettings: geofence.alerts,
                        createdAt: geofence.createdAt,
                        userId: geofence.userId || 'unknown' // 생성자 ID 필드
                    }
                };
            })
                .filter(Boolean);
            return {
                type: 'FeatureCollection',
                features
            };
        }
        catch (error) {
            console.error('[mapService] 지오펜스 GeoJSON 내보내기 실패:', error);
            return { type: 'FeatureCollection', features: [] };
        }
    }
    /**
     * 지오펜스 분석 - 차량 방문 빈도
     * @param geofenceId 지오펜스 ID
     * @param startDate 시작 날짜
     * @param endDate 종료 날짜
     * @returns 차량별 방문 횟수
     */
    async analyzeGeofenceVisits(geofenceId, startDate, endDate) {
        try {
            const events = await this.getGeofenceEvents(geofenceId, startDate, endDate);
            // 차량별 방문 횟수 집계
            const visitCountMap = {};
            events.forEach(event => {
                visitCountMap[event.vehicleId] = (visitCountMap[event.vehicleId] || 0) + 1;
            });
            // 차량 정보 가져오기
            const vehicleInfoPromises = Object.keys(visitCountMap).map(async (vehicleId) => {
                try {
                    const response = await this.apiClient.get(`/vehicles/${vehicleId}`);
                    return {
                        vehicleId,
                        vehicleName: response.name || vehicleId,
                        visitCount: visitCountMap[vehicleId]
                    };
                }
                catch (error) {
                    return {
                        vehicleId,
                        vehicleName: vehicleId,
                        visitCount: visitCountMap[vehicleId]
                    };
                }
            });
            const results = await Promise.all(vehicleInfoPromises);
            return results.sort((a, b) => b.visitCount - a.visitCount); // 방문 횟수 내림차순 정렬
        }
        catch (error) {
            console.error(`[mapService] 지오펜스 ID ${geofenceId} 방문 분석 실패:`, error);
            return [];
        }
    }
    /**
     * 차량의 특정 지역 체류 시간 분석
     * @param vehicleId 차량 ID
     * @param geofenceId 지오펜스 ID
     * @param startDate 시작 날짜
     * @param endDate 종료 날짜
     * @returns 체류 시간 분석 결과
     */
    async analyzeVehicleDwellTime(vehicleId, geofenceId, startDate, endDate) {
        try {
            // 모든 출입 이벤트 가져오기
            const events = await this.getGeofenceEvents(geofenceId, startDate, endDate);
            // 시간순 정렬
            events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            const dwellSessions = [];
            let enterTime = null;
            // 체류 시간 계산
            for (const event of events) {
                if (event.eventType === 'ENTER') {
                    if (enterTime === null) {
                        enterTime = event.timestamp;
                    }
                }
                else if (event.eventType === 'EXIT' && enterTime !== null) {
                    const exitTime = event.timestamp;
                    const durationMs = exitTime.getTime() - enterTime.getTime();
                    dwellSessions.push({
                        enterTime,
                        exitTime,
                        durationMs
                    });
                    enterTime = null;
                }
            }
            // 마지막 ENTER 이벤트가 있고 EXIT이 없는 경우 현재 시간까지 계산
            if (enterTime !== null) {
                const exitTime = new Date();
                const durationMs = exitTime.getTime() - enterTime.getTime();
                dwellSessions.push({
                    enterTime,
                    exitTime,
                    durationMs
                });
            }
            // 집계
            const totalDwellTimeMs = dwellSessions.reduce((sum, session) => sum + session.durationMs, 0);
            const averageDwellTimeMs = dwellSessions.length > 0 ? totalDwellTimeMs / dwellSessions.length : 0;
            return {
                totalDwellTimeMs,
                averageDwellTimeMs,
                dwellSessions
            };
        }
        catch (error) {
            console.error(`[mapService] 차량 ID ${vehicleId}의 지오펜스 ID ${geofenceId} 체류 시간 분석 실패:`, error);
            return {
                totalDwellTimeMs: 0,
                averageDwellTimeMs: 0,
                dwellSessions: []
            };
        }
    }
    /**
     * 좌표 변환 유틸리티: LatLng → Coordinates
     * @param latLng LatLng 형식 좌표
     * @returns Coordinates 형식 좌표
     */
    latLngToCoordinates(latLng) {
        return {
            latitude: latLng.lat,
            longitude: latLng.lng
        };
    }
    /**
     * 좌표 변환 유틸리티: Coordinates → LatLng
     * @param coordinates Coordinates 형식 좌표
     * @returns LatLng 형식 좌표
     */
    coordinatesToLatLng(coordinates) {
        return {
            lat: coordinates.latitude,
            lng: coordinates.longitude
        };
    }
    /**
     * 지도 경계 생성
     * @param boundary 생성할 경계 정보
     * @returns 생성된 경계 ID
     */
    async createMapBoundary(boundary) {
        try {
            const response = await this.apiClient.post('/map/boundaries', boundary);
            return response.id;
        }
        catch (error) {
            console.error('[mapService] 지도 경계 생성 실패:', error);
            return null;
        }
    }
    /**
     * 지도 경계 업데이트
     * @param id 경계 ID
     * @param updates 업데이트할 내용
     * @returns 성공 여부
     */
    async updateMapBoundary(id, updates) {
        try {
            await this.apiClient.put(`${this.basePath}/map/boundaries/${id}`, updates);
            notification.success({
                message: '지도 경계 업데이트',
                description: '경계가 성공적으로 업데이트되었습니다.'
            });
            return true;
        }
        catch (error) {
            console.error(`[mapService] 지도 경계 ID ${id} 업데이트 실패:`, error);
            notification.error({
                message: '지도 경계 업데이트 실패',
                description: `경계 ID ${id}를 업데이트하는 중 문제가 발생했습니다.`
            });
            return false;
        }
    }
    /**
     * 지도 경계 삭제
     * @param id 삭제할 경계 ID
     * @returns 성공 여부
     */
    async deleteMapBoundary(id) {
        try {
            await this.apiClient.delete(`${this.basePath}/map/boundaries/${id}`);
            return true;
        }
        catch (error) {
            console.error(`[mapService] 지도 경계 ID ${id} 삭제 실패:`, error);
            return false;
        }
    }
    /**
     * 사용자의 지도 경계 목록 조회
     * @param userId 사용자 ID
     * @returns 경계 목록
     */
    async getUserMapBoundaries(userId) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/map/boundaries?userId=${userId}`);
            return response;
        }
        catch (error) {
            console.error(`[mapService] 사용자 ID ${userId}의 지도 경계 목록 조회 실패:`, error);
            return [];
        }
    }
    /**
     * 좌표가 경계 내에 있는지 확인
     * @param coords 확인할 좌표
     * @param boundary 확인할 경계
     * @returns 경계 내 포함 여부
     */
    isPointInBoundary(coords, boundary) {
        const { bounds } = boundary;
        return (coords.latitude <= bounds.north &&
            coords.latitude >= bounds.south &&
            coords.longitude <= bounds.east &&
            coords.longitude >= bounds.west);
    }
    /**
     * 지도 경계 모니터링 시작
     * @param userId 사용자 ID
     * @param vehicleIds 모니터링할 차량 ID 목록
     * @param intervalMs 모니터링 간격 (밀리초)
     * @returns 성공 여부
     */
    async startBoundaryMonitoring(userId, vehicleIds = [], intervalMs = 30000) {
        // 이미 활성화된 모니터링이 있으면 중지
        if (this.monitoringIntervals['boundary']) {
            this.stopBoundaryMonitoring();
        }
        // 사용자의 활성화된 지도 경계 로드
        try {
            const boundaries = await this.getUserMapBoundaries(userId);
            this.activeBoundaries = boundaries.filter(b => b.active);
            if (this.activeBoundaries.length === 0) {
                console.log('활성화된 지도 경계가 없습니다.');
                return false;
            }
            // 모니터링 인터벌 설정
            const intervalId = window.setInterval(async () => {
                // 모니터링할 차량이 지정되지 않은 경우 모든 활성 차량 사용
                const vehiclesToMonitor = vehicleIds.length > 0 ? vehicleIds : Object.keys(this.activeVehicleLocations);
                if (vehiclesToMonitor.length === 0) {
                    console.log('모니터링할 차량이 없습니다.');
                    return;
                }
                // 각 차량의 위치 업데이트 및 경계 확인
                for (const vehicleId of vehiclesToMonitor) {
                    try {
                        // 차량 정보 조회
                        const vehicle = await this.getVehicleLocation(vehicleId);
                        if (!vehicle)
                            continue;
                        const currentLocation = {
                            lat: vehicle.latitude,
                            lng: vehicle.longitude
                        };
                        const currentCoords = this.latLngToCoordinates(currentLocation);
                        // 각 경계에 대해 검사
                        for (const boundary of this.activeBoundaries) {
                            const boundaryId = boundary.id;
                            // 이 차량에 대한 이전 이벤트 가져오기
                            this.lastBoundaryEvents[vehicleId] = this.lastBoundaryEvents[vehicleId] || {};
                            const lastEvent = this.lastBoundaryEvents[vehicleId][boundaryId];
                            // 경계 내부에 있는지 확인
                            const isInside = this.isPointInBoundary(currentCoords, boundary);
                            // 이전 이벤트가 없고 현재 경계 밖에 있는 경우
                            // 또는 이전에 경계 내부에 있었는데 현재 경계 밖으로 나간 경우
                            if ((!lastEvent && !isInside) || (lastEvent?.eventType === 'reentry' && !isInside)) {
                                // 경계 이탈 이벤트 생성
                                if (boundary.options.notifyOnExit) {
                                    const eventDetails = {
                                        boundaryId,
                                        boundaryName: boundary.name,
                                        vehicleId,
                                        vehicleName: vehicle.name || `차량 ${vehicleId}`,
                                        timestamp: new Date(),
                                        eventType: 'exit',
                                        location: currentCoords
                                    };
                                    // 이벤트 기록
                                    this.lastBoundaryEvents[vehicleId][boundaryId] = eventDetails;
                                    // 알림 생성
                                    await this.createBoundaryAlert(eventDetails, boundary);
                                }
                            }
                            // 이전에 경계 밖에 있었는데 현재 경계 안으로 들어온 경우
                            else if (lastEvent?.eventType === 'exit' && isInside) {
                                // 재진입 이벤트 생성
                                const eventDetails = {
                                    boundaryId,
                                    boundaryName: boundary.name,
                                    vehicleId,
                                    vehicleName: vehicle.name || `차량 ${vehicleId}`,
                                    timestamp: new Date(),
                                    eventType: 'reentry',
                                    location: currentCoords
                                };
                                // 이벤트 기록
                                this.lastBoundaryEvents[vehicleId][boundaryId] = eventDetails;
                                // 알림 생성 (선택적)
                                if (boundary.options.notifyOnExit) {
                                    await this.createBoundaryAlert(eventDetails, boundary);
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error(`[mapService] 차량 ${vehicleId} 경계 모니터링 중 오류:`, error);
                    }
                }
            }, intervalMs);
            // 인터벌 ID 저장
            this.monitoringIntervals['boundary'] = intervalId;
            console.log('지도 경계 모니터링이 시작되었습니다.');
            return true;
        }
        catch (error) {
            console.error('[mapService] 지도 경계 모니터링 시작 실패:', error);
            return false;
        }
    }
    /**
     * 지도 경계 모니터링 중지
     */
    stopBoundaryMonitoring() {
        if (this.monitoringIntervals['boundary']) {
            window.clearInterval(this.monitoringIntervals['boundary']);
            delete this.monitoringIntervals['boundary'];
            console.log('지도 경계 모니터링이 중지되었습니다.');
        }
    }
    /**
     * 경계 알림 생성
     * @param eventDetails 이벤트 상세 정보
     * @param boundary 관련 경계
     */
    async createBoundaryAlert(eventDetails, boundary) {
        try {
            // 알림 생성
            const notification = {
                userId: boundary.userId,
                title: `차량이 지정된 경계를 ${eventDetails.eventType === 'exit' ? '벗어났습니다' : '재진입했습니다'}`,
                message: `${eventDetails.vehicleName}이(가) ${boundary.name} 경계를 ${eventDetails.eventType === 'exit' ? '벗어났습니다' : '재진입했습니다'}.`,
                type: NotificationType.VEHICLE,
                metadata: {
                    vehicleId: eventDetails.vehicleId,
                    boundaryId: eventDetails.boundaryId,
                    eventType: eventDetails.eventType,
                    location: eventDetails.location
                }
            };
            await notificationService.createNotification(notification);
            // 추가 연락처에 알림을 보낼 경우 - sendToContacts 함수는 제거
            if (boundary.options.notifyContacts && boundary.options.notifyContacts.length > 0) {
                // 여기에 연락처에 알림 보내는 코드 추가
            }
        }
        catch (error) {
            console.error(`[mapService] 경계 ID ${eventDetails.boundaryId} 알림 생성 오류:`, error);
        }
    }
    async submitShopReview(shopId, rating, comment, vehicleId) {
        try {
            const response = await this.apiClient.post(`${this.basePath}/shops/${shopId}/reviews`, {
                rating,
                comment,
                vehicleId
            });
            return response.success;
        }
        catch (error) {
            console.error(`정비소 ID ${shopId} 평가 제출 중 오류 발생:`, error);
            return false;
        }
    }
    async bookAppointment(shopId, date, time, vehicleId, services) {
        try {
            const response = await this.apiClient.post(`${this.basePath}/appointments`, {
                shopId,
                date,
                time,
                vehicleId,
                services
            });
            return response.success;
        }
        catch (error) {
            console.error('정비소 예약 중 오류 발생:', error);
            return false;
        }
    }
    async getVehicleStatus(vehicleId) {
        try {
            const response = await this.apiClient.get(`${this.basePath}/vehicles/${vehicleId}/status`);
            return response;
        }
        catch (error) {
            console.error(`차량 ID ${vehicleId} 상태 조회 중 오류 발생:`, error);
            return null;
        }
    }
}
