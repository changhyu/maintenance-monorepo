import React, { useState } from 'react';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangePickerProps {
  initialRange?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  label?: string;
}

/**
 * 날짜 범위 선택 컴포넌트
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  initialRange,
  onChange,
  className = '',
  label = '기간 선택',
}) => {
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(today.getMonth() - 1);
  
  const [range, setRange] = useState<DateRange>(
    initialRange || { startDate: monthAgo, endDate: today }
  );

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    const newRange = { ...range, startDate: newStartDate };
    
    // 시작일이 종료일보다 늦으면 종료일을 시작일로 설정
    if (newStartDate > range.endDate) {
      newRange.endDate = newStartDate;
    }
    
    setRange(newRange);
    onChange(newRange);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    const newRange = { ...range, endDate: newEndDate };
    
    // 종료일이 시작일보다 이르면 시작일을 종료일로 설정
    if (newEndDate < range.startDate) {
      newRange.startDate = newEndDate;
    }
    
    setRange(newRange);
    onChange(newRange);
  };

  // 빠른 기간 선택 옵션
  const selectPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const newRange = { startDate: start, endDate: end };
    setRange(newRange);
    onChange(newRange);
  };

  return (
    <div className={`${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="flex-1">
          <div className="relative">
            <input
              type="date"
              value={formatDateForInput(range.startDate)}
              onChange={handleStartDateChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-gray-500">~</span>
        </div>
        <div className="flex-1">
          <div className="relative">
            <input
              type="date"
              value={formatDateForInput(range.endDate)}
              onChange={handleEndDateChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-2 flex space-x-2">
        <button 
          type="button" 
          onClick={() => selectPresetRange(7)}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          7일
        </button>
        <button 
          type="button" 
          onClick={() => selectPresetRange(30)}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          30일
        </button>
        <button 
          type="button" 
          onClick={() => selectPresetRange(90)}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          90일
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker; 