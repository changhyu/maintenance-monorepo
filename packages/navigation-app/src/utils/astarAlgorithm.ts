import { Node, RoadSegment, GeoPoint } from '../types';
import { calculateDistance } from '../services/NavigationService';

// 우선순위 큐 구현
class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// 휴리스틱 함수: 목적지까지의 직선 거리 계산
const heuristic = (current: Node, goal: Node): number => {
  return calculateDistance(current.position, goal.position);
};

// A* 알고리즘을 사용하여 최단 경로 찾기
export const findPathWithAStar = (
  startNodeId: string,
  endNodeId: string,
  nodes: Node[],
  roadSegments: RoadSegment[],
  options: {
    avoidHighways?: boolean;
    avoidTolls?: boolean;
    routeType?: 'fastest' | 'shortest' | 'eco';
    considerTraffic?: boolean;
  } = {}
): string[] | null => {
  // 노드 ID로 노드 객체 찾기
  const startNode = nodes.find(n => n.id === startNodeId);
  const endNode = nodes.find(n => n.id === endNodeId);

  if (!startNode || !endNode) {
    return null;
  }

  // 방문한 노드 추적
  const visited = new Set<string>();
  
  // g 점수 (시작점에서 현재까지의 비용)
  const gScore: Record<string, number> = {};
  nodes.forEach(node => {
    gScore[node.id] = Infinity;
  });
  gScore[startNodeId] = 0;

  // f 점수 (g + h, 총 추정 비용)
  const fScore: Record<string, number> = {};
  nodes.forEach(node => {
    fScore[node.id] = Infinity;
  });
  fScore[startNodeId] = heuristic(startNode, endNode);

  // 이전 노드 추적을 위한 맵
  const previousNodes: Record<string, string | null> = {};
  nodes.forEach(node => {
    previousNodes[node.id] = null;
  });

  // 우선순위 큐 초기화
  const openSet = new PriorityQueue<string>();
  openSet.enqueue(startNodeId, fScore[startNodeId]);

  while (!openSet.isEmpty()) {
    const currentNodeId = openSet.dequeue();
    
    if (!currentNodeId) {
      continue;
    }

    if (currentNodeId === endNodeId) {
      // 목적지 도착, 경로 역추적
      const path: string[] = [];
      let current: string | null = endNodeId;
      
      while (current !== null) {
        path.unshift(current);
        current = previousNodes[current];
      }
      
      return path;
    }

    visited.add(currentNodeId);

    // 현재 노드와 연결된 모든 인접 노드 처리
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) continue;

    for (const segmentId of currentNode.connections) {
      const segment = roadSegments.find(s => s.id === segmentId);
      if (!segment) continue;

      // 옵션에 따라 도로 필터링
      if (options.avoidHighways && segment.roadType === 'highway') continue;

      // 인접 노드 ID 찾기
      let neighborId: string;
      if (segment.startNodeId === currentNodeId) {
        neighborId = segment.endNodeId;
      } else if (segment.endNodeId === currentNodeId && !segment.oneWay) {
        neighborId = segment.startNodeId;
      } else {
        continue; // 단방향 도로의 역방향인 경우 스킵
      }

      if (visited.has(neighborId)) continue;

      const neighbor = nodes.find(n => n.id === neighborId);
      if (!neighbor) continue;

      // 가중치 계산 (옵션에 따라 다른 계산 적용)
      let weight;
      const speedInMetersPerSecond = segment.speedLimit * (1000 / 3600);
      const timeInSeconds = segment.distance / speedInMetersPerSecond;

      if (options.routeType === 'shortest') {
        weight = segment.distance;
      } else if (options.routeType === 'eco') {
        // 에코 라우팅은 일정 속도(약 60km/h)일 때 연비가 좋다고 가정
        const optimalSpeed = 60;
        const fuelEfficiencyPenalty = Math.abs(segment.speedLimit - optimalSpeed) / 30;
        weight = segment.distance * (1 + fuelEfficiencyPenalty);
      } else {
        // 기본값: 가장 빠른 경로 (시간 기준)
        weight = timeInSeconds;
        // 교통 상황 반영
        if (options.considerTraffic && segment.trafficLevel !== undefined) {
          weight *= (1 + segment.trafficLevel * 0.2);
        }
      }

      // tentative_gScore = 시작점에서 이웃까지의 비용
      const tentativeGScore = gScore[currentNodeId] + weight;
      
      if (tentativeGScore < gScore[neighborId]) {
        // 더 나은 경로 발견
        previousNodes[neighborId] = currentNodeId;
        gScore[neighborId] = tentativeGScore;
        fScore[neighborId] = tentativeGScore + heuristic(neighbor, endNode);
        
        // 이웃 노드가 열린 세트에 없다면 추가
        if (!visited.has(neighborId)) {
          openSet.enqueue(neighborId, fScore[neighborId]);
        }
      }
    }
  }

  // 경로를 찾을 수 없음
  return null;
};