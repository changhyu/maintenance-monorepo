import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { CarOutlined, FileSearchOutlined, FilterOutlined, ReloadOutlined, DashboardOutlined } from '@ant-design/icons';
import { Card, Row, Col, Table, Select, DatePicker, Button, Typography, Tabs, Spin, Alert, Space, Divider } from 'antd';
import { VehicleTypeChart, MaintenanceStatusChart, CostDistributionChart, MaintenanceTrendChart } from './charts';
import { ReportGenerator } from './common';
import { ReportType } from './common/ReportGenerator';
import { vehicleService } from '../services/vehicle';
import { VehicleType, convertServiceVehicleToFrontend } from '../types/vehicle';
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;
const VehicleReportPage = () => {
    // 상태 변수들
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVehicleTypes, setSelectedVehicleTypes] = useState([]);
    const [dateRange, setDateRange] = useState(null);
    // VehicleType enum에서 차량 유형 목록 생성
    const vehicleTypes = Object.values(VehicleType);
    // 데이터 로드
    useEffect(() => {
        fetchVehicles();
    }, []);
    // 차량 데이터 가져오기
    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const response = await vehicleService.getVehicles();
            // API 응답을 ReportVehicle 형식으로 변환
            const formattedVehicles = response
                .map(vehicle => {
                const frontendVehicle = convertServiceVehicleToFrontend(vehicle);
                if (!frontendVehicle) {
                    return null;
                }
                return {
                    id: frontendVehicle.id,
                    name: frontendVehicle.name,
                    status: String(frontendVehicle.status),
                    type: frontendVehicle.type ?? '미지정',
                    lastMaintenance: frontendVehicle.lastMaintenanceDate
                        ? frontendVehicle.lastMaintenanceDate.toLocaleDateString()
                        : '정보 없음',
                    mileage: frontendVehicle.mileage ?? 0,
                    healthScore: frontendVehicle.healthScore
                };
            })
                .filter(Boolean);
            setVehicles(formattedVehicles);
        }
        catch (error) {
            console.error('차량 데이터 로드 실패:', error);
            // 데모 데이터 사용
            setVehicles([
                {
                    id: 'V001',
                    name: '트럭 A-101',
                    status: '운행 중',
                    type: '화물트럭',
                    lastMaintenance: '2023-03-15',
                    mileage: 45678,
                    healthScore: 92
                },
                {
                    id: 'V002',
                    name: '버스 B-202',
                    status: '정비 중',
                    type: '버스',
                    lastMaintenance: '2023-02-28',
                    mileage: 78923,
                    healthScore: 65
                },
                {
                    id: 'V003',
                    name: '밴 C-303',
                    status: '운행 중',
                    type: '밴',
                    lastMaintenance: '2023-03-10',
                    mileage: 35621,
                    healthScore: 88
                },
                {
                    id: 'V004',
                    name: '승용차 D-404',
                    status: '대기 중',
                    type: '승용차',
                    lastMaintenance: '2023-04-01',
                    mileage: 12890,
                    healthScore: 95
                },
                {
                    id: 'V005',
                    name: '택시 E-505',
                    status: '운행 중',
                    type: '택시',
                    lastMaintenance: '2023-03-22',
                    mileage: 56432,
                    healthScore: 79
                }
            ]);
        }
        finally {
            setLoading(false);
        }
    };
    // 필터 적용 데이터
    const filteredVehicles = vehicles.filter(vehicle => {
        // 차량 유형 필터링
        if (selectedVehicleTypes.length > 0 && !selectedVehicleTypes.includes(vehicle.type)) {
            return false;
        }
        // 날짜 범위 필터링은 실제 구현에서 추가될 예정
        return true;
    });
    // 보고서 생성 후 처리
    const handleReportGenerated = (filename, format) => {
        console.log(`보고서가 생성되었습니다: ${filename}.${format}`);
    };
    // 테이블 컬럼 정의
    const columns = [
        {
            title: '차량 ID',
            dataIndex: 'id',
            key: 'id'
        },
        {
            title: '차량명',
            dataIndex: 'name',
            key: 'name'
        },
        {
            title: '유형',
            dataIndex: 'type',
            key: 'type'
        },
        {
            title: '상태',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'green';
                if (status === '정비 중') {
                    color = 'orange';
                }
                else if (status === '대기 중') {
                    color = 'blue';
                }
                else if (status === '고장') {
                    color = 'red';
                }
                return _jsx("span", { style: { color }, children: status });
            }
        },
        {
            title: '마지막 정비일',
            dataIndex: 'lastMaintenance',
            key: 'lastMaintenance'
        },
        {
            title: '주행거리 (km)',
            dataIndex: 'mileage',
            key: 'mileage',
            render: (mileage) => mileage.toLocaleString()
        },
        {
            title: '상태 점수',
            dataIndex: 'healthScore',
            key: 'healthScore',
            render: (score) => {
                let color = 'green';
                if (score < 70) {
                    color = 'orange';
                }
                else if (score < 50) {
                    color = 'red';
                }
                return _jsxs("span", { style: { color }, children: [score, "%"] });
            }
        }
    ];
    return (_jsx("div", { className: "vehicle-report-page", children: _jsxs(Card, { children: [_jsxs(Row, { gutter: [16, 16], align: "middle", justify: "space-between", children: [_jsx(Col, { children: _jsxs(Title, { level: 3, children: [_jsx(CarOutlined, {}), " \uCC28\uB7C9 \uBCF4\uACE0\uC11C"] }) }), _jsx(Col, { children: _jsxs(Space, { children: [_jsx(ReportGenerator, { data: filteredVehicles, availableTypes: [
                                            ReportType.VEHICLE_STATUS,
                                            ReportType.MAINTENANCE_HISTORY,
                                            ReportType.FLEET_SUMMARY
                                        ], filenamePrefix: "vehicle-report", buttonText: "\uBCF4\uACE0\uC11C \uC0DD\uC131", onReportGenerated: handleReportGenerated }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: fetchVehicles, loading: loading, children: "\uC0C8\uB85C\uACE0\uCE68" })] }) })] }), _jsx(Divider, {}), _jsx(Row, { gutter: [16, 16], children: _jsx(Col, { span: 24, children: _jsx(Card, { title: _jsxs(_Fragment, { children: [_jsx(FilterOutlined, {}), " \uD544\uD130"] }), size: "small", children: _jsxs(Row, { gutter: 16, children: [_jsxs(Col, { span: 8, children: [_jsx(Text, { strong: true, children: "\uCC28\uB7C9 \uC720\uD615" }), _jsx(Select, { mode: "multiple", placeholder: "\uCC28\uB7C9 \uC720\uD615 \uC120\uD0DD", style: { width: '100%', marginTop: 8 }, value: selectedVehicleTypes, onChange: setSelectedVehicleTypes, children: vehicleTypes.map(type => (_jsx(Option, { value: type, children: type }, type))) })] }), _jsxs(Col, { span: 8, children: [_jsx(Text, { strong: true, children: "\uB0A0\uC9DC \uBC94\uC704" }), _jsx("br", {}), _jsx(DatePicker.RangePicker, { style: { width: '100%', marginTop: 8 }, onChange: dates => {
                                                    if (dates) {
                                                        setDateRange([
                                                            dates[0]?.toDate() ?? new Date(),
                                                            dates[1]?.toDate() ?? new Date()
                                                        ]);
                                                    }
                                                    else {
                                                        setDateRange(null);
                                                    }
                                                } })] })] }) }) }) }), _jsx(Divider, {}), _jsxs(Tabs, { defaultActiveKey: "vehicle-status", type: "card", children: [_jsx(TabPane, { tab: _jsxs(_Fragment, { children: [_jsx(CarOutlined, {}), " \uCC28\uB7C9 \uC0C1\uD0DC"] }), children: _jsx(Spin, { spinning: loading, children: filteredVehicles.length > 0 ? (_jsx(Table, { dataSource: filteredVehicles, columns: columns, rowKey: "id", pagination: { pageSize: 10 } })) : (_jsx(Alert, { message: "\uB370\uC774\uD130 \uC5C6\uC74C", description: "\uD45C\uC2DC\uD560 \uCC28\uB7C9 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uD544\uD130 \uC870\uAC74\uC744 \uBCC0\uACBD\uD558\uAC70\uB098 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.", type: "info" })) }) }, "vehicle-status"), _jsxs(TabPane, { tab: _jsxs(_Fragment, { children: [_jsx(DashboardOutlined, {}), " \uC694\uC57D \uB300\uC2DC\uBCF4\uB4DC"] }), children: [_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { span: 8, children: _jsx(Card, { title: "\uCC28\uB7C9 \uC720\uD615 \uBD84\uD3EC", children: filteredVehicles.length > 0 ? (_jsx(VehicleTypeChart, { data: Object.entries(filteredVehicles.reduce((acc, vehicle) => {
                                                        acc[vehicle.type] = (acc[vehicle.type] ?? 0) + 1;
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
                                                        acc[vehicle.status] = (acc[vehicle.status] ?? 0) + 1;
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
                                                }, children: _jsx(Text, { type: "secondary", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) }) }) })] }, "dashboard"), _jsx(TabPane, { tab: _jsxs(_Fragment, { children: [_jsx(FileSearchOutlined, {}), " \uC0C1\uC138 \uBD84\uC11D"] }), children: _jsx(Row, { gutter: [16, 16], children: _jsx(Col, { span: 24, children: _jsx(Alert, { message: "\uAE30\uB2A5 \uC900\uBE44 \uC911", description: "\uC0C1\uC138 \uBD84\uC11D \uAE30\uB2A5\uC740 \uD604\uC7AC \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4. \uACE7 \uC774\uC6A9\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", type: "info", showIcon: true }) }) }) }, "analysis")] })] }) }));
};
export default VehicleReportPage;
