import axios from 'axios';

// 환경 변수에서 API URL을 가져오되, 없으면 9999 포트를 사용 (백엔드 서버의 실제 포트)
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:9999/api/v1';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 타임아웃 설정 (15초)
  timeout: 15000,
});

// 요청 인터셉터 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 요청 시작 시간 추가 (성능 모니터링용)
    config.metadata = { startTime: new Date().getTime() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 추가
apiClient.interceptors.response.use(
  (response) => {
    // 응답 시간 계산 (성능 모니터링용)
    const endTime = new Date().getTime();
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const duration = endTime - startTime;
      // 응답 시간이 5초 이상이면 콘솔에 경고 표시
      if (duration > 5000) {
        console.warn(`API 호출 지연: ${response.config.url}, 소요시간: ${duration}ms`);
      }
      
      // 응답 헤더에 응답 시간 추가
      response.headers['x-response-time'] = `${duration}ms`;
    }
    
    return response;
  },
  (error) => {
    // 에러 처리를 위한 공통 함수
    const handleError = (status, message) => {
      console.error(`API 에러 [${status}]: ${message}`);
      
      // 필요하다면 여기에 통합 에러 알림 기능 추가 가능
      const errorEvent = new CustomEvent('api-error', { 
        detail: { status, message } 
      });
      window.dispatchEvent(errorEvent);
      
      return Promise.reject(error);
    };
    
    // 응답이 없는 경우 (네트워크 오류)
    if (!error.response) {
      return handleError('NETWORK', '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.');
    }
    
    // HTTP 상태 코드별 처리
    switch (error.response.status) {
      case 400: // Bad Request
        return handleError(400, '잘못된 요청입니다.');
        
      case 401: // Unauthorized
        localStorage.removeItem('token');
        window.location.href = '/login';
        return handleError(401, '로그인이 필요합니다.');
        
      case 403: // Forbidden
        return handleError(403, '해당 작업에 대한 권한이 없습니다.');
        
      case 404: // Not Found
        return handleError(404, '요청한 리소스를 찾을 수 없습니다.');
        
      case 408: // Request Timeout
        return handleError(408, '요청 시간이 초과되었습니다.');
        
      case 409: // Conflict
        return handleError(409, '데이터 충돌이 발생했습니다.');
        
      case 422: // Unprocessable Entity
        return handleError(422, '입력 데이터가 유효하지 않습니다.');
        
      case 429: // Too Many Requests
        return handleError(429, '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도하세요.');
        
      case 500: // Internal Server Error
        return handleError(500, '서버 내부 오류가 발생했습니다.');
        
      case 502: // Bad Gateway
        return handleError(502, '서버가 일시적으로 응답하지 않습니다.');
        
      case 503: // Service Unavailable
        return handleError(503, '서비스를 일시적으로 사용할 수 없습니다.');
        
      default:
        return handleError(error.response.status, '예기치 않은 오류가 발생했습니다.');
    }
  }
);

// 글로벌 환경에서 axios 기본 설정
axios.defaults.withCredentials = true;

export default apiClient;