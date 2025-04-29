import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { CarOutlined, ToolOutlined, ReloadOutlined } from '@ant-design/icons';
import { Row, Col, Card, Statistic, Badge, Table, Tag, Empty, Spin, Button, Typography, message } from 'antd';
import moment from 'moment';
import { useVehicleService, useMaintenanceService } from '../hooks';
import { DashboardDataService } from '../services/DashboardDataService';
import ReportWidgets from './dashboard/ReportWidgets.jsx';
export const Dashboard = () => {
    // 커스텀 훅 사용
    const { getVehicles } = useVehicleService();
    const { getAllMaintenanceSchedules } = useMaintenanceService();
    const [vehicleStats, setVehicleStats] = useState({
        totalVehicles: 0,
        activeVehicles: 0,
        inMaintenanceVehicles: 0,
        outOfServiceVehicles: 0
    });
    const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
    const [recentMaintenance, setRecentMaintenance] = useState([]);
    const [predictiveMaintenance, setPredictiveMaintenance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataUpdated, setDataUpdated] = useState(new Date());
    const [dataRefreshing, setDataRefreshing] = useState(false);
    const dashboardDataService = new DashboardDataService();
    useEffect(() => {
        fetchDashboardData();
    }, []);
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            // 차량 정보 가져오기
            const vehicles = await getVehicles();
            // 차량 통계 계산
            // status 필드가 실제 Vehicle 인터페이스에 정의된 값과 일치하는지 확인
            const activeVehicles = vehicles.filter(v => v.status === 'active').length;
            const inMaintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
            const outOfServiceVehicles = vehicles.filter(v => v.status === 'outOfService').length;
            setVehicleStats({
                totalVehicles: vehicles.length,
                activeVehicles,
                inMaintenanceVehicles,
                outOfServiceVehicles
            });
            // 정비 데이터 가져오기
            const records = await getAllMaintenanceSchedules();
            // 예정된 정비
            const upcoming = records
                .filter(record => record.status === 'scheduled')
                .sort((a, b) => new Date(a.scheduledDate || '').getTime() - new Date(b.scheduledDate || '').getTime())
                .slice(0, 5);
            setUpcomingMaintenance(upcoming);
            // 최근 정비 기록
            const recent = records
                .filter(record => record.status === 'completed')
                .sort((a, b) => new Date(b.completionDate || '').getTime() - new Date(a.completionDate || '').getTime())
                .slice(0, 5);
            setRecentMaintenance(recent);
            // 예측 정비 (예시 데이터)
            const predictive = [
                {
                    vehicleId: 'V001',
                    component: '브레이크 패드',
                    probability: 0.85,
                    estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    severity: 'high'
                },
                {
                    vehicleId: 'V003',
                    component: '엔진 오일',
                    probability: 0.75,
                    estimatedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    severity: 'medium'
                },
                {
                    vehicleId: 'V007',
                    component: '에어 필터',
                    probability: 0.65,
                    estimatedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                    severity: 'low'
                }
            ];
            setPredictiveMaintenance(predictive);
            setDataUpdated(new Date());
        }
        catch (err) {
            console.error('대시보드 데이터 로드 오류:', err);
            setError('데이터를 불러오는 중 오류가 발생했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 대시보드 데이터 수동 새로고침
    const refreshDashboardData = async () => {
        try {
            setDataRefreshing(true);
            await fetchDashboardData();
            message.success('대시보드 데이터가 업데이트되었습니다.');
        }
        catch (err) {
            message.error('데이터 새로고침 중 오류가 발생했습니다.');
        }
        finally {
            setDataRefreshing(false);
        }
    };
    // 날짜 포맷팅
    const formatDate = (dateString) => {
        return moment(dateString).format('YYYY년 MM월 DD일');
    };
    // 시간 포맷팅
    const formatTime = (date) => {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    // 상태에 따른 색상 결정
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
            case 'completed':
                return 'success';
            case 'maintenance':
            case 'scheduled':
                return 'warning';
            case 'outOfService':
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };
    // 정비 심각도에 따른 색상 결정
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high':
                return 'red';
            case 'medium':
                return 'orange';
            case 'low':
                return 'green';
            default:
                return 'blue';
        }
    };
    // 로딩 중이면 로딩 UI 표시
    if (loading) {
        return (_jsx("div", { className: "flex justify-center items-center h-full", children: _jsx(Spin, { size: "large", tip: "\uB300\uC2DC\uBCF4\uB4DC \uB370\uC774\uD130 \uB85C\uB529 \uC911..." }) }));
    }
    // 에러가 있으면 에러 메시지 표시
    if (error) {
        return (_jsx("div", { className: "flex justify-center items-center h-full", children: _jsx(Empty, { description: error, image: Empty.PRESENTED_IMAGE_SIMPLE }) }));
    }
    // 예측 정비 테이블용 컬럼 정의
    const predictiveColumns = [
        { title: "차량 ID", dataIndex: "vehicleId", key: "vehicleId" },
        { title: "부품", dataIndex: "component", key: "component" },
        {
            title: "예상 정비일",
            dataIndex: "estimatedDate",
            key: "estimatedDate",
            render: (date) => formatDate(date.toISOString())
        },
        {
            title: "심각도",
            dataIndex: "severity",
            key: "severity",
            render: severity => _jsx(Tag, { color: getSeverityColor(severity), children: severity.toUpperCase() })
        },
        {
            title: "확률",
            dataIndex: "probability",
            key: "probability",
            render: probability => `${Math.round(probability * 100)}%`
        }
    ];
    // 최근 정비 기록용 컬럼 (확장)
    const maintenanceColumns = [
        { title: "차량 ID", dataIndex: "vehicleId", key: "vehicleId" },
        { title: "정비 유형", dataIndex: "maintenanceType", key: "maintenanceType" },
        {
            title: "완료일",
            dataIndex: "completionDate",
            key: "completionDate",
            render: date => (date ? formatDate(date) : '-')
        },
        { title: "설명", dataIndex: "description", key: "description", ellipsis: true },
        {
            title: "비용",
            dataIndex: "cost",
            key: "cost",
            render: cost => (cost ? `₩${cost.toLocaleString()}` : '-')
        },
        {
            title: "상태",
            dataIndex: "status",
            key: "status",
            render: status => _jsx(Badge, { status: getStatusColor(status), text: status })
        }
    ];
    // 예정된 정비 컬럼 정의
    const upcomingMaintenanceColumns = [
        { title: "차량 ID", dataIndex: "vehicleId", key: "vehicleId" },
        { title: "정비 유형", dataIndex: "maintenanceType", key: "maintenanceType" },
        {
            title: "예정일",
            dataIndex: "scheduledDate",
            key: "scheduledDate",
            render: date => (date ? formatDate(date) : '-')
        },
        { title: "설명", dataIndex: "description", key: "description", ellipsis: true }
    ];
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx(Typography.Title, { level: 2, children: "\uCC28\uB7C9 \uC815\uBE44 \uB300\uC2DC\uBCF4\uB4DC" }), _jsxs("div", { className: "flex items-center", children: [_jsxs("span", { className: "text-sm text-gray-500 mr-4", children: ["\uCD5C\uADFC \uC5C5\uB370\uC774\uD2B8: ", formatTime(dataUpdated)] }), _jsx(Button, { icon: _jsx(ReloadOutlined, { spin: dataRefreshing }), onClick: refreshDashboardData, loading: dataRefreshing, children: "\uB300\uC2DC\uBCF4\uB4DC \uC0C8\uB85C\uACE0\uCE68" })] })] }), _jsxs(Row, { gutter: 16, className: "mb-6", children: [_jsx(Col, { span: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\uC804\uCCB4 \uCC28\uB7C9", value: vehicleStats.totalVehicles, prefix: _jsx(CarOutlined, {}) }) }) }), _jsx(Col, { span: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\uC6B4\uD589 \uC911 \uCC28\uB7C9", value: vehicleStats.activeVehicles, valueStyle: { color: '#3f8600' }, prefix: _jsx(CarOutlined, {}) }) }) }), _jsx(Col, { span: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\uC815\uBE44 \uD544\uC694 \uCC28\uB7C9", value: vehicleStats.inMaintenanceVehicles, valueStyle: { color: '#faad14' }, prefix: _jsx(ToolOutlined, {}) }) }) }), _jsx(Col, { span: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\uC6B4\uD589 \uBD88\uAC00 \uCC28\uB7C9", value: vehicleStats.outOfServiceVehicles, valueStyle: { color: '#cf1322' }, prefix: _jsx(CarOutlined, {}) }) }) })] }), _jsx(ReportWidgets, { dashboardService: dashboardDataService }), _jsxs(Row, { gutter: 16, className: "mb-6", children: [_jsx(Col, { span: 12, children: _jsx(Card, { title: "\uC608\uC815\uB41C \uC815\uBE44", extra: _jsx("a", { href: "/maintenance", children: "\uB354 \uBCF4\uAE30" }), children: upcomingMaintenance.length > 0 ? (_jsx(Table, { dataSource: upcomingMaintenance, columns: upcomingMaintenanceColumns, pagination: false, size: "small", rowKey: "id" })) : (_jsx(Empty, { description: "\uC608\uC815\uB41C \uC815\uBE44\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" })) }) }), _jsx(Col, { span: 12, children: _jsx(Card, { title: "\uC608\uCE21 \uC815\uBE44", extra: _jsx("a", { href: "/predictive", children: "\uB354 \uBCF4\uAE30" }), children: predictiveMaintenance.length > 0 ? (_jsx(Table, { dataSource: predictiveMaintenance, columns: predictiveColumns, pagination: false, size: "small", rowKey: (record, index) => `${record.vehicleId}-${index}` })) : (_jsx(Empty, { description: "\uC608\uCE21 \uC815\uBE44 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" })) }) })] }), _jsx(Card, { title: "\uCD5C\uADFC \uC815\uBE44 \uAE30\uB85D", extra: _jsx("a", { href: "/maintenance/history", children: "\uC804\uCCB4 \uBCF4\uAE30" }), children: recentMaintenance.length > 0 ? (_jsx(Table, { dataSource: recentMaintenance, columns: maintenanceColumns, pagination: false, size: "small", rowKey: "id" })) : (_jsx(Empty, { description: "\uCD5C\uADFC \uC815\uBE44 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" })) })] }));
};
export default Dashboard;
