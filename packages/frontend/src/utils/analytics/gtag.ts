// Google Analytics 측정 ID
export const GA_TRACKING_ID = 'G-G3YPKZZWBZ';

// 페이지뷰 추적
export const pageview = (url: string): void => {
  if (!window.gtag) {
    console.warn('Google Analytics가 로드되지 않았습니다.');
    return;
  }
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// 이벤트 추적
export const event = ({ action, category, label, value }: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}): void => {
  if (!window.gtag) {
    console.warn('Google Analytics가 로드되지 않았습니다.');
    return;
  }
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};