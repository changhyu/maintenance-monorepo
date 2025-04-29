import { ReportHandler } from 'web-vitals';

/**
 * Web Vitals 성능 지표 측정 및 보고 함수
 * 
 * 참고: https://web.dev/vitals/
 * - CLS (Cumulative Layout Shift): 누적 레이아웃 이동 - 시각적 안정성 측정
 * - FID (First Input Delay): 최초 입력 지연 - 상호작용성 측정
 * - LCP (Largest Contentful Paint): 최대 콘텐츠풀 페인트 - 로딩 성능 측정
 * - FCP (First Contentful Paint): 최초 콘텐츠풀 페인트
 * - TTFB (Time to First Byte): 첫 번째 바이트까지의 시간
 * 
 * @param onPerfEntry 성능 지표를 처리할 콜백 함수
 */
export const reportWebVitals = async (onPerfEntry?: ReportHandler): Promise<void> => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    try {
      // 'web-vitals' 라이브러리를 동적으로 불러옵니다.
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
      
      getCLS(onPerfEntry); // 누적 레이아웃 이동 측정
      getFID(onPerfEntry); // 최초 입력 지연 측정
      getFCP(onPerfEntry); // 최초 콘텐츠풀 페인트 측정
      getLCP(onPerfEntry); // 최대 콘텐츠풀 페인트 측정
      getTTFB(onPerfEntry); // 첫 번째 바이트까지의 시간 측정

      console.log('Web Vitals 성능 측정 시작됨');
    } catch (error) {
      console.error('Web Vitals 라이브러리 로딩 실패:', error);
    }
  } else {
    console.warn('Web Vitals를 측정하기 위한 유효한 콜백 함수가 제공되지 않았습니다.');
  }
};