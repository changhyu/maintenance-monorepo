import { GeoPoint, RoadSegment } from '../../types';
import { mapData } from '../../data/mapData';
// NetInfo 모듈 조건부 가져오기로 변경
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  // NetInfo가 없는 환경(브라우저, Node.js 등)을 위한 Mock
  NetInfo = {
    fetch: () => Promise.resolve({ isConnected: true })
  };
}
import { calculateDistance } from '../NavigationService';

// 교통 정보 레벨 정의
export enum TrafficLevel {
  FREE_FLOW = 0,      // 원활
  LIGHT = 0.2,        // 약간 혼잡
  MODERATE = 0.4,     // 보통 혼잡
  HEAVY = 0.7,        // 심한 혼잡
  VERY_HEAVY = 1.0,   // 매우 심한 혼잡
  CLOSED = -1,        // 도로 폐쇄
}

// 교통 사고/이벤트 유형
export enum TrafficEventType {
  ACCIDENT = 'accident',         // 사고
  CONSTRUCTION = 'construction', // 공사
  CLOSURE = 'closure',           // 폐쇄
  WEATHER = 'weather',           // 기상 상황
  EVENT = 'event',               // 행사/이벤트
  OTHER = 'other',               // 기타
}

// 교통 사고/이벤트 정보
export interface TrafficEvent {
  id: string;
  location: GeoPoint;
  roadSegmentId: string;
  type: TrafficEventType;
  description: string;
  startTime: Date;
  endTime?: Date; // 종료 시간이 없으면 진행중
  severity: 1 | 2 | 3; // 1: 경미, 2: 중간, 3: 심각
  affectedSegments?: string[]; // 영향을 받는 주변 도로 세그먼트 ID
}

export class TrafficService {
  private readonly trafficData: Map<string, TrafficLevel> = new Map(); // 도로 세그먼트별 교통 상황
  private trafficEvents: TrafficEvent[] = [];                // 교통 사고 및 이벤트
  private lastUpdate: Date = new Date(0);                     // 마지막 업데이트 시간
  private updateInterval: number = 5 * 60 * 1000;             // 기본 업데이트 간격 (5분)
  private isUpdating: boolean = false;                        // 업데이트 중복 방지
  private updateTimer: NodeJS.Timeout | null = null;          // 타이머 참조

  constructor() {
    // 초기화 시 모든 도로 세그먼트에 대해 기본 교통 상황을 설정
    this.initializeTrafficData();
  }

  // 교통 데이터 초기화
  private initializeTrafficData(): void {
    mapData.roadSegments.forEach(segment => {
      this.trafficData.set(segment.id, this.generateRandomTrafficLevel());
    });
  }
  
  // (시뮬레이션을 위한) 랜덤 교통 정보 생성
  private generateRandomTrafficLevel(): TrafficLevel {
    const rand = Math.random();
    if (rand < 0.5) {
      return TrafficLevel.FREE_FLOW;    // 50% 확률로 원활
    }
    if (rand < 0.7) {
      return TrafficLevel.LIGHT;        // 20% 확률로 약간 혼잡
    }
    if (rand < 0.85) {
      return TrafficLevel.MODERATE;    // 15% 확률로 보통 혼잡
    }
    if (rand < 0.95) {
      return TrafficLevel.HEAVY;       // 10% 확률로 심한 혼잡
    }
    return TrafficLevel.VERY_HEAVY;                   // 5% 확률로 매우 심한 혼잡
  }
  
