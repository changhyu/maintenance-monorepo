// 교통안전정보 서비스 통합 테스트

import { safetyDataService } from '../services/traffic/SafetyDataService';
import { safetyTrafficIntegration } from '../services/traffic/SafetyTrafficIntegration';
import { safetyAwareRouteService } from '../services/navigation/SafetyAwareRouteService';
import SafetyDataLoader from '../utils/safetyDataLoader';
import { GeoPoint, RoadSegment } from '../types';

/**
 * 교통안전정보 서비스 테스트 실행 메서드
 */
async function runSafetyServiceTest() {
  console.log('교통안전정보 서비스 테스트 시작...');
  
  try {
    // 1. SafetyDataService 초기화 및 더미 데이터 로드 테스트
    console.log('\n1. SafetyDataService 초기화 및 더미 데이터 로드 테스트');
    const loadResult = await safetyDataService.loadFromExcel('dummy');
    console.log(`- 데이터 로드 결과: ${loadResult ? '성공' : '실패'}`);
    console.log(`- 로드된 데이터 개수: ${safetyDataService.getAllSafetyData().length}`);
    
    // 2. 위치 주변 안전 이벤트 찾기 테스트
    console.log('\n2. 위치 주변 안전 이벤트 찾기 테스트');
    const testLocation: GeoPoint = { latitude: 37.5665, longitude: 126.9780 }; // 서울 시청 좌표
    const nearbyEvents = safetyDataService.findSafetyEventsNear(testLocation, 1000);
    console.log(`- 주변 ${nearbyEvents.length}개의 안전 이벤트 발견`);
    if (nearbyEvents.length > 0) {
      console.log(`- 첫 번째 이벤트: ${JSON.stringify(nearbyEvents[0].safetyData.DATA_DESC)}`);
    }
    
    // 3. SafetyTrafficIntegration 초기화 테스트
    console.log('\n3. SafetyTrafficIntegration 초기화 테스트');
    const integrationResult = await safetyTrafficIntegration.initialize();
    console.log(`- 통합 서비스 초기화 결과: ${integrationResult ? '성공' : '실패'}`);
    
    // 4. 안전 점수 계산 테스트
    console.log('\n4. 안전 점수 계산 테스트');
    const testRoute: GeoPoint[] = [
      { latitude: 37.5665, longitude: 126.9780 }, // 서울 시청
      { latitude: 37.5668, longitude: 126.9830 }, // 중간 지점
      { latitude: 37.5700, longitude: 126.9860 }  // 종료 지점
    ];
    const safetyScore = safetyTrafficIntegration.calculateRouteSafetyScore(testRoute);
    console.log(`- 경로 안전 점수: ${safetyScore.score}`);
    console.log(`- 안전 요소: ${JSON.stringify(safetyScore.factors)}`);
    
    // 5. SafetyAwareRouteService 초기화 테스트
    console.log('\n5. SafetyAwareRouteService 초기화 테스트');
    const routeServiceResult = await safetyAwareRouteService.initialize();
    console.log(`- 안전 경로 서비스 초기화 결과: ${routeServiceResult ? '성공' : '실패'}`);
    
    // 6. 안전 경로 찾기 테스트
    console.log('\n6. 안전 경로 찾기 테스트');
    const startPoint: GeoPoint = { latitude: 37.5665, longitude: 126.9780 }; // 서울 시청
    const endPoint: GeoPoint = { latitude: 37.5700, longitude: 126.9860 };   // 종료 지점
    const routeResult = await safetyAwareRouteService.findSafeAlternativeRoute(startPoint, endPoint);
    console.log(`- 경로 계산 결과: ${routeResult ? '성공' : '실패'}`);
    
    // 7. 데이터 GeoJSON 변환 테스트
    console.log('\n7. 데이터 GeoJSON 변환 테스트');
    const allData = safetyDataService.getAllSafetyData();
    const geoJson = SafetyDataLoader.convertToGeoJSON(allData.slice(0, 3)); // 처음 3개만
    console.log(`- GeoJSON 변환 결과: ${geoJson.features.length}개 피처 생성`);
    
    console.log('\n모든 테스트 완료!');
    return true;
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
    return false;
  }
}

// 테스트 실행
runSafetyServiceTest()
  .then(result => {
    console.log(`\n테스트 최종 결과: ${result ? '성공' : '실패'}`);
  });

export default runSafetyServiceTest;