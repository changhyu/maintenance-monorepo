// 구글 애널리틱스 글로벌 객체 타입 정의
interface Window {
  gtag: (
    command: 'config' | 'event' | 'js' | 'set' | 'consent',
    targetId: string,
    config?: Record<string, any>
  ) => void;
  dataLayer: Record<string, any>[];
}