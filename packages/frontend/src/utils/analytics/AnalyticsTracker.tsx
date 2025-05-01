import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as gtag from './gtag';

/**
 * 페이지 전환을 감지하여 구글 애널리틱스에 페이지뷰를 보내는 컴포넌트
 */
const AnalyticsTracker: React.FC = () => {
  const location = useLocation();
  
  useEffect(() => {
    // 페이지 변경 시 구글 애널리틱스에 페이지뷰 이벤트 전송
    gtag.pageview(location.pathname + location.search);
  }, [location]);
  
  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

export default AnalyticsTracker;