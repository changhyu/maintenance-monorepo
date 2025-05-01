/**
 * SHP 파일 파서 유틸리티
 * 
 * 이 모듈은 shpjs 라이브러리를 사용하여 SHP 파일을 파싱하고,
 * 내비게이션 앱에서 사용할 수 있는 형식으로 변환하는 기능을 제공합니다.
 */

import { GeoPoint, RoadSegment, Node } from '../types';
import JSZip from 'jszip';
import * as shpjs from 'shpjs';
import { generateUniqueId } from './idGenerator';

// SHP 파일에서 추출한 도로 정보 타입
export interface ShpRoadFeature {
  type: 'Feature';
  properties: {
    ROAD_NAME?: string;
    ROAD_TYPE?: string;
    ROAD_NO?: string;
    ROAD_WIDTH?: number;
    SPEED_LIMIT?: number;
    ONEWAY?: string | number | boolean;
    [key: string]: any;
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
}

// SHP 파일에서 추출한 교차로/주요 지점 타입
export interface ShpNodeFeature {
  type: 'Feature';
  properties: {
    NODE_ID?: string;
    NODE_NAME?: string;
    NODE_TYPE?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Point';
    coordinates: number[];
  };
}

// 도로 타입 매핑
const roadTypeMapping: Record<string, RoadSegment['roadType']> = {
  '고속도로': 'highway',
  '고속화도로': 'highway',
  '국도': 'major_road',
  '지방도': 'major_road',
  '국지도': 'major_road',
  '시도': 'minor_road',
  '군도': 'minor_road',
  '구도': 'minor_road',
  '면리간도로': 'local_road',
  '리간도로': 'local_road',
  '농어촌도로': 'local_road',
  // 영문 이름으로도 매핑 추가
  'highway': 'highway',
  'national': 'major_road',
  'provincial': 'major_road',
  'city': 'minor_road',
  'local': 'local_road',
  'others': 'local_road'
};

// 도로 속성 정보에서 속도 제한 추출
const extractSpeedLimit = (properties: ShpRoadFeature['properties']): number => {
  // 속도 제한 우선순위: SPEED_LIMIT > MAX_SPD > 도로 유형 기반 기본 속도
  if (properties.SPEED_LIMIT && typeof properties.SPEED_LIMIT === 'number') {
    return properties.SPEED_LIMIT;
  }
  
  if (properties.MAX_SPD && typeof properties.MAX_SPD === 'number') {
    return properties.MAX_SPD;
  }
  
  if (properties.SPEED && typeof properties.SPEED === 'number') {
    return properties.SPEED;
  }

  // 도로 유형 기반 기본 속도 할당
  const roadType = determineRoadType(properties);
  switch (roadType) {
    case 'highway':
      return 100; // 고속도로 기본 100km/h
    case 'major_road':
      return 80; // 주요 도로 기본 80km/h
    case 'minor_road':
      return 60; // 보조 도로 기본 60km/h
    case 'local_road':
    default:
      return 50; // 지역 도로 기본 50km/h
  }
};

// 도로 타입 결정
const determineRoadType = (properties: ShpRoadFeature['properties']): RoadSegment['roadType'] => {
  // 다양한 속성 이름에 대응 (SHP 파일 형식에 따라 다를 수 있음)
  const typeField = properties.ROAD_TYPE ?? properties.TYPE ?? properties.ROADTYPE ?? '';
  
  if (typeof typeField === 'string') {
    return roadTypeMapping[typeField] ?? 'local_road';
  }
  
  // 숫자 코드 기반 도로 타입 분류 (일반적인 한국 도로 분류 체계)
  if (typeof properties.ROAD_RANK === 'number' || typeof properties.ROAD_LEVEL === 'number') {
    const rank = properties.ROAD_RANK ?? properties.ROAD_LEVEL;
    
    if (rank === 1) {
      return 'highway';
    }
    if (rank === 2) {
      return 'major_road';
    }
    if (rank === 3) {
      return 'minor_road';
    }
    if (rank >= 4) {
      return 'local_road';
    }
  }
  
  return 'local_road'; // 기본값
};

// 일방통행 여부 확인
const isOneWay = (properties: ShpRoadFeature['properties']): boolean => {
  // 다양한 속성 이름 및 값 형식에 대응
  if (properties.ONEWAY !== undefined) {
    // 문자열 형식
    if (typeof properties.ONEWAY === 'string') {
      const value = properties.ONEWAY.toLowerCase();
      return value === 'y' || value === 'yes' || value === 't' || value === 'true' || value === '1';
    }
    // 숫자 형식
    if (typeof properties.ONEWAY === 'number') {
      return properties.ONEWAY === 1;
    }
    // 불리언 형식
    if (typeof properties.ONEWAY === 'boolean') {
      return properties.ONEWAY;
    }
  }
  
  // 다른 필드명 확인
  if (properties.ONE_WAY !== undefined) {
    return properties.ONE_WAY === 'Y' || properties.ONE_WAY === 1 || properties.ONE_WAY === true;
  }
  
  // 분리된 필드 확인
  if (properties.F_DIR !== undefined && properties.T_DIR !== undefined) {
    // 양방향 모두 가능하다면 일방통행이 아님
    return !(properties.F_DIR === 'Y' && properties.T_DIR === 'Y');
  }
  
  return false; // 기본적으로 양방향으로 가정
};

// 좌표 변환: [경도, 위도] -> GeoPoint
const coordToGeoPoint = (coord: number[]): GeoPoint => {
  return {
    latitude: coord[1],
    longitude: coord[0]
  };
};

// LineString 좌표 배열을 GeoPoint 배열로 변환
const convertLineStringToPath = (coordinates: number[][]): GeoPoint[] => {
  return coordinates.map(coord => coordToGeoPoint(coord));
};

// MultiLineString 좌표 배열을 GeoPoint 배열로 변환 (첫 번째 LineString 사용)
const convertMultiLineStringToPath = (coordinates: number[][][]): GeoPoint[] => {
  if (coordinates.length === 0) {
    return [];
  }
  return convertLineStringToPath(coordinates[0]);
};

// SHP 도로 피처를 앱 RoadSegment로 변환
export const convertShpRoadToRoadSegment = (
  feature: ShpRoadFeature, 
  id: string,
  startNodeId: string,
  endNodeId: string
): RoadSegment => {
  // 좌표 경로 추출
  let pathResult: GeoPoint[];
  
  if (feature.geometry.type === 'LineString') {
    // sourcery:ignore:next
    pathResult = convertLineStringToPath(feature.geometry.coordinates as number[][]);
  } else { // MultiLineString
    // sourcery:ignore:next
    pathResult = convertMultiLineStringToPath(feature.geometry.coordinates as number[][][]);
  }
  
  // 도로 길이 계산 (간단한 구현, 실제로는 좌표 간 거리 계산 필요)
  const distance = calculatePathDistance(pathResult);
  
  // 도로 이름 추출 (다양한 필드명 대응)
  const name = feature.properties.ROAD_NAME ?? 
               feature.properties.NAME ?? 
               feature.properties.ROAD_NM ?? 
               '이름 없는 도로';
  
  return {
    id,
    name,
    startNodeId,
    endNodeId,
    path: pathResult,
    distance,
    speedLimit: extractSpeedLimit(feature.properties),
    roadType: determineRoadType(feature.properties),
    oneWay: isOneWay(feature.properties),
    trafficLevel: 0 // 기본 교통량 정보 없음
  };
};

// SHP 노드 피처를 앱 Node로 변환
export const convertShpNodeToNode = (feature: ShpNodeFeature, id: string): Node => {
  const position = coordToGeoPoint(feature.geometry.coordinates);
  
  // 노드 타입 결정
  let nodeType: Node['type'] = 'intersection';
  
  // 노드 타입 매핑
  if (feature.properties.NODE_TYPE) {
    const nodeTypeName = feature.properties.NODE_TYPE.toLowerCase();
    if (nodeTypeName.includes('highway') && nodeTypeName.includes('entrance')) {
      // sourcery:ignore:next
      nodeType = 'highway_entrance';
    } else if (nodeTypeName.includes('highway') && nodeTypeName.includes('exit')) {
      // sourcery:ignore:next
      nodeType = 'highway_exit';
    } else if (nodeTypeName.includes('poi') || nodeTypeName.includes('point')) {
      // sourcery:ignore:next
      nodeType = 'poi';
    }
  }
  
  // 노드 이름 추출 (다양한 필드명 대응)
  const name = feature.properties.NODE_NAME ?? 
               feature.properties.NAME ?? 
               feature.properties.NODE_NM ?? 
               undefined;
  
  return {
    id,
    position,
    name,
    type: nodeType,
    connections: [] // 초기 연결 없음
  };
};

// 경로 거리 계산 (Haversine 공식 사용)
export const calculatePathDistance = (path: GeoPoint[]): number => {
  if (path.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += calculateDistance(path[i], path[i + 1]);
  }
  
  return totalDistance;
};

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

// 두 좌표 사이의 거리 계산 (Haversine 공식)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
};

