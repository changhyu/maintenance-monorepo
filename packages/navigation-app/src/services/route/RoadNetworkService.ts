// filepath: /Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/navigation-app/src/services/route/RoadNetworkService.ts
import { GeoPoint } from '../../types';
import { RoadSegment } from './types';
import { mapData } from '../../data/mapData';

class RoadNetworkService {
  // 모든 노드 ID 목록 반환
  getAllNodeIds(): string[] {
    return mapData.nodes.map(node => node.id);
  }

  // ID로 노드 조회
  getNodeById(nodeId: string): GeoPoint | null {
    const node = mapData.nodes.find(n => n.id === nodeId);
    return node ? node.position : null; // position으로 수정 (location -> position)
  }

  // 이웃 노드와 연결 세그먼트 조회
  getNeighbors(nodeId: string): Array<{ nodeId: string; segment: RoadSegment }> {
    const neighbors: Array<{ nodeId: string; segment: RoadSegment }> = [];
    
    // 현재 노드 검색
    const currentNode = mapData.nodes.find(node => node.id === nodeId);
    if (!currentNode) {
      return [];
    }
    
    // 연결된 모든 세그먼트 확인
    for (const segmentId of currentNode.connections) {
      const segment = mapData.roadSegments.find(s => s.id === segmentId);
      if (!segment) {
        continue; // 중괄호 추가
      }
      
      // 이 세그먼트의 반대쪽 노드 결정
      const neighborNodeId = segment.startNodeId === nodeId ? segment.endNodeId : segment.startNodeId;
      
      // 완전한 RoadSegment 객체로 생성하여 타입 일치시키기
      const roadSegment: RoadSegment = {
        ...segment,
        length: segment.distance || 0, // distance를 length로 변환
        estimatedTime: (segment.distance / (segment.speedLimit || 30)) * 3.6, // 예상 시간 계산 (초 단위)
        scenicValue: segment.metadata?.scenicValue || 0.5 // 기본 scenic 값 제공
      };
      
      neighbors.push({
        nodeId: neighborNodeId,
        segment: roadSegment
      });
    }
    
    return neighbors;
  }

  // 두 노드 사이의 세그먼트 조회
  getSegmentBetweenNodes(startNodeId: string, endNodeId: string): RoadSegment | null {
    const segment = mapData.roadSegments.find(segment => 
      (segment.startNodeId === startNodeId && segment.endNodeId === endNodeId) ||
      (segment.startNodeId === endNodeId && segment.endNodeId === startNodeId)
    );
    
    if (!segment) {
      return null;
    }
    
    // 완전한 RoadSegment 객체로 생성하여 타입 일치시키기
    const roadSegment: RoadSegment = {
      ...segment,
      length: segment.distance || 0, // distance를 length로 변환
      estimatedTime: (segment.distance / (segment.speedLimit || 30)) * 3.6, // 예상 시간 계산 (초 단위)
      scenicValue: segment.metadata?.scenicValue || 0.5 // 기본 scenic 값 제공
    };
    
    return roadSegment;
  }
}

export default new RoadNetworkService();