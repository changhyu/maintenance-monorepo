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

// jspdf 및 jspdf-autotable 타입 정의
declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    text(text: string, x: number, y: number, options?: any): jsPDF;
    save(filename: string): jsPDF;
    addPage(options?: any): jsPDF;
    setFontSize(size: number): jsPDF;
    autoTable?: (options: any) => jsPDF;
  }
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
  }
  
  function autoTable(options: any): jsPDF;
  export = autoTable;
}

// html2canvas 관련 타입
declare module 'html2canvas' {
  interface Options {
    useCORS?: boolean;
    scale?: number;
    logging?: boolean;
    backgroundColor?: string;
    allowTaint?: boolean;
    imageTimeout?: number;
  }
  
  function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
  export default html2canvas;
}

// 보고서 시스템 관련 공통 타입
interface ReportChartElement extends HTMLElement {
  __chartRef?: any;
}

// 차트 데이터 타입
interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

// 차트 타입 확장으로 더 구체적인 차트 타입 정의
interface LineChartDataPoint extends ChartDataPoint {
  date?: string;
  time?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface BarChartDataPoint extends ChartDataPoint {
  category?: string;
  color?: string;
  compare?: number;
}

interface PieChartDataPoint extends ChartDataPoint {
  percentage?: number;
  color?: string;
  highlight?: boolean;
}

// 차트 구성 옵션 타입
interface ChartOptions {
  width?: number;
  height?: number;
  colors?: string[];
  legend?: boolean;
  grid?: boolean;
  animation?: boolean;
  responsive?: boolean;
  tooltip?: boolean;
  xAxis?: {
    label?: string;
    showGrid?: boolean;
    tickCount?: number;
  };
  yAxis?: {
    label?: string;
    showGrid?: boolean;
    tickCount?: number;
  };
}

// 보고서 템플릿 관련 타입
interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  sections: ReportSection[];
  createdAt: string;
  lastModified?: string;
  author?: string;
  version?: string;
}

interface ReportSection {
  id: string;
  type: 'header' | 'table' | 'chart' | 'text' | 'image';
  title?: string;
  content?: any;
  options?: Record<string, any>;
  order?: number;
  visible?: boolean;
}

// PDF 다국어 지원 관련 타입
interface PDFLocalization {
  locale: string;
  translations: {
    pageTitle?: string;
    generatedOn?: string;
    page?: string;
    of?: string;
    reportSummary?: string;
    tableSummary?: string;
    chartSummary?: string;
    dataSource?: string;
    exportedBy?: string;
    confidential?: string;
    dateFormat?: string;
  };
}

// 웹 접근성 향상을 위한 보고서 메타데이터 타입
interface ReportAccessibility {
  lang?: string;
  altTexts?: {[key: string]: string};
  ariaLabels?: {[key: string]: string};
  tableCaption?: string;
  chartDescriptions?: {[key: string]: string};
  highContrastMode?: boolean;
  textToSpeech?: boolean;
  keyboardNavigable?: boolean;
}

// 보고서 캐싱 관련 타입
interface ReportCache {
  key: string;
  data: any;
  timestamp: number;
  expiresIn?: number;
  version?: string;
}

// 차트 이미지 캐싱
interface ChartImageCache {
  chartId: string;
  imageData: string; // base64 이미지 데이터
  timestamp: number;
  dimensions: {width: number; height: number};
  checksum?: string; // 데이터 변경 감지를 위한 체크섬
}

// 보고서 PDF 옵션 타입
interface ReportExportOptions {
  includeCharts?: boolean;
  paperSize?: 'a4' | 'letter' | 'legal';
  landscape?: boolean;
  quality?: number;
  password?: string;
  watermark?: {
    text?: string;
    fontSize?: number;
    opacity?: number;
    angle?: number;
  };
  header?: {
    text?: string;
    logo?: string;
    height?: number;
  };
  footer?: {
    text?: string;
    pagination?: boolean;
    height?: number;
  };
  compression?: boolean;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
  };
  accessibility?: ReportAccessibility;
  localization?: PDFLocalization;
} 