// SHP 파일에서 도로 세그먼트 변환
export const convertToRoadSegments = (features: ShpRoadFeature[]): RoadSegment[] => {
  return features.map(feature => {
    const { properties, geometry } = feature;
    
    // 좌표 배열 처리 (LineString 또는 MultiLineString)
    let coordArray: number[][] = [];
    
    if (geometry.type === 'LineString') {
      // sourcery:ignore:next
      coordArray = geometry.coordinates as number[][];
    } else if (geometry.type === 'MultiLineString') {
      // MultiLineString의 경우 첫 번째 라인을 사용
      // sourcery:ignore:next
      coordArray = (geometry.coordinates as number[][][])[0] ?? [];
    }
    
    // 좌표를 GeoPoint 형식으로 변환
    const points: GeoPoint[] = coordArray.map(coord => ({
      longitude: coord[0],
      latitude: coord[1],
      altitude: coord[2] ?? 0
    }));
    
    // 시작/끝 노드 ID 생성
    const startNodeId = generateUniqueId();
    const endNodeId = generateUniqueId();
    
    // 일방통행 여부 확인
    let onewayFlag = false;
    if (typeof properties.ONEWAY === 'string') {
      // sourcery:ignore:next
      onewayFlag = ['Y', 'YES', 'TRUE', '1'].includes(properties.ONEWAY.toUpperCase());
    } else if (typeof properties.ONEWAY === 'number') {
      // sourcery:ignore:next
      onewayFlag = properties.ONEWAY === 1;
    } else if (typeof properties.ONEWAY === 'boolean') {
      // sourcery:ignore:next
      onewayFlag = properties.ONEWAY;
    }
    
    // 도로 세그먼트 생성
    const segment: RoadSegment = {
      id: properties.ID ?? properties.ROAD_ID ?? generateUniqueId(),
      name: properties.ROAD_NAME ?? properties.NAME ?? '',
      startNodeId,
      endNodeId,
      path: points,
      distance: calculatePathDistance(points),
      speedLimit: extractSpeedLimit(properties),
      roadType: determineRoadType(properties),
      oneWay: onewayFlag,
      trafficLevel: 0 // 기본 교통량 정보 없음
    };
    
    return segment;
  });
};

