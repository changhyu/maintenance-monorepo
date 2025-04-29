import React from 'react';
import { Box, Typography, Link, styled } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface SkipToContentProps {
  contentId?: string;
  label?: string;
}

// 스타일이 지정된 링크 컴포넌트
const SkipLink = styled(Link)(({ theme }) => ({
  position: 'absolute',
  top: '-40px',
  left: 0,
  zIndex: theme.zIndex.tooltip + 1,
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  textDecoration: 'none',
  fontWeight: 500,
  transition: 'top 0.2s ease-in-out',
  '&:focus': {
    top: 0,
    outline: `2px solid ${theme.palette.secondary.main}`,
    outlineOffset: '2px',
  },
}));

/**
 * 접근성 향상을 위한 건너뛰기 링크 컴포넌트
 * 키보드 사용자가 반복되는 네비게이션을 건너뛰고 바로 메인 콘텐츠로 이동할 수 있게 해줌
 */
const SkipToContent: React.FC<SkipToContentProps> = ({
  contentId = 'main-content',
  label,
}) => {
  const { t } = useTranslation();
  
  // 건너뛰기 링크 클릭 시 메인 콘텐츠로 포커스 이동
  const handleSkip = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    
    const mainContent = document.getElementById(contentId);
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      
      // 포커스 스타일이 남지 않도록 포커스 제거 이벤트 등록
      const onBlur = () => {
        mainContent.removeAttribute('tabindex');
        mainContent.removeEventListener('blur', onBlur);
      };
      
      mainContent.addEventListener('blur', onBlur);
    }
  };
  
  return (
    <Box>
      <SkipLink
        href={`#${contentId}`}
        onClick={handleSkip}
        aria-label={label || t('common.a11y.skipToContent')}
      >
        <Typography variant="body1">
          {label || t('common.a11y.skipToContent', '메인 콘텐츠로 건너뛰기')}
        </Typography>
      </SkipLink>
    </Box>
  );
};

export default SkipToContent;