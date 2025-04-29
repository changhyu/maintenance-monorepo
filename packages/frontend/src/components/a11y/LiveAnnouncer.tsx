import React from 'react';
import { Box } from '@mui/material';
import { srOnly } from '../../utils/a11y';
import { useAnnouncerStore } from '../../store/announcerStore';

/**
 * 스크린 리더를 위한 라이브 리전 안내 컴포넌트
 * 동적으로 변경되는 콘텐츠를 스크린 리더에 알리기 위함
 * Zustand 스토어를 활용하여 애플리케이션 전역에서 접근 가능
 */
const LiveAnnouncer: React.FC = () => {
  const { message, assertive } = useAnnouncerStore();
  
  return (
    <Box
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      sx={srOnly}
    >
      {message}
    </Box>
  );
};

/**
 * @deprecated 직접 스토어를 사용하는 방식을 권장합니다. useAnnouncerStore()를 import하여 사용하세요.
 */
export const useAnnouncer = () => {
  const { message, assertive, announce } = useAnnouncerStore();
  
  return {
    message,
    assertive,
    announce
  };
};

export default LiveAnnouncer;