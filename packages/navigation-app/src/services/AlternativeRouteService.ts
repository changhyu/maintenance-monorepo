// 실제 AlternativeRouteService는 route 폴더 안에 있지만, 기존 임포트 호환성을 위해 re-export
import AlternativeRouteService from './route/AlternativeRouteService';
export * from './route/AlternativeRouteService';
export default AlternativeRouteService;