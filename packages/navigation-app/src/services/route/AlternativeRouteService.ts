import { v4 as uuidv4 } from 'uuid';
import { RoadSegment, Route, AlternativeRoute, RouteResult, RoutePriority } from './types';
import trafficService from '../traffic/TrafficService';
import routeService from './RouteService';
import roadNetworkService from './RoadNetworkService';

// 경로 계산을 위한 알고리즘 상수
const ALTERNATIVE_COUNT = 2; // 최대 대체 경로 수
const SIMILARITY_THRESHOLD = 0.7; // 유사도 임계값
const MAX_DETOUR_RATIO = 1.4; // 최대 우회 비율
const MIN_DETOUR_LENGTH = 500; // 최소 우회 길이 (미터)
const PENALTY_FACTOR = 0.8; // 이미 방문한 도로에 대한 패널티

class AlternativeRouteService {
  // 대체 경로 계산
  calculateAlternatives(baseRoute: Route, priorityId: RoutePriority): RouteResult {
    // 기본 경로를 우선 확보
    const mainRoute: AlternativeRoute = {
      id: uuidv4(),
      name: '추천 경로',
      path: baseRoute.path,
      distance: baseRoute.distance,
      estimatedTime: baseRoute.estimatedTime,
      segments: baseRoute.segments,
      nodes: baseRoute.nodes,
      trafficLevel: this.calculateRouteTrafficLevel(baseRoute),
      priority: priorityId
    };
    
    // 노드 추출해서 대체 경로 찾기
    const alternatives: AlternativeRoute[] = [];
    
    // 대체 경로 생성을 위한 노드와 간선 데이터 준비
    const { startNodeId, endNodeId } = this.extractNodeIds(baseRoute);
    
    if (!startNodeId || !endNodeId) {
      return { mainRoute, alternatives };
    }
    
    // 첫 번째 대체 경로 찾기
    const firstAlternative = this.findAlternativePath(
      startNodeId, 
      endNodeId,
      baseRoute.nodes,
      priorityId
    );
    
    if (firstAlternative) {
      alternatives.push(firstAlternative);
    }
    
    if (alternatives.length < ALTERNATIVE_COUNT) {
      // 두 번째 대체 경로 찾기 (첫 번째 경로와 원본 경로 모두 피하기)
      const allNodesToAvoid = [...baseRoute.nodes];
      if (firstAlternative) {
        allNodesToAvoid.push(...firstAlternative.nodes);
      }
      
      const secondAlternative = this.findAlternativePath(
        startNodeId, 
        endNodeId,
        allNodesToAvoid,
        priorityId
      );
      
      if (secondAlternative) {
        alternatives.push(secondAlternative);
      }
    }
    
    return { mainRoute, alternatives };
  }
  
  // 경로에서 시작 노드와 종료 노드 ID 추출
  private extractNodeIds(route: Route): { startNodeId: string | null; endNodeId: string | null } {
    if (!route.nodes || route.nodes.length < 2) {
      return { startNodeId: null, endNodeId: null };
    }
    
    const startNodeId = route.nodes[0];
    const endNodeId = route.nodes[route.nodes.length - 1];
    
    return { startNodeId, endNodeId };
  }
  
  // 대체 경로 찾기 - 복잡도를 줄이기 위해 여러 메서드로 분리
  private findAlternativePath(
    startNodeId: string, 
    endNodeId: string,
    nodesToAvoid: string[],
    priority: RoutePriority
  ): AlternativeRoute | null {
    // Dijkstra 알고리즘 준비
    const { distance, previous } = this.initializeDijkstra(startNodeId);
    const visited = new Set<string>();
    
    // 경로의 우선순위에 따른 비용 계산 함수 정의
    const getSegmentCost = this.createCostFunction(priority, nodesToAvoid);
    
    // 최단 경로 찾기
    this.findShortestPath(startNodeId, endNodeId, distance, previous, visited, getSegmentCost);
    
    // 경로가 발견되지 않았다면 null 반환
    if (!previous[endNodeId]) {
      return null;
    }
    
    // 경로 구성 및 검증
    return this.constructAndValidatePath(startNodeId, endNodeId, previous, priority);
  }

