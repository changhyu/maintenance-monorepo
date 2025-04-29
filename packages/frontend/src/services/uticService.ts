import axios from 'axios';

/**
 * UTIC (Urban Traffic Information Center) API Service
 * 도시교통 정보 개방데이터 API 서비스
 */

// API Key from environment variables - should be set in .env file
const API_KEY = process.env.REACT_APP_UTIC_API_KEY || 'test'; // 실 환경에서는 환경 변수로 관리
const API_BASE_URL = 'https://openapi.its.go.kr:9443';

// API URLs
const API_URLS = {
  trafficFlow: `http://www.utic.go.kr/etc/telMap.do?key=${API_KEY}`,
  incidents: `http://www.utic.go.kr/guide/imsOpenData.do?key=${API_KEY}`,
  safety: `http://www.utic.go.kr/guide/tsdmsOpenData.do?key=${API_KEY}`,
  cctv: `${API_BASE_URL}/cctvInfo`,
  roadHazards: `http://www.utic.go.kr/guide/getRoadAccJson.do?key=${API_KEY}`,
  protectedAreas: (sidoCd: string) => `http://www.utic.go.kr/guide/getSafeOpenJson.do?key=${API_KEY}&sidoCd=${sidoCd}`,
  trafficSignals: `http://tsihub.utic.go.kr/tsi/api/PlanCrossRoadInfoService/getPlanCRRSInfo?serviceKey=${API_KEY}&type=json`,
  construction: `http://www.utic.go.kr/guide/tcsOpenData.do?key=${API_KEY}`
};

