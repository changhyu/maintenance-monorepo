// 실제 TrafficService는 traffic 폴더 안에 있지만, 기존 임포트 호환성을 위해 re-export
import TrafficService from './traffic/TrafficService';
export * from './traffic/TrafficService';
export default TrafficService;