  // 특정 위치 주변의 교통 이벤트 생성 (시뮬레이션용)
  private generateTrafficEvent(center: GeoPoint): TrafficEvent | null {
    // 가장 가까운 도로 세그먼트를 찾음
    let _closestSegment: RoadSegment | null = null;
    let _minDistance = Infinity;
    
    mapData.roadSegments.forEach(segment => {
      // 단순화를 위해 세그먼트의 첫 번째 점만 고려
      const distance = calculateDistance(center, segment.path[0]);
      if (distance < _minDistance) {
        _minDistance = distance;
        _closestSegment = segment;
      }
    });
    
    if (!_closestSegment) {
      return null;
    }
    
    // 타입스크립트 에러 방지를 위한 타입 단언
    const segment = _closestSegment as RoadSegment;
    
    const eventTypes = Object.values(TrafficEventType);
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)] as TrafficEventType;
    
    // 이벤트 설명 생성
    let description = '';
    switch (randomType) {
      case TrafficEventType.ACCIDENT: {
        description = '차량 충돌 사고';
        break;
      }
      case TrafficEventType.CONSTRUCTION: {
        description = '도로 공사';
        break;
      }
      case TrafficEventType.CLOSURE: {
        description = '도로 폐쇄';
        break;
      }
      case TrafficEventType.WEATHER: {
        description = '기상 상황으로 인한 통행 제한';
        break;
      }
      case TrafficEventType.EVENT: {
        description = '지역 행사로 인한 교통 혼잡';
        break;
      }
      default: {
        description = '기타 교통 장애';
      }
    }
    
    // 이벤트 지속 시간 (1~8시간 랜덤)
    const duration = 1 + Math.floor(Math.random() * 8); 
    const startTime = new Date();
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + duration);
    
    // 주변 영향을 받는 세그먼트 찾기
    const affectedSegments = this.findAffectedSegments(segment.id);
    
    return {
      id: `event-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      location: segment.path[0],
      roadSegmentId: segment.id,
      type: randomType,
      description,
      startTime,
      endTime,
      severity: Math.floor(Math.random() * 3 + 1) as 1 | 2 | 3,
      affectedSegments
    };
  }
  
  // 특정 세그먼트와 연결된 다른 세그먼트 찾기
  private findAffectedSegments(segmentId: string): string[] {
    const segment = mapData.roadSegments.find(s => s.id === segmentId);
    if (!segment) {
      return [];
    }
    
    // 시작 노드와 끝 노드에 연결된 다른 세그먼트 찾기
    const affectedSegments: string[] = [];
    
    // 시작 노드에 연결된 세그먼트 찾기
    const startNode = mapData.nodes.find(n => n.id === segment.startNodeId);
    if (startNode) {
      startNode.connections.forEach(connId => {
        if (connId !== segmentId) {
          affectedSegments.push(connId);
        }
      });
    }
    
    // 끝 노드에 연결된 세그먼트 찾기
    const endNode = mapData.nodes.find(n => n.id === segment.endNodeId);
    if (endNode) {
      endNode.connections.forEach(connId => {
        if (connId !== segmentId && !affectedSegments.includes(connId)) {
          affectedSegments.push(connId);
        }
      });
    }
    
    return affectedSegments;
  }
  
  // 교통 정보 업데이트 (API 호출이 실제로는 필요하지만 여기서는 시뮬레이션)
  async updateTrafficData(): Promise<boolean> {
    if (this.isUpdating) {
      return false;
    }
    
    this.isUpdating = true;
    
    try {
      // 네트워크 연결 확인
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('네트워크 연결이 없어 교통 정보를 업데이트할 수 없습니다.');
        this.isUpdating = false;
        return false;
      }
      
      // 실제 앱에서는 여기서 API 호출을 통해 교통 정보를 가져오지만, 
      // 시뮬레이션을 위해 랜덤하게 일부 도로의 교통 상황을 업데이트
      
      // 20%의 도로 세그먼트에 대한 교통 정보 업데이트
      const segmentIds = Array.from(this.trafficData.keys());
      const updateCount = Math.floor(segmentIds.length * 0.2);
      
      for (let i = 0; i < updateCount; i++) {
        const randomIndex = Math.floor(Math.random() * segmentIds.length);
        const segmentId = segmentIds[randomIndex];
        this.trafficData.set(segmentId, this.generateRandomTrafficLevel());
      }
      
      // 5% 확률로 새로운 교통 이벤트 생성
      if (Math.random() < 0.05) {
        // 랜덤 위치 생성 (실제로는 사용자 주변 또는 경로 주변으로 설정)
        const center: GeoPoint = {
          latitude: 37.5 + (Math.random() * 0.1 - 0.05),  // 서울 기준 랜덤 위치
          longitude: 127.0 + (Math.random() * 0.1 - 0.05)
        };
        
        const newEvent = this.generateTrafficEvent(center);
        if (newEvent) {
          // 이벤트 발생한 도로 세그먼트와 주변 도로의 교통량 증가
          this.trafficData.set(
            newEvent.roadSegmentId,
            newEvent.type === TrafficEventType.CLOSURE 
              ? TrafficLevel.CLOSED 
              : TrafficLevel.VERY_HEAVY
          );
          
          // 영향을 받는 세그먼트의 교통량도 증가
          newEvent.affectedSegments?.forEach(segId => {
            const currentLevel = this.trafficData.get(segId) ?? TrafficLevel.FREE_FLOW;
            if (currentLevel !== TrafficLevel.CLOSED) {
              const newLevel = Math.min(
                TrafficLevel.VERY_HEAVY, 
                currentLevel + (0.2 * newEvent.severity)
              ) as TrafficLevel;
              this.trafficData.set(segId, newLevel);
            }
          });
          
          this.trafficEvents.push(newEvent);
        }
      }
      
      // 만료된 교통 이벤트 제거
      const now = new Date();
      this.trafficEvents = this.trafficEvents.filter(event => {
        if (event.endTime && event.endTime < now) {
          // 이벤트가 종료되면 영향을 받던 도로 세그먼트의 교통량을 정상화
          this.normalizeTrafficAfterEvent(event);
          return false;
        }
        return true;
      });
      
      this.lastUpdate = now;
      
      return true;
    } catch (error) {
      console.error('교통 정보 업데이트 중 오류 발생:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }
  
  // 이벤트 종료 후 교통량 정상화
  private normalizeTrafficAfterEvent(event: TrafficEvent): void {
    // 주요 세그먼트 정상화
    if (this.trafficData.get(event.roadSegmentId) === TrafficLevel.CLOSED) {
      this.trafficData.set(event.roadSegmentId, TrafficLevel.HEAVY);
    } else {
      const currentLevel = this.trafficData.get(event.roadSegmentId) ?? TrafficLevel.FREE_FLOW;
      const newLevel = Math.max(
        TrafficLevel.FREE_FLOW,
        currentLevel - (0.3 * event.severity)
      ) as TrafficLevel;
      this.trafficData.set(event.roadSegmentId, newLevel);
    }
    
    // 영향을 받던 주변 세그먼트 정상화
    event.affectedSegments?.forEach(segId => {
      const currentLevel = this.trafficData.get(segId) ?? TrafficLevel.FREE_FLOW;
      const newLevel = Math.max(
        TrafficLevel.FREE_FLOW,
        currentLevel - (0.2 * event.severity)
      ) as TrafficLevel;
      this.trafficData.set(segId, newLevel);
    });
  }
  
  // 주기적 업데이트 시작
  startPeriodicUpdates(intervalMs = this.updateInterval): void {
    // 기존 타이머가 있으면 중지
    this.stopPeriodicUpdates();
    
    // 새로운 타이머 시작
    this.updateInterval = intervalMs;
    this.updateTimer = setInterval(() => {
      this.updateTrafficData();
    }, this.updateInterval);
    
    // 초기 업데이트 즉시 실행
    this.updateTrafficData();
  }
  
  // 주기적 업데이트 중지
  stopPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  // 특정 도로 세그먼트의 교통 상황 조회
  getTrafficLevel(segmentId: string): TrafficLevel {
    return this.trafficData.get(segmentId) ?? TrafficLevel.FREE_FLOW;
  }
  
  // 특정 경로에 대한 교통 상황 조회
  getRouteTrafficInfo(segmentIds: string[]): { 
    averageTrafficLevel: number; 
    worstTrafficLevel: TrafficLevel;
    worstSegmentId: string | null;
    events: TrafficEvent[];
  } {
    let sum = 0;
    let count = 0;
    let worstLevel = TrafficLevel.FREE_FLOW;
    let worstSegmentId = null;
    const events: TrafficEvent[] = [];
    
    // 경로에 포함된 모든 세그먼트에 대한 교통 수준 분석
    for (const segmentId of segmentIds) {
      const level = this.getTrafficLevel(segmentId);
      if (level >= 0) { // 폐쇄된 도로(-1)는 평균에서 제외
        sum += level;
        count++;
      }
      
      // 가장 혼잡한 구간 기록
      if (level > worstLevel || level === TrafficLevel.CLOSED) {
        worstLevel = level;
        worstSegmentId = segmentId;
      }
      
      // 이 세그먼트에 관련된 이벤트 찾기
      const relatedEvents = this.trafficEvents.filter(
        event => event.roadSegmentId === segmentId || 
                (event.affectedSegments?.includes(segmentId))
      );
      
      // 중복 제거하며 이벤트 추가
      for (const event of relatedEvents) {
        if (!events.some(e => e.id === event.id)) {
          events.push(event);
        }
      }
    }
    
    const averageTrafficLevel = count > 0 ? sum / count : 0;
    
    return {
      averageTrafficLevel,
      worstTrafficLevel: worstLevel,
      worstSegmentId,
      events
    };
  }
  
  // 교통 이벤트 목록 조회
  getTrafficEvents(
    area?: { center: GeoPoint; radiusKm: number } // 특정 지역 내 이벤트만 조회
  ): TrafficEvent[] {
    if (!area) {
      return [...this.trafficEvents];
    }
    
    // 특정 반경 내의 이벤트만 필터링
    return this.trafficEvents.filter(event => {
      const distance = calculateDistance(area.center, event.location) / 1000; // km 단위로 변환
      return distance <= area.radiusKm;
    });
  }
  
  // 마지막 업데이트 시간 조회
  getLastUpdateTime(): Date {
    return this.lastUpdate;
  }
  
  // 특정 지역 내의 평균 교통 수준 계산
  getAverageTrafficLevelInArea(center: GeoPoint, radiusMeters: number): number {
    let sum = 0;
    let count = 0;
    
    mapData.roadSegments.forEach(segment => {
      // 세그먼트의 중간 지점 계산 (간단하게 첫 번째와 마지막 지점의 중간으로)
      const midPoint = {
        latitude: (segment.path[0].latitude + segment.path[segment.path.length - 1].latitude) / 2,
        longitude: (segment.path[0].longitude + segment.path[segment.path.length - 1].longitude) / 2
      };
      
      // 지정된 반경 내에 있는지 확인
      const distance = calculateDistance(center, midPoint);
      if (distance <= radiusMeters) {
        const level = this.getTrafficLevel(segment.id);
        if (level >= 0) { // 폐쇄된 도로(-1)는 평균에서 제외
          sum += level;
          count++;
        }
      }
    });
    
    return count > 0 ? sum / count : 0;
  }
  
  // 특정 경로의 실시간 예상 소요 시간 계산
  estimateRouteTime(segmentIds: string[]): number {
    let totalTime = 0;
    
    for (const segmentId of segmentIds) {
      const segment = mapData.roadSegments.find(s => s.id === segmentId);
      if (!segment) {
        continue;
      }
      
      // 세그먼트 거리 계산
      let segmentDistance = 0;
      for (let i = 1; i < segment.path.length; i++) {
        segmentDistance += calculateDistance(segment.path[i-1], segment.path[i]);
      }
      
      // 교통 상황 가져오기
      const trafficLevel = this.getTrafficLevel(segment.id);
      
      // 폐쇄된 도로는 통과 불가
      if (trafficLevel === TrafficLevel.CLOSED) {
        continue;
      }
      
      // 교통 수준에 따른 평균 속도 계산 (km/h)
      let averageSpeed;
      switch (trafficLevel) {
        case TrafficLevel.FREE_FLOW: {
          averageSpeed = segment.speedLimit ?? 60; // 원활, 제한 속도
          break;
        }
        case TrafficLevel.LIGHT: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.8; // 약간 혼잡, 80%
          break;
        }
        case TrafficLevel.MODERATE: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.6; // 보통 혼잡, 60%
          break;
        }
        case TrafficLevel.HEAVY: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.4; // 심한 혼잡, 40%
          break;
        }
        case TrafficLevel.VERY_HEAVY: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.2; // 매우 심한 혼잡, 20%
          break;
        }
        default: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.5; // 기본값, 50%
        }
      }
      
      // 시간 계산 (초 단위)
      const segmentTime = (segmentDistance / 1000) / (averageSpeed / 3600);
      totalTime += segmentTime;
    }
    
    return totalTime;
  }

  // 교통 상황을 고려한 경로 시간 계산 (초 단위)
  private calculateRouteTimeWithTraffic(segments: RoadSegment[]): number {
    let totalTime = 0;
    
    for (const segment of segments) {
      // 세그먼트 거리 계산
      let segmentDistance = 0;
      for (let i = 1; i < segment.path.length; i++) {
        segmentDistance += calculateDistance(segment.path[i-1], segment.path[i]);
      }
      
      // 교통 상황 가져오기 - 순환 참조 수정 (trafficService -> this)
      const trafficLevel = this.getTrafficLevel(segment.id);
      
      // 폐쇄된 도로는 통과 불가
      if (trafficLevel === TrafficLevel.CLOSED) {
        continue;
      }
      
      // 교통 수준에 따른 평균 속도 계산 (km/h)
      let averageSpeed;
      switch (trafficLevel) {
        case TrafficLevel.FREE_FLOW: {
          averageSpeed = segment.speedLimit ?? 60; // 원활, 제한 속도
          break;
        }
        case TrafficLevel.LIGHT: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.8; // 약간 혼잡, 80%
          break;
        }
        case TrafficLevel.MODERATE: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.6; // 보통 혼잡, 60%
          break;
        }
        case TrafficLevel.HEAVY: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.4; // 심한 혼잡, 40%
          break;
        }
        case TrafficLevel.VERY_HEAVY: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.2; // 매우 심한 혼잡, 20%
          break;
        }
        default: {
          averageSpeed = (segment.speedLimit ?? 60) * 0.5; // 기본값, 50%
        }
      }
      
      // 시간 계산 (초 단위)
      const segmentTime = (segmentDistance / 1000) / (averageSpeed / 3600);
      totalTime += segmentTime;
    }
    
    return totalTime;
  }
  
  // 실시간 교통 정보 알림 구독 메서드
  subscribeToTrafficAlerts(
    area: { center: GeoPoint; radiusKm: number },
    severity: 1 | 2 | 3 | undefined,
    callback: (events: TrafficEvent[]) => void
  ): { unsubscribe: () => void } {
    // 고유 ID 생성 - 변수명 앞에 밑줄 추가하여 미사용 경고 방지
    const _subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 주기적으로 교통 상황 확인 및 알림
    const checkInterval = setInterval(() => {
      // 지정된 영역의 지정된 심각도 이상의 이벤트 필터링
      const events = this.getTrafficEvents(area).filter(event => 
        severity === undefined || event.severity >= severity
      );
      
      if (events.length > 0) {
        callback(events);
      }
    }, 60000); // 1분마다 체크
    
    // 구독 해제 함수 반환
    return {
      unsubscribe: () => {
        clearInterval(checkInterval);
      }
    };
  }
  
  // 특정 경로에 대한 교통 상황 변화 모니터링
  monitorRouteTraffic(
    segmentIds: string[],
    callback: (trafficInfo: ReturnType<typeof this.getRouteTrafficInfo>) => void
  ): { unsubscribe: () => void } {
    // 고유 ID 생성 - 변수명 앞에 밑줄 추가하여 미사용 경고 방지
    const _monitorId = `monitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 이전 교통 정보 저장
    let previousInfo = this.getRouteTrafficInfo(segmentIds);
    
    // 주기적으로 교통 상황 확인 및 변화 시 알림
    const checkInterval = setInterval(() => {
      const currentInfo = this.getRouteTrafficInfo(segmentIds);
      
      // 교통 상황에 유의미한 변화가 있는지 확인
      const hasSignificantChange = 
        Math.abs(currentInfo.averageTrafficLevel - previousInfo.averageTrafficLevel) > 0.2 ||
        currentInfo.worstTrafficLevel !== previousInfo.worstTrafficLevel ||
        currentInfo.events.length !== previousInfo.events.length;
      
      if (hasSignificantChange) {
        callback(currentInfo);
        previousInfo = currentInfo;
      }
    }, 30000); // 30초마다 체크
    
    // 모니터링 해제 함수 반환
    return {
      unsubscribe: () => {
        clearInterval(checkInterval);
      }
    };
  }
}

// 싱글톤 인스턴스
export const trafficService = new TrafficService();
export default trafficService;