import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { DatePicker, Button, Space } from 'antd';
import locale from 'antd/lib/date-picker/locale/ko_KR';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
/**
 * 날짜 범위 선택 컴포넌트
 * 빠른 선택 버튼과 직접 입력 제공
 */
const DateRangePicker = ({ onChange, value, defaultValue }) => {
    const [selectedDates, setSelectedDates] = useState(value || defaultValue || null);
    // value prop이 변경되면 내부 상태 업데이트
    useEffect(() => {
        if (value !== undefined) {
            setSelectedDates(value);
        }
    }, [value]);
    // 날짜 범위 변경 처리
    const handleDateChange = (dates) => {
        if (dates && dates[0] && dates[1]) {
            const newRange = {
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD')
            };
            setSelectedDates(newRange);
            onChange(newRange);
        }
        else {
            setSelectedDates(null);
            onChange(null);
        }
    };
    // 빠른 선택 버튼 처리
    const handleQuickSelect = (days) => {
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
            return [dayjs(selectedDates.startDate), dayjs(selectedDates.endDate)];
        }
        return null;
    };
    return (_jsxs(Space, { direction: "vertical", size: "small", children: [_jsxs(Space, { children: [_jsx(Button, { size: "small", onClick: () => handleQuickSelect(7), children: "\uCD5C\uADFC 7\uC77C" }), _jsx(Button, { size: "small", onClick: () => handleQuickSelect(30), children: "\uCD5C\uADFC 30\uC77C" }), _jsx(Button, { size: "small", onClick: () => handleQuickSelect(90), children: "\uCD5C\uADFC 90\uC77C" })] }), _jsx(RangePicker, { locale: locale, value: getDayjsValue(), onChange: handleDateChange, allowClear: true, style: { width: '100%' } })] }));
};
export default DateRangePicker;
