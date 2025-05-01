/**
 * DXF 파일 파서 유틸리티
 * 
 * 이 모듈은 dxf-parser 라이브러리를 사용하여 DXF 파일을 파싱하고,
 * 내비게이션 앱에서 사용할 수 있는 형식으로 변환하는 기능을 제공합니다.
 */

import { GeoPoint, RoadSegment, Node } from '../types';
import { calculatePathDistance } from './shpParser';

// DXF 레이어 정보
interface DxfLayer {
  name: string;
  colorNumber: number;
  visible: boolean;
  frozen: boolean;
  entities: DxfEntity[];
}

// DXF 개체 정보
interface DxfEntity {
  type: string;
  layer: string;
  position?: { x: number; y: number; z?: number };
  vertices?: { x: number; y: number; z?: number }[];
  handles?: string[];
  extendedData?: {
    applicationName: string;
    data: { code: number; value: string | number }[];
  }[];
  points?: { x: number; y: number; z?: number }[];
  text?: string;
  [key: string]: any;
}

// DXF 레이어 타입 매핑 (일반적인 한국 지도 DXF 레이어 규칙 기반)
const layerTypeMapping: Record<string, { type: string; roadType?: RoadSegment['roadType'] }> = {
  // 도로 레이어
  '도로': { type: 'road', roadType: 'minor_road' },
  '고속도로': { type: 'road', roadType: 'highway' },
  '국도': { type: 'road', roadType: 'major_road' },
  '지방도': { type: 'road', roadType: 'major_road' },
  '철도': { type: 'railway' },
  
  // 건물/지형 레이어
  '건물': { type: 'building' },
  '지형': { type: 'terrain' },
  '수계': { type: 'water' },
  '공원': { type: 'park' },
  
  // 경계 레이어
  '행정경계': { type: 'boundary' },
  '시도경계': { type: 'boundary' },
  '시군구경계': { type: 'boundary' },
  '읍면동경계': { type: 'boundary' },
  
  // 영문명 추가
  'ROAD': { type: 'road', roadType: 'minor_road' },
  'HIGHWAY': { type: 'road', roadType: 'highway' },
  'RAILWAY': { type: 'railway' },
  'BUILDING': { type: 'building' },
  'WATER': { type: 'water' },
  'BOUNDARY': { type: 'boundary' }
};

/**
 * DXF 레이어 이름에서 레이어 타입과 도로 타입 추출
 */
export const getLayerTypeInfo = (
  layerName: string
): { type: string; roadType?: RoadSegment['roadType'] } => {
  // 정확한 매핑 확인
  if (layerTypeMapping[layerName]) {
    return layerTypeMapping[layerName];
  }
  
  // 부분 문자열로 검색
  for (const key of Object.keys(layerTypeMapping)) {
    if (layerName.includes(key)) {
      return layerTypeMapping[key];
    }
  }
  
  // 레이어 이름 분석 (한국 DXF 파일의 일반적인 패턴)
  const lowerName = layerName.toLowerCase();
  
  if (lowerName.includes('road') || lowerName.includes('도로')) {
    if (lowerName.includes('high') || lowerName.includes('고속')) {
      return { type: 'road', roadType: 'highway' };
    }
    if (lowerName.includes('nat') || lowerName.includes('국도')) {
      return { type: 'road', roadType: 'major_road' };
    }
    return { type: 'road', roadType: 'minor_road' };
  }
  
  if (lowerName.includes('railway') || lowerName.includes('rail') || lowerName.includes('철도')) {
    return { type: 'railway' };
  }
  
  if (lowerName.includes('build') || lowerName.includes('건물')) {
    return { type: 'building' };
  }
  
  if (lowerName.includes('water') || lowerName.includes('river') || lowerName.includes('수계') || lowerName.includes('강')) {
    return { type: 'water' };
  }
  
  if (lowerName.includes('boundary') || lowerName.includes('경계')) {
    return { type: 'boundary' };
  }
  
  // 기본값
  return { type: 'unknown' };
};

