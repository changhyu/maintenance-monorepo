import * as React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

declare module 'react-router-dom' {
  // React 19의 새로운 JSX 타입과 호환되도록 주요 컴포넌트 재정의
  export interface PathRouteProps {
    caseSensitive?: boolean;
    path?: string;
    id?: string;
    loader?: ReactRouterDOM.LoaderFunction;
    action?: ReactRouterDOM.ActionFunction;
    element?: React.ReactNode | null;
    errorElement?: React.ReactNode | null;
    handle?: ReactRouterDOM.RouteObject['handle'];
    shouldRevalidate?: ReactRouterDOM.ShouldRevalidateFunction;
  }

  export interface LayoutRouteProps {
    id?: string;
    element?: React.ReactNode | null;
    errorElement?: React.ReactNode | null;
    handle?: ReactRouterDOM.RouteObject['handle'];
    children?: React.ReactNode;
  }

  export interface IndexRouteProps {
    id?: string;
    loader?: ReactRouterDOM.LoaderFunction;
    action?: ReactRouterDOM.ActionFunction;
    element?: React.ReactNode | null;
    errorElement?: React.ReactNode | null;
    handle?: ReactRouterDOM.RouteObject['handle'];
    shouldRevalidate?: ReactRouterDOM.ShouldRevalidateFunction;
  }
}