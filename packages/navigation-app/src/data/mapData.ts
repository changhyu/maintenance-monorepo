import { Node, RoadSegment, GeoPoint, Place } from '../types';

// 서울 지역 일부 좌표 (중심: 서울시청)
const SEOUL_CENTER: GeoPoint = { latitude: 37.566, longitude: 126.9784 };

// 노드(교차로) 생성 헬퍼 함수
const createNode = (
  id: string, 
  lat: number, 
  lng: number, 
  type: Node['type'] = 'intersection',
  name?: string
): Node => ({
  id,
  position: { latitude: lat, longitude: lng },
  name,
  type,
  connections: []
});

// Road segment configuration interface
interface RoadSegmentConfig {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  path: GeoPoint[];
  distance: number;
  speedLimit: number;
  roadType?: RoadSegment['roadType'];
  oneWay?: boolean;
}

// 도로 세그먼트 생성 헬퍼 함수
const createRoadSegment = (config: RoadSegmentConfig): RoadSegment => {
  const {
    id,
    name,
    startNodeId,
    endNodeId,
    path,
    distance,
    speedLimit,
    roadType = 'major_road',
    oneWay = false
  } = config;
  
  return {
    id,
    name,
    startNodeId,
    endNodeId,
    path,
    distance,
    speedLimit,
    roadType,
    oneWay,
    trafficLevel: Math.floor(Math.random() * 3) // 랜덤 교통 상황
  };
};

// 두 지점 사이 경로 생성 (직선 방식)
const createPathBetween = (start: GeoPoint, end: GeoPoint, segments: number = 5): GeoPoint[] => {
  const path: GeoPoint[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const ratio = i / segments;
    path.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio
    });
  }
  
  return path;
};

// 두 지점 사이 거리 계산 (Haversine 공식)
const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
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

// 노드 데이터 (교차로)
export const nodes: Node[] = [
  // 주요 지점
  createNode('n1', 37.566, 126.9784, 'poi', '서울시청'),
  createNode('n2', 37.5664, 126.9859, 'intersection', '을지로입구역'),
  createNode('n3', 37.5606, 126.9822, 'intersection', '명동역'),
  createNode('n4', 37.5631, 126.9742, 'intersection', '시청역'),
  createNode('n5', 37.5585, 126.9713, 'intersection', '서울역'),
  createNode('n6', 37.5571, 126.9740, 'intersection', '남대문시장'),
  createNode('n7', 37.5689, 126.9771, 'intersection', '종로3가'),
  createNode('n8', 37.5668, 126.9830, 'intersection', '종로2가'),
  createNode('n9', 37.5641, 126.9700, 'intersection', '서대문역'),
  createNode('n10', 37.5729, 126.9797, 'poi', '종로'),
  
  // 광화문 쪽
  createNode('n11', 37.5703, 126.9756, 'intersection', '광화문사거리'),
  createNode('n12', 37.5743, 126.9768, 'poi', '경복궁'),
  createNode('n13', 37.5696, 126.9723, 'intersection', '서촌'),
  
  // 동대문 쪽
  createNode('n14', 37.5647, 126.9975, 'poi', '동대문'),
  createNode('n15', 37.5664, 126.9934, 'intersection', '동대문역사문화공원'),
  createNode('n16', 37.5680, 126.9895, 'intersection', '종로4가'),
  
  // 남산 쪽
  createNode('n17', 37.5514, 126.9880, 'poi', '남산타워'),
  createNode('n18', 37.5558, 126.9823, 'intersection', '남산 입구'),
  createNode('n19', 37.5508, 126.9770, 'intersection', '후암동'),
  
  // 마포/여의도 방향
  createNode('n20', 37.5564, 126.9378, 'poi', '여의도'),
  createNode('n21', 37.5538, 126.9507, 'intersection', '마포'),
  createNode('n22', 37.5568, 126.9227, 'intersection', '여의나루')
];

// 초기 연결 상태
nodes.forEach(node => {
  node.connections = [];
});