  // Dijkstra 알고리즘 초기화
  private initializeDijkstra(startNodeId: string): { 
    distance: Record<string, number>; 
    previous: Record<string, string | null> 
  } {
    const distance: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    
    const nodes = roadNetworkService.getAllNodeIds();
    nodes.forEach((nodeId: string) => {
      distance[nodeId] = Infinity;
      previous[nodeId] = null;
    });
    distance[startNodeId] = 0;
    
    return { distance, previous };
  }
  
  // 비용 계산 함수 생성
  private createCostFunction(priority: RoutePriority, nodesToAvoid: string[]): (segment: RoadSegment) => number {
    return (segment: RoadSegment): number => {
      let cost = segment.length;
      
      // 이미 방문한 도로에 페널티 부여
      if (nodesToAvoid.includes(segment.endNodeId) || 
          nodesToAvoid.includes(segment.startNodeId)) {
        cost *= (1 / PENALTY_FACTOR);
      }
      
      switch (priority) {
        case RoutePriority.FASTEST:
          cost *= segment.estimatedTime / segment.length;
          break;
        case RoutePriority.SHORTEST:
          // 이미 거리를 기본 비용으로 사용하고 있으므로 변경 필요 없음
          break;
        case RoutePriority.LEAST_TRAFFIC:
          cost *= (1 + this.getSegmentCongestionLevel(segment.id));
          break;
        case RoutePriority.SCENIC:
          cost *= (1 - segment.scenicValue);
          break;
      }
      
      return cost;
    };
  }
  
