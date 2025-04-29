import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DateRangePicker, FilterSelect } from './common';
import './dashboard/Dashboard.css';
/**
 * 대시보드 필터 컴포넌트
 */
const DashboardFilter = ({ onFilterChange, className = '' }) => {
    const [filters, setFilters] = useState({
        dateRange: {
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toISOString()
                .split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
        },
        vehicleType: '',
        maintenanceStatus: '',
        priority: ''
    });
    // 차량 유형 옵션
    const vehicleTypeOptions = [
        { value: '', label: '모든 차량 유형' },
        { value: 'sedan', label: '승용차' },
        { value: 'suv', label: 'SUV' },
        { value: 'van', label: '밴' },
        { value: 'truck', label: '트럭' },
        { value: 'other', label: '기타' }
    ];
    // 정비 상태 옵션
    const maintenanceStatusOptions = [
        { value: '', label: '모든 정비 상태' },
        { value: 'scheduled', label: '예약됨' },
        { value: 'inProgress', label: '진행 중' },
        { value: 'completed', label: '완료됨' },
        { value: 'cancelled', label: '취소됨' }
    ];
    // 우선순위 옵션
    const priorityOptions = [
        { value: '', label: '모든 우선순위' },
        { value: 'high', label: '높음' },
        { value: 'medium', label: '중간' },
        { value: 'low', label: '낮음' }
    ];
    // 날짜 범위 변경 핸들러
    const handleDateRangeChange = (dateRange) => {
        const newFilters = { ...filters, dateRange };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };
    // 필터 값 변경 핸들러
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };
    // 필터 초기화 핸들러
    const handleResetFilters = () => {
        const defaultFilters = {
            dateRange: {
                startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
                    .toISOString()
                    .split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            },
            vehicleType: '',
            maintenanceStatus: '',
            priority: ''
        };
        setFilters(defaultFilters);
        onFilterChange(defaultFilters);
    };
    return (_jsxs("div", { className: `bg-white shadow rounded-lg p-4 ${className}`, children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-lg font-medium text-gray-800", children: "\uD544\uD130 \uC635\uC158" }), _jsx("button", { onClick: handleResetFilters, className: "text-sm text-blue-600 hover:text-blue-800", children: "\uD544\uD130 \uCD08\uAE30\uD654" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "filter-label", children: "\uB0A0\uC9DC \uBC94\uC704" }), _jsx(DateRangePicker, { value: filters.dateRange, defaultValue: filters.dateRange, onChange: handleDateRangeChange })] }), _jsx(FilterSelect, { options: vehicleTypeOptions, value: [filters.vehicleType || ''], onChange: values => handleFilterChange('vehicleType', values[0] || ''), label: "\uCC28\uB7C9 \uC720\uD615" }), _jsx(FilterSelect, { options: maintenanceStatusOptions, value: [filters.maintenanceStatus || ''], onChange: values => handleFilterChange('maintenanceStatus', values[0] || ''), label: "\uC815\uBE44 \uC0C1\uD0DC" }), _jsx(FilterSelect, { options: priorityOptions, value: [filters.priority || ''], onChange: values => handleFilterChange('priority', values[0] || ''), label: "\uC6B0\uC120\uC21C\uC704" })] })] }));
};
export default DashboardFilter;
