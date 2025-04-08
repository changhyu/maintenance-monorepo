import React from 'react';
import { DashboardCardData } from '../services/DashboardDataService';

/**
 * 데이터 대시보드 Props 인터페이스
 */
export interface ScrDataDashboardProps {
  /** 대시보드 제목 */
  title: string;
  /** 데이터 항목 배열 */
  data: DashboardCardData[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 컬럼 수 */
  columns?: 1 | 2 | 3 | 4;
  /** 헤더 컨텐츠 */
  headerContent?: React.ReactNode;
  /** 추가 클래스 */
  className?: string;
}

/**
 * 데이터 대시보드 컴포넌트
 * 
 * 데이터 항목을 그리드 형태로 표시하는 스크롤 가능한 대시보드
 */
const ScrDataDashboard: React.FC<ScrDataDashboardProps> = ({
  title,
  data,
  loading = false,
  columns = 2,
  headerContent,
  className = '',
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-5 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">{title}</h2>
        {headerContent && <div>{headerContent}</div>}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className={`grid ${gridCols[columns]} gap-4`}>
          {data.map((item, index) => (
            <div
              key={item.id || `dashboard-item-${index}`}
              className="bg-gray-50 rounded-lg p-4 border border-gray-100"
            >
              <h3 className="text-sm font-medium text-gray-500 mb-1">{item.label || item.title}</h3>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-semibold text-gray-800 flex items-baseline">
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  {item.color && (
                    <span
                      className="ml-2 h-2 w-2 rounded-full inline-block"
                      style={{ backgroundColor: getColorValue(item.color) }}
                    />
                  )}
                </div>
                {item.change !== undefined && (
                  <div
                    className={`text-sm font-medium ${
                      item.change > 0
                        ? 'text-green-500'
                        : item.change < 0
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.change > 0 ? '+' : ''}
                    {item.change}%
                    {item.changeLabel && (
                      <span className="text-xs text-gray-400 block">
                        {item.changeLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getColorValue = (color: string): string => {
  switch (color) {
    case 'red':
      return '#ef4444';
    case 'green':
      return '#10b981';
    case 'blue':
      return '#3b82f6';
    case 'yellow':
      return '#f59e0b';
    case 'purple':
      return '#9333ea';
    case 'gray':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

export default ScrDataDashboard; 