  // 최단 경로 찾기 로직 (Dijkstra 알고리즘 주요 부분)
  private findShortestPath(
    startNodeId: string,
    endNodeId: string,
    distance: Record<string, number>,
    previous: Record<string, string | null>,
    visited: Set<string>,
    getSegmentCost: (segment: RoadSegment) => number
  ): void {
    const nodes = roadNetworkService.getAllNodeIds();
    const unvisitedNodes = [...nodes];
    
    while (unvisitedNodes.length > 0 && !visited.has(endNodeId)) {
      // 가장 가까운 노드 찾기
      let currentNodeId: string | null = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisitedNodes) {
        if (distance[nodeId] < minDistance) {
          minDistance = distance[nodeId];
          currentNodeId = nodeId;
        }
      }
      
      // 더 이상 방문할 노드가 없으면 종료
      if (currentNodeId === null || distance[currentNodeId] === Infinity) {
        break;
      }
      
      // 이 노드는 방문 완료
      unvisitedNodes.splice(unvisitedNodes.indexOf(currentNodeId), 1);
      visited.add(currentNodeId);
      
      // 최종 목적지에 도달했다면 종료
      if (currentNodeId === endNodeId) {
        break;
      }
      
      // 이웃 노드 처리
      this.processNeighbors(
        currentNodeId, 
        distance, 
        previous, 
        visited, 
        getSegmentCost
      );
    }
  }
  
  // 경로 구성 및 유효성 검증
  private constructAndValidatePath(
    startNodeId: string,
    endNodeId: string,
    previous: Record<string, string | null>,
    priority: RoutePriority
  ): AlternativeRoute | null {
    // 경로 재구성
    const pathNodeIds = this.reconstructNodePath(endNodeId, previous);
    
    // 노드가 충분하지 않으면 null 반환
    if (pathNodeIds.length < 2) {
      return null;
    }
    
    // 세그먼트로 변환
    const segments = this.convertNodesToSegments(pathNodeIds);
    
    // 세그먼트를 찾을 수 없다면 null 반환
    if (!segments.length) {
      return null;
    }
    
    // 대체 경로 계산
    const totalDistance = segments.reduce((sum, segment) => sum + segment.length, 0);
    const estimatedTime = segments.reduce((sum, segment) => sum + segment.estimatedTime, 0);
    const path = routeService.calculatePathFromSegments(segments);
    
    // 거리가 너무 길면 대체 경로로 사용하지 않음
    const startPoint = roadNetworkService.getNodeById(startNodeId);
    const endPoint = roadNetworkService.getNodeById(endNodeId);
    const baseDistance = startPoint && endPoint ? 
      routeService.getDirectDistanceBetween(startPoint, endPoint) : null;
    
    // 우회율이 너무 높으면 null 반환
    if (baseDistance && totalDistance > baseDistance * MAX_DETOUR_RATIO && totalDistance > MIN_DETOUR_LENGTH) {
      return null;
    }
    
    return {
      id: uuidv4(),
      name: this.getRouteNameByPriority(priority),
      path,
      distance: totalDistance,
      estimatedTime,
      segments,
      nodes: pathNodeIds,
      trafficLevel: this.calculateTrafficLevelForSegments(segments),
      priority
    };
  }
  
  // 경로 이름 생성
  private getRouteNameByPriority(priority: RoutePriority): string {
    switch(priority) {
      case RoutePriority.FASTEST:
        return '대체 경로 (빠른)';
      case RoutePriority.SHORTEST:
        return '대체 경로 (짧은)';
      case RoutePriority.LEAST_TRAFFIC:
        return '대체 경로 (원활)';
      case RoutePriority.SCENIC:
        return '대체 경로 (경관)';
      default:
        return '대체 경로';
    }
  }
  
  // 세그먼트 교통 혼잡도 계산
  private getSegmentCongestionLevel(segmentId: string): number {
    const trafficLevel = trafficService.getTrafficLevel(segmentId);
    // TrafficLevel.CLOSED는 -1이므로 제외
    return trafficLevel >= 0 ? trafficLevel : 1.0;
  }
  
  // 경로의 교통 수준 계산
  private calculateRouteTrafficLevel(route: Route): number {
    const segmentIds = route.segments.map(segment => segment.id);
    const trafficInfo = trafficService.getRouteTrafficInfo(segmentIds);
    return trafficInfo.averageTrafficLevel;
  }
  
  // 세그먼트 목록의 교통 수준 계산
  private calculateTrafficLevelForSegments(segments: RoadSegment[]): number {
    const segmentIds = segments.map(segment => segment.id);
    const trafficInfo = trafficService.getRouteTrafficInfo(segmentIds);
    return trafficInfo.averageTrafficLevel;
  }
  
  // 이웃 노드 처리
  private processNeighbors(
    currentNodeId: string, 
    distance: Record<string, number>, 
    previous: Record<string, string | null>, 
    visited: Set<string>, 
    getSegmentCost: (segment: RoadSegment) => number
  ): void {
    // 현재 노드의 이웃 노드 가져오기
    const neighbors = roadNetworkService.getNeighbors(currentNodeId);
    
    // 각 이웃에 대해 최단 경로 업데이트
    for (const { nodeId, segment } of neighbors) {
      // 이미 방문한 노드는 건너뜀
      if (visited.has(nodeId)) {
        continue;
      }
      
      // 새로운 거리 계산
      const segmentCost = getSegmentCost(segment);
      const newDistance = distance[currentNodeId] + segmentCost;
      
      // 더 짧은 경로를 찾았다면 업데이트
      if (newDistance < distance[nodeId]) {
        distance[nodeId] = newDistance;
        previous[nodeId] = currentNodeId;
      }
    }
  }
  
  // 노드 경로 재구성
  private reconstructNodePath(endNodeId: string, previous: Record<string, string | null>): string[] {
    const pathNodeIds: string[] = [];
    let currentNodeId: string | null = endNodeId;
    
    while (currentNodeId) {
      pathNodeIds.unshift(currentNodeId);
      currentNodeId = previous[currentNodeId];
    }
    
    return pathNodeIds;
  }
  
  // 노드 배열을 세그먼트 배열로 변환
  private convertNodesToSegments(nodeIds: string[]): RoadSegment[] {
    const segments: RoadSegment[] = [];
    
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const segment = roadNetworkService.getSegmentBetweenNodes(nodeIds[i], nodeIds[i + 1]);
      if (segment) {
        segments.push(segment);
      } else {
        return [];
      }
    }
    
    return segments;
  }
}

export default new AlternativeRouteService();