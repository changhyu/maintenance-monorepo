import React, { useRef, useEffect } from 'react';
import { IconButton, Tooltip, styled, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useDarkMode } from '../context/AppContext';

// 다국어 처리를 위한 문자열 - 나중에 i18n으로 통합 가능
const translations = {
  lightMode: '라이트 모드',
  darkMode: '다크 모드',
  lightModeEnabled: '라이트 모드가 활성화되었습니다.',
  darkModeEnabled: '다크 모드가 활성화되었습니다.'
};

// 접근성이 강화된 스타일링된 IconButton
const StyledIconButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: '50%',
  transition: 'all 0.3s ease',
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

/**
 * 테마 전환 컴포넌트
 * 다크 모드와 라이트 모드를 전환할 수 있는 아이콘 버튼을 제공합니다.
 * 접근성을 준수하여 키보드 네비게이션과 스크린 리더를 지원합니다.
 */
const ThemeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const theme = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + T를 눌렀을 때 테마 토글
      if (event.altKey && event.key === 't') {
        event.preventDefault();
        toggleDarkMode();
        // 포커스 설정
        buttonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleDarkMode]);

  // 테마 전환 핸들러
  const handleThemeToggle = () => {
    toggleDarkMode();
    // 스크린 리더를 위한 알림 메시지
    const message = darkMode ? translations.lightModeEnabled : translations.darkModeEnabled;
    // 스크린 리더에게 알림 (접근성 라이브 리전)
    const announcement = document.getElementById('theme-change-announcement');
    if (announcement) {
      announcement.textContent = message;
    }
  };

  const modeText = darkMode ? translations.lightMode : translations.darkMode;

  return (
    <>
      {/* 스크린 리더를 위한 알림 영역 */}
      <div
        id="theme-change-announcement"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}
      />
      
      <Tooltip title={modeText}>
        <StyledIconButton
          ref={buttonRef}
          color="inherit"
          onClick={handleThemeToggle}
          aria-label={modeText}
          aria-pressed={darkMode}
          role="switch"
          data-testid="theme-toggle-button"
          tabIndex={0}
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          }}
        >
          {darkMode ? (
            <Brightness7Icon aria-hidden="true" fontSize="small" />
          ) : (
            <Brightness4Icon aria-hidden="true" fontSize="small" />
          )}
        </StyledIconButton>
      </Tooltip>
    </>
  );
};

export default ThemeToggle; 