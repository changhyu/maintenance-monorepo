/**
 * 경로 계산 유틸리티
 * 
 * 로드된 노드와 도로 세그먼트를 기반으로 최단 경로를 계산하는 기능을 제공합니다.
 */

import { 
  GeoPoint, 
  Node, 
  RoadSegment, 
  Route, 
  RouteStep, 
  RouteCalculationOptions,
  Maneuver
} from '../types';
import { calculateDistance } from './mapUtils';

// 맵핑 객체를 사용하여 Maneuver 열거형을 문자열로 변환
const maneuverToString: Record<Maneuver, string> = {
  [Maneuver.START]: "depart",
  [Maneuver.CONTINUE]: "straight",
  [Maneuver.TURN_LEFT]: "turn-left",
  [Maneuver.TURN_RIGHT]: "turn-right",
  [Maneuver.SLIGHT_LEFT]: "slight-left",
  [Maneuver.SLIGHT_RIGHT]: "slight-right",
  [Maneuver.SHARP_LEFT]: "sharp-left",
  [Maneuver.SHARP_RIGHT]: "sharp-right",
  [Maneuver.U_TURN]: "u-turn",
  [Maneuver.MERGE]: "merge",
  [Maneuver.EXIT]: "exit",
  [Maneuver.ROUNDABOUT]: "roundabout",
  [Maneuver.FINISH]: "arrive"
};

// 경로 계산을 위한 노드 정보 타입
interface RouteNode {
  id: string;
  distance: number;
  previous: string | null;
  visited: boolean;
}