// Types for API responses
export interface TrafficFlowData {
  linkId: string;
  speed: number;
  travelTime: number;
  roadName: string;
  roadType: string;
  congestionLevel: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

export interface TrafficIncident {
  id: string;
  type: string;
  description: string;
  startTime: string;
  endTime?: string;
  latitude: number;
  longitude: number;
  roadName: string;
  direction?: string;
  severityLevel: string;
}

/**
 * CCTV 데이터 인터페이스
 */
export interface CCTVData {
  id?: string;              // 식별자 (선택)
  name?: string;            // CCTV 설치 장소명
  type: string;             // CCTV 유형(1: 실시간 스트리밍 / 2: 동영상 파일 / 3: 정지 영상)
  url: string;              // CCTV 영상 주소
  format?: string;          // CCTV 형식 (HLS 등)
  resolution?: string;      // CCTV 해상도
  createTime?: string;      // 파일 생성 시간
  latitude: number;         // 위도 좌표
  longitude: number;        // 경도 좌표
  roadSectionId?: string;   // 도로 구간 ID
}

/**
 * CCTV API 요청 매개변수 인터페이스
 */
export interface CCTVRequestParams {
  type: string;             // 도로 유형(ex: 고속도로 / its: 국도 / all: 모두)
  cctvType: string;         // CCTV 유형(1: 실시간 스트리밍 / 2: 동영상 파일 / 3: 정지 영상)
  minX: number;             // 최소 경도 영역
  maxX: number;             // 최대 경도 영역
  minY: number;             // 최소 위도 영역
  maxY: number;             // 최대 위도 영역
  getType: 'xml' | 'json';  // 출력 결과 형식
}

export interface RoadHazard {
  id: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  roadName: string;
  reportTime: string;
  status: string;
}

export interface ConstructionInfo {
  id: string;
  description: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  roadName: string;
  status: string;
  type: string;
}

export interface ProtectedArea {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface TrafficSignal {
  nodeId: string;
  nodeName: string;
  latitude: number;
  longitude: number;
  cycleTime: number;
  phaseCount: number;
  lastUpdated: string;
}

/**
 * Fetches traffic flow information from UTIC API
 * 도로 소통정보를 가져옵니다
 */
export const getTrafficFlow = async (): Promise<TrafficFlowData[]> => {
  try {
    const response = await axios.get(API_URLS.trafficFlow);
    return response.data.map((item: any) => ({
      linkId: item.linkId,
      speed: parseFloat(item.speed),
      travelTime: parseInt(item.travelTime, 10),
      roadName: item.roadName,
      roadType: item.roadType,
      congestionLevel: item.congestionLevel,
      coordinates: item.coordinates.map((coord: any) => ({
        latitude: parseFloat(coord.lat),
        longitude: parseFloat(coord.lng)
      }))
    }));
  } catch (error) {
    console.error('Error fetching traffic flow data:', error);
    return [];
  }
};

/**
 * Fetches traffic incidents information
 * 돌발정보 데이터를 가져옵니다
 */
export const getTrafficIncidents = async (): Promise<TrafficIncident[]> => {
  try {
    const response = await axios.get(API_URLS.incidents);
    
    if (!response.data || !Array.isArray(response.data.list)) {
      return [];
    }
    
    return response.data.list.map((item: any) => ({
      id: item.incidentId || `incident-${Math.random().toString(36).substr(2, 9)}`,
      type: item.incidentType,
      description: item.description,
      startTime: item.startTime,
      endTime: item.endTime,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      roadName: item.roadName,
      direction: item.direction,
      severityLevel: item.severityLevel || 'A0401' // 기본값: 경미
    }));
  } catch (error) {
    console.error('Error fetching traffic incidents:', error);
    return [];
  }
};

/**
 * Fetches CCTV data
 * CCTV 데이터를 가져옵니다
 * @param params - CCTV API 요청 파라미터
 */
export const getCCTVData = async (params: CCTVRequestParams): Promise<CCTVData[]> => {
  try {
    const response = await axios.get(API_URLS.cctv, {
      params: {
        apiKey: API_KEY,
        type: params.type,      // 도로 유형(ex: 고속도로 / its: 국도 / all: 모두)
        cctvType: params.cctvType, // CCTV 유형(1: 실시간 스트리밍 / 2: 동영상 파일 / 3: 정지 영상)
        minX: params.minX,      // 최소 경도 영역
        maxX: params.maxX,      // 최대 경도 영역
        minY: params.minY,      // 최소 위도 영역
        maxY: params.maxY,      // 최대 위도 영역
        getType: params.getType // 출력 결과 형식(xml, json)
      }
    });

    // JSON 응답 처리
    if (params.getType === 'json') {
      if (!response.data || !response.data.response) {
        return [];
      }
      
      let cctvItems = [];
      
      // 데이터가 여러 개일 경우 배열로 반환됨
      if (response.data.response.data && Array.isArray(response.data.response.data)) {
        cctvItems = response.data.response.data;
      }
      // 데이터가 하나일 경우 객체로 반환됨
      else if (response.data.response.data) {
        cctvItems = [response.data.response.data];
      }
      
      // CCTVData 타입으로 매핑
      return cctvItems.map((item: any) => ({
        id: item.cctvid || item.cctvname || `cctv-${Math.random().toString(36).substr(2, 9)}`,
        name: item.cctvname,
        type: item.cctvtype,
        url: item.cctvurl,
        format: item.cctvformat,
        resolution: item.cctvresolution,
        createTime: item.filecreatetime || new Date().toISOString(),
        latitude: parseFloat(item.coordy),
        longitude: parseFloat(item.coordx),
        roadSectionId: item.roadsectionid
      }));
    } 
    // XML 응답 처리 (실제 구현 필요 시)
    else if (params.getType === 'xml') {
      console.warn('XML response format is not fully implemented');
      // XML 파싱 필요
      return [];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching CCTV data:', error);
    throw new Error('CCTV 데이터를 불러오는 중 오류가 발생했습니다.');
  }
};

/**
 * Fetches road hazard forecasts
 * 도로위험상황예보 정보를 가져옵니다
 */
export const getRoadHazards = async (): Promise<RoadHazard[]> => {
  try {
    const response = await axios.get(API_URLS.roadHazards);
    
    if (!response.data || !Array.isArray(response.data.list)) {
      return [];
    }
    
    return response.data.list.map((item: any) => ({
      id: item.hazardId || `hazard-${Math.random().toString(36).substr(2, 9)}`,
      type: item.hazardType,
      description: item.description,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      roadName: item.roadName,
      reportTime: item.reportTime,
      status: item.status
    }));
  } catch (error) {
    console.error('Error fetching road hazards:', error);
    return [];
  }
};

/**
 * Fetches protected area information by area code
 * 시도 코드에 따른 보호구역 데이터를 가져옵니다
 * @param sidoCode - 시도 코드 (e.g. 11 for 서울, 26 for 부산)
 */
export const getProtectedAreas = async (sidoCode: string): Promise<ProtectedArea[]> => {
  try {
    const response = await axios.get(API_URLS.protectedAreas(sidoCode));
    
    if (!response.data || !Array.isArray(response.data.list)) {
      return [];
    }
    
    return response.data.list.map((item: any) => ({
      id: item.areaId || `area-${Math.random().toString(36).substr(2, 9)}`,
      name: item.areaName,
      type: item.areaType,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      address: item.address
    }));
  } catch (error) {
    console.error('Error fetching protected areas:', error);
    return [];
  }
};

/**
 * Fetches traffic signal information
 * 신호 정보를 가져옵니다
 */
export const getTrafficSignals = async (): Promise<TrafficSignal[]> => {
  try {
    const response = await axios.get(API_URLS.trafficSignals);
    
    if (!response.data || !response.data.items || !Array.isArray(response.data.items.item)) {
      return [];
    }
    
    return response.data.items.item.map((item: any) => ({
      nodeId: item.nodeId,
      nodeName: item.nodeName,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lng),
      cycleTime: parseInt(item.cycleTime, 10),
      phaseCount: parseInt(item.phaseCount, 10),
      lastUpdated: item.lastUpdated
    }));
  } catch (error) {
    console.error('Error fetching traffic signals:', error);
    return [];
  }
};

/**
 * Fetches construction information
 * 공사 정보를 가져옵니다
 */
export const getConstructionInfo = async (): Promise<ConstructionInfo[]> => {
  try {
    const response = await axios.get(API_URLS.construction);
    
    if (!response.data || !Array.isArray(response.data.list)) {
      return [];
    }
    
    return response.data.list.map((item: any) => ({
      id: item.constructionId || `const-${Math.random().toString(36).substr(2, 9)}`,
      description: item.description,
      startDate: item.startDate,
      endDate: item.endDate,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      roadName: item.roadName,
      status: item.status,
      type: item.type
    }));
  } catch (error) {
    console.error('Error fetching construction information:', error);
    return [];
  }
};

/**
 * UTIC API 에러 처리 함수
 * @param errorCode 에러 코드
 * @returns 에러 메시지
 */
export const handleAPIError = (errorCode: string): string => {
  const errorMessages: { [key: string]: string } = {
    '000': '시스템 에러가 발생했습니다. 잠시 후 다시 시도해주세요.',
    '100': '필수 요청변수가 누락되었습니다.',
    '200': '잘못된 요청변수가 포함되었습니다.',
    '300': '요청 변수의 값이 유효하지 않습니다.',
    '400': '등록되지 않은 서비스키를 사용했습니다.',
    '500': '서비스키 사용이 중지되었습니다.',
    '600': '요청 허용량을 초과했습니다.'
  };
  
  return errorMessages[errorCode] || '알 수 없는 오류가 발생했습니다.';
};

export default {
  getTrafficFlow,
  getTrafficIncidents,
  getCCTVData,
  getRoadHazards,
  getProtectedAreas,
  getTrafficSignals,
  getConstructionInfo,
  handleAPIError
};