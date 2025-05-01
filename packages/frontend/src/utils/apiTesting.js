/**
 * API 테스트 유틸리티
 * 
 * 이 모듈은 API 엔드포인트 및 통합 테스트를 위한 유틸리티 함수를 제공합니다.
 * 자동화된 테스트를 통해 API 응답 검증과 오류 시나리오 테스트를 지원합니다.
 */

import { queryClient } from '../providers/ReactQueryProvider';
import apiClient from '../services/api/api-client';
import { resetMockData } from '../mocks/browser';

/**
 * API 테스트 팩토리 클래스
 * API 엔드포인트 테스트를 위한 인터페이스 제공
 */
export class ApiTestFactory {
  constructor() {
    this.apiClient = apiClient;
    this.queryClient = queryClient;
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * 테스트를 실행하기 전 환경 초기화
   */
  setup() {
    // React Query 캐시 초기화
    this.queryClient.clear();
    
    // 모의 데이터 초기화
    resetMockData();
    
    // 테스트 결과 초기화
    this.testResults = [];
    
    return this;
  }

  /**
   * 테스트 시작
   * @param {string} name - 테스트 이름
   * @returns {ApiTestFactory} 체이닝을 위해 자신을 반환
   */
  test(name) {
    this.currentTest = {
      name,
      steps: [],
      startTime: performance.now(),
      endTime: null,
      duration: null,
      status: 'pending',
      error: null
    };
    
    this.testResults.push(this.currentTest);
    
    return this;
  }

  /**
   * 테스트 완료
   * @param {string} status - 테스트 상태 ('passed' 또는 'failed')
   * @param {Error} error - 테스트 실패 시 오류 객체
   * @returns {ApiTestFactory} 체이닝을 위해 자신을 반환
   */
  complete(status = 'passed', error = null) {
    if (this.currentTest) {
      this.currentTest.endTime = performance.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      this.currentTest.status = status;
      this.currentTest.error = error;
    }
    
    return this;
  }

  /**
   * API GET 요청 테스트
   * @param {string} url - API 엔드포인트 URL
   * @param {object} params - 요청 파라미터
   * @param {Function} validate - 응답 유효성 검사 함수
   * @returns {Promise<ApiTestFactory>} 체이닝을 위해 자신을 반환하는 Promise
   */
  async testGet(url, params = {}, validate = null) {
    try {
      this.addStep(`GET ${url}`, { params });
      
      const response = await this.apiClient.get(url, { params });
      
      this.addStep('Response', { 
        status: response.status,
        data: response.data
      });
      
      if (validate && typeof validate === 'function') {
        const validationResult = validate(response);
        
        if (validationResult !== true) {
          throw new Error(validationResult || 'Validation failed');
        }
        
        this.addStep('Validation', { result: 'passed' });
      }
      
      return this.complete('passed');
    } catch (error) {
      this.addStep('Error', { 
        message: error.message,
        response: error.response?.data
      });
      
      return this.complete('failed', error);
    }
  }

  /**
   * API POST 요청 테스트
   * @param {string} url - API 엔드포인트 URL
   * @param {object} data - 요청 데이터
   * @param {Function} validate - 응답 유효성 검사 함수
   * @returns {Promise<ApiTestFactory>} 체이닝을 위해 자신을 반환하는 Promise
   */
  async testPost(url, data = {}, validate = null) {
    try {
      this.addStep(`POST ${url}`, { data });
      
      const response = await this.apiClient.post(url, data);
      
      this.addStep('Response', { 
        status: response.status,
        data: response.data
      });
      
      if (validate && typeof validate === 'function') {
        const validationResult = validate(response);
        
        if (validationResult !== true) {
          throw new Error(validationResult || 'Validation failed');
        }
        
        this.addStep('Validation', { result: 'passed' });
      }
      
      return this.complete('passed');
    } catch (error) {
      this.addStep('Error', { 
        message: error.message,
        response: error.response?.data
      });
      
      return this.complete('failed', error);
    }
  }

  /**
   * API PUT 요청 테스트
   * @param {string} url - API 엔드포인트 URL
   * @param {object} data - 요청 데이터
   * @param {Function} validate - 응답 유효성 검사 함수
   * @returns {Promise<ApiTestFactory>} 체이닝을 위해 자신을 반환하는 Promise
   */
  async testPut(url, data = {}, validate = null) {
    try {
      this.addStep(`PUT ${url}`, { data });
      
      const response = await this.apiClient.put(url, data);
      
      this.addStep('Response', { 
        status: response.status,
        data: response.data
      });
      
      if (validate && typeof validate === 'function') {
        const validationResult = validate(response);
        
        if (validationResult !== true) {
          throw new Error(validationResult || 'Validation failed');
        }
        
        this.addStep('Validation', { result: 'passed' });
      }
      
      return this.complete('passed');
    } catch (error) {
      this.addStep('Error', { 
        message: error.message,
        response: error.response?.data
      });
      
      return this.complete('failed', error);
    }
  }

  /**
   * API DELETE 요청 테스트
   * @param {string} url - API 엔드포인트 URL
   * @param {Function} validate - 응답 유효성 검사 함수
   * @returns {Promise<ApiTestFactory>} 체이닝을 위해 자신을 반환하는 Promise
   */
  async testDelete(url, validate = null) {
    try {
      this.addStep(`DELETE ${url}`);
      
      const response = await this.apiClient.delete(url);
      
      this.addStep('Response', { 
        status: response.status,
        data: response.data
      });
      
      if (validate && typeof validate === 'function') {
        const validationResult = validate(response);
        
        if (validationResult !== true) {
          throw new Error(validationResult || 'Validation failed');
        }
        
        this.addStep('Validation', { result: 'passed' });
      }
      
      return this.complete('passed');
    } catch (error) {
      this.addStep('Error', { 
        message: error.message,
        response: error.response?.data
      });
      
      return this.complete('failed', error);
    }
  }

  /**
   * 테스트 단계 추가
   * @param {string} name - 단계 이름
   * @param {object} data - 단계 데이터
   */
  addStep(name, data = null) {
    if (this.currentTest) {
      this.currentTest.steps.push({
        name,
        data,
        timestamp: new Date().toISOString()
      });
    }
    
    return this;
  }

  /**
   * 모든 테스트 결과 가져오기
   * @returns {Array} 테스트 결과 배열
   */
  getResults() {
    return {
      success: this.testResults.every(test => test.status === 'passed'),
      total: this.testResults.length,
      passed: this.testResults.filter(test => test.status === 'passed').length,
      failed: this.testResults.filter(test => test.status === 'failed').length,
      tests: this.testResults
    };
  }

  /**
   * 특정 API 엔드포인트에 대한 테스트 스위트 실행
   * @param {object} options - 테스트 옵션
   * @returns {Promise<object>} 테스트 결과
   */
  async runTestSuite(options = {}) {
    const { baseUrl = '/api/v1', endpoints = [] } = options;
    
    this.setup();
    
    for (const endpoint of endpoints) {
      const { method, path, name, data, params, validate } = endpoint;
      const url = `${baseUrl}${path}`;
      
      await this.test(name || `${method} ${path}`);
      
      switch (method.toLowerCase()) {
        case 'get':
          await this.testGet(url, params, validate);
          break;
        case 'post':
          await this.testPost(url, data, validate);
          break;
        case 'put':
          await this.testPut(url, data, validate);
          break;
        case 'delete':
          await this.testDelete(url, validate);
          break;
        default:
          this.addStep(`Unsupported method: ${method}`);
          this.complete('failed', new Error(`Unsupported method: ${method}`));
      }
    }
    
    return this.getResults();
  }
}

// API 테스트 팩토리 인스턴스 생성
export const apiTestFactory = new ApiTestFactory();

/**
 * 공통 검증 함수
 */
export const validators = {
  // 성공 응답 검증
  isSuccess: (response) => {
    return response.status >= 200 && response.status < 300 
      ? true 
      : `Expected success status but got ${response.status}`;
  },
  
  // 배열 응답 검증
  isArray: (response) => {
    return Array.isArray(response.data) 
      ? true 
      : 'Expected array response';
  },
  
  // 페이지네이션 응답 검증
  isPaginated: (response) => {
    return response.data && 
           response.data.items && 
           Array.isArray(response.data.items) &&
           typeof response.data.total === 'number' &&
           typeof response.data.page === 'number' 
      ? true 
      : 'Expected paginated response format';
  },
  
  // 특정 필드 포함 검증
  hasFields: (fields) => (response) => {
    if (!response.data) return 'Response has no data';
    
    const data = Array.isArray(response.data) 
      ? response.data[0] 
      : response.data;
    
    if (!data) return 'Data is empty';
    
    const missingFields = fields.filter(field => !(field in data));
    
    return missingFields.length === 0 
      ? true 
      : `Missing fields: ${missingFields.join(', ')}`;
  }
};

/**
 * API 엔드포인트에 대한 자동화된 테스트 실행
 * @param {string} groupName - 테스트 그룹 이름
 * @param {Array} endpoints - 테스트할 엔드포인트 목록
 * @returns {Promise<object>} 테스트 결과
 */
export const runApiTests = async (groupName, endpoints) => {
  console.group(`🧪 API 테스트: ${groupName}`);
  console.time(`${groupName} 테스트 완료 시간`);
  
  const results = await apiTestFactory
    .setup()
    .runTestSuite({ endpoints });
  
  console.log(`✅ 통과: ${results.passed}/${results.total}`);
  
  if (results.failed > 0) {
    console.error(`❌ 실패: ${results.failed}/${results.total}`);
    
    results.tests
      .filter(test => test.status === 'failed')
      .forEach(test => {
        console.error(`❌ ${test.name} 실패:`, test.error?.message);
      });
  }
  
  console.timeEnd(`${groupName} 테스트 완료 시간`);
  console.groupEnd();
  
  return results;
};

export default {
  ApiTestFactory,
  apiTestFactory,
  validators,
  runApiTests
};