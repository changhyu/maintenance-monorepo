/**
 * MaterialIcons 폴리필
 * 웹 환경에서 MaterialIcons를 사용할 수 있도록 구현을 제공합니다.
 * 웹에서 로컬 폰트 파일을 사용합니다.
 */

import React, { useEffect } from 'react';

// Material Icons 웹 폰트가 사용 가능한지 확인하는 함수
// public/index.html에 정의된 @font-face를 사용합니다.
const checkFontAvailability = () => {
  if (typeof document !== 'undefined') {
    // 폰트 로딩 상태 체크를 위한 추가적인 스타일이 필요한 경우에만 추가
    const styleId = 'material-icons-style-check';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .material-icons-check {
          visibility: hidden;
          font-family: 'MaterialIcons', sans-serif;
        }
      `;
      document.head.appendChild(style);
    }
  }
  return Promise.resolve();
};

// 폰트 사용 가능성을 확인
checkFontAvailability();

// 아이콘 매핑 테이블 (자주 사용되는 아이콘들)
const iconMap = {
  'menu': 'menu',
  'home': 'home',
  'arrow-back': 'arrow_back',
  'arrow-forward': 'arrow_forward',
  'search': 'search',
  'settings': 'settings',
  'person': 'person',
  'location': 'location_on',
  'map': 'map',
  'navigation': 'navigation',
  'directions': 'directions',
  'my-location': 'my_location',
  'place': 'place',
  'add': 'add',
  'remove': 'remove',
  'done': 'done',
  'close': 'close',
  'refresh': 'refresh',
  'info': 'info',
  'warning': 'warning',
  'error': 'error',
  'star': 'star',
  'favorite': 'favorite',
  // 필요에 따라 더 많은 아이콘 추가 가능
};

// MaterialIcons 컴포넌트
const MaterialIcons = ({ name, size = 24, color = 'black', style = {}, ...props }) => {
  // 컴포넌트 마운트 시 폰트 확인
  useEffect(() => {
    checkFontAvailability();
  }, []);

  const iconStyle = {
    fontFamily: 'MaterialIcons',
    fontSize: `${size}px`,
    color: color,
    display: 'inline-block',
    lineHeight: 1,
    textTransform: 'none',
    letterSpacing: 'normal',
    wordWrap: 'normal',
    whiteSpace: 'nowrap',
    direction: 'ltr',
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    ...style
  };

  // 아이콘 이름을 매핑 테이블에서 찾거나, 원래 이름 사용
  const iconName = iconMap[name] || name || '?';
  
  return (
    <span 
      {...props} 
      style={iconStyle} 
      data-icon-name={name}
    >
      {iconName}
    </span>
  );
};

// 필수 메서드 구현
MaterialIcons.loadFont = checkFontAvailability;

MaterialIcons.getImageSource = (name, size, color) => {
  // 웹에서는 이미지 소스가 필요하지 않지만, 
  // React Native 호환성을 위해 Promise 반환
  if (typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size || 24;
      canvas.height = size || 24;
      const ctx = canvas.getContext('2d');
      
      ctx.font = `${size || 24}px MaterialIcons`;
      ctx.fillStyle = color || 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iconMap[name] || name || '?', canvas.width/2, canvas.height/2);
      
      resolve({ uri: canvas.toDataURL() });
    });
  }
  return Promise.resolve({ uri: `${name}_${size}_${color}` });
};

MaterialIcons.getRawGlyphMap = () => iconMap;
MaterialIcons.hasIcon = (name) => !!name && (!!iconMap[name] || name);

// 기본 내보내기 (직접 import용)
// eslint-disable-next-line import/no-default-export
export default MaterialIcons;

// 명명된 내보내기 (구조분해 import용)
export {
  MaterialIcons
};

// React Native Vector Icons와의 호환성을 위한 추가 함수
export const createIconSet = () => MaterialIcons;
export const createIconSetFromIcoMoon = () => MaterialIcons;
export const createIconSetFromFontello = () => MaterialIcons;

// 기본 모듈로 자신을 설정 (CJS 모듈 시스템 호환성)
if (typeof module !== 'undefined') {
  module.exports = MaterialIcons;
  module.exports.MaterialIcons = MaterialIcons;
  module.exports.default = MaterialIcons;
  module.exports.createIconSet = createIconSet;
  module.exports.createIconSetFromIcoMoon = createIconSetFromIcoMoon;
  module.exports.createIconSetFromFontello = createIconSetFromFontello;
}