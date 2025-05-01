/**
 * API Mock 서비스 설정
 * 
 * 이 모듈은 MSW(Mock Service Worker)를 사용하여 개발 환경에서 API 요청을 가로채고
 * 모의 응답을 제공하는 시스템을 설정합니다.
 */

import { setupWorker, rest } from 'msw';
import { userHandlers } from './handlers/userHandlers';
import { maintenanceHandlers } from './handlers/maintenanceHandlers';
import { vehicleHandlers } from './handlers/vehicleHandlers';
import { githubHandlers } from './handlers/githubHandlers';

// 모든 API 핸들러 결합
const handlers = [
  ...userHandlers,
  ...maintenanceHandlers,
  ...vehicleHandlers,
  ...githubHandlers,
];

// MSW 인스턴스 생성
export const worker = setupWorker(...handlers);

// 모의 API 응답 지연 시간 설정 (밀리초)
const ARTIFICIAL_DELAY = {
  DEFAULT: 300,
  SLOW: 1500,
  ERROR: 200
};

/**
 * 모의 API 서비스 초기화
 * @param {Object} options - 초기화 옵션
 * @param {boolean} options.withDelay - 모의 응답 지연 사용 여부
 * @param {boolean} options.withNetworkError - 네트워크 오류 시뮬레이션 여부
 */
export const initializeMockService = async (options = {}) => {
  const { 
    withDelay = true, 
    withNetworkError = false 
  } = options;

  if (withDelay) {
    worker.use(
      rest.all('*', async (req, res, ctx) => {
        // URL 쿼리 매개변수에서 지연 시간 설정 (예: ?delay=slow)
        const delayParam = req.url.searchParams.get('delay');
        
        let delayTime = ARTIFICIAL_DELAY.DEFAULT;
        
        if (delayParam === 'slow') {
          delayTime = ARTIFICIAL_DELAY.SLOW;
        } else if (delayParam === 'error') {
          delayTime = ARTIFICIAL_DELAY.ERROR;
        } else if (delayParam && !isNaN(parseInt(delayParam))) {
          delayTime = parseInt(delayParam);
        }
        
        // 실제 요청 처리 전 지연 적용
        return res(ctx.delay(delayTime));
      })
    );
  }

  if (withNetworkError) {
    worker.use(
      rest.all('*', async (req, res, ctx) => {
        // URL에 error 쿼리 매개변수가 있으면 네트워크 오류 시뮬레이션
        if (req.url.searchParams.has('networkError')) {
          return res.networkError('Failed to connect');
        }
        
        // 특정 오류 코드를 시뮬레이션
        const statusCode = req.url.searchParams.get('errorCode');
        if (statusCode && !isNaN(parseInt(statusCode))) {
          return res(ctx.status(parseInt(statusCode)));
        }
      })
    );
  }

  // 스토리지 데이터 초기화
  initializeStorageData();

  // 워커 시작
  try {
    await worker.start({
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 실제 서버로 전달
    });
    
    console.log('[MSW] Mock API 서비스가 성공적으로 초기화되었습니다.');
  } catch (error) {
    console.error('[MSW] Mock API 서비스 초기화 실패:', error);
  }
};

/**
 * Mock API 서비스 중지
 */
export const stopMockService = () => {
  worker.stop();
  console.log('[MSW] Mock API 서비스가 중지되었습니다.');
};

/**
 * 로컬 스토리지에 초기 모의 데이터 설정
 */
function initializeStorageData() {
  // 초기 사용자 데이터
  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify([
      { id: 1, username: 'admin', name: '관리자', email: 'admin@example.com', role: 'admin' },
      { id: 2, username: 'user1', name: '홍길동', email: 'user1@example.com', role: 'user' },
      { id: 3, username: 'user2', name: '김철수', email: 'user2@example.com', role: 'user' },
    ]));
  }

  // 초기 차량 데이터
  if (!localStorage.getItem('mock_vehicles')) {
    localStorage.setItem('mock_vehicles', JSON.stringify([
      { id: 1, model: '그랜저', year: 2021, vin: 'ABC123456789', status: 'active' },
      { id: 2, model: '아반떼', year: 2020, vin: 'DEF123456789', status: 'maintenance' },
      { id: 3, model: '소나타', year: 2022, vin: 'GHI123456789', status: 'inactive' },
    ]));
  }

  // 초기 정비 기록 데이터
  if (!localStorage.getItem('mock_maintenance_records')) {
    localStorage.setItem('mock_maintenance_records', JSON.stringify([
      { id: 1, vehicleId: 1, date: '2025-01-15', description: '정기 점검', cost: 50000, status: 'completed' },
      { id: 2, vehicleId: 2, date: '2025-04-20', description: '엔진 오일 교체', cost: 30000, status: 'in_progress' },
      { id: 3, vehicleId: 1, date: '2025-02-10', description: '타이어 교체', cost: 400000, status: 'completed' },
    ]));
  }
}

/**
 * 모의 데이터 리셋
 */
export const resetMockData = () => {
  localStorage.removeItem('mock_users');
  localStorage.removeItem('mock_vehicles');
  localStorage.removeItem('mock_maintenance_records');
  
  initializeStorageData();
  console.log('[MSW] 모의 데이터가 초기화되었습니다.');
};

/**
 * API 모의 지연 시간 설정 
 * @param {number} time - 지연 시간(밀리초)
 */
export const setMockDelay = (time) => {
  if (typeof time === 'number' && time >= 0) {
    ARTIFICIAL_DELAY.DEFAULT = time;
    console.log(`[MSW] 모의 API 지연 시간이 ${time}ms로 설정되었습니다.`);
  }
};

export default { 
  initializeMockService, 
  stopMockService, 
  resetMockData, 
  setMockDelay 
};