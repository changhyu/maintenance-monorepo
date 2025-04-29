/**
 * API 클라이언트 패키지
 * 
 * 차량 정비 관리 시스템의 API 클라이언트를 제공합니다.
 * 웹사이트와 프론트엔드 애플리케이션에서 공통으로 사용할 수 있는 인터페이스입니다.
 */

// 공통 API 클라이언트 내보내기
export * from './unified-client';

// 인증 관련 유틸리티 내보내기
export * from './auth';

// 오프라인 훅 내보내기 (shared 패키지에서 재내보내기)
// 실제 구현에서는 패키지 참조로 직접 가져와야 합니다.
// export * from '@maintenance/shared/dist/hooks/useOfflineSync';
// export * from '@maintenance/shared/dist/hooks/useNetworkStatus';

// 기본 내보내기는 API 클라이언트 클래스
export { default } from './unified-client'; 