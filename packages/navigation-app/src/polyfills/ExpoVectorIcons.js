/**
 * Expo Vector Icons 웹 폴리필
 * 
 * 웹 환경에서 @expo/vector-icons 패키지를 단순화하여 제공합니다.
 * JSX 없이 React.createElement 사용
 */

import React from 'react';

// 아이콘 기본 스타일
const defaultIconStyle = {
  display: 'inline-block',
  width: '1em',
  height: '1em',
  fontSize: '1.5rem',
  color: 'currentColor',
  verticalAlign: 'middle',
};

// 아이콘 구현을 위한 기본 함수
const createIconSet = (glyphMap, fontFamily) => {
  const Icon = ({ name, size, color, style, ...props }) => {
    return React.createElement(
      'span',
      {
        style: {
          ...defaultIconStyle,
          fontFamily,
          fontSize: size || defaultIconStyle.fontSize,
          color: color || defaultIconStyle.color,
          ...style,
        },
        'aria-label': name,
        ...props,
      },
      // 실제 아이콘 코드 대신 이름의 첫 글자를 표시
      name ? name.charAt(0) : ''
    );
  };

  // 모든 글리프 이름에 대한 정적 컴포넌트 생성
  const components = {};
  Object.keys(glyphMap).forEach(name => {
    components[name] = (props) => React.createElement(Icon, { name, ...props });
  });

  return Object.assign(Icon, components);
};

// 간단한 테마 생성
const createIconSetFromIcoMoon = createIconSet;
const createIconSetFromFontello = createIconSet;

// 기본 아이콘 세트 맵
const AntDesign = createIconSet({
  stepforward: 'e600', stepbackward: 'e601', forward: 'e602',
  banckward: 'e603', caretright: 'e604', caretleft: 'e605',
  down: 'e606', up: 'e607', user: 'e608', setting: 'e609',
}, 'anticon');

const Entypo = createIconSet({
  'add-to-list': '0xe600', 'classic-computer': '0xe601', 'user': '0xe602',
  'emoji-happy': '0xe603', 'home': '0xe604', 'search': '0xe605',
  'star': '0xe606', 'heart': '0xe607', 'cog': '0xe608',
}, 'entypo');

const EvilIcons = createIconSet({
  archive: '0x61', chart: '0x63', user: '0x75', lock: '0x6c',
  search: '0x73', gear: '0x67', heart: '0x68', star: '0x74',
}, 'evilicons');

const Feather = createIconSet({
  activity: '0xe900', alert: '0xe901', archive: '0xe902',
  user: '0xe903', settings: '0xe904', search: '0xe905',
}, 'feather');

const FontAwesome = createIconSet({
  glass: '0xf000', music: '0xf001', user: '0xf007',
  home: '0xf015', search: '0xf002', star: '0xf005',
}, 'fontawesome');

const Foundation = createIconSet({
  address: '0xf100', alert: '0xf101', archive: '0xf102',
  home: '0xf103', star: '0xf104', search: '0xf105',
}, 'foundation');

const Ionicons = createIconSet({
  'add': '0xf100', 'add-circle': '0xf101', 'add-circle-outline': '0xf102',
  'airplane': '0xf103', 'home': '0xf104', 'star': '0xf105',
  'search': '0xf106', 'settings': '0xf107', 'person': '0xf108',
}, 'ionicons');

const MaterialIcons = createIconSet({
  '3d-rotation': '0xe84d', 'access-alarm': '0xe190', 'home': '0xe88a',
  'star': '0xe838', 'search': '0xe8b6', 'settings': '0xe8b8',
  'person': '0xe7fd', 'menu': '0xe5d2', 'close': '0xe5cd',
}, 'materialicons');

const MaterialCommunityIcons = createIconSet({
  'access-point': '0xf002', 'account': '0xf004', 'home': '0xf2dc',
  'star': '0xf4ce', 'search': '0xf349', 'settings': '0xf493',
  'account-circle': '0xf009', 'menu': '0xf35c', 'close': '0xf156',
}, 'materialcommunityicons');

const SimpleLineIcons = createIconSet({
  user: '0x55', people: '0x41', settings: '0x67',
  'graph': '0x4d', 'star': '0x48', 'home': '0x68',
}, 'simplelineicons');

const Octicons = createIconSet({
  alert: '0xf02d', 'arrow-down': '0xf03f', 'home': '0xf046', 
  'search': '0xf06e', 'gear': '0xf02f', 'person': '0xf018',
}, 'octicons');

const Zocial = createIconSet({
  amazon: '0x41', android: '0x42', apple: '0x43',
  twitter: '0x54', facebook: '0x46', github: '0x47',
}, 'zocial');

// 모든 아이콘 세트 내보내기
export {
  createIconSet,
  createIconSetFromIcoMoon,
  createIconSetFromFontello,
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  Foundation,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  SimpleLineIcons,
  Octicons,
  Zocial
};