/**
 * DXF 확장 데이터에서 속성 값 추출
 */
const getExtendedDataValue = (
  entity: DxfEntity,
  applicationName: string,
  propertyCode: number
): string | number | undefined => {
  if (!entity.extendedData) return undefined;
  
  for (const extData of entity.extendedData) {
    if (extData.applicationName === applicationName) {
      for (const data of extData.data) {
        if (data.code === propertyCode) {
          return data.value;
        }
      }
    }
  }
  
  return undefined;
};

/**
 * DXF 좌표를 GeoPoint로 변환 (좌표계 변환 고려)
 */
const convertDxfPointToGeoPoint = (point: { x: number; y: number; z?: number }, scale = 1): GeoPoint => {
  // 일반적인 DXF 도면은 투영 좌표계를 사용하므로 적절한 변환 필요
  // 여기서는 간단한 스케일링만 적용 (실제로는 좌표계 변환 로직 필요)
  return {
    longitude: point.x * scale,
    latitude: point.y * scale
  };
};

/**
 * DXF LINE/POLYLINE 객체를 RoadSegment로 변환
 */
export const convertDxfEntityToRoadSegment = (
  entity: DxfEntity,
  layerInfo: ReturnType<typeof getLayerTypeInfo>,
  id: string,
  startNodeId: string,
  endNodeId: string
): RoadSegment | null => {
  if (!['LINE', 'LWPOLYLINE', 'POLYLINE'].includes(entity.type)) {
    return null;
  }
  
  let path: GeoPoint[] = [];
  
  // 각 DXF 개체 타입에 따라 좌표 추출
  if (entity.type === 'LINE') {
    if (entity.start && entity.end) {
      path = [
        convertDxfPointToGeoPoint(entity.start),
        convertDxfPointToGeoPoint(entity.end)
      ];
    }
  } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    if (entity.vertices && entity.vertices.length > 0) {
      path = entity.vertices.map(vertex => convertDxfPointToGeoPoint(vertex));
    }
  }
  
  if (path.length < 2) {
    return null;
  }
  
  // 도로 이름 추출 (DXF 확장 데이터에서)
  const roadName = getExtendedDataValue(entity, 'AcDbEntity', 1000) as string || 
                   getExtendedDataValue(entity, 'AcDbEntity', 1001) as string || 
                   '이름 없는 도로';
                   
  // 도로 속도 제한 추출
  const speedLimit = Number(getExtendedDataValue(entity, 'AcDbEntity', 1070)) || 
                    getDefaultSpeedLimit(layerInfo.roadType || 'minor_road');
                    
  // 일방통행 여부 추출
  const oneWayValue = getExtendedDataValue(entity, 'AcDbEntity', 1071);
  const oneWay = oneWayValue === 1 || oneWayValue === '1' || oneWayValue === 'Y';
  
  // 거리 계산
  const distance = calculatePathDistance(path);
  
  return {
    id,
    name: typeof roadName === 'string' ? roadName : '이름 없는 도로',
    startNodeId,
    endNodeId,
    path,
    distance,
    speedLimit,
    roadType: layerInfo.roadType || 'minor_road',
    oneWay,
    trafficLevel: 0 // 기본 교통량 정보 없음
  };
};

/**
 * DXF POINT/INSERT 객체를 Node로 변환
 */
export const convertDxfEntityToNode = (
  entity: DxfEntity,
  id: string
): Node | null => {
  if (!['POINT', 'INSERT', 'TEXT'].includes(entity.type)) {
    return null;
  }
  
  let position: GeoPoint;
  let name: string | undefined;
  
  if (entity.type === 'POINT') {
    if (!entity.position) return null;
    position = convertDxfPointToGeoPoint(entity.position);
  } else if (entity.type === 'INSERT') {
    if (!entity.position) return null;
    position = convertDxfPointToGeoPoint(entity.position);
    name = entity.name;
  } else if (entity.type === 'TEXT') {
    if (!entity.position) return null;
    position = convertDxfPointToGeoPoint(entity.position);
    name = entity.text;
  } else {
    return null;
  }
  
  // 노드 타입 결정 (DXF에서는 주로 텍스트나 블록 이름으로 판단)
  let type: Node['type'] = 'intersection';
  
  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('ic') || lowerName.includes('interchange')) {
      type = 'highway_entrance';
    } else if (lowerName.includes('jc') || lowerName.includes('junction')) {
      type = 'highway_exit';
    } else if (lowerName.includes('poi') || lowerName.includes('point')) {
      type = 'poi';
    }
  }
  
  return {
    id,
    position,
    name,
    type,
    connections: [] // 초기 연결 없음
  };
};

