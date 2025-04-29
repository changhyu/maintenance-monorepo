import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, Row, Col, Button } from 'antd';
import { DateRangePicker, FilterSelect } from '../common';
import './Dashboard.css';
// 필터 옵션들
const vehicleTypeOptions = [
    { value: 'all', label: '전체 차량' },
    { value: 'sedan', label: '승용차' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: '밴' },
    { value: 'truck', label: '트럭' },
    { value: 'bus', label: '버스' }
];
const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'active', label: '운행 중' },
    { value: 'maintenance', label: '정비 중' },
    { value: 'inactive', label: '비활성' }
];
const locationOptions = [
    { value: 'all', label: '전체 지역' },
    { value: 'seoul', label: '서울' },
    { value: 'busan', label: '부산' },
    { value: 'incheon', label: '인천' },
    { value: 'daegu', label: '대구' },
    { value: 'gwangju', label: '광주' }
];
const DashboardFilters = ({ onFilterChange }) => {
    // 필터 상태 관리
    const [filters, setFilters] = useState({
        dateRange: null,
        vehicleTypes: ['all'],
        status: ['all'],
        locations: ['all']
    });
    // 필터 변경 처리
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };
    // 필터 초기화
    const resetFilters = () => {
        const defaultFilters = {
            dateRange: null,
            vehicleTypes: ['all'],
            status: ['all'],
            locations: ['all']
        };
        setFilters(defaultFilters);
        onFilterChange(defaultFilters);
    };
    return (_jsx(Card, { title: "\uB300\uC2DC\uBCF4\uB4DC \uD544\uD130", className: "dashboard-filters-card", extra: _jsx(Button, { onClick: resetFilters, children: "\uCD08\uAE30\uD654" }), children: _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { span: 24, children: _jsx(DateRangePicker, { onChange: dates => handleFilterChange('dateRange', dates), defaultValue: filters.dateRange }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(FilterSelect, { label: "\uCC28\uB7C9 \uC720\uD615", options: vehicleTypeOptions, value: filters.vehicleTypes, onChange: value => handleFilterChange('vehicleTypes', value), mode: "multiple" }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(FilterSelect, { label: "\uC0C1\uD0DC", options: statusOptions, value: filters.status, onChange: value => handleFilterChange('status', value), mode: "multiple" }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(FilterSelect, { label: "\uC9C0\uC5ED", options: locationOptions, value: filters.locations, onChange: value => handleFilterChange('locations', value), mode: "multiple" }) })] }) }));
};
export default DashboardFilters;
