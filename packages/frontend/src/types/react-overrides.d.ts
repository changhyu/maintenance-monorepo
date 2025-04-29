import React from 'react';

// React 19 JSX 네임스페이스 문제를 해결하기 위한 타입 확장
declare global {
  namespace JSX {
    // React 19에 대한 호환성 타입 정의
    interface IntrinsicAttributes {
      children?: React.ReactNode;
    }
  }
}

declare module 'react' {
  // 일부 타사 라이브러리와 호환되지 않는 React 19의 타입에 대한 폴백
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): React.ReactNode;
    propTypes?: React.WeakValidationMap<P>;
    contextTypes?: React.ValidationMap<any>;
    defaultProps?: Partial<P>;
    displayName?: string;
  }

  interface ComponentClass<P = {}, S = {}> extends StaticLifecycle<P, S> {
    new(props: P, context?: any): Component<P, S>;
    propTypes?: React.WeakValidationMap<P>;
    contextTypes?: React.ValidationMap<any>;
    defaultProps?: Partial<P>;
    displayName?: string;
  }

  // 타사 라이브러리와의 호환성을 위한 ReactElement 타입 정의
  interface ReactElement<
    P = any,
    T extends string | JSXElementConstructor<any> = 
      | string
      | JSXElementConstructor<any>
  > {
    type: T;
    props: P;
    key: Key | null;
  }
}

export {};