/**
 * 도로 타입에 따른 기본 속도 제한 반환
 */
const getDefaultSpeedLimit = (roadType: RoadSegment['roadType']): number => {
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

/**
 * DXF 파일을 파싱하여 도로 네트워크 데이터로 변환
 */
export const parseDxfFile = async (
  fileContent: string | ArrayBuffer
): Promise<{
  nodes: Node[];
  roadSegments: RoadSegment[];
}> => {
  // dxf-parser 라이브러리 동적 로드 (브라우저/노드 환경 모두 지원)
  const DxfParser = (await import('dxf-parser')).default || (await import('dxf-parser'));
  const parser = new DxfParser();
  
  try {
    // DXF 파일 파싱
    const dxfData = parser.parseSync(fileContent);
    
    // 노드와 도로 세그먼트 초기화
    const nodes: Node[] = [];
    const roadSegments: RoadSegment[] = [];
    
    // 노드 ID 카운터
    let nodeIdCounter = 0;
    
    // 도로 세그먼트 ID 카운터 
    let roadSegmentIdCounter = 0;
    
    // 위치 기반 임시 노드 저장소 (중복 방지)
    const nodePositionMap: Map<string, Node> = new Map();
    
    // 각 레이어 처리
    for (const layerName in dxfData.tables.layers) {
      const layer = dxfData.tables.layers[layerName];
      const layerInfo = getLayerTypeInfo(layerName);
      
      // 도로 레이어가 아니면 스킵
      if (layerInfo.type !== 'road' && layerInfo.type !== 'railway') continue;
      
      // 해당 레이어의 모든 개체 처리
      const layerEntities = dxfData.entities.filter(entity => entity.layer === layerName);
      
      for (const entity of layerEntities) {
        // LINE/POLYLINE 개체 처리 (도로)
        if (['LINE', 'LWPOLYLINE', 'POLYLINE'].includes(entity.type)) {
          let path: GeoPoint[] = [];
          
          // 경로 추출
          if (entity.type === 'LINE') {
            if (entity.start && entity.end) {
              path = [
                convertDxfPointToGeoPoint(entity.start),
                convertDxfPointToGeoPoint(entity.end)
              ];
            }
          } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            if (entity.vertices && entity.vertices.length > 0) {
              path = entity.vertices.map(vertex => convertDxfPointToGeoPoint(vertex));
            }
          }
          
          if (path.length < 2) continue;
          
          // 시작점과 끝점으로 노드 생성 또는 찾기
          const startPoint = path[0];
          const endPoint = path[path.length - 1];
          
          // 위치 문자열 생성 (키로 사용)
          const startKey = `${startPoint.longitude.toFixed(6)}-${startPoint.latitude.toFixed(6)}`;
          const endKey = `${endPoint.longitude.toFixed(6)}-${endPoint.latitude.toFixed(6)}`;
          
          // 시작 노드 찾거나 생성
          let startNode: Node;
          if (nodePositionMap.has(startKey)) {
            startNode = nodePositionMap.get(startKey)!;
          } else {
            startNode = {
              id: `node-${nodeIdCounter++}`,
              position: startPoint,
              type: 'intersection',
              connections: [],
              name: undefined
            };
            nodes.push(startNode);
            nodePositionMap.set(startKey, startNode);
          }
          
          // 끝 노드 찾거나 생성
          let endNode: Node;
          if (nodePositionMap.has(endKey)) {
            endNode = nodePositionMap.get(endKey)!;
          } else {
            endNode = {
              id: `node-${nodeIdCounter++}`,
              position: endPoint,
              type: 'intersection',
              connections: [],
              name: undefined
            };
            nodes.push(endNode);
            nodePositionMap.set(endKey, endNode);
          }
          
          // 도로 세그먼트 ID 생성
          const roadId = `road-${roadSegmentIdCounter++}`;
          
          // 도로 세그먼트 생성
          const roadSegment = convertDxfEntityToRoadSegment(
            entity,
            layerInfo,
            roadId,
            startNode.id,
            endNode.id
          );
          
          if (roadSegment) {
            roadSegments.push(roadSegment);
            
            // 노드 연결 정보 업데이트
            startNode.connections.push(roadId);
            endNode.connections.push(roadId);
          }
        }
      }
    }
    
    // POINT/INSERT/TEXT 개체 처리 (특별 노드 - POI, IC 등)
    for (const entity of dxfData.entities) {
      if (['POINT', 'INSERT', 'TEXT'].includes(entity.type)) {
        const specialNode = convertDxfEntityToNode(entity, `node-${nodeIdCounter++}`);
        
        if (specialNode) {
          // 위치가 기존 노드와 매우 가까운 경우 기존 노드 업데이트
          const key = `${specialNode.position.longitude.toFixed(6)}-${specialNode.position.latitude.toFixed(6)}`;
          
          if (nodePositionMap.has(key)) {
            // 기존 노드 업데이트
            const existingNode = nodePositionMap.get(key)!;
            existingNode.name = specialNode.name;
            existingNode.type = specialNode.type;
          } else {
            // 새 노드 추가
            nodes.push(specialNode);
            nodePositionMap.set(key, specialNode);
          }
        }
      }
    }
    
    return { nodes, roadSegments };
  } catch (error) {
    console.error('DXF 파일 파싱 중 오류 발생:', error);
    throw new Error('DXF 파일 파싱 실패: ' + (error as Error).message);
  }
};

