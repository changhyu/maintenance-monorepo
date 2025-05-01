import { GeoPoint, Node, Place, RoadSegment } from '../types';
import { mapData } from '../data/mapData';

// 두 지점 사이의 거리 계산 (Haversine 공식)
export const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
};

// 특정 위치에서 가장 가까운 노드 찾기
export const getClosestNode = (point: GeoPoint): Node | null => {
  const nodes = mapData.nodes;
  
  if (nodes.length === 0) return null;
  
  let closestNode = nodes[0];
  let closestDistance = calculateDistance(point, nodes[0].position);
  
  for (let i = 1; i < nodes.length; i++) {
    const distance = calculateDistance(point, nodes[i].position);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestNode = nodes[i];
    }
  }
  
  return closestNode;
};

// 특정 위치에서 가장 가까운 도로 세그먼트 찾기
export const getClosestRoad = (point: GeoPoint): RoadSegment | null => {
  const segments = mapData.roadSegments;
  
  if (segments.length === 0) return null;
  
  let closestSegment = segments[0];
  let closestDistance = Infinity;
  
  segments.forEach(segment => {
    // 세그먼트의 각 점과의 거리 계산
    for (let i = 0; i < segment.path.length - 1; i++) {
      const distance = distanceToLineSegment(
        point,
        segment.path[i],
        segment.path[i + 1]
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSegment = segment;
      }
    }
  });
  
  return closestSegment;
};

// 점과 선분 사이의 최단 거리 계산
export const distanceToLineSegment = (
  point: GeoPoint,
  lineStart: GeoPoint,
  lineEnd: GeoPoint
): number => {
  const x = point.longitude;
  const y = point.latitude;
  const x1 = lineStart.longitude;
  const y1 = lineStart.latitude;
  const x2 = lineEnd.longitude;
  const y2 = lineEnd.latitude;
  
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  
  // C와 D가 모두 0이면 시작점과 끝점이 같은 경우 (선분이 아닌 점)
  if (len_sq === 0) return calculateDistance(point, lineStart);
  
  let param = dot / len_sq;
  
  // 선분 범위 내에서 파라미터 제한
  param = Math.max(0, Math.min(1, param));
  
  const xx = x1 + param * C;
  const yy = y1 + param * D;
  
  return calculateDistance(point, { latitude: yy, longitude: xx });
};

// 주어진 범위 내의 장소 찾기
export const findPlacesInBounds = (
  southWest: GeoPoint,
  northEast: GeoPoint
): Place[] => {
  return mapData.places.filter(place => {
    const lat = place.position.latitude;
    const lng = place.position.longitude;
    
    return (
      lat >= southWest.latitude &&
      lat <= northEast.latitude &&
      lng >= southWest.longitude &&
      lng <= northEast.longitude
    );
  });
};

// 이름이나 주소로 장소 검색
export const searchPlaces = (query: string): Place[] => {
  if (!query || query.trim() === '') return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return mapData.places.filter(place => {
    const nameMatch = place.name.toLowerCase().includes(normalizedQuery);
    const addressMatch = place.address?.toLowerCase().includes(normalizedQuery) || false;
    
    return nameMatch || addressMatch;
  });
};

// 평면 좌표(Canvas, SVG 등에 사용)로 변환
export const geoToPixel = (
  point: GeoPoint,
  bounds: { sw: GeoPoint; ne: GeoPoint },
  size: { width: number; height: number }
): { x: number; y: number } => {
  const { sw, ne } = bounds;
  
  // 경도를 x좌표로 변환
  const x = ((point.longitude - sw.longitude) / (ne.longitude - sw.longitude)) * size.width;
  
  // 위도를 y좌표로 변환 (위도는 아래로 갈수록 줄어들기 때문에 반전 필요)
  const y = ((ne.latitude - point.latitude) / (ne.latitude - sw.latitude)) * size.height;
  
  return { x, y };
};

// 화면 좌표를 지리 좌표로 변환
export const pixelToGeo = (
  pixel: { x: number; y: number },
  bounds: { sw: GeoPoint; ne: GeoPoint },
  size: { width: number; height: number }
): GeoPoint => {
  const { sw, ne } = bounds;
  
  // x좌표를 경도로 변환
  const longitude = sw.longitude + (pixel.x / size.width) * (ne.longitude - sw.longitude);
  
  // y좌표를 위도로 변환 (위도는 아래로 갈수록 줄어들기 때문에 반전 필요)
  const latitude = ne.latitude - (pixel.y / size.height) * (ne.latitude - sw.latitude);
  
  return { latitude, longitude };
};

// 지도 뷰 범위 계산
export const calculateBounds = (
  center: GeoPoint,
  zoomLevel: number,
  viewportSize: { width: number; height: number }
): { sw: GeoPoint; ne: GeoPoint } => {
  // 줌 레벨에 따른 시야 범위 (km)
  const viewRangeInKm = 10 / Math.pow(2, zoomLevel - 1);
  
  // 지구 반경(km)
  const earthRadius = 6371;
  
  // 위도 1도 당 거리(km)
  const kmPerLatDegree = 111.32;
  
  // 경도 1도 당 거리(km)는 위도에 따라 달라짐
  const kmPerLngDegree = 111.32 * Math.cos((center.latitude * Math.PI) / 180);
  
  // 가로 비율에 따른 경도 범위 계산
  const aspectRatio = viewportSize.width / viewportSize.height;
  
  // 위도 범위 계산
  const latDiff = (viewRangeInKm / kmPerLatDegree) / 2;
  const lngDiff = (viewRangeInKm * aspectRatio / kmPerLngDegree) / 2;
  
  return {
    sw: {
      latitude: center.latitude - latDiff,
      longitude: center.longitude - lngDiff
    },
    ne: {
      latitude: center.latitude + latDiff,
      longitude: center.longitude + lngDiff
    }
  };
}; 