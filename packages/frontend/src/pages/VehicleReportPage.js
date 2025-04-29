import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { CarOutlined, LineChartOutlined, FileDoneOutlined, FilterOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { Table, Card, Row, Col, Tabs, Space, Spin, Alert, Typography, Badge, Select, Button, Divider, Empty, message } from 'antd';
import { BookingButton } from '../components/booking/BookingModal';
import CostDistributionChart from '../components/charts/CostDistributionChart';
import MaintenanceStatusChart from '../components/charts/MaintenanceStatusChart';
import MaintenanceTrendChart from '../components/charts/MaintenanceTrendChart';
import VehicleTypeChart from '../components/charts/VehicleTypeChart';
import { DateRangePicker, FilterSelect, ReportGenerator, ReportType } from '../components/common';
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
const VehicleReportPage = () => {
    // 상태 관리
    const [vehicles, setVehicles] = useState([]);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('status');
    const [selectedVehicleTypes, setSelectedVehicleTypes] = useState([]);
    const [dateRange, setDateRange] = useState(null);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        fetchVehicles();
    }, []);
    // 필터 변경 시 필터링 적용
    useEffect(() => {
        applyFilters();
    }, [selectedVehicleTypes, dateRange, vehicles]);
    // 차량 데이터 조회
    const fetchVehicles = async () => {
        setLoading(true);
        setError(null);
        try {
            // 실제 구현에서는 API 호출
            // const response = await apiClient.get('/vehicles');
            // setVehicles(response.data);
            // 샘플 데이터
            const mockVehicles = generateMockVehicles();
            setVehicles(mockVehicles);
            // 차량 유형 목록 추출
            const types = [...new Set(mockVehicles.map(v => v.type))];
            setVehicleTypes(types);
        }
        catch (err) {
            console.error('차량 데이터를 불러오는 중 오류가 발생했습니다:', err);
            setError('차량 데이터를 불러오는 중 오류가 발생했습니다.');
            // 에러 발생 시에도 샘플 데이터 사용
            const mockVehicles = generateMockVehicles();
            setVehicles(mockVehicles);
            const types = [...new Set(mockVehicles.map(v => v.type))];
            setVehicleTypes(types);
        }
        finally {
            setLoading(false);
        }
    };
    // 샘플 차량 데이터 생성
    const generateMockVehicles = () => {
        const vehicleTypes = ['승용차', '화물차', 'SUV', '버스', '트럭'];
        const statuses = ['운행 중', '정비 중', '대기 중', '고장', '점검 필요'];
        return Array.from({ length: 50 }).map((_, idx) => {
            const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const healthScore = Math.floor(Math.random() * 100);
            const lastMaintenance = new Date();
            lastMaintenance.setDate(lastMaintenance.getDate() - Math.floor(Math.random() * 90));
            return {
                id: `VH-${1000 + idx}`,
                name: `차량 ${1000 + idx}`,
                type,
                status,
                healthScore,
                lastMaintenance: lastMaintenance.toISOString().split('T')[0],
                mileage: Math.floor(Math.random() * 100000),
                maintenanceCount: Math.floor(Math.random() * 20),
                cost: Math.floor(Math.random() * 5000000)
            };
        });
    };
    // 필터 적용
    const applyFilters = () => {
        let filtered = [...vehicles];
        // 차량 유형 필터
        if (selectedVehicleTypes.length > 0) {
            filtered = filtered.filter(vehicle => selectedVehicleTypes.includes(vehicle.type));
        }
        // 날짜 범위 필터
        if (dateRange && dateRange.startDate && dateRange.endDate) {
            const startDate = new Date(dateRange.startDate).getTime();
            const endDate = new Date(dateRange.endDate).getTime();
            filtered = filtered.filter(vehicle => {
                const maintenanceDate = new Date(vehicle.lastMaintenance).getTime();
                return maintenanceDate >= startDate && maintenanceDate <= endDate;
            });
        }
        setFilteredVehicles(filtered);
    };
    // 필터 초기화
    const resetFilters = () => {
        setSelectedVehicleTypes([]);
        setDateRange(null);
    };
    // 상태에 따른 배지 색상
    const getStatusBadge = (status) => {
        switch (status) {
            case '운행 중':
                return _jsx(Badge, { status: "success", text: "\uC6B4\uD589 \uC911" });
            case '정비 중':
                return _jsx(Badge, { status: "processing", text: "\uC815\uBE44 \uC911" });
            case '대기 중':
                return _jsx(Badge, { status: "default", text: "\uB300\uAE30 \uC911" });
            case '고장':
                return _jsx(Badge, { status: "error", text: "\uACE0\uC7A5" });
            case '점검 필요':
                return _jsx(Badge, { status: "warning", text: "\uC810\uAC80 \uD544\uC694" });
            default:
                return _jsx(Badge, { status: "default", text: status });
        }
    };
    // 건강 점수에 따른 색상
    const getHealthScoreColor = (score) => {
        if (score >= 80)
            return 'green';
        if (score >= 50)
            return 'orange';
        return 'red';
    };
    // 보고서 생성 완료 시 처리
    const handleReportGenerated = (filename, format) => {
        console.log(`보고서가 생성되었습니다: ${filename}.${format}`);
    };
    // 차량 테이블 컬럼 정의
    const columns = [
        {
            title: '차량 ID',
            dataIndex: 'id',
            key: 'id',
            width: 100
        },
        {
            title: '차량명',
            dataIndex: 'name',
            key: 'name',
            width: 150
        },
        {
            title: '유형',
            dataIndex: 'type',
            key: 'type',
            width: 100
        },
        {
            title: '상태',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => getStatusBadge(status)
        },
        {
            title: '최근 정비일',
            dataIndex: 'lastMaintenance',
            key: 'lastMaintenance',
            width: 120,
            render: (date) => new Date(date).toLocaleDateString('ko-KR')
        },
        {
            title: '주행거리',
            dataIndex: 'mileage',
            key: 'mileage',
            width: 120,
            render: (mileage) => `${mileage.toLocaleString('ko-KR')} km`
        },
        {
            title: '상태 점수',
            dataIndex: 'healthScore',
            key: 'healthScore',
            width: 120,
            render: (score) => (_jsxs("div", { style: { color: getHealthScoreColor(score), fontWeight: 'bold' }, children: [score, "%"] }))
        },
        {
            title: '정비 예약',
            key: 'action',
            width: 120,
            render: (_, record) => (_jsx(Space, { children: _jsx(BookingButton, { vehicleId: record.id, buttonText: record.healthScore < 50 ? '긴급 정비' : '정비 예약', buttonType: record.healthScore < 50 ? 'primary' : 'default', onBookingCreated: bookingId => {
                        message.success(`차량 ${record.name}에 대한 정비 예약이 완료되었습니다. (예약 ID: ${bookingId})`);
                    } }) }))
        }
    ];
    return (_jsxs("div", { className: "vehicle-report-page", style: { padding: '20px' }, children: [_jsx("div", { className: "page-header", style: { marginBottom: '20px' }, children: _jsxs(Row, { justify: "space-between", align: "middle", children: [_jsxs(Col, { children: [_jsx(Title, { level: 2, children: "\uCC28\uB7C9 \uBCF4\uACE0\uC11C" }), _jsx(Text, { type: "secondary", children: "\uCC28\uB7C9 \uD604\uD669 \uBC0F \uBD84\uC11D \uB370\uC774\uD130\uB97C \uC870\uD68C\uD558\uACE0 \uBCF4\uACE0\uC11C\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4." })] }), _jsx(Col, { children: _jsxs(Space, { children: [_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: fetchVehicles, loading: loading, children: "\uC0C8\uB85C\uACE0\uCE68" }), _jsx(BookingButton, { buttonText: "\uC2E0\uADDC \uC815\uBE44 \uC608\uC57D", buttonType: "primary", onBookingCreated: bookingId => {
                                            message.success(`정비 예약이 완료되었습니다. (예약 ID: ${bookingId})`);
                                            fetchVehicles();
                                        } }), _jsx(ReportGenerator, { data: filteredVehicles, availableTypes: [
                                            ReportType.VEHICLE_STATUS,
                                            ReportType.MAINTENANCE_HISTORY,
                                            ReportType.FLEET_SUMMARY
                                        ], filenamePrefix: "vehicle-report", onReportGenerated: handleReportGenerated, buttonText: "\uBCF4\uACE0\uC11C \uC0DD\uC131", disabled: filteredVehicles.length === 0 })] }) })] }) }), _jsx(Card, { className: "filter-section", style: { marginBottom: '20px' }, children: _jsxs(Space, { align: "start", size: "large", children: [_jsxs("div", { children: [_jsx(Text, { strong: true, style: { display: 'block', marginBottom: '8px' }, children: "\uCC28\uB7C9 \uC720\uD615" }), _jsx(FilterSelect, { options: vehicleTypes.map(type => ({ value: type, label: type })), value: selectedVehicleTypes, onChange: setSelectedVehicleTypes, placeholder: "\uCC28\uB7C9 \uC720\uD615 \uC120\uD0DD", style: { width: 200 }, mode: "multiple" })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, style: { display: 'block', marginBottom: '8px' }, children: "\uC815\uBE44 \uAE30\uAC04" }), _jsx(DateRangePicker, { onChange: setDateRange, defaultValue: dateRange })] }), _jsx(Button, { type: "primary", icon: _jsx(FilterOutlined, {}), onClick: applyFilters, style: { marginTop: '30px' }, children: "\uD544\uD130 \uC801\uC6A9" }), _jsx(Button, { onClick: resetFilters, style: { marginTop: '30px' }, children: "\uCD08\uAE30\uD654" })] }) }), loading && (_jsx("div", { style: { textAlign: 'center', margin: '40px 0' }, children: _jsx(Spin, { size: "large" }) })), error && !loading && (_jsx(Alert, { message: "\uB370\uC774\uD130 \uB85C\uB4DC \uC624\uB958", description: error, type: "error", showIcon: true, style: { marginBottom: '20px' } })), !loading && !error && (_jsxs(_Fragment, { children: [!loading && !error && filteredVehicles.filter(v => v.healthScore < 50).length > 0 && (_jsx(Alert, { message: "\uCC28\uB7C9 \uC0C1\uD0DC \uACBD\uACE0", description: `${filteredVehicles.filter(v => v.healthScore < 50).length}대의 차량이 정비가 필요한 상태입니다. 해당 차량의 정비 예약을 진행해주세요.`, type: "warning", showIcon: true, style: { marginBottom: '20px' }, action: _jsx(Button, { size: "small", type: "primary", danger: true, onClick: () => {
                                const lowHealthVehicles = filteredVehicles.filter(v => v.healthScore < 50);
                                if (lowHealthVehicles.length > 0) {
                                    message.info(`${lowHealthVehicles[0].name} 차량의 정비 예약을 위해 목록에서 "긴급 정비" 버튼을 클릭하세요.`);
                                }
                            }, children: "\uC0C1\uC138 \uBCF4\uAE30" }) })), _jsxs(Tabs, { activeKey: activeTab, onChange: setActiveTab, style: { marginBottom: '20px' }, children: [_jsx(TabPane, { tab: _jsxs("span", { children: [_jsx(CarOutlined, {}), " \uCC28\uB7C9 \uC0C1\uD0DC"] }), children: _jsx(Table, { dataSource: filteredVehicles, columns: columns, rowKey: "id", pagination: { pageSize: 10 }, scroll: { x: 1000 }, loading: loading, locale: { emptyText: _jsx(Empty, { description: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) } }) }, "status"), _jsxs(TabPane, { tab: _jsxs("span", { children: [_jsx(LineChartOutlined, {}), " \uC694\uC57D \uB300\uC2DC\uBCF4\uB4DC"] }), children: [_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { span: 8, children: _jsx(Card, { title: "\uCC28\uB7C9 \uC720\uD615 \uBD84\uD3EC", children: filteredVehicles.length > 0 ? (_jsx(VehicleTypeChart, { data: Object.entries(filteredVehicles.reduce((acc, vehicle) => {
                                                            acc[vehicle.type] = (acc[vehicle.type] || 0) + 1;
                                                            return acc;
                                                        }, {})).map(([label, value]) => ({
                                                            label,
                                                            value
                                                        })) })) : (_jsx("div", { style: {
                                                            height: 200,
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }, children: _jsx(Text, { type: "secondary", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) }) }), _jsx(Col, { span: 8, children: _jsx(Card, { title: "\uCC28\uB7C9 \uC0C1\uD0DC \uBD84\uD3EC", children: filteredVehicles.length > 0 ? (_jsx(MaintenanceStatusChart, { data: Object.entries(filteredVehicles.reduce((acc, vehicle) => {
                                                            acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
                                                            return acc;
                                                        }, {})).map(([label, value]) => ({
                                                            label,
                                                            value
                                                        })) })) : (_jsx("div", { style: {
                                                            height: 200,
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }, children: _jsx(Text, { type: "secondary", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) }) }), _jsx(Col, { span: 8, children: _jsx(Card, { title: "\uC0C1\uD0DC \uC810\uC218 \uBD84\uD3EC", children: filteredVehicles.length > 0 ? (_jsx(CostDistributionChart, { data: [
                                                            {
                                                                label: '양호 (80-100)',
                                                                value: filteredVehicles.filter(v => v.healthScore >= 80).length
                                                            },
                                                            {
                                                                label: '주의 (50-79)',
                                                                value: filteredVehicles.filter(v => v.healthScore >= 50 && v.healthScore < 80).length
                                                            },
                                                            {
                                                                label: '위험 (0-49)',
                                                                value: filteredVehicles.filter(v => v.healthScore < 50).length
                                                            }
                                                        ] })) : (_jsx("div", { style: {
                                                            height: 200,
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }, children: _jsx(Text, { type: "secondary", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) }) })] }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 16 }, children: _jsx(Col, { span: 24, children: _jsx(Card, { title: "\uCC28\uB7C9 \uC0C1\uD0DC \uC810\uC218 \uD1B5\uACC4", children: filteredVehicles.length > 0 ? (_jsx(MaintenanceTrendChart, { data: filteredVehicles.map(vehicle => ({
                                                        date: vehicle.lastMaintenance,
                                                        completed: 1,
                                                        pending: vehicle.healthScore < 70 ? 1 : 0
                                                    })) })) : (_jsx("div", { style: {
                                                        height: 200,
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }, children: _jsx(Text, { type: "secondary", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) }) }) })] }, "dashboard"), _jsx(TabPane, { tab: _jsxs("span", { children: [_jsx(FileDoneOutlined, {}), " \uC0C1\uC138 \uBD84\uC11D"] }), children: _jsxs(Card, { children: [_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { span: 12, children: _jsx(Card, { title: "\uC815\uBE44 \uD69F\uC218 \uBD84\uD3EC", type: "inner", children: filteredVehicles.length > 0 ? (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Title, { level: 4, children: ["\uD3C9\uADE0 \uC815\uBE44 \uD69F\uC218:", ' ', (filteredVehicles.reduce((sum, v) => sum + (v.maintenanceCount || 0), 0) / filteredVehicles.length).toFixed(1), "\uD68C"] }) }), _jsx("div", { children: _jsxs(Text, { children: ["5\uD68C \uBBF8\uB9CC:", ' ', filteredVehicles.filter(v => (v.maintenanceCount || 0) < 5).length, "\uB300"] }) }), _jsx("div", { children: _jsxs(Text, { children: ["5-10\uD68C:", ' ', filteredVehicles.filter(v => (v.maintenanceCount || 0) >= 5 && (v.maintenanceCount || 0) < 10).length, "\uB300"] }) }), _jsx("div", { children: _jsxs(Text, { children: ["10\uD68C \uC774\uC0C1:", ' ', filteredVehicles.filter(v => (v.maintenanceCount || 0) >= 10).length, "\uB300"] }) })] })) : (_jsx(Empty, { description: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" })) }) }), _jsx(Col, { span: 12, children: _jsx(Card, { title: "\uC815\uBE44 \uBE44\uC6A9 \uBD84\uC11D", type: "inner", children: filteredVehicles.length > 0 ? (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs(Title, { level: 4, children: ["\uCD1D \uC815\uBE44 \uBE44\uC6A9:", ' ', filteredVehicles
                                                                                    .reduce((sum, v) => sum + (v.cost || 0), 0)
                                                                                    .toLocaleString('ko-KR'), "\uC6D0"] }), _jsxs(Title, { level: 5, children: ["\uCC28\uB7C9\uB2F9 \uD3C9\uADE0:", ' ', (filteredVehicles.reduce((sum, v) => sum + (v.cost || 0), 0) /
                                                                                    filteredVehicles.length).toLocaleString('ko-KR'), "\uC6D0"] })] }), _jsx("div", { children: _jsxs(Text, { children: ["\uCD5C\uACE0 \uBE44\uC6A9 \uCC28\uB7C9:", ' ', filteredVehicles.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
                                                                                ?.name, ' ', "(", filteredVehicles
                                                                                .sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
                                                                                ?.cost?.toLocaleString('ko-KR'), "\uC6D0)"] }) })] })) : (_jsx(Empty, { description: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" })) }) })] }), _jsx(Divider, {}), _jsx(Button, { type: "primary", icon: _jsx(DownloadOutlined, {}), size: "large", block: true, children: "\uC0C1\uC138 \uBD84\uC11D \uBCF4\uACE0\uC11C \uB2E4\uC6B4\uB85C\uB4DC" })] }) }, "analysis")] })] }))] }));
};
export default VehicleReportPage;
