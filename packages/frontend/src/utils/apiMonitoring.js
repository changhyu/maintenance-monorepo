/**
 * API 모니터링 및 로깅 시스템
 * 
 * 이 모듈은 API 호출을 모니터링하고 로깅하는 기능을 제공합니다.
 * 개발 환경에서는 상세한 로깅을, 프로덕션 환경에서는 최적화된 로깅을 수행합니다.
 */

import { nanoid } from 'nanoid';

// API 호출 기록을 저장하는 메모리 저장소
const apiCallLog = [];

// 저장할 최대 로그 항목 수
const MAX_LOG_ITEMS = 500;

// 성능 지표
const performanceMetrics = {
  totalCalls: 0,
  successCalls: 0,
  errorCalls: 0,
  apiLatencies: {},
  avgLatency: 0,
  totalLatency: 0
};

/**
 * API 요청 로깅 및 모니터링 미들웨어
 * axios 인터셉터로 사용됩니다.
 */
export const setupApiMonitoring = (apiClient) => {
  // 요청 인터셉터
  apiClient.instance.interceptors.request.use(
    (config) => {
      // 요청 ID 생성 및 시작 시간 기록
      const requestId = nanoid(8);
      config.metadata = { 
        requestId,
        startTime: performance.now(),
        endpoint: `${config.method?.toUpperCase() || 'GET'} ${config.url}`
      };
      
      // 개발 환경에서만 상세 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 API 요청 [${requestId}]: ${config.method?.toUpperCase() || 'GET'} ${config.url}`, {
          params: config.params,
          data: config.data,
          headers: sanitizeHeaders(config.headers)
        });
      }
      
      return config;
    },
    (error) => {
      console.error('❌ API 요청 오류:', error);
      return Promise.reject(error);
    }
  );
  
  // 응답 인터셉터
  apiClient.instance.interceptors.response.use(
    (response) => {
      // 응답에 대한 지표 계산 및 로깅
      const { config } = response;
      const metadata = config.metadata || {};
      const { requestId, startTime, endpoint } = metadata;
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 성능 지표 업데이트
      performanceMetrics.totalCalls++;
      performanceMetrics.successCalls++;
      performanceMetrics.totalLatency += duration;
      performanceMetrics.avgLatency = performanceMetrics.totalLatency / performanceMetrics.totalCalls;
      
      // 엔드포인트별 지연 시간 추적
      if (!performanceMetrics.apiLatencies[endpoint]) {
        performanceMetrics.apiLatencies[endpoint] = {
          count: 0,
          totalLatency: 0,
          avgLatency: 0
        };
      }
      
      performanceMetrics.apiLatencies[endpoint].count++;
      performanceMetrics.apiLatencies[endpoint].totalLatency += duration;
      performanceMetrics.apiLatencies[endpoint].avgLatency = 
        performanceMetrics.apiLatencies[endpoint].totalLatency / 
        performanceMetrics.apiLatencies[endpoint].count;
      
      // 로그 항목 생성
      const logItem = {
        id: requestId,
        timestamp: new Date().toISOString(),
        endpoint,
        method: config.method?.toUpperCase() || 'GET',
        url: config.url,
        status: response.status,
        duration,
        success: true
      };
      
      // 로그 저장
      addToApiLog(logItem);
      
      // 개발 환경에서만 상세 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API 응답 [${requestId}]: ${response.status} ${endpoint} (${duration.toFixed(2)}ms)`, {
          data: response.data,
          headers: sanitizeHeaders(response.headers)
        });
      }
      
      return response;
    },
    (error) => {
      // 오류 응답에 대한 지표 계산 및 로깅
      const { config, response } = error;
      
      if (config) {
        const metadata = config.metadata || {};
        const { requestId, startTime, endpoint } = metadata;
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // 성능 지표 업데이트
        performanceMetrics.totalCalls++;
        performanceMetrics.errorCalls++;
        
        // 로그 항목 생성
        const logItem = {
          id: requestId,
          timestamp: new Date().toISOString(),
          endpoint,
          method: config.method?.toUpperCase() || 'GET',
          url: config.url,
          status: response?.status || 0,
          duration,
          success: false,
          error: {
            message: error.message,
            code: response?.status,
            data: response?.data
          }
        };
        
        // 로그 저장
        addToApiLog(logItem);
        
        // 오류 로깅
        console.error(`❌ API 오류 [${requestId}]: ${response?.status || 'NETWORK_ERROR'} ${endpoint} (${duration.toFixed(2)}ms)`, {
          error: error.message,
          response: response?.data,
          request: {
            method: config.method?.toUpperCase() || 'GET',
            url: config.url,
            params: config.params,
            data: config.data
          }
        });
      } else {
        console.error('❌ API 오류 (구성 없음):', error);
      }
      
      return Promise.reject(error);
    }
  );
  
  return apiClient;
};

