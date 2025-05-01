/**
 * React Native Vector Icons 폴리필
 * 웹 환경에서 아이콘 컴포넌트를 사용할 수 있도록 구현을 제공합니다.
 * 다양한 import 방식을 지원하고 로컬 폰트 파일을 사용합니다.
 */

import React, { useEffect } from 'react';
import MaterialIconsComponent from './MaterialIcons';

// 폰트 사용 가능성을 확인하는 함수
// public/index.html에 정의된 @font-face를 사용합니다.
const checkFontAvailability = () => {
  // 웹 빌드에서 @font-face는 index.html에서 이미 정의되었으므로 
  // 추가 작업이 필요하지 않습니다.
  return Promise.resolve();
};

// 폰트 가용성 확인
checkFontAvailability();

// 아이콘 이름 매핑 테이블
const iconMappings = {
  material: {
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
  },
  fontawesome: {
    'home': 'home',
    'search': 'search',
    'user': 'user',
    'cog': 'cog',
    'map': 'map',
    'star': 'star',
  },
  ionicons: {
    'home': 'home',
    'search': 'search',
    'person': 'person',
    'settings': 'settings',
    'location': 'location',
    'map': 'map',
  }
};

// 모든 아이콘 세트가 사용하는 기본 아이콘 구현
const createIconSet = (glyphMap = {}, fontFamily = '', fontFile = '', prefix = '') => {
  const Icon = ({ name, size = 24, color = 'black', style = {}, ...props }) => {
    // 컴포넌트 마운트 시 폰트 확인
    useEffect(() => {
      checkFontAvailability();
    }, []);

    const iconStyle = {
      fontFamily: fontFamily,
      fontSize: `${size}px`,
      color: color,
      lineHeight: 1,
      textTransform: 'none',
      letterSpacing: 'normal',
      wordWrap: 'normal',
      whiteSpace: 'nowrap',
      direction: 'ltr',
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      ...style,
    };

    // 아이콘 이름을 매핑 테이블에서 찾거나, 원래 이름 사용
    const iconName = (glyphMap && glyphMap[name]) || name || '?';

    // 아이콘 폰트 패밀리에 따라 스타일 및 텍스트 조정
    if (fontFamily === 'MaterialIcons') {
      return (
        <span 
          {...props} 
          style={iconStyle}
          data-icon-name={name}
        >
          {iconMappings.material[name] || iconName}
        </span>
      );
    } else if (fontFamily === 'FontAwesome') {
      return (
        <span 
          {...props} 
          style={iconStyle}
          data-icon-name={name}
        >
          {iconMappings.fontawesome[name] || iconName}
        </span>
      );
    } else if (fontFamily === 'Ionicons') {
      return (
        <span 
          {...props} 
          style={iconStyle}
          data-icon-name={name}
        >
          {iconMappings.ionicons[name] || iconName}
        </span>
      );
    }

    // 기본 출력 - 일반 텍스트로 렌더링
    return (
      <span {...props} style={iconStyle} data-icon-name={name}>
        {iconName}
      </span>
    );
  };

  Icon.loadFont = checkFontAvailability;
  Icon.getImageSource = (name, size, color) => {
    if (typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size || 24;
        canvas.height = size || 24;
        const ctx = canvas.getContext('2d');
        
        ctx.font = `${size || 24}px ${fontFamily}`;
        ctx.fillStyle = color || 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((glyphMap && glyphMap[name]) || name || '?', canvas.width/2, canvas.height/2);
        
        resolve({ uri: canvas.toDataURL() });
      });
    }
    return Promise.resolve({ uri: `${name}_${size}_${color}` });
  };
  Icon.getRawGlyphMap = () => glyphMap || {};
  Icon.hasIcon = (name) => !!name && (!!glyphMap && !!glyphMap[name] || name);

  return Icon;
};

// 아이콘 세트 생성을 위한 유틸리티 메서드
const createIconSetFromIcoMoon = () => createIconSet();
const createIconSetFromFontello = () => createIconSet();

// 일반적으로 사용되는 기본 아이콘 컴포넌트 생성
const MaterialIcons = createIconSet(iconMappings.material, 'MaterialIcons');
const FontAwesome = createIconSet(iconMappings.fontawesome, 'FontAwesome');
const Ionicons = createIconSet(iconMappings.ionicons, 'Ionicons');
const MaterialCommunityIcons = createIconSet(iconMappings.material, 'MaterialCommunityIcons');
const Octicons = createIconSet({}, 'Octicons');
const AntDesign = createIconSet({}, 'AntDesign');
const Entypo = createIconSet({}, 'Entypo');
const Feather = createIconSet({}, 'Feather');
const FontAwesome5 = createIconSet(iconMappings.fontawesome, 'FontAwesome');
const Foundation = createIconSet({}, 'Foundation');
const SimpleLineIcons = createIconSet({}, 'SimpleLineIcons');
const Zocial = createIconSet({}, 'Zocial');

// 필요한 모든 컴포넌트 및 메서드 내보내기
export {
  createIconSet,
  createIconSetFromIcoMoon,
  createIconSetFromFontello,
  MaterialIcons,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  Octicons,
  AntDesign,
  Entypo,
  Feather,
  FontAwesome5,
  Foundation,
  SimpleLineIcons,
  Zocial,
};

// 직접 import 시 MaterialIcons를 기본으로 사용
const defaultIcon = MaterialIcons;
export default defaultIcon;

// CJS 모듈 시스템 호환성
if (typeof module !== 'undefined') {
  module.exports = defaultIcon;
  module.exports.MaterialIcons = MaterialIcons;
  module.exports.FontAwesome = FontAwesome;
  module.exports.Ionicons = Ionicons;
  module.exports.MaterialCommunityIcons = MaterialCommunityIcons;
  module.exports.Octicons = Octicons;
  module.exports.AntDesign = AntDesign;
  module.exports.Entypo = Entypo;
  module.exports.Feather = Feather;
  module.exports.FontAwesome5 = FontAwesome5;
  module.exports.Foundation = Foundation;
  module.exports.SimpleLineIcons = SimpleLineIcons;
  module.exports.Zocial = Zocial;
  module.exports.createIconSet = createIconSet;
  module.exports.createIconSetFromIcoMoon = createIconSetFromIcoMoon;
  module.exports.createIconSetFromFontello = createIconSetFromFontello;
  module.exports.default = defaultIcon;
}