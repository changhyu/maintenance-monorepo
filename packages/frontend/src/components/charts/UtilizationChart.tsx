import React from 'react';

export interface UtilizationChartProps {
  data: {
    value: number;
    previousValue?: number;
    label?: string;
    change?: number;
    color?: string;
  };
  height?: number;
  isLoading?: boolean;
  title?: string;
}

/**
 * 차량 활용률 차트 컴포넌트
 */
const UtilizationChart: React.FC<UtilizationChartProps> = ({
  data,
  height = 300,
  isLoading = false,
  title = '차량 활용률'
}) => {
  // 데이터가 없거나 로딩 중인 경우
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
        <h3 className="text-lg font-medium text-gray-800 mb-2">{title}</h3>
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-500">데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  // 활용률 변화에 따른 색상과 아이콘
  const getChangeColor = () => {
    if (!data.change) return 'text-gray-500';
    return data.change > 0 ? 'text-green-500' : data.change < 0 ? 'text-red-500' : 'text-gray-500';
  };

  const getChangeIcon = () => {
    if (!data.change) return null;
    return data.change > 0 ? (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    ) : data.change < 0 ? (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    ) : null;
  };

  // 게이지 색상
  const gaugeColor = data.color || '#3B82F6'; // 기본 파란색

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>

      <div className="mt-8">
        <div className="flex justify-center items-center mb-4">
          <div className="w-36 h-36 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#F3F4F6" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={gaugeColor}
                strokeWidth="10"
                strokeDasharray={`${data.value * 2.83} 283`}
                strokeDashoffset="0"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{data.value}%</span>
              {data.label && <span className="text-sm text-gray-500 mt-1">{data.label}</span>}
            </div>
          </div>
        </div>

        {data.previousValue !== undefined && (
          <div className="flex justify-center items-center mt-2">
            <span className="text-sm text-gray-500 mr-2">이전: {data.previousValue}%</span>
            {data.change !== undefined && (
              <div className={`flex items-center ${getChangeColor()}`}>
                {getChangeIcon()}
                <span className="ml-1">
                  {data.change > 0 ? '+' : ''}
                  {data.change}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full"
              style={{
                width: `${Math.min(100, data.value)}%`,
                backgroundColor: gaugeColor
              }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700 w-16 text-right">{data.value}%</span>
        </div>
        {data.change !== undefined && (
          <p className={`text-sm ${getChangeColor()} mt-2 flex items-center`}>
            {getChangeIcon()}
            <span className="ml-1">
              전월 대비 {data.change > 0 ? '+' : ''}
              {data.change}%
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default UtilizationChart;