/**
 * SHP 파일을 로드하고 파싱하는 함수
 * 
 * @param file SHP 파일 또는 ZIP 파일 (SHP, DBF, PRJ 등 포함)
 * @returns Promise<GeoJSON.FeatureCollection> GeoJSON 형태로 변환된 결과
 */
export const loadShapefile = async (file: File): Promise<any> => {
  try {
    // 파일 타입 확인
    const isZip = file.name.toLowerCase().endsWith('.zip');
    const isShp = file.name.toLowerCase().endsWith('.shp');
    
    // 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      const onloadHandler = (e: ProgressEvent<FileReader>) => resolve(e.target?.result as ArrayBuffer);
      const onerrorHandler = reject;
      
      // sourcery:ignore:next
      reader.onload = onloadHandler;
      // sourcery:ignore:next
      reader.onerror = onerrorHandler;
      reader.readAsArrayBuffer(file);
    });
    
    // ZIP 파일 처리
    if (isZip) {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const shpFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.shp'));
      
      if (shpFiles.length === 0) {
        throw new Error('ZIP 파일 내에 SHP 파일이 없습니다.');
      }
      
      // 첫 번째 SHP 파일을 사용
      const shpFileData = await zip.file(shpFiles[0])?.async('arraybuffer');
      
      if (!shpFileData) {
        throw new Error('ZIP 파일에서 SHP 데이터를 추출할 수 없습니다.');
      }
      
      // SHP 파싱 (shpjs 라이브러리 사용)
      const geoJSON = await shpjs.parseShp(shpFileData);
      
      // DBF 파일 처리 (속성 데이터)
      const dbfFileName = shpFiles[0].replace('.shp', '.dbf');
      const dbfFile = zip.file(dbfFileName);
      
      if (dbfFile) {
        const dbfData = await dbfFile.async('arraybuffer');
        const attributes = await shpjs.parseDbf(dbfData);
        
        // GeoJSON 피처에 속성 추가
        return shpjs.combine([geoJSON, attributes]);
      }
      
      return geoJSON;
    } 
    // 단일 SHP 파일 처리
    else if (isShp) {
      // 웹 환경에서는 단일 SHP 파일만으로는 처리가 어려움
      // (DBF 파일 등이 필요함)
      return shpjs.parseShp(arrayBuffer);
    }
    
    throw new Error('지원하지 않는 파일 형식입니다. ZIP 또는 SHP 파일이 필요합니다.');
  } catch (error) {
    console.error('Shapefile 로드 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 여러 SHP 파일을 로드하고 파싱하는 함수
 * 
 * @param files SHP 파일 또는 ZIP 파일 배열
 * @returns Promise<any[]> GeoJSON 형태로 변환된 결과 배열
 */
export const loadMultipleShapefiles = async (files: File[]): Promise<any[]> => {
  try {
    const results = [];
    
    for (const file of files) {
      const result = await loadShapefile(file);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  } catch (error) {
    console.error('여러 Shapefile 로드 중 오류 발생:', error);
    throw error;
  }
};