// 도로 세그먼트 데이터
export const roadSegments: RoadSegment[] = [
  // 시청 중심 도로
  createRoadSegment({
    id: 'r1',
    name: '세종대로',
    startNodeId: 'n1',
    endNodeId: 'n4',
    path: createPathBetween(nodes[0].position, nodes[3].position),
    distance: calculateDistance(nodes[0].position, nodes[3].position),
    speedLimit: 50
  }),
  createRoadSegment({
    id: 'r2',
    name: '을지로',
    startNodeId: 'n1',
    endNodeId: 'n2',
    path: createPathBetween(nodes[0].position, nodes[1].position),
    distance: calculateDistance(nodes[0].position, nodes[1].position),
    speedLimit: 40
  }),
  
  // 시청-서울역
  createRoadSegment({
    id: 'r3',
    name: '세종대로',
    startNodeId: 'n4',
    endNodeId: 'n5',
    path: createPathBetween(nodes[3].position, nodes[4].position),
    distance: calculateDistance(nodes[3].position, nodes[4].position),
    speedLimit: 50,
    roadType: 'major_road',
    oneWay: false
  }),
  
  // 명동 지역
  createRoadSegment({
    id: 'r4',
    name: '을지로',
    startNodeId: 'n2',
    endNodeId: 'n3',
    path: createPathBetween(nodes[1].position, nodes[2].position),
    distance: calculateDistance(nodes[1].position, nodes[2].position),
    speedLimit: 40
  }),
  createRoadSegment({
    id: 'r5',
    name: '퇴계로',
    startNodeId: 'n3',
    endNodeId: 'n6',
    path: createPathBetween(nodes[2].position, nodes[5].position),
    distance: calculateDistance(nodes[2].position, nodes[5].position),
    speedLimit: 40
  }),
  createRoadSegment({
    id: 'r6',
    name: '남대문로',
    startNodeId: 'n6',
    endNodeId: 'n5',
    path: createPathBetween(nodes[5].position, nodes[4].position),
    distance: calculateDistance(nodes[5].position, nodes[4].position),
    speedLimit: 40
  }),
  
  // 종로 방향
  createRoadSegment({
    id: 'r7',
    name: '종로',
    startNodeId: 'n7',
    endNodeId: 'n8',
    path: createPathBetween(nodes[6].position, nodes[7].position),
    distance: calculateDistance(nodes[6].position, nodes[7].position),
    speedLimit: 40
  }),
  createRoadSegment({
    id: 'r8',
    name: '새문안로',
    startNodeId: 'n9',
    endNodeId: 'n1',
    path: createPathBetween(nodes[8].position, nodes[0].position),
    distance: calculateDistance(nodes[8].position, nodes[0].position),
    speedLimit: 45
  }),
  createRoadSegment({
    id: 'r9',
    name: '종로',
    startNodeId: 'n8',
    endNodeId: 'n10',
    path: createPathBetween(nodes[7].position, nodes[9].position),
    distance: calculateDistance(nodes[7].position, nodes[9].position),
    speedLimit: 40
  }),
  
  // 광화문
  createRoadSegment({
    id: 'r10',
    name: '세종대로',
    startNodeId: 'n1',
    endNodeId: 'n11',
    path: createPathBetween(nodes[0].position, nodes[10].position),
    distance: calculateDistance(nodes[0].position, nodes[10].position),
    speedLimit: 50,
    roadType: 'major_road',
    oneWay: false
  }),
  createRoadSegment({
    id: 'r11',
    name: '세종대로',
    startNodeId: 'n11',
    endNodeId: 'n12',
    path: createPathBetween(nodes[10].position, nodes[11].position),
    distance: calculateDistance(nodes[10].position, nodes[11].position),
    speedLimit: 50
  }),
  createRoadSegment({
    id: 'r12',
    name: '사직로',
    startNodeId: 'n11',
    endNodeId: 'n13',
    path: createPathBetween(nodes[10].position, nodes[12].position),
    distance: calculateDistance(nodes[10].position, nodes[12].position),
    speedLimit: 40
  }),
  
  // 동대문 방향
  createRoadSegment({
    id: 'r13',
    name: '을지로',
    startNodeId: 'n2',
    endNodeId: 'n15',
    path: createPathBetween(nodes[1].position, nodes[14].position),
    distance: calculateDistance(nodes[1].position, nodes[14].position),
    speedLimit: 40
  }),
  createRoadSegment({
    id: 'r14',
    name: '종로',
    startNodeId: 'n7',
    endNodeId: 'n16',
    path: createPathBetween(nodes[6].position, nodes[15].position),
    distance: calculateDistance(nodes[6].position, nodes[15].position),
    speedLimit: 40
  }),
  createRoadSegment({
    id: 'r15',
    name: '종로',
    startNodeId: 'n16',
    endNodeId: 'n14',
    path: createPathBetween(nodes[15].position, nodes[13].position),
    distance: calculateDistance(nodes[15].position, nodes[13].position),
    speedLimit: 40
  }),
  
  // 남산 방향
  createRoadSegment({
    id: 'r16',
    name: '남산1호터널',
    startNodeId: 'n3',
    endNodeId: 'n18',
    path: createPathBetween(nodes[2].position, nodes[17].position),
    distance: calculateDistance(nodes[2].position, nodes[17].position),
    speedLimit: 50,
    roadType: 'major_road',
    oneWay: true
  }),
  createRoadSegment({
    id: 'r17',
    name: '남산길',
    startNodeId: 'n18',
    endNodeId: 'n17',
    path: createPathBetween(nodes[17].position, nodes[16].position),
    distance: calculateDistance(nodes[17].position, nodes[16].position),
    speedLimit: 30,
    roadType: 'minor_road',
    oneWay: false
  }),
  createRoadSegment({
    id: 'r18',
    name: '소월로',
    startNodeId: 'n5',
    endNodeId: 'n19',
    path: createPathBetween(nodes[4].position, nodes[18].position),
    distance: calculateDistance(nodes[4].position, nodes[18].position),
    speedLimit: 40
  }),
  
  // 마포/여의도 방향
  createRoadSegment({
    id: 'r19',
    name: '마포대로',
    startNodeId: 'n9',
    endNodeId: 'n21',
    path: createPathBetween(nodes[8].position, nodes[20].position),
    distance: calculateDistance(nodes[8].position, nodes[20].position),
    speedLimit: 60,
    roadType: 'major_road',
    oneWay: false
  }),
  createRoadSegment({
    id: 'r20',
    name: '여의대로',
    startNodeId: 'n21',
    endNodeId: 'n20',
    path: createPathBetween(nodes[20].position, nodes[19].position),
    distance: calculateDistance(nodes[20].position, nodes[19].position),
    speedLimit: 60,
    roadType: 'highway',
    oneWay: false
  }),
  createRoadSegment({
    id: 'r21',
    name: '여의대로',
    startNodeId: 'n20',
    endNodeId: 'n22',
    path: createPathBetween(nodes[19].position, nodes[21].position),
    distance: calculateDistance(nodes[19].position, nodes[21].position),
    speedLimit: 70,
    roadType: 'highway',
    oneWay: false
  })
];