/**
 * API 로그 항목 추가 및 최대 크기 관리
 */
const addToApiLog = (logItem) => {
  apiCallLog.unshift(logItem); // 최신 항목을 앞에 추가
  
  // 최대 개수 유지
  if (apiCallLog.length > MAX_LOG_ITEMS) {
    apiCallLog.pop(); // 가장 오래된 항목 제거
  }
};

/**
 * 헤더에서 민감한 정보 제거
 */
const sanitizeHeaders = (headers) => {
  if (!headers) return {};
  
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * API 호출 로그 조회
 * @param {number} limit - 반환할 최대 항목 수
 * @param {Function} filter - 필터링 함수
 * @returns {Array} API 호출 로그
 */
export const getApiCallLogs = (limit = 50, filter = null) => {
  let logs = [...apiCallLog];
  
  if (filter && typeof filter === 'function') {
    logs = logs.filter(filter);
  }
  
  return logs.slice(0, limit);
};

/**
 * API 성능 지표 조회
 * @returns {Object} 성능 지표
 */
export const getApiPerformanceMetrics = () => {
  return {
    ...performanceMetrics,
    successRate: performanceMetrics.totalCalls > 0 
      ? (performanceMetrics.successCalls / performanceMetrics.totalCalls) * 100 
      : 0,
    errorRate: performanceMetrics.totalCalls > 0 
      ? (performanceMetrics.errorCalls / performanceMetrics.totalCalls) * 100 
      : 0,
    timestamp: new Date().toISOString()
  };
};

/**
 * API 오류율 조회
 * @param {number} minutes - 최근 몇 분 동안의 오류율 계산
 * @returns {number} 오류율 (백분율)
 */
export const getApiErrorRate = (minutes = 5) => {
  const now = new Date();
  const timeThreshold = new Date(now.getTime() - (minutes * 60 * 1000));
  
  const recentLogs = apiCallLog.filter(log => new Date(log.timestamp) >= timeThreshold);
  
  if (recentLogs.length === 0) return 0;
  
  const errorCount = recentLogs.filter(log => !log.success).length;
  return (errorCount / recentLogs.length) * 100;
};

/**
 * API 성능 및 오류 대시보드 데이터 조회
 */
export const getApiDashboardData = () => {
  const now = new Date();
  
  // 최근 1시간 데이터
  const lastHour = new Date(now.getTime() - (60 * 60 * 1000));
  const lastHourLogs = apiCallLog.filter(log => new Date(log.timestamp) >= lastHour);
  
  // 엔드포인트별 성공/실패 횟수
  const endpointStats = {};
  lastHourLogs.forEach(log => {
    if (!endpointStats[log.endpoint]) {
      endpointStats[log.endpoint] = { success: 0, error: 0, totalLatency: 0 };
    }
    
    if (log.success) {
      endpointStats[log.endpoint].success++;
    } else {
      endpointStats[log.endpoint].error++;
    }
    
    endpointStats[log.endpoint].totalLatency += log.duration;
  });
  
  // 평균 지연 시간 계산
  Object.keys(endpointStats).forEach(endpoint => {
    const total = endpointStats[endpoint].success + endpointStats[endpoint].error;
    endpointStats[endpoint].avgLatency = total > 0 
      ? endpointStats[endpoint].totalLatency / total 
      : 0;
  });
  
  // 시간별 호출 횟수
  const hourlyStats = {};
  for (let i = 0; i < 24; i++) {
    const hour = now.getHours() - i;
    const hourKey = hour >= 0 ? hour : hour + 24;
    hourlyStats[hourKey] = { success: 0, error: 0 };
  }
  
  lastHourLogs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    if (log.success) {
      hourlyStats[hour].success++;
    } else {
      hourlyStats[hour].error++;
    }
  });
  
  return {
    summary: {
      totalCalls: lastHourLogs.length,
      successCalls: lastHourLogs.filter(log => log.success).length,
      errorCalls: lastHourLogs.filter(log => !log.success).length,
      avgLatency: lastHourLogs.length > 0 
        ? lastHourLogs.reduce((sum, log) => sum + log.duration, 0) / lastHourLogs.length 
        : 0
    },
    endpointStats,
    hourlyStats
  };
};

export default {
  setupApiMonitoring,
  getApiCallLogs,
  getApiPerformanceMetrics,
  getApiErrorRate,
  getApiDashboardData
};