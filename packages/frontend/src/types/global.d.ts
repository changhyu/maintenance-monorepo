import * as React from 'react';

// 기본 React 및 JSX 타입 재정의
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      strong: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      label: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
      select: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
      option: React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
      table: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>;
      tr: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>;
      th: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableHeaderCellElement>, HTMLTableHeaderCellElement>;
      td: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableDataCellElement>, HTMLTableDataCellElement>;
      img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
      [elemName: string]: any;
    }
  }
}

// React 모듈 정의 확장
declare module 'react' {
  // ReactNode 타입 확장
  type ReactNode =
    | React.ReactElement<any, any>
    | React.ReactFragment
    | React.ReactPortal
    | string
    | number
    | boolean
    | null
    | undefined;

  // FC 인터페이스 확장
  interface FC<P = {}> {
    (props: P): React.ReactElement<P> | null;
    displayName?: string;
    defaultProps?: Partial<P>;
  }

  // Hooks 타입 정의
  function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  function useRef<T>(initialValue: T): { current: T };
  function useContext<T>(context: React.Context<T>): T;
}

// CSS 모듈 및 이미지 파일 타입 정의
declare module '*.css';
declare module '*.scss';
declare module '*.less';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

// Ant Design 컴포넌트 타입 정의
declare module 'antd' {
  // Card 컴포넌트
  export const Card: React.FC<any>;
  
  // Dropdown 컴포넌트
  export const Dropdown: React.FC<any>;
  
  // Menu 컴포넌트
  export const Menu: React.FC<any> & {
    Item: React.FC<any>;
    SubMenu: React.FC<any>;
    Divider: React.FC<any>;
  };
  
  // Button 컴포넌트
  export const Button: React.FC<any>;
  
  // Space 컴포넌트
  export const Space: React.FC<any>;
  
  // Tag 컴포넌트
  export const Tag: React.FC<any>;
  
  // Switch 컴포넌트
  export const Switch: React.FC<any>;
  
  // Tabs 컴포넌트
  export interface TabsInterface extends React.FC<any> {
    TabPane: React.FC<any>;
  }
  export const Tabs: TabsInterface;
  export const TabPane: React.FC<any>;
  
  // Form 컴포넌트
  export const Form: React.FC<any> & {
    Item: React.FC<any>;
    useForm(): any[];
  };
  
  // Input 컴포넌트
  export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    rows?: number;
    placeholder?: string;
  }

  export interface InputSearchProps {
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style?: React.CSSProperties;
    allowClear?: boolean;
    onSearch?: (value: string) => void;
  }

  export const Input: React.FC<any> & {
    TextArea: React.FC<TextAreaProps>;
    Search: React.FC<InputSearchProps>;
  };
  
  // Select 컴포넌트
  export const Select: React.FC<any> & {
    Option: React.FC<any>;
  };
  
  // Modal 컴포넌트
  export const Modal: React.FC<any>;
  
  // Spin 컴포넌트
  export const Spin: React.FC<any>;
  
  // Badge 컴포넌트
  export const Badge: React.FC<any>;
  
  // Rate 컴포넌트
  export const Rate: React.FC<any>;
  
  // Typography 컴포넌트
  export const Typography: {
    Text: React.FC<any>;
    Title: React.FC<any>;
    Paragraph: React.FC<any>;
  };

  // 기타 사용 컴포넌트
  export const InputNumber: React.FC<any>;
  export const Checkbox: React.FC<any>;
  
  // Radio 컴포넌트
  export interface RadioInterface extends React.FC<any> {
    Group: React.FC<any>;
    Button: React.FC<any>;
  }
  export const Radio: RadioInterface;
  
  export const Table: React.FC<any>;
  export const Popconfirm: React.FC<any>;
  export const Divider: React.FC<any>;
  export const Tooltip: React.FC<any>;
  export const ColorPicker: React.FC<any>;
  export const Row: React.FC<any>;
  export const Col: React.FC<any>;
  export const message: {
    success: (content: string) => void;
    error: (content: string) => void;
    warning: (content: string) => void;
    info: (content: string) => void;
    loading: (content: string, duration?: number, onClose?: () => void) => void;
    open: (config: { key?: string; type: 'success' | 'error' | 'warning' | 'info' | 'loading'; content: string; duration?: number }) => void;
  };
}

// AntD 아이콘
declare module '@ant-design/icons' {
  export const FilePdfOutlined: React.FC<any>;
  export const FileExcelOutlined: React.FC<any>;
  export const FileTextOutlined: React.FC<any>;
  export const DownloadOutlined: React.FC<any>;
  export const DownOutlined: React.FC<any>;
  export const PlusOutlined: React.FC<any>;
  export const DeleteOutlined: React.FC<any>;
  export const EditOutlined: React.FC<any>;
  export const InfoCircleOutlined: React.FC<any>;
  export const EnvironmentOutlined: React.FC<any>;
  export const CarOutlined: React.FC<any>;
  export const ToolOutlined: React.FC<any>;
  export const SearchOutlined: React.FC<any>;
  export const RightOutlined: React.FC<any>;
  export const SaveOutlined: React.FC<any>;
  export const UndoOutlined: React.FC<any>;
  export const AimOutlined: React.FC<any>;
}

// 기타 라이브러리
declare module 'jspdf';
declare module 'xlsx';
declare module 'react-beautiful-dnd';
declare module 'styled-components'; 