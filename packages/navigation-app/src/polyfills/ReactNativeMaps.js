/**
 * React Native Maps 웹 폴리필
 * 
 * 웹 환경에서 react-native-maps 패키지를 단순화한 버전으로 제공합니다.
 * JSX 없이 React.createElement 사용
 */

import React from 'react';

// Provider 상수 내보내기
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';
export const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
  NONE: 'none'
};

// 기본 빈 컴포넌트들
const MapView = (props) => {
  console.warn('MapView is not fully implemented in web environment');
  return React.createElement(
    'div', 
    {
      style: {
        width: props.style?.width || '100%',
        height: props.style?.height || 300,
        backgroundColor: '#e0e0e0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
      }
    },
    React.createElement('p', null, '지도는 네이티브 앱에서만 완전히 지원됩니다.'),
    props.children
  );
};

const Marker = (props) => {
  return React.createElement(
    'div', 
    {
      style: {
        padding: 8,
        backgroundColor: 'red',
        borderRadius: '50%',
        color: 'white',
      }
    },
    props.title
  );
};

const EmptyComponent = () => React.createElement('div', null);

const Polyline = EmptyComponent;
const Polygon = EmptyComponent;
const Circle = EmptyComponent;
const Callout = EmptyComponent;
const Overlay = EmptyComponent;
const Heatmap = EmptyComponent;
const Geojson = EmptyComponent;
const UrlTile = EmptyComponent;
const WMSTile = EmptyComponent;
const LocalTile = EmptyComponent;

// MapView에 필요한 properties와 메서드 추가
MapView.Marker = Marker;
MapView.Polyline = Polyline;
MapView.Polygon = Polygon;
MapView.Circle = Circle;
MapView.Callout = Callout;
MapView.Overlay = Overlay;
MapView.Heatmap = Heatmap;
MapView.Geojson = Geojson;
MapView.UrlTile = UrlTile;
MapView.WMSTile = WMSTile;
MapView.LocalTile = LocalTile;

// Constants
MapView.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
MapView.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
MapView.MAP_TYPES = MAP_TYPES;
MapView.animateToRegion = () => {};
MapView.fitToCoordinates = () => {};
MapView.animateToCoordinate = () => {};

export { MapView, Marker, Polyline, Polygon, Circle, Callout };
export default MapView;