// 두 지리적 좌표 사이의 거리를 미터 단위로 계산 (하버사인 공식 사용)
export function calculateDistanceBetweenPoints(pointA: GeoPoint, pointB: GeoPoint): number {
  const R = 6371000; // 지구 반지름 (미터)
  const φ1 = (pointA.latitude * Math.PI) / 180;
  const φ2 = (pointB.latitude * Math.PI) / 180;
  const Δφ = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const Δλ = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// 주어진 경로의 소요 시간 추정 (초 단위)
export function estimateDuration(distance: number, roadType: string, trafficLevel: number = 0): number {
  // 도로 유형별 기본 속도 설정 (km/h)
  let baseSpeed: number;
  switch (roadType) {
    case 'highway':
      baseSpeed = 100;
      break;
    case 'primary':
      baseSpeed = 80;
      break;
    case 'secondary':
      baseSpeed = 60;
      break;
    case 'tertiary':
      baseSpeed = 50;
      break;
    case 'residential':
      baseSpeed = 30;
      break;
    case 'service':
    case 'pedestrian':
    case 'path':
      baseSpeed = 15;
      break;
    default:
      baseSpeed = 40;
  }

  // 교통 수준에 따른 속도 감소 (0: 원활, 5: 심각한 정체)
  const trafficFactor = 1 - (trafficLevel * 0.15);
  const speed = baseSpeed * trafficFactor;

  // 초당 이동 거리 계산 (m/s)
  const speedMps = speed * 1000 / 3600;
  
  // 소요 시간 계산 (초)
  return distance / speedMps;
}

// 두 도로 세그먼트 사이의 회전 각도를 계산하여 적절한 회전 방향을 반환
export function determineManeuver(
  prevSegment: RoadSegment, 
  nextSegment: RoadSegment, 
  nodes: Map<string, Node>
): Maneuver {
  // 이전 세그먼트의 방향 계산
  const prevStartNode = nodes.get(prevSegment.startNodeId);
  const prevEndNode = nodes.get(prevSegment.endNodeId);
  
  // 다음 세그먼트의 방향 계산
  const nextStartNode = nodes.get(nextSegment.startNodeId);
  const nextEndNode = nodes.get(nextSegment.endNodeId);
  
  if (!prevStartNode || !prevEndNode || !nextStartNode || !nextEndNode) {
    return Maneuver.CONTINUE;
  }

  // 공통 노드 찾기
  let commonNodeId: string | null = null;
  if (prevSegment.endNodeId === nextSegment.startNodeId) {
    commonNodeId = prevSegment.endNodeId;
  } else if (prevSegment.endNodeId === nextSegment.endNodeId) {
    commonNodeId = prevSegment.endNodeId;
  } else if (prevSegment.startNodeId === nextSegment.startNodeId) {
    commonNodeId = prevSegment.startNodeId;
  } else if (prevSegment.startNodeId === nextSegment.endNodeId) {
    commonNodeId = prevSegment.startNodeId;
  }

  if (!commonNodeId) {
    return Maneuver.CONTINUE;
  }

  // 각 세그먼트의 방향 벡터 계산
  const prevVector = {
    x: prevEndNode.position.longitude - prevStartNode.position.longitude,
    y: prevEndNode.position.latitude - prevStartNode.position.latitude
  };
  
  const nextVector = {
    x: nextEndNode.position.longitude - nextStartNode.position.longitude,
    y: nextEndNode.position.latitude - nextStartNode.position.latitude
  };

  // 두 벡터 사이의 각도 계산 (라디안)
  const dot = prevVector.x * nextVector.x + prevVector.y * nextVector.y;
  const prevMagnitude = Math.sqrt(prevVector.x * prevVector.x + prevVector.y * prevVector.y);
  const nextMagnitude = Math.sqrt(nextVector.x * nextVector.x + nextVector.y * nextVector.y);
  
  // 외적을 사용하여 회전 방향 판별 (양수: 왼쪽, 음수: 오른쪽)
  const cross = prevVector.x * nextVector.y - prevVector.y * nextVector.x;
  
  // 각도 계산 (도)
  let angle = Math.acos(Math.min(Math.max(dot / (prevMagnitude * nextMagnitude), -1), 1)) * (180 / Math.PI);
  
  // 회전 방향 판별
  if (angle < 10) {
    return Maneuver.CONTINUE;
  } else if (angle < 45) {
    return cross > 0 ? Maneuver.SLIGHT_LEFT : Maneuver.SLIGHT_RIGHT;
  } else if (angle < 135) {
    return cross > 0 ? Maneuver.TURN_LEFT : Maneuver.TURN_RIGHT;
  } else {
    return cross > 0 ? Maneuver.SHARP_LEFT : Maneuver.SHARP_RIGHT;
  }
}

// 지침 문자열 생성
export function generateInstruction(maneuver: Maneuver, roadName: string = ''): string {
  const roadInfo = roadName ? ` ${roadName}(으)로` : '';
  
  switch (maneuver) {
    case Maneuver.START:
      return `${roadInfo} 출발하세요`;
    case Maneuver.FINISH:
      return '목적지에 도착했습니다';
    case Maneuver.CONTINUE:
      return `계속 직진하세요${roadInfo}`;
    case Maneuver.TURN_LEFT:
      return `좌회전하세요${roadInfo}`;
    case Maneuver.TURN_RIGHT:
      return `우회전하세요${roadInfo}`;
    case Maneuver.SLIGHT_LEFT:
      return `약간 왼쪽으로 이동하세요${roadInfo}`;
    case Maneuver.SLIGHT_RIGHT:
      return `약간 오른쪽으로 이동하세요${roadInfo}`;
    case Maneuver.SHARP_LEFT:
      return `급좌회전하세요${roadInfo}`;
    case Maneuver.SHARP_RIGHT:
      return `급우회전하세요${roadInfo}`;
    case Maneuver.U_TURN:
      return `유턴하세요${roadInfo}`;
    case Maneuver.ROUNDABOUT:
      return `로터리에 진입하세요${roadInfo}`;
    case Maneuver.MERGE:
      return `${roadInfo} 합류하세요`;
    case Maneuver.EXIT:
      return `${roadInfo} 나가세요`;
    default:
      return `진행하세요${roadInfo}`;
  }
}

// 경로 안내 단계 생성
export function generateRouteSteps(
  path: string[], 
  nodes: Map<string, Node>, 
  roadSegments: Map<string, RoadSegment>
): RouteStep[] {
  const steps: RouteStep[] = [];
  let currentSegmentIds: string[] = [];

  // 시작 지점 추가
  if (path.length > 1) {
    const startNodeId = path[0];
    const nextNodeId = path[1];
    
    const startNode = nodes.get(startNodeId);
    const connectedSegment = findSegmentBetweenNodes(startNodeId, nextNodeId, roadSegments);
    
    if (startNode && connectedSegment) {
      currentSegmentIds.push(connectedSegment.id);
      
      steps.push({
        maneuver: maneuverToString[Maneuver.START],
        instruction: generateInstruction(Maneuver.START, connectedSegment.metadata?.name as string),
        distance: 0,
        duration: 0,
        startPoint: startNode.position,
        endPoint: startNode.position,
        roadSegmentIds: [connectedSegment.id]
      });
    }
  }

  // 경로 단계 생성
  for (let i = 1; i < path.length - 1; i++) {
    const prevNodeId = path[i - 1];
    const currentNodeId = path[i];
    const nextNodeId = path[i + 1];
    
    const currentNode = nodes.get(currentNodeId);
    if (!currentNode) continue;
    
    const prevSegment = findSegmentBetweenNodes(prevNodeId, currentNodeId, roadSegments);
    const nextSegment = findSegmentBetweenNodes(currentNodeId, nextNodeId, roadSegments);
    
    if (!prevSegment || !nextSegment) continue;
    
    if (i === 1) {
      // 이미 시작 단계에 추가한 세그먼트는 제외
    } else {
      currentSegmentIds.push(prevSegment.id);
    }
    
    // 새 도로로 진입하거나 방향이 크게 바뀔 때만 새로운 단계 추가
    const maneuver = determineManeuver(prevSegment, nextSegment, nodes);
    
    if (maneuver !== Maneuver.CONTINUE || 
        prevSegment.metadata?.name !== nextSegment.metadata?.name) {
      
      currentSegmentIds.push(nextSegment.id);
      
      const nextNode = nodes.get(nextNodeId);
      if (!nextNode) continue;
      
      // 이전 단계부터 현재 지점까지의 거리 계산
      let stepDistance = 0;
      for (const segId of currentSegmentIds) {
        const segment = roadSegments.get(segId);
        if (segment) {
          stepDistance += segment.distance;
        }
      }
      
      // 소요 시간 추정
      let stepDuration = 0;
      for (const segId of currentSegmentIds) {
        const segment = roadSegments.get(segId);
        if (segment) {
          const roadType = segment.roadType || 'unknown';
          stepDuration += estimateDuration(
            segment.distance, 
            roadType, 
            segment.metadata?.trafficLevel || 0
          );
        }
      }
      
      steps.push({
        maneuver: maneuverToString[maneuver],
        instruction: generateInstruction(maneuver, nextSegment.metadata?.name as string),
        distance: stepDistance,
        duration: stepDuration,
        startPoint: currentNode.position,
        endPoint: nextNode.position,
        roadSegmentIds: [...currentSegmentIds]
      });
      
      // 새 단계 시작
      currentSegmentIds = [nextSegment.id];
    }
  }

  // 도착 지점 추가
  if (path.length > 1) {
    const lastNodeId = path[path.length - 1];
    const secondLastNodeId = path[path.length - 2];
    
    const lastNode = nodes.get(lastNodeId);
    const lastSegment = findSegmentBetweenNodes(secondLastNodeId, lastNodeId, roadSegments);
    
    if (lastNode && lastSegment) {
      steps.push({
        maneuver: maneuverToString[Maneuver.FINISH],
        instruction: generateInstruction(Maneuver.FINISH),
        distance: 0,
        duration: 0,
        startPoint: lastNode.position,
        endPoint: lastNode.position,
        roadSegmentIds: [lastSegment.id]
      });
    }
  }

  return steps;
}

// 두 노드 사이의 도로 세그먼트 찾기
function findSegmentBetweenNodes(
  nodeA: string, 
  nodeB: string, 
  roadSegments: Map<string, RoadSegment>
): RoadSegment | undefined {
  for (const segment of roadSegments.values()) {
    if ((segment.startNodeId === nodeA && segment.endNodeId === nodeB) ||
        (segment.startNodeId === nodeB && segment.endNodeId === nodeA)) {
      return segment;
    }
  }
  return undefined;
}

// 가장 가까운 노드 찾기
export function findNearestNode(
  point: GeoPoint, 
  nodes: Map<string, Node>
): Node | null {
  let nearestNode: Node | null = null;
  let minDistance = Number.MAX_VALUE;

  for (const node of nodes.values()) {
    const distance = calculateDistanceBetweenPoints(point, node.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = node;
    }
  }

  return nearestNode;
}

// A* 알고리즘을 사용한 경로 탐색
export function calculatePathBetweenPoints(
  origin: GeoPoint,
  destination: GeoPoint,
  nodes: Map<string, Node>,
  roadSegments: Map<string, RoadSegment>,
  options: RouteCalculationOptions = {}
): Route | null {
  // 출발지와 목적지에 가장 가까운 노드 찾기
  const startNode = findNearestNode(origin, nodes);
  const endNode = findNearestNode(destination, nodes);
  
  if (!startNode || !endNode) {
    console.error('출발지 또는 목적지 근처에 유효한 노드를 찾을 수 없습니다');
    return null;
  }
  
  // 이미 방문한 노드와 다음 방문할 노드 목록
  const openSet: string[] = [startNode.id];
  const closedSet: Set<string> = new Set();
  
  // 각 노드까지의 최적 경로 비용
  const gScore: Map<string, number> = new Map();
  gScore.set(startNode.id, 0);
  
  // 출발지에서 각 노드를 거쳐 목적지까지의 예상 총 비용
  const fScore: Map<string, number> = new Map();
  fScore.set(startNode.id, calculateDistanceBetweenPoints(startNode.position, endNode.position));
  
  // 최적 경로 추적을 위한 노드 맵
  const cameFrom: Map<string, string> = new Map();
  
  while (openSet.length > 0) {
    // fScore가 가장 낮은 노드 찾기
    let currentNodeId = openSet[0];
    let lowestFScore = fScore.get(currentNodeId) || Infinity;
    
    for (let i = 1; i < openSet.length; i++) {
      const nodeId = openSet[i];
      const score = fScore.get(nodeId) || Infinity;
      
      if (score < lowestFScore) {
        currentNodeId = nodeId;
        lowestFScore = score;
      }
    }
    
    // 목적지에 도달한 경우
    if (currentNodeId === endNode.id) {
      // 경로 재구성
      const path: string[] = [currentNodeId];
      let current = currentNodeId;
      
      while (cameFrom.has(current)) {
        current = cameFrom.get(current)!;
        path.unshift(current);
      }
      
      // 경로 점 생성
      const pathPoints: GeoPoint[] = path.map(nodeId => {
        const node = nodes.get(nodeId);
        return node ? node.position : { latitude: 0, longitude: 0 };
      });
      
      // 사용된 도로 세그먼트 ID 목록
      const roadSegmentIds: string[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const segment = findSegmentBetweenNodes(path[i], path[i + 1], roadSegments);
        if (segment) roadSegmentIds.push(segment.id);
      }
      
      // 총 거리와 소요 시간 계산
      let totalDistance = 0;
      let totalDuration = 0;
      
      for (const segmentId of roadSegmentIds) {
        const segment = roadSegments.get(segmentId);
        if (segment) {
          totalDistance += segment.distance;
          const roadType = segment.roadType || 'unknown';
          totalDuration += estimateDuration(
            segment.distance, 
            roadType, 
            segment.metadata?.trafficLevel || 0
          );
        }
      }
      
      // 경로 안내 단계 생성
      const steps = generateRouteSteps(path, nodes, roadSegments);
      
      // 최종 경로 객체 반환
      return {
        id: `route-${Date.now()}`,
        origin,
        destination,
        totalDistance,
        totalDuration,
        steps,
        pathPoints,
        roadSegmentIds
      };
    }
    
    // 현재 노드를 openSet에서 제거하고 closedSet에 추가
    openSet.splice(openSet.indexOf(currentNodeId), 1);
    closedSet.add(currentNodeId);
    
    // 현재 노드의 이웃 노드 탐색
    const currentNode = nodes.get(currentNodeId);
    if (!currentNode) continue;
    
    // 현재 노드와 연결된 모든 세그먼트 찾기
    const connectedSegments: RoadSegment[] = [];
    for (const segmentId of currentNode.connections) {
      const segment = roadSegments.get(segmentId);
      if (segment) {
        connectedSegments.push(segment);
      }
    }
    
    for (const segment of connectedSegments) {
      // 이웃 노드 ID 결정
      const neighborId = segment.startNodeId === currentNodeId 
        ? segment.endNodeId 
        : segment.startNodeId;
      
      // 이미 방문한 노드는 건너뛰기
      if (closedSet.has(neighborId)) continue;
      
      // 일방통행 도로 처리
      if (segment.oneWay && segment.endNodeId === currentNodeId) {
        continue; // 일방통행 도로의 역방향은 이동 불가
      }
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor) continue;
      
      // 옵션에 따른 도로 유형 필터링
      if (options.avoidHighways && segment.roadType === 'highway') {
        continue;
      }
      
      // 현재 노드에서 이웃 노드까지의 비용 계산
      let edgeCost = segment.distance;
      
      // 옵션에 따른 경로 우선순위 적용
      if (options.preferFasterRoute) {
        const roadType = segment.roadType || 'unknown';
        edgeCost = estimateDuration(
          segment.distance, 
          roadType, 
          segment.metadata?.trafficLevel || 0
        );
      } else if (options.preferMainRoads) {
        const roadType = segment.roadType || 'unknown';
        switch (roadType) {
          case 'highway':
            edgeCost *= 0.7;
            break;
          case 'primary':
            edgeCost *= 0.8;
            break;
          case 'secondary':
            edgeCost *= 0.9;
            break;
          default:
            // 기본 비용 유지
        }
      }
      
      // 출발지에서 이웃 노드까지의 비용
      const tentativeGScore = (gScore.get(currentNodeId) || 0) + edgeCost;
      
      // 이웃 노드가 openSet에 없으면 추가
      if (!openSet.includes(neighborId)) {
        openSet.push(neighborId);
      } else if (tentativeGScore >= (gScore.get(neighborId) || Infinity)) {
        // 이미 더 좋은 경로를 찾은 경우
        continue;
      }
      
      // 더 좋은 경로 발견
      cameFrom.set(neighborId, currentNodeId);
      gScore.set(neighborId, tentativeGScore);
      
      // 휴리스틱 비용 계산 (직선 거리)
      const hCost = calculateDistanceBetweenPoints(neighbor.position, endNode.position);
      fScore.set(neighborId, tentativeGScore + hCost);
    }
  }
  
  // 경로를 찾을 수 없는 경우
  console.error('유효한 경로를 찾을 수 없습니다');
  return null;
}