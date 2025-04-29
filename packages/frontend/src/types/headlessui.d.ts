// Type declarations for @headlessui/react
declare module '@headlessui/react' {
  import { ComponentType, ElementType, ReactElement, ComponentProps, HTMLAttributes } from 'react';

  export interface MenuProps<TTag = ElementType> {
    as?: TTag;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any; // 추가적인 HTML 속성들을 허용
  }

  export const Menu: ComponentType<MenuProps> & {
    Button: ComponentType<{
      className?: string;
      children?: React.ReactNode;
      [key: string]: any;
    }>;
    Items: ComponentType<{
      className?: string;
      children?: React.ReactNode;
      static?: boolean;
      [key: string]: any;
    }>;
    Item: ComponentType<{
      as?: ElementType;
      className?: string;
      children?: ((props: { active: boolean; disabled: boolean }) => React.ReactNode) | React.ReactNode;
      disabled?: boolean;
      [key: string]: any;
    }>;
  };

  export interface TransitionProps {
    as?: ElementType;
    show?: boolean;
    enter?: string;
    enterFrom?: string;
    enterTo?: string;
    leave?: string;
    leaveFrom?: string;
    leaveTo?: string;
    children?: React.ReactNode;
    appear?: boolean;
    className?: string;
    [key: string]: any;
  }

  export const Transition: ComponentType<TransitionProps> & {
    Child: ComponentType<TransitionProps>;
    Root: ComponentType<TransitionProps>;
  };
  
  export interface TransitionChildProps extends TransitionProps {}
  export const TransitionChild: ComponentType<TransitionChildProps>;

  export const Fragment: ElementType;
}