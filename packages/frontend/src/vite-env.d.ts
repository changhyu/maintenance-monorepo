/// <reference types="vite/client" />

// React 및 JSX 타입 정의
import * as React from 'react';

// 전역 타입 선언 추가
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Vite 환경 변수 타입 확장
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly MODE: string; // 'development', 'production' 또는 'test'
  // 다른 환경 변수를 여기에 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Ant Design 컴포넌트 타입 처리를 위한 선언
declare module 'antd' {
  const Card: React.ComponentType<any>;
  const Button: React.ComponentType<any>;
  const Table: React.ComponentType<any>;
  const Tabs: React.ComponentType<any> & { TabPane: React.ComponentType<any> };
  const TabPane: React.ComponentType<any>;
  const Row: React.ComponentType<any>;
  const Col: React.ComponentType<any>;
  const Space: React.ComponentType<any>;
  const Select: React.ComponentType<any> & { Option: React.ComponentType<any> };
  const Option: React.ComponentType<any>;
  const Typography: {
    Title: React.ComponentType<any>;
    Text: React.ComponentType<any>;
  };
  const Text: React.ComponentType<any>;
  const Title: React.ComponentType<any>;
  const Tag: React.ComponentType<any>;
  const Badge: React.ComponentType<any>;
  const Spin: React.ComponentType<any>;
  const Alert: React.ComponentType<any>;
  const Empty: React.ComponentType<any>;
  const Divider: React.ComponentType<any>;
  const DatePicker: React.ComponentType<any> & { RangePicker: React.ComponentType<any> };
  const RangePicker: React.ComponentType<any>;
  const Breadcrumb: React.ComponentType<any> & { Item: React.ComponentType<any> };
  
  export {
    Card, Button, Table, Tabs, TabPane, Row, Col, Space, Select, Option,
    Typography, Text, Title, Tag, Badge, Spin, Alert, Empty, Divider,
    DatePicker, RangePicker, Breadcrumb
  };
}

// Icon 컴포넌트 타입 처리
declare module '@ant-design/icons' {
  const ReloadOutlined: React.ComponentType<any>;
  const FilterOutlined: React.ComponentType<any>;
  const CarOutlined: React.ComponentType<any>;
  const LineChartOutlined: React.ComponentType<any>;
  const FileDoneOutlined: React.ComponentType<any>;
  const DownloadOutlined: React.ComponentType<any>;
  const HomeOutlined: React.ComponentType<any>;
  const FileTextOutlined: React.ComponentType<any>;
  
  export {
    ReloadOutlined, FilterOutlined, CarOutlined, LineChartOutlined,
    FileDoneOutlined, DownloadOutlined, HomeOutlined, FileTextOutlined
  };
}

// React Router 타입 처리
declare module 'react-router-dom' {
  const Link: React.ComponentType<any>;
  const useNavigate: () => any;
  const useParams: () => any;
  const useLocation: () => any;
  
  export { Link, useNavigate, useParams, useLocation };
}

// Recharts 컴포넌트 타입 처리
declare module 'recharts' {
  const ResponsiveContainer: React.ComponentType<any>;
  const LineChart: React.ComponentType<any>;
  const BarChart: React.ComponentType<any>;
  const PieChart: React.ComponentType<any>;
  const RadarChart: React.ComponentType<any>;
  const ScatterChart: React.ComponentType<any>;
  const AreaChart: React.ComponentType<any>;
  
  const XAxis: React.ComponentType<any>;
  const YAxis: React.ComponentType<any>;
  const CartesianGrid: React.ComponentType<any>;
  const Tooltip: React.ComponentType<any>;
  const Legend: React.ComponentType<any>;
  const Line: React.ComponentType<any>;
  const Bar: React.ComponentType<any>;
  const Pie: React.ComponentType<any>;
  const Radar: React.ComponentType<any>;
  const Scatter: React.ComponentType<any>;
  const Area: React.ComponentType<any>;
  const Cell: React.ComponentType<any>;
  const PolarAngleAxis: React.ComponentType<any>;
  const PolarRadiusAxis: React.ComponentType<any>;
  
  export {
    ResponsiveContainer, LineChart, BarChart, PieChart, RadarChart, ScatterChart, AreaChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Pie, Radar, Scatter, Area, Cell,
    PolarAngleAxis, PolarRadiusAxis
  };
}

// React Beautiful DnD 타입 처리
declare module 'react-beautiful-dnd' {
  const DragDropContext: React.ComponentType<any>;
  const Droppable: React.ComponentType<any>;
  const Draggable: React.ComponentType<any>;
  
  export { DragDropContext, Droppable, Draggable };
}
