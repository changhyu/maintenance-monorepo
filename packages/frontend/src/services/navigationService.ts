/**
 * Navigation Service
 * 내비게이션 서비스
 * 
 * This service provides navigation functionality including:
 * - Route calculation based on origin and destination
 * - Traffic-aware routing (using UTIC traffic flow data)
 * - Alert generation for traffic incidents, construction, etc.
 */

import uticService, { 
  TrafficFlowData, 
  TrafficIncident, 
  ConstructionInfo,
  RoadHazard,
  ProtectedArea
} from './uticService';

// Types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: Coordinates;
  destination: Coordinates;
  waypoints?: Coordinates[];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
}

export interface RouteSegment {
  startPoint: Coordinates;
  endPoint: Coordinates;
  distance: number; // meters
  duration: number; // seconds
  instruction: string;
  roadName: string;
  trafficLevel: number; // 1-4, with 4 being most congested
}

export interface Route {
  segments: RouteSegment[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  trafficDelayTime: number; // additional seconds due to traffic
  expectedArrivalTime: Date;
}

export interface NavigationAlert {
  type: 'INCIDENT' | 'CONSTRUCTION' | 'HAZARD' | 'PROTECTED_AREA' | 'CONGESTION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  distance: number; // meters from current location
  location: string;
  description: string;
  timestamp: Date;
  coordinates: Coordinates;
}

/**
 * Calculate route between two points considering traffic conditions
 * 두 지점 사이의 경로를 계산하고 교통 상황을 고려합니다
 */
export const calculateRoute = async (request: RouteRequest): Promise<Route> => {
  try {
    // Get traffic flow data to enhance routing
    const trafficData = await uticService.getTrafficFlow();
    
    // In a real implementation, we would use an actual routing engine
    // For now, we'll mock a basic route with segments
    
    // Mock route calculation
    const route = mockCalculateRoute(request, trafficData);
    
    return route;
  } catch (error) {
    console.error('Error calculating route:', error);
    throw new Error('Failed to calculate route');
  }
};

/**
 * Get nearby alerts based on current location and route
 * 현재 위치와 경로를 기반으로 주변 알림을 가져옵니다
 */
export const getNearbyAlerts = async (
  currentLocation: Coordinates,
  route?: Route,
  radius: number = 5000 // 5km radius
): Promise<NavigationAlert[]> => {
  try {
    // Fetch all data that might generate alerts
    const [incidents, construction, hazards] = await Promise.all([
      uticService.getTrafficIncidents(),
      uticService.getConstructionInfo(),
      uticService.getRoadHazards()
    ]);
    
    // Convert data to alerts
    const alerts: NavigationAlert[] = [
      ...createIncidentAlerts(incidents, currentLocation, radius),
      ...createConstructionAlerts(construction, currentLocation, radius),
      ...createHazardAlerts(hazards, currentLocation, radius)
    ];
    
    // If we have a route, check for congestion along that route
    if (route) {
      const congestionAlerts = await createCongestionAlerts(route, currentLocation);
      alerts.push(...congestionAlerts);
    }
    
    // Sort by distance
    return alerts.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error getting nearby alerts:', error);
    return [];
  }
};

/**
 * Check if user is within or approaching a protected area
 * 사용자가 보호 구역 내에 있거나 접근 중인지 확인합니다
 */
export const checkProtectedAreas = async (
  currentLocation: Coordinates,
  sidoCode: string,
  radius: number = 500 // 500m radius
): Promise<NavigationAlert[]> => {
  try {
    const protectedAreas = await uticService.getProtectedAreas(sidoCode);
    
    return createProtectedAreaAlerts(protectedAreas, currentLocation, radius);
  } catch (error) {
    console.error('Error checking protected areas:', error);
    return [];
  }
};

/**
 * Update route with real-time traffic information
 * 실시간 교통 정보로 경로를 업데이트합니다
 */
export const updateRouteWithTraffic = async (route: Route): Promise<Route> => {
  try {
    const trafficData = await uticService.getTrafficFlow();
    
    // Apply traffic data to each segment
    const updatedSegments = route.segments.map(segment => {
      const trafficForSegment = findTrafficForSegment(trafficData, segment);
      if (trafficForSegment) {
        // Update duration based on traffic level
        const trafficMultiplier = getTrafficMultiplier(trafficForSegment.congestionLevel);
        return {
          ...segment,
          duration: segment.duration * trafficMultiplier,
          trafficLevel: trafficForSegment.congestionLevel
        };
      }
      return segment;
    });
    
    // Recalculate total duration and arrival time
    const totalDuration = updatedSegments.reduce((sum, segment) => sum + segment.duration, 0);
    const trafficDelayTime = totalDuration - route.totalDistance / 13.89; // 13.89 m/s = 50 km/h
    
    const now = new Date();
    const expectedArrivalTime = new Date(now.getTime() + totalDuration * 1000);
    
    return {
      segments: updatedSegments,
      totalDistance: route.totalDistance,
      totalDuration: totalDuration,
      trafficDelayTime: Math.max(0, trafficDelayTime),
      expectedArrivalTime: expectedArrivalTime
    };
  } catch (error) {
    console.error('Error updating route with traffic:', error);
    return route;
  }
};

// Helper Functions

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 * 두 좌표 간의 거리를 미터 단위로 계산합니다 (Haversine 공식)
 */
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Mock implementation of route calculation
 * 경로 계산의 모의 구현
 */
const mockCalculateRoute = (request: RouteRequest, trafficData: TrafficFlowData[]): Route => {
  // Create direct path segments from origin to destination
  const directDistance = calculateDistance(request.origin, request.destination);
  
  // Create some intermediate points
  const segmentCount = Math.max(1, Math.floor(directDistance / 1000)); // One segment per km
  const segments: RouteSegment[] = [];
  
  let totalDistance = 0;
  let totalDuration = 0;
  let prevPoint = request.origin;
  
  for (let i = 0; i <= segmentCount; i++) {
    const progress = i / segmentCount;
    
    // Simple linear interpolation between origin and destination
    const currentPoint: Coordinates = (i === segmentCount) ? request.destination : {
      latitude: request.origin.latitude + (request.destination.latitude - request.origin.latitude) * progress,
      longitude: request.origin.longitude + (request.destination.longitude - request.origin.longitude) * progress
    };
    
    if (i > 0) {
      const segmentDistance = calculateDistance(prevPoint, currentPoint);
      totalDistance += segmentDistance;
      
      // Find nearest traffic data for this segment
      const nearestTraffic = findNearestTrafficData(trafficData, currentPoint);
      const trafficLevel = nearestTraffic?.congestionLevel || 1;
      const trafficMultiplier = getTrafficMultiplier(trafficLevel);
      
      // Base duration calculation (assuming 50 km/h average speed = 13.89 m/s)
      const baseDuration = segmentDistance / 13.89;
      const adjustedDuration = baseDuration * trafficMultiplier;
      totalDuration += adjustedDuration;
      
      segments.push({
        startPoint: prevPoint,
        endPoint: currentPoint,
        distance: segmentDistance,
        duration: adjustedDuration,
        instruction: i === segmentCount ? '목적지에 도착했습니다' : `계속 직진하세요`,
        roadName: `도로 ${i}`,
        trafficLevel
      });
    }
    
    prevPoint = currentPoint;
  }
  
  // Calculate expected arrival time
  const now = new Date();
  const expectedArrivalTime = new Date(now.getTime() + totalDuration * 1000);
  
  // Estimate traffic delay (assuming no traffic would be 50 km/h)
  const noTrafficDuration = totalDistance / 13.89;
  const trafficDelayTime = totalDuration - noTrafficDuration;
  
  return {
    segments,
    totalDistance,
    totalDuration,
    trafficDelayTime,
    expectedArrivalTime
  };
};

/**
 * Get traffic multiplier based on congestion level
 * 혼잡도에 따른 교통 승수를 가져옵니다
 */
const getTrafficMultiplier = (congestionLevel: number): number => {
  switch (congestionLevel) {
    case 1: return 1.0;  // 원활
    case 2: return 1.3;  // 서행
    case 3: return 1.8;  // 지체
    case 4: return 2.5;  // 정체
    default: return 1.0;
  }
};

/**
 * Find nearest traffic data point to a location
 * 위치에 가장 가까운 교통 데이터 포인트를 찾습니다
 */
const findNearestTrafficData = (trafficData: TrafficFlowData[], location: Coordinates): TrafficFlowData | null => {
  // In a real implementation, this would use road network geometry
  // For now, we'll return random traffic data
  if (trafficData.length === 0) return null;
  
  return trafficData[Math.floor(Math.random() * trafficData.length)];
};

/**
 * Find traffic data for a specific route segment
 * 특정 경로 세그먼트에 대한 교통 데이터를 찾습니다
 */
const findTrafficForSegment = (trafficData: TrafficFlowData[], segment: RouteSegment): TrafficFlowData | null => {
  // In a real implementation, this would match road segments to traffic data
  // For now, we'll use the midpoint of the segment to find nearest traffic
  const midpoint: Coordinates = {
    latitude: (segment.startPoint.latitude + segment.endPoint.latitude) / 2,
    longitude: (segment.startPoint.longitude + segment.endPoint.longitude) / 2
  };
  
  return findNearestTrafficData(trafficData, midpoint);
};

/**
 * Create alerts from traffic incidents
 * 교통 사고로부터 알림을 생성합니다
 */
const createIncidentAlerts = (
  incidents: TrafficIncident[],
  currentLocation: Coordinates,
  radius: number
): NavigationAlert[] => {
  return incidents
    .map(incident => {
      const coordinates = {
        latitude: incident.latitude,
        longitude: incident.longitude
      };
      
      const distance = calculateDistance(currentLocation, coordinates);
      
      if (distance <= radius) {
        return {
          type: 'INCIDENT',
          severity: getSeverityFromIncidentType(incident.type),
          distance,
          location: incident.location,
          description: incident.description,
          timestamp: new Date(),
          coordinates
        };
      }
      return null;
    })
    .filter((alert): alert is NavigationAlert => alert !== null);
};

/**
 * Create alerts from construction information
 * 공사 정보로부터 알림을 생성합니다
 */
const createConstructionAlerts = (
  constructions: ConstructionInfo[],
  currentLocation: Coordinates,
  radius: number
): NavigationAlert[] => {
  return constructions
    .map(construction => {
      const coordinates = {
        latitude: construction.latitude,
        longitude: construction.longitude
      };
      
      const distance = calculateDistance(currentLocation, coordinates);
      
      if (distance <= radius) {
        return {
          type: 'CONSTRUCTION',
          severity: 'MEDIUM',
          distance,
          location: construction.location,
          description: `${construction.roadName} 공사 중: ${construction.description}`,
          timestamp: new Date(),
          coordinates
        };
      }
      return null;
    })
    .filter((alert): alert is NavigationAlert => alert !== null);
};

/**
 * Create alerts from road hazards
 * 도로 위험 요소로부터 알림을 생성합니다
 */
const createHazardAlerts = (
  hazards: RoadHazard[],
  currentLocation: Coordinates,
  radius: number
): NavigationAlert[] => {
  return hazards
    .map(hazard => {
      const coordinates = {
        latitude: hazard.latitude,
        longitude: hazard.longitude
      };
      
      const distance = calculateDistance(currentLocation, coordinates);
      
      if (distance <= radius) {
        return {
          type: 'HAZARD',
          severity: 'HIGH',
          distance,
          location: hazard.location,
          description: hazard.description,
          timestamp: new Date(),
          coordinates
        };
      }
      return null;
    })
    .filter((alert): alert is NavigationAlert => alert !== null);
};

/**
 * Create alerts from protected areas
 * 보호구역으로부터 알림을 생성합니다
 */
const createProtectedAreaAlerts = (
  areas: ProtectedArea[],
  currentLocation: Coordinates,
  radius: number
): NavigationAlert[] => {
  return areas
    .map(area => {
      const coordinates = {
        latitude: area.latitude,
        longitude: area.longitude
      };
      
      const distance = calculateDistance(currentLocation, coordinates);
      
      if (distance <= radius) {
        let description = '';
        if (area.type.includes('어린이')) {
          description = '어린이 보호구역입니다. 서행하세요.';
        } else if (area.type.includes('노인')) {
          description = '노인 보호구역입니다. 서행하세요.';
        } else {
          description = '보호구역입니다. 서행하세요.';
        }
        
        return {
          type: 'PROTECTED_AREA',
          severity: 'MEDIUM',
          distance,
          location: area.name,
          description,
          timestamp: new Date(),
          coordinates
        };
      }
      return null;
    })
    .filter((alert): alert is NavigationAlert => alert !== null);
};

/**
 * Create congestion alerts based on route traffic levels
 * 경로 교통 수준에 따른 정체 알림을 생성합니다
 */
const createCongestionAlerts = async (
  route: Route,
  currentLocation: Coordinates
): Promise<NavigationAlert[]> => {
  const alerts: NavigationAlert[] = [];
  
  // Look for congested segments
  for (const segment of route.segments) {
    if (segment.trafficLevel >= 3) { // Level 3 or 4 (지체 or 정체)
      const segmentMidpoint: Coordinates = {
        latitude: (segment.startPoint.latitude + segment.endPoint.latitude) / 2,
        longitude: (segment.startPoint.longitude + segment.endPoint.longitude) / 2
      };
      
      const distance = calculateDistance(currentLocation, segmentMidpoint);
      
      // Only alert for upcoming congestion
      if (distance > 100 && distance < 5000) {
        alerts.push({
          type: 'CONGESTION',
          severity: segment.trafficLevel === 4 ? 'HIGH' : 'MEDIUM',
          distance,
          location: segment.roadName,
          description: segment.trafficLevel === 4 ? 
            '전방에 심각한 정체 구간이 있습니다.' : 
            '전방에 지체 구간이 있습니다.',
          timestamp: new Date(),
          coordinates: segmentMidpoint
        });
      }
    }
  }
  
  return alerts;
};

/**
 * Determine alert severity based on incident type
 * 사고 유형에 따른 알림 심각도를 결정합니다
 */
const getSeverityFromIncidentType = (incidentType: string): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (incidentType.includes('사고') || incidentType.includes('accident')) {
    return 'HIGH';
  } else if (incidentType.includes('공사') || incidentType.includes('construction')) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
};

export default {
  calculateRoute,
  getNearbyAlerts,
  checkProtectedAreas,
  updateRouteWithTraffic,
  calculateDistance
};