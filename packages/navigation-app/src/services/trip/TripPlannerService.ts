import { GeoPoint, RouteWaypoint, PlaceInfo, TravelMode } from '../../types';
import { multiRouteService, OptimizationType } from '../route/MultiRouteService';
import { RoutePriority } from '../route/AlternativeRouteService';
import { trafficService } from '../traffic/TrafficService';
import { calculateDistance } from '../NavigationService';

// 여행 일정 항목 유형
export enum TripItemType {
  START = 'start',           // 출발지
  DESTINATION = 'destination', // 최종 목적지
  WAYPOINT = 'waypoint',     // 경유지
  ATTRACTION = 'attraction', // 관광지/명소
  RESTAURANT = 'restaurant', // 식당
  ACCOMMODATION = 'accommodation', // 숙소
  SHOPPING = 'shopping',     // 쇼핑
  REST = 'rest',             // 휴식
  CUSTOM = 'custom',         // 사용자 정의
}

// 여행 일정 항목
export interface TripItem {
  id: string;
  type: TripItemType;
  place: PlaceInfo;
  startTime?: Date;      // 시작 시간
  endTime?: Date;        // 종료 시간
  duration?: number;     // 소요 시간 (분)
  notes?: string;        // 메모
  completed?: boolean;   // 완료 여부
}

// 여행 일정 계획
export interface TripPlan {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  items: TripItem[];
  estimatedTotalDistance?: number;  // 총 예상 이동 거리 (미터)
  estimatedTotalTime?: number;      // 총 예상 소요 시간 (분)
  created: Date;
  updated: Date;
}

class TripPlannerService {
  private tripPlans: TripPlan[] = [];
  private nextId = 1;

  // 새 여행 일정 계획 생성
  createTripPlan(
    name: string,
    description: string,
    startDate: Date,
    endDate: Date,
    initialItems: TripItem[] = []
  ): TripPlan {
    const now = new Date();
    const tripPlan: TripPlan = {
      id: `trip-${this.nextId++}`,
      name,
      description,
      startDate,
      endDate,
      items: [...initialItems],
      created: now,
      updated: now
    };

    this.tripPlans.push(tripPlan);
    return tripPlan;
  }
  
  // 모든 여행 일정 목록 조회
  getAllTripPlans(): TripPlan[] {
    return [...this.tripPlans];
  }
  
  // 특정 여행 일정 조회
  getTripPlanById(id: string): TripPlan | undefined {
    return this.tripPlans.find(plan => plan.id === id);
  }
  
  // 여행 일정 수정
  updateTripPlan(
    id: string,
    updates: Partial<Omit<TripPlan, 'id' | 'created' | 'updated'>>
  ): TripPlan | null {
    const index = this.tripPlans.findIndex(plan => plan.id === id);
    if (index === -1) return null;
    
    const tripPlan = this.tripPlans[index];
    
    // 업데이트 적용
    const updatedPlan: TripPlan = {
      ...tripPlan,
      ...updates,
      updated: new Date() // 업데이트 시간 갱신
    };
    
    this.tripPlans[index] = updatedPlan;
    return updatedPlan;
  }
  
  // 여행 일정 삭제
  deleteTripPlan(id: string): boolean {
    const initialLength = this.tripPlans.length;
    this.tripPlans = this.tripPlans.filter(plan => plan.id !== id);
    return this.tripPlans.length < initialLength;
  }
  
  // 여행 일정에 항목 추가
  addTripItem(tripId: string, item: Omit<TripItem, 'id'>): TripItem | null {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return null;
    
    // 새 일정 항목 ID 생성
    const newItem: TripItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...item
    };
    
    // 일정에 추가
    tripPlan.items.push(newItem);
    tripPlan.updated = new Date();
    
