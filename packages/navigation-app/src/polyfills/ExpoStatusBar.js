/**
 * Expo StatusBar 폴리필
 * 웹 환경에서 상태 표시줄을 제어하기 위한 더미 구현입니다.
 */

import React from 'react';

// 상태 표시줄 스타일 옵션 
export const StatusBarStyle = {
  DARK: 'dark-content',
  LIGHT: 'light-content',
  AUTO: 'auto',
};

// 상태 표시줄 애니메이션 옵션
export const StatusBarAnimation = {
  NONE: 'none',
  FADE: 'fade',
  SLIDE: 'slide',
};

// 웹 환경에서 theme-color 메타 태그를 통해 상태 표시줄 색상 설정
const setStatusBarColor = (backgroundColor, style) => {
  if (typeof document !== 'undefined') {
    // 기존 theme-color 메타 태그 확인
    let themeColorMeta = document.querySelector('meta[name=theme-color]');
    
    // 없으면 새로 생성
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    
    // 배경색 설정
    if (backgroundColor) {
      themeColorMeta.setAttribute('content', backgroundColor);
    }
    
    // 상태표시줄 스타일에 따라 다른 처리 가능
    if (style === StatusBarStyle.DARK) {
      // 다크 모드 대응
    } else if (style === StatusBarStyle.LIGHT) {
      // 라이트 모드 대응
    }
  }
};

// StatusBar 컴포넌트 구현
const StatusBar = ({
  animated = false,
  backgroundColor,
  barStyle = StatusBarStyle.DEFAULT,
  hidden = false,
  networkActivityIndicatorVisible = false,
  showHideTransition = StatusBarAnimation.FADE,
  translucent = false,
  style = {},
}) => {
  // 컴포넌트가 마운트되면 상태 표시줄 스타일 설정
  React.useEffect(() => {
    setStatusBarColor(backgroundColor, barStyle);
    
    return () => {
      // 컴포넌트 언마운트 시 정리 작업
    };
  }, [backgroundColor, barStyle]);
  
  // 실제 UI를 렌더링하지 않음 (웹에서는 상태 표시줄 없음)
  return null;
};

// 정적 메서드들 추가
StatusBar.setBarStyle = (style, animated = false) => {
  setStatusBarColor(null, style);
};

StatusBar.setBackgroundColor = (color, animated = false) => {
  setStatusBarColor(color);
};

StatusBar.setTranslucent = (translucent) => {
  // 웹 환경에서는 아무 작업 수행 안함
};

StatusBar.setHidden = (hidden, animation = StatusBarAnimation.NONE) => {
  // 웹 환경에서는 아무 작업 수행 안함
};

StatusBar.setNetworkActivityIndicatorVisible = (visible) => {
  // 웹 환경에서는 아무 작업 수행 안함
};

// 상수 내보내기
StatusBar.currentHeight = null;

export default StatusBar;