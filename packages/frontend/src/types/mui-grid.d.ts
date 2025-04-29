// MUI v7 Grid 컴포넌트를 위한 타입 확장
import { ComponentProps } from 'react';
import { SxProps, Theme } from '@mui/material/styles';

declare module '@mui/material/Grid' {
  // Grid 컴포넌트 프로퍼티 확장
  interface GridProps extends ComponentProps<'div'> {
    container?: boolean;
    item?: boolean;
    xs?: number | 'auto' | boolean;
    sm?: number | 'auto' | boolean;
    md?: number | 'auto' | boolean;
    lg?: number | 'auto' | boolean;
    xl?: number | 'auto' | boolean;
    spacing?: number | string;
    rowSpacing?: number | string;
    columnSpacing?: number | string;
    direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    zeroMinWidth?: boolean;
    sx?: SxProps<Theme>;
  }
}

// 오류가 보고된 특정 타입 확장
declare module '@mui/material' {
  // 타입 충돌을 해결하기 위한 확장
  interface GridSpacing {}
  interface GridSize {}
  interface GridProps {}
  
  export interface Grid {
    // Grid 컴포넌트에 필요한 프로퍼티 추가
    Spacing: GridSpacing;
    Size: GridSize;
    Props: GridProps;
  }
}