// 연결 정보 업데이트
roadSegments.forEach(segment => {
  const startNode = nodes.find(node => node.id === segment.startNodeId);
  const endNode = nodes.find(node => node.id === segment.endNodeId);
  
  if (startNode && !startNode.connections.includes(segment.id)) {
    startNode.connections.push(segment.id);
  }
  
  if (endNode && !segment.oneWay && !endNode.connections.includes(segment.id)) {
    endNode.connections.push(segment.id);
  }
});

// 주요 장소 데이터
export const places: Place[] = [
  {
    id: 'p1',
    name: '서울시청',
    position: { latitude: 37.566, longitude: 126.9784 },
    address: '서울특별시 중구 세종대로 110',
    category: 'government'
  },
  {
    id: 'p2',
    name: '경복궁',
    position: { latitude: 37.5743, longitude: 126.9768 },
    address: '서울특별시 종로구 세종로 1-1',
    category: 'tourist_attraction'
  },
  {
    id: 'p3',
    name: '남산서울타워',
    position: { latitude: 37.5514, longitude: 126.9880 },
    address: '서울특별시 용산구 남산공원길 105',
    category: 'tourist_attraction'
  },
  {
    id: 'p4',
    name: '동대문디자인플라자',
    position: { latitude: 37.5647, longitude: 126.9975 },
    address: '서울특별시 중구 을지로 281',
    category: 'tourist_attraction'
  },
  {
    id: 'p5',
    name: '명동성당',
    position: { latitude: 37.5636, longitude: 126.9830 },
    address: '서울특별시 중구 명동길 74',
    category: 'religious_place'
  },
  {
    id: 'p6',
    name: '여의도 한강공원',
    position: { latitude: 37.5285, longitude: 126.9325 },
    address: '서울특별시 영등포구 여의동로 330',
    category: 'park'
  },
  {
    id: 'p7',
    name: '롯데백화점 본점',
    position: { latitude: 37.5656, longitude: 126.9813 },
    address: '서울특별시 중구 소공로 2',
    category: 'shopping'
  },
  {
    id: 'p8',
    name: '서울역',
    position: { latitude: 37.5563, longitude: 126.9723 },
    address: '서울특별시 중구 통일로 1',
    category: 'transport'
  },
  {
    id: 'p9',
    name: '국립중앙박물관',
    position: { latitude: 37.5216, longitude: 126.9816 },
    address: '서울특별시 용산구 서빙고로 137',
    category: 'museum'
  },
  {
    id: 'p10',
    name: '광화문광장',
    position: { latitude: 37.5725, longitude: 126.9768 },
    address: '서울특별시 종로구 세종로 172',
    category: 'landmark'
  }
];

// 전체 지도 데이터
export const mapData = {
  nodes,
  roadSegments,
  places,
  center: SEOUL_CENTER
};