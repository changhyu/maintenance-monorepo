// react-router-dom v6 타입 확장
import 'react-router-dom';
import { Location, NavigateFunction, Params } from 'react-router-dom';

declare module 'react-router-dom' {
  // 현재 위치 훅 확장
  interface LocationState {
    from?: Location;
    backgroundLocation?: Location;
    [key: string]: any;
  }

  // 네비게이션 옵션 확장
  interface NavigateOptions {
    replace?: boolean;
    state?: Record<string, unknown>;
    preventScrollReset?: boolean;
    relative?: 'route' | 'path';
  }

  // 경로 파라미터 확장
  interface RouteParams extends Params {
    [key: string]: string | undefined;
  }

  // 경로 객체 확장
  interface RouteObject {
    caseSensitive?: boolean;
    children?: RouteObject[];
    element?: React.ReactNode;
    errorElement?: React.ReactNode;
    index?: boolean;
    path?: string;
    handle?: Record<string, unknown>;
    loader?: (args: any) => Promise<any>;
    action?: (args: any) => Promise<any>;
  }

  // Router 컨텍스트 확장
  interface RouterContextType {
    location: Location;
    navigationType: NavigationType;
    navigator: Navigator;
    basename?: string;
  }

  // 매칭 확장
  interface PathMatch<ParamKey extends string = string> {
    params: Params<ParamKey>;
    pathname: string;
    pattern: {
      path: string;
      caseSensitive?: boolean;
      end?: boolean;
    };
  }

  // useRoutes 확장
  function useRoutes(
    routes: RouteObject[],
    locationArg?: Partial<Location> | string
  ): React.ReactElement | null;
}