    return newItem;
  }
  
  // 여행 일정 항목 수정
  updateTripItem(
    tripId: string,
    itemId: string,
    updates: Partial<Omit<TripItem, 'id'>>
  ): TripItem | null {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return null;
    
    const itemIndex = tripPlan.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return null;
    
    // 업데이트 적용
    tripPlan.items[itemIndex] = {
      ...tripPlan.items[itemIndex],
      ...updates
    };
    
    tripPlan.updated = new Date();
    return tripPlan.items[itemIndex];
  }
  
  // 여행 일정 항목 삭제
  removeTripItem(tripId: string, itemId: string): boolean {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return false;
    
    const initialLength = tripPlan.items.length;
    tripPlan.items = tripPlan.items.filter(item => item.id !== itemId);
    
    if (tripPlan.items.length < initialLength) {
      tripPlan.updated = new Date();
      return true;
    }
    
    return false;
  }
  
  // 여행 일정 항목 재정렬
  reorderTripItems(tripId: string, newOrder: string[]): boolean {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return false;
    
    // 모든 ID가 유효한지 확인
    const validIds = new Set(tripPlan.items.map(item => item.id));
    const allIdsValid = newOrder.every(id => validIds.has(id));
    
    if (!allIdsValid || newOrder.length !== tripPlan.items.length) {
      return false;
    }
    
    // 새로운 순서대로 항목 재정렬
    const itemsMap = new Map(tripPlan.items.map(item => [item.id, item]));
    tripPlan.items = newOrder.map(id => itemsMap.get(id)!);
    tripPlan.updated = new Date();
    
    return true;
  }
  
  // 여행 일정 최적화
  async optimizeTripPlan(
    tripId: string,
    optimizationType: OptimizationType = OptimizationType.FASTEST
  ): Promise<TripPlan | null> {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan || tripPlan.items.length < 3) return null; // 최소 출발지, 경유지, 목적지 필요
    
    // 방문 장소 추출
    const places = tripPlan.items.map(item => item.place.location);
    if (!places.every(location => location)) return null; // 모든 장소에 위치 정보가 있어야 함
    
    // 출발지와 목적지 설정 (첫 번째와 마지막 항목)
    const origin = places[0];
    const destination = places[places.length - 1];
    const waypoints = places.slice(1, -1);
    
    try {
      // 다중 경로 서비스를 사용하여 최적화
      const routeResult = await multiRouteService.planMultiRoute(
        origin as GeoPoint,
        waypoints as GeoPoint[],
        destination as GeoPoint,
        optimizationType,
        RoutePriority.BALANCED
      );
      
      // 최적화된 순서를 일정에 적용
      const optimizedItems: TripItem[] = [];
      
      // 첫 번째 항목은 항상 출발지
      optimizedItems.push(tripPlan.items[0]);
      
      // 중간 경유지들은 최적화된 순서대로 정렬
      // 첫 번째와 마지막 웨이포인트는 출발지와 목적지이므로 제외
      const waypointIndices = routeResult.waypoints
        .slice(1, -1)
        .map(wp => {
          // 경유지 위치와 일치하는 원래 항목 찾기
          return tripPlan.items.findIndex(item =>
            item.place.location &&
            item.place.location.latitude === wp.position.latitude &&
            item.place.location.longitude === wp.position.longitude
          );
        })
        .filter(idx => idx > 0); // 출발지 제외
      
      // 최적화된 순서대로 항목 추가
      for (const idx of waypointIndices) {
        optimizedItems.push(tripPlan.items[idx]);
      }
      
      // 마지막 항목은 항상 목적지
      optimizedItems.push(tripPlan.items[tripPlan.items.length - 1]);
      
      // 업데이트된 일정 저장
      const updatedPlan = this.updateTripPlan(tripId, {
        items: optimizedItems,
        estimatedTotalDistance: routeResult.totalDistance,
        estimatedTotalTime: routeResult.totalEstimatedTime / 60 // 분 단위로 변환
      });
      
      return updatedPlan;
    } catch (error) {
      console.error('여행 일정 최적화 중 오류:', error);
      return null;
    }
  }
  
  // 여행 일정에 대한 시간 추정치 계산 및 업데이트
  async calculateTripTimesAndDistances(tripId: string): Promise<TripPlan | null> {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return null;
    
    const items = tripPlan.items;
    if (items.length < 2) return tripPlan; // 최소 출발지와 목적지 필요
    
    try {
      let totalDistance = 0;
      let totalTravelTime = 0; // 이동 시간 (분)
      let totalStayTime = 0; // 체류 시간 (분)
      
      // 각 연속된 장소 사이의 거리와 시간 계산
      for (let i = 0; i < items.length - 1; i++) {
        const currentItem = items[i];
        const nextItem = items[i + 1];
        
        // 두 장소 사이 거리 계산
        const distance = calculateDistance(
          currentItem.place.location as GeoPoint,
          nextItem.place.location as GeoPoint
        );
        totalDistance += distance;
        
        // 평균 속도로 시간 추정 (교통 상황 반영)
        // 실제로는 navigationService를 통해 실제 경로 계산 필요
        const averageSpeed = 40; // km/h
        const estimatedTime = (distance / 1000) / (averageSpeed / 60); // 분 단위
        totalTravelTime += estimatedTime;
        
        // 체류 시간 계산
        if (currentItem.duration) {
          totalStayTime += currentItem.duration;
        } else {
          // 기본 체류 시간 추정 (항목 유형에 따라)
          switch (currentItem.type) {
            case TripItemType.ATTRACTION:
              totalStayTime += 90; // 1시간 30분
              break;
            case TripItemType.RESTAURANT:
              totalStayTime += 60; // 1시간
              break;
            case TripItemType.SHOPPING:
              totalStayTime += 60; // 1시간
              break;
            case TripItemType.REST:
              totalStayTime += 30; // 30분
              break;
            case TripItemType.ACCOMMODATION:
              totalStayTime += 720; // 12시간 (숙박)
              break;
            default:
              totalStayTime += 30; // 기본 30분
          }
        }
      }
      
      // 마지막 목적지 체류 시간 추가
      const lastItem = items[items.length - 1];
      if (lastItem.duration) {
        totalStayTime += lastItem.duration;
      }
      
      // 총 소요 시간 = 이동 시간 + 체류 시간
      const totalTime = totalTravelTime + totalStayTime;
      
      // 업데이트된 일정 저장
      return this.updateTripPlan(tripId, {
        estimatedTotalDistance: totalDistance,
        estimatedTotalTime: totalTime
      });
    } catch (error) {
      console.error('여행 일정 시간 계산 중 오류:', error);
      return tripPlan; // 오류 발생 시 원래 계획 반환
    }
  }
  
  // 실시간 교통 상황을 반영하여 여행 일정 업데이트
  async updateTripWithTrafficInfo(tripId: string): Promise<TripPlan | null> {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return null;
    
    try {
      // 교통 정보 업데이트
      await trafficService.updateTrafficData();
      
      // 여행 일정 다시 계산
      return this.calculateTripTimesAndDistances(tripId);
    } catch (error) {
      console.error('교통 정보 업데이트 중 오류:', error);
      return tripPlan;
    }
  }
  
  // 여행 일정을 기반으로 일별 일정 생성
  generateDailyItinerary(tripId: string): { date: Date; items: TripItem[] }[] | null {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return null;
    
    // 여행 일수 계산
    const startDate = new Date(tripPlan.startDate);
    const endDate = new Date(tripPlan.endDate);
    const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (durationInDays <= 0) return null;
    
    // 각 항목마다 예상 소요 시간 (이동 + 체류) 계산
    const itemsWithTimeEstimate = tripPlan.items.map((item, index, array) => {
      let travelTimeToNext = 0;
      
      // 마지막 항목이 아니면 다음 장소까지의 이동 시간 추정
      if (index < array.length - 1) {
        const nextItem = array[index + 1];
        const distance = calculateDistance(
          item.place.location as GeoPoint,
          nextItem.place.location as GeoPoint
        );
        
        // 평균 속도를 사용한 이동 시간 추정 (분 단위)
        const averageSpeed = 40; // km/h
        travelTimeToNext = (distance / 1000) / (averageSpeed / 60);
      }
      
      // 체류 시간 (지정되었거나 항목 유형에 따른 기본값)
      let stayTime = item.duration || 0;
      
      if (!stayTime) {
        switch (item.type) {
          case TripItemType.ATTRACTION:
            stayTime = 90; // 1시간 30분
            break;
          case TripItemType.RESTAURANT:
            stayTime = 60; // 1시간
            break;
          case TripItemType.SHOPPING:
            stayTime = 60; // 1시간
            break;
          case TripItemType.REST:
            stayTime = 30; // 30분
            break;
          case TripItemType.ACCOMMODATION:
            stayTime = 720; // 12시간 (숙박)
            break;
          default:
            stayTime = 30; // 기본 30분
        }
      }
      
      return {
        ...item,
        estimatedStayTime: stayTime,
        estimatedTravelTimeToNext: travelTimeToNext,
        totalTime: stayTime + travelTimeToNext
      };
    });
    
    // 총 소요 시간 계산
    const totalMinutes = itemsWithTimeEstimate.reduce((sum, item) => sum + item.totalTime, 0);
    
    // 일별로 균등하게 배분
    const minutesPerDay = Math.ceil(totalMinutes / durationInDays);
    
    // 일별 일정 생성
    const dailyItinerary: { date: Date; items: TripItem[] }[] = [];
    let currentDayItems: TripItem[] = [];
    let currentDayMinutes = 0;
    let currentDate = new Date(startDate);
    
    // 각 항목을 일별 일정에 배정
    itemsWithTimeEstimate.forEach(item => {
      // 하루 배정량을 초과하면 다음 날로
      if (currentDayMinutes + item.totalTime > minutesPerDay && currentDayItems.length > 0) {
        dailyItinerary.push({
          date: new Date(currentDate),
          items: [...currentDayItems]
        });
        
        // 다음 날로 이동
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
        currentDayItems = [];
        currentDayMinutes = 0;
      }
      
      // 현재 날짜에 항목 추가
      currentDayItems.push(item);
      currentDayMinutes += item.totalTime;
    });
    
    // 마지막 날 처리
    if (currentDayItems.length > 0) {
      dailyItinerary.push({
        date: new Date(currentDate),
        items: [...currentDayItems]
      });
    }
    
    return dailyItinerary;
  }
  
  // 여행 일정 항목에 시작/종료 시간 자동 할당
  assignTimesToItinerary(tripId: string): boolean {
    const tripPlan = this.getTripPlanById(tripId);
    if (!tripPlan) return false;
    
    // 일별 일정 생성
    const dailyItinerary = this.generateDailyItinerary(tripId);
    if (!dailyItinerary) return false;
    
    // 모든 항목에 시작/종료 시간 지정
    let allItems: TripItem[] = [];
    
    dailyItinerary.forEach(day => {
      // 해당 일의 시작 시간 (오전 9시부터 시작)
      let currentTime = new Date(day.date);
      currentTime.setHours(9, 0, 0, 0);
      
      day.items.forEach(item => {
        // 시작 시간 설정
        const startTime = new Date(currentTime);
        
        // 체류 시간 계산 (분 단위)
        let stayTime = item.duration || 0;
        if (!stayTime) {
          switch (item.type) {
            case TripItemType.ATTRACTION:
              stayTime = 90; // 1시간 30분
              break;
            case TripItemType.RESTAURANT:
              stayTime = 60; // 1시간
              break;
            case TripItemType.SHOPPING:
              stayTime = 60; // 1시간
              break;
            case TripItemType.REST:
              stayTime = 30; // 30분
              break;
            case TripItemType.ACCOMMODATION:
              stayTime = 720; // 12시간 (숙박)
              break;
            default:
              stayTime = 30; // 기본 30분
          }
        }
        
        // 종료 시간 계산
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + stayTime);
        
        // 시간이 할당된 항목 생성
        const itemWithTimes: TripItem = {
          ...item,
          startTime,
          endTime,
          duration: stayTime
        };
        
        allItems.push(itemWithTimes);
        
        // 다음 항목 시작 시간 계산 (이동 시간 포함)
        currentTime = new Date(endTime);
        
        // 이동 시간 추가 (항목에 저장된 추정치 사용)
        const travelTime = (item as any).estimatedTravelTimeToNext || 0;
        currentTime.setMinutes(currentTime.getMinutes() + travelTime);
      });
    });
    
    // 일정 업데이트
    const updated = this.updateTripPlan(tripId, { items: allItems });
    return !!updated;
  }
  
  // 여행 일정에서 특정 유형의 장소 추천 (예: 경로 상의 식당)
  recommendPlacesForTrip(
    tripId: string,
    placeType: TripItemType,
    maxResults: number = 5
  ): PlaceInfo[] {
    // 실제 구현에서는 Place API나 데이터베이스를 활용해야 함
    // 여기서는 더미 데이터로 대체
    
    return [
      {
        id: 'place1',
        name: '추천 장소 1',
        category: placeType,
        location: { latitude: 37.5665, longitude: 126.9780 },
        address: '서울시 중구',
        rating: 4.5,
        priceLevel: 2,
        photos: ['photo1.jpg'],
        description: '추천 장소 설명'
      },
      {
        id: 'place2',
        name: '추천 장소 2',
        category: placeType,
        location: { latitude: 37.5662, longitude: 126.9784 },
        address: '서울시 중구',
        rating: 4.2,
        priceLevel: 3,
        photos: ['photo2.jpg'],
        description: '추천 장소 설명'
      }
    ].slice(0, maxResults);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const tripPlannerService = new TripPlannerService();
export default tripPlannerService;