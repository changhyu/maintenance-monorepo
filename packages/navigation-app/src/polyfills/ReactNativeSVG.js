/**
 * React Native SVG 웹 폴리필
 * 
 * 웹 환경에서 react-native-svg 컴포넌트를 단순 SVG 엘리먼트로 대체합니다.
 * JSX 없이 React.createElement 사용
 */

import React from 'react';

// 기본 SVG 요소들 정의
const Svg = ({ width, height, viewBox, children, style, ...props }) =>
  React.createElement(
    'svg',
    {
      width,
      height,
      viewBox,
      style,
      ...props
    },
    children
  );

const Path = ({ d, fill, stroke, strokeWidth, ...props }) =>
  React.createElement(
    'path',
    {
      d,
      fill: fill || 'none',
      stroke,
      strokeWidth,
      ...props
    }
  );

const Circle = ({ cx, cy, r, fill, ...props }) =>
  React.createElement(
    'circle',
    {
      cx,
      cy,
      r,
      fill,
      ...props
    }
  );

const Rect = ({ x, y, width, height, fill, ...props }) =>
  React.createElement(
    'rect',
    {
      x,
      y,
      width,
      height,
      fill,
      ...props
    }
  );

const Line = ({ x1, y1, x2, y2, stroke, ...props }) =>
  React.createElement(
    'line',
    {
      x1,
      y1,
      x2,
      y2,
      stroke,
      ...props
    }
  );

// Polyline 컴포넌트 추가
const Polyline = ({ points, fill, stroke, strokeWidth, ...props }) =>
  React.createElement(
    'polyline',
    {
      points,
      fill: fill || 'none',
      stroke,
      strokeWidth,
      ...props
    }
  );

const G = ({ children, ...props }) =>
  React.createElement(
    'g',
    props,
    children
  );

const Text = ({ x, y, fontSize, fill, children, ...props }) =>
  React.createElement(
    'text',
    {
      x,
      y,
      fontSize,
      fill,
      ...props
    },
    children
  );

// SVG 그라데이션 및 필터
const LinearGradient = ({ id, x1, y1, x2, y2, children, ...props }) =>
  React.createElement(
    'linearGradient',
    {
      id,
      x1,
      y1,
      x2,
      y2,
      ...props
    },
    children
  );

const Stop = ({ offset, stopColor, stopOpacity, ...props }) =>
  React.createElement(
    'stop',
    {
      offset,
      stopColor,
      stopOpacity,
      ...props
    }
  );

const Defs = ({ children, ...props }) =>
  React.createElement(
    'defs',
    props,
    children
  );

// 모든 컴포넌트 내보내기
export {
  Svg,
  Path,
  Circle,
  Rect,
  Line,
  Polyline,
  G,
  Text,
  LinearGradient,
  Stop,
  Defs
};

export default Svg;