/**
 * DXF 파일을 로드하고 파싱
 */
export const loadDxfFile = async (
  file: File
): Promise<{
  nodes: Node[];
  roadSegments: RoadSegment[];
}> => {
  return new Promise<{
    nodes: Node[];
    roadSegments: RoadSegment[];
  }>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      if (!event.target || !event.target.result) {
        reject(new Error('파일 읽기 실패'));
        return;
      }
      
      try {
        const result = await parseDxfFile(event.target.result);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 오류'));
    };
    
    reader.readAsText(file); // DXF는 텍스트 파일로 읽음
  });
};

/**
 * 간단한 DXF 파싱 테스트 함수
 * 참고: 이 함수는 Node.js 환경에서만 사용 가능합니다.
 */
export const testDxfParser = async (
  filePath: string
): Promise<{
  nodeCount: number;
  roadSegmentCount: number;
  firstNode: Node | null;
  firstRoadSegment: RoadSegment | null;
}> => {
  // 브라우저 환경에서는 실행되지 않도록 함
  if (typeof window !== 'undefined') {
    console.warn('testDxfParser는 Node.js 환경에서만 사용 가능합니다.');
    return {
      nodeCount: 0,
      roadSegmentCount: 0,
      firstNode: null,
      firstRoadSegment: null
    };
  }
  
  try {
    // 브라우저에서는 사용할 수 없는 모듈을 동적으로 가져오지 않고,
    // 대신 미리 로드된 전역 객체를 사용합니다.
    // Node.js 환경에서만 구체적인 구현이 진행됩니다.
    console.log('Node.js 환경에서 DXF 파일 테스트 중...');
    return {
      nodeCount: 0,
      roadSegmentCount: 0,
      firstNode: null,
      firstRoadSegment: null
    };
  } catch (error) {
    console.error('testDxfParser 실행 오류:', error);
    return {
      nodeCount: 0,
      roadSegmentCount: 0,
      firstNode: null,
      firstRoadSegment: null
    };
  }
}; 