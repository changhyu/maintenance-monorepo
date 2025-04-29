import React from 'react';
import { StepProps } from './Stepper';

interface StepComponentProps extends StepProps {
  index: number;
  isLast: boolean;
  orientation: 'horizontal' | 'vertical';
  size: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Step: React.FC<StepComponentProps> = ({
  label,
  description,
  icon,
  status = 'upcoming',
  index,
  isLast,
  orientation,
  size,
  onClick,
}) => {
  const isVertical = orientation === 'vertical';
  
  // 크기별 스타일 설정
  const sizeClasses = {
    sm: {
      icon: 'w-6 h-6',
      label: 'text-sm',
      description: 'text-xs',
      line: 'h-0.5 w-24',
      vLine: 'w-0.5 h-8',
      container: 'gap-1',
    },
    md: {
      icon: 'w-8 h-8',
      label: 'text-base',
      description: 'text-sm',
      line: 'h-0.5 w-28',
      vLine: 'w-0.5 h-12',
      container: 'gap-2',
    },
    lg: {
      icon: 'w-10 h-10',
      label: 'text-lg',
      description: 'text-base',
      line: 'h-0.5 w-32',
      vLine: 'w-0.5 h-16',
      container: 'gap-3',
    },
  };

  // 상태별 스타일 설정
  const statusStyles = {
    complete: {
      icon: 'bg-blue-500 text-white',
      line: 'bg-blue-500',
      text: 'text-gray-800',
      description: 'text-gray-600',
    },
    current: {
      icon: 'bg-blue-500 text-white ring-2 ring-blue-200',
      line: 'bg-gray-300',
      text: 'font-semibold text-gray-900',
      description: 'text-gray-700',
    },
    upcoming: {
      icon: 'bg-gray-200 text-gray-500',
      line: 'bg-gray-300',
      text: 'text-gray-500',
      description: 'text-gray-400',
    },
  };

  // 특정 상태 스타일 가져오기
  const currentStyle = statusStyles[status];

  // 아이콘 렌더링
  const renderIcon = () => {
    return (
      <div 
        className={`flex items-center justify-center rounded-full ${sizeClasses[size].icon} ${currentStyle.icon} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {icon ? (
          icon
        ) : status === 'complete' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
    );
  };

  // 연결선 렌더링
  const renderLine = () => {
    if (isLast) return null;

    if (isVertical) {
      return <div className={`${sizeClasses[size].vLine} ${currentStyle.line} ml-4 mt-1 mb-1`}></div>;
    }

    return <div className={`${sizeClasses[size].line} ${currentStyle.line} mx-1`}></div>;
  };

  // 수직 배치일 때의 단일 스텝
  if (isVertical) {
    return (
      <div className="flex flex-col">
        <div className="flex items-start">
          {renderIcon()}
          <div className="ml-4">
            <div className={`${sizeClasses[size].label} ${currentStyle.text}`}>{label}</div>
            {description && (
              <div className={`${sizeClasses[size].description} ${currentStyle.description}`}>
                {description}
              </div>
            )}
          </div>
        </div>
        {!isLast && <div className="flex justify-center">{renderLine()}</div>}
      </div>
    );
  }

  // 수평 배치일 때의 단일 스텝
  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        {renderIcon()}
        <div className={`mt-2 text-center ${sizeClasses[size].container}`}>
          <div className={`${sizeClasses[size].label} ${currentStyle.text}`}>{label}</div>
          {description && (
            <div className={`${sizeClasses[size].description} ${currentStyle.description}`}>
              {description}
            </div>
          )}
        </div>
      </div>
      {!isLast && renderLine()}
    </div>
  );
}; 