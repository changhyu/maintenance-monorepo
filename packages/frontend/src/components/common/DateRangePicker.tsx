import React, { useState, useEffect } from 'react';
import { DatePicker, Button, Space } from 'antd';
import type { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';
import locale from 'antd/lib/date-picker/locale/ko_KR';

const { RangePicker } = DatePicker;

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface DateRangePickerProps {
  onChange: (value: DateRange | null) => void;
  value?: DateRange | null;
  defaultValue?: DateRange | null;
}

/**
 * 날짜 범위 선택 컴포넌트
 * 빠른 선택 버튼과 직접 입력 제공
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  onChange, 
  value, 
  defaultValue 
}) => {
  const [selectedDates, setSelectedDates] = useState<DateRange | null>(value || defaultValue || null);

  // value prop이 변경되면 내부 상태 업데이트
  useEffect(() => {
    if (value !== undefined) {
      setSelectedDates(value);
    }
  }, [value]);

  // 날짜 범위 변경 처리
  const handleDateChange = (dates: RangePickerProps['value']) => {
    if (dates && dates[0] && dates[1]) {
      const newRange = {
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      };
      setSelectedDates(newRange);
      onChange(newRange);
    } else {
      setSelectedDates(null);
      onChange(null);
    }
  };

  // 빠른 선택 버튼 처리
  const handleQuickSelect = (days: number) => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(days, 'day');
    
    const newRange = {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD')
    };
    
    setSelectedDates(newRange);
    onChange(newRange);
  };

  // 선택된 날짜를 dayjs 객체로 변환
  const getDayjsValue = () => {
    if (selectedDates && selectedDates.startDate && selectedDates.endDate) {
      return [
        dayjs(selectedDates.startDate),
        dayjs(selectedDates.endDate)
      ] as [dayjs.Dayjs, dayjs.Dayjs];
    }
    return null;
  };

  return (
    <Space direction="vertical" size="small">
      <Space>
        <Button size="small" onClick={() => handleQuickSelect(7)}>최근 7일</Button>
        <Button size="small" onClick={() => handleQuickSelect(30)}>최근 30일</Button>
        <Button size="small" onClick={() => handleQuickSelect(90)}>최근 90일</Button>
      </Space>
      <RangePicker 
        locale={locale}
        value={getDayjsValue()}
        onChange={handleDateChange}
        allowClear={true}
        style={{ width: '100%' }}
      />
    </Space>
  );
};

export default DateRangePicker; 