import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useState, useEffect } from 'react';
import { VehicleTypeChart, MaintenanceStatusChart, MaintenanceTrendChart, CostDistributionChart, UtilizationChart } from './charts';
import ScrDataDashboard from './ScrDataDashboard';
import { DashboardDataService } from '../services/DashboardDataService';
import DashboardFilters from './dashboard/DashboardFilters';
/**
 * 통합 대시보드 컴포넌트
 * 여러 유형의 데이터를 한 화면에 통합하여 보여주는 대시보드
 */
const IntegratedDashboard = ({ initialTab = 'overview', loading = false, userId, companyId, className = '' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [overviewData, setOverviewData] = useState([]);
    const [vehicleData, setVehicleData] = useState({ cards: [] });
    const [maintenanceData, setMaintenanceData] = useState({ cards: [] });
    const [fleetData, setFleetData] = useState({ cards: [] });
    // 차트 데이터 상태
    const [vehicleTypeChartData, setVehicleTypeChartData] = useState([]);
    const [maintenanceStatusChartData, setMaintenanceStatusChartData] = useState([]);
    const [maintenancePriorityChartData, setMaintenancePriorityChartData] = useState([]);
    const [maintenanceTrendChartData, setMaintenanceTrendChartData] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const dashboardService = new DashboardDataService();
    // 필터 상태 (새로운 필터 타입으로 변경)
    const [filters, setFilters] = useState({
        dateRange: null,
        vehicleTypes: ['all'],
        status: ['all'],
        locations: ['all']
    });
    // 필터 변경 핸들러 (새로운 필터 타입으로 변경)
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        loadFilteredDashboardData(newFilters);
    };
    // 데이터 로드 함수 (필터 없음)
    const loadDashboardData = async () => {
        setIsDataLoading(true);
        try {
            // 일반 데이터 로드
            const overview = await dashboardService.getOverviewData();
            const vehicle = await dashboardService.getVehicleData();
            const maintenance = await dashboardService.getMaintenanceData();
            const fleet = await dashboardService.getFleetData();
            // 기본 데이터 설정
            setOverviewData(overview);
            setVehicleData(vehicle);
            setMaintenanceData(maintenance);
            setFleetData(fleet);
            // 차트 데이터 설정 - 임시 데이터로 구현
            // 실제 구현 시 API 연동 필요
            setVehicleTypeChartData([
                { label: '승용차', value: 25 },
                { label: 'SUV', value: 35 },
                { label: '밴', value: 15 },
                { label: '트럭', value: 20 },
                { label: '기타', value: 5 }
            ]);
            setMaintenanceStatusChartData([
                { label: '정기 점검', value: 45 },
                { label: '부품 교체', value: 30 },
                { label: '고장 수리', value: 15 },
                { label: '타이어', value: 20 },
                { label: '기타', value: 10 }
            ]);
            setMaintenancePriorityChartData([
                { label: '높음', value: 25 },
                { label: '중간', value: 40 },
                { label: '낮음', value: 55 }
            ]);
            setMaintenanceTrendChartData(dashboardService.formatMaintenanceTrendChartData());
        }
        catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
        finally {
            setIsDataLoading(false);
        }
    };
    // 필터링된 데이터 로드 함수 (새로운 필터 타입으로 변경)
    const loadFilteredDashboardData = async (currentFilters) => {
        setIsDataLoading(true);
        try {
            // 기존 DashboardDataService에 맞게 필터 변환
            const adaptedFilters = {
                dateRange: {
                    startDate: currentFilters.dateRange
                        ? new Date(currentFilters.dateRange[0])
                        : new Date(new Date().setMonth(new Date().getMonth() - 1)),
                    endDate: currentFilters.dateRange ? new Date(currentFilters.dateRange[1]) : new Date()
                },
                vehicleType: currentFilters.vehicleTypes.includes('all')
                    ? ''
                    : currentFilters.vehicleTypes[0],
                maintenanceStatus: currentFilters.status.includes('all') ? '' : currentFilters.status[0],
                priority: ''
            };
            // 일반 데이터 로드
            const overview = await dashboardService.getOverviewData();
            const vehicle = await dashboardService.getVehicleData();
            const maintenance = await dashboardService.getMaintenanceData();
            const fleet = await dashboardService.getFleetData();
            // 기본 데이터 설정
            setOverviewData(overview);
            setVehicleData(vehicle);
            setMaintenanceData(maintenance);
            setFleetData(fleet);
            // 차트 데이터 설정 - 임시 데이터로 구현
            // 실제 구현 시 API 연동 필요
            setVehicleTypeChartData([
                { label: '승용차', value: 25 },
                { label: 'SUV', value: 35 },
                { label: '밴', value: 15 },
                { label: '트럭', value: 20 },
                { label: '기타', value: 5 }
            ]);
            setMaintenanceStatusChartData([
                { label: '정기 점검', value: 45 },
                { label: '부품 교체', value: 30 },
                { label: '고장 수리', value: 15 },
                { label: '타이어', value: 20 },
                { label: '기타', value: 10 }
            ]);
            setMaintenancePriorityChartData([
                { label: '높음', value: 25 },
                { label: '중간', value: 40 },
                { label: '낮음', value: 55 }
            ]);
            setMaintenanceTrendChartData(dashboardService.formatMaintenanceTrendChartData());
        }
        catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
        finally {
            setIsDataLoading(false);
        }
    };
    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        loadFilteredDashboardData(filters);
    }, [userId, companyId]);
    // 탭 변경 핸들러
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [_jsx("div", { className: "flex justify-between items-center", children: _jsxs("div", { className: "flex space-x-1", children: [_jsx("button", { className: `px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'overview'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, onClick: () => handleTabChange('overview'), children: "\uC804\uCCB4 \uAC1C\uC694" }), _jsx("button", { className: `px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'vehicles'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, onClick: () => handleTabChange('vehicles'), children: "\uCC28\uB7C9 \uD604\uD669" }), _jsx("button", { className: `px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'maintenance'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, onClick: () => handleTabChange('maintenance'), children: "\uC815\uBE44 \uD604\uD669" }), _jsx("button", { className: `px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'fleet'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, onClick: () => handleTabChange('fleet'), children: "\uC6B4\uC601 \uD604\uD669" })] }) }), _jsx(DashboardFilters, { onFilterChange: handleFilterChange }), activeTab === 'overview' && (_jsx("div", { className: "space-y-6", children: _jsx(ScrDataDashboard, { title: "\uC804\uCCB4 \uAC1C\uC694", data: overviewData, loading: loading || isDataLoading, columns: 4, headerContent: _jsx("button", { className: "text-sm text-blue-600 hover:text-blue-800", onClick: () => loadFilteredDashboardData(filters), children: "\uC0C8\uB85C\uACE0\uCE68" }) }) })), activeTab === 'vehicles' && (_jsxs("div", { className: "space-y-6", children: [_jsx(ScrDataDashboard, { title: "\uCC28\uB7C9 \uD604\uD669", data: vehicleData.cards, loading: loading || isDataLoading, columns: 4, headerContent: _jsx("button", { className: "text-sm text-blue-600 hover:text-blue-800", onClick: () => loadFilteredDashboardData(filters), children: "\uC0C8\uB85C\uACE0\uCE68" }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(VehicleTypeChart, { data: vehicleTypeChartData, isLoading: isDataLoading, title: "\uCC28\uB7C9 \uC720\uD615\uBCC4 \uBD84\uD3EC" }), _jsxs("div", { className: "bg-white rounded-lg shadow p-4", children: [_jsx("h3", { className: "text-lg font-medium text-gray-800 mb-4", children: "\uCC28\uB7C9 \uC0C1\uD0DC \uBD84\uD3EC" }), _jsxs("div", { className: "flex flex-col space-y-2", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-green-500 mr-2" }), _jsx("span", { className: "text-sm text-gray-600", children: "\uC591\uD638 (70%)" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-yellow-500 mr-2" }), _jsx("span", { className: "text-sm text-gray-600", children: "\uC8FC\uC758 (20%)" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-red-500 mr-2" }), _jsx("span", { className: "text-sm text-gray-600", children: "\uC704\uD5D8 (10%)" })] })] })] })] })] })), activeTab === 'maintenance' && (_jsxs("div", { className: "space-y-6", children: [_jsx(ScrDataDashboard, { title: "\uC815\uBE44 \uD604\uD669", data: maintenanceData.cards, loading: loading || isDataLoading, columns: 4, headerContent: _jsx("button", { className: "text-sm text-blue-600 hover:text-blue-800", onClick: () => loadFilteredDashboardData(filters), children: "\uC0C8\uB85C\uACE0\uCE68" }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(MaintenanceStatusChart, { data: maintenanceStatusChartData, isLoading: isDataLoading, title: "\uC815\uBE44 \uC720\uD615\uBCC4 \uBD84\uD3EC" }), _jsx(MaintenanceStatusChart, { data: maintenancePriorityChartData, isLoading: isDataLoading, title: "\uC815\uBE44 \uC6B0\uC120\uC21C\uC704\uBCC4 \uBD84\uD3EC" })] }), _jsx(MaintenanceTrendChart, { data: maintenanceTrendChartData, isLoading: isDataLoading, title: "\uC6D4\uBCC4 \uC815\uBE44 \uCD94\uC774", height: 350 })] })), activeTab === 'fleet' && (_jsxs("div", { className: "space-y-6", children: [_jsx(ScrDataDashboard, { title: "\uC6B4\uC601 \uD604\uD669", data: fleetData.cards, loading: loading || isDataLoading, columns: 4, headerContent: _jsx("button", { className: "text-sm text-blue-600 hover:text-blue-800", onClick: () => loadFilteredDashboardData(filters), children: "\uC0C8\uB85C\uACE0\uCE68" }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(CostDistributionChart, { data: [
                                    { label: '연료', value: 45000000 },
                                    { label: '정비', value: 35000000 },
                                    { label: '보험', value: 30000000 },
                                    { label: '감가상각', value: 25000000 },
                                    { label: '기타', value: 15000000 }
                                ], isLoading: isDataLoading, title: "\uBE44\uC6A9 \uCE74\uD14C\uACE0\uB9AC\uBCC4 \uBD84\uD3EC" }), _jsx(UtilizationChart, { data: {
                                    value: 85,
                                    previousValue: 83,
                                    change: 2,
                                    label: '차량 가동률'
                                }, isLoading: isDataLoading, title: "\uCC28\uB7C9 \uD65C\uC6A9\uB960" })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-4", children: [_jsx("h3", { className: "text-lg font-medium text-gray-800 mb-4", children: "\uC6D4\uBCC4 \uBE44\uC6A9 \uCD94\uC774" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm text-left text-gray-500", children: [_jsx("thead", { className: "text-xs text-gray-700 uppercase bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-6 py-3", children: "\uC6D4" }), _jsx("th", { scope: "col", className: "px-6 py-3", children: "\uC5F0\uB8CC" }), _jsx("th", { scope: "col", className: "px-6 py-3", children: "\uC815\uBE44" }), _jsx("th", { scope: "col", className: "px-6 py-3", children: "\uBCF4\uD5D8" }), _jsx("th", { scope: "col", className: "px-6 py-3", children: "\uAE30\uD0C0" }), _jsx("th", { scope: "col", className: "px-6 py-3", children: "\uD569\uACC4" })] }) }), _jsx("tbody", { children: [
                                                {
                                                    month: '1월',
                                                    fuel: 7200000,
                                                    maintenance: 5500000,
                                                    insurance: 2800000,
                                                    etc: 3000000
                                                },
                                                {
                                                    month: '2월',
                                                    fuel: 6500000,
                                                    maintenance: 3200000,
                                                    insurance: 2800000,
                                                    etc: 2700000
                                                },
                                                {
                                                    month: '3월',
                                                    fuel: 7100000,
                                                    maintenance: 6700000,
                                                    insurance: 2800000,
                                                    etc: 2800000
                                                },
                                                {
                                                    month: '4월',
                                                    fuel: 6900000,
                                                    maintenance: 4100000,
                                                    insurance: 2800000,
                                                    etc: 2900000
                                                },
                                                {
                                                    month: '5월',
                                                    fuel: 7800000,
                                                    maintenance: 3900000,
                                                    insurance: 2800000,
                                                    etc: 3200000
                                                },
                                                {
                                                    month: '6월',
                                                    fuel: 8300000,
                                                    maintenance: 6200000,
                                                    insurance: 2800000,
                                                    etc: 3500000
                                                }
                                            ].map((item, index) => {
                                                const total = item.fuel + item.maintenance + item.insurance + item.etc;
                                                return (_jsxs("tr", { className: "bg-white border-b", children: [_jsx("th", { scope: "row", className: "px-6 py-4 font-medium text-gray-900 whitespace-nowrap", children: item.month }), _jsx("td", { className: "px-6 py-4", children: new Intl.NumberFormat('ko-KR', {
                                                                style: 'currency',
                                                                currency: 'KRW'
                                                            }).format(item.fuel) }), _jsx("td", { className: "px-6 py-4", children: new Intl.NumberFormat('ko-KR', {
                                                                style: 'currency',
                                                                currency: 'KRW'
                                                            }).format(item.maintenance) }), _jsx("td", { className: "px-6 py-4", children: new Intl.NumberFormat('ko-KR', {
                                                                style: 'currency',
                                                                currency: 'KRW'
                                                            }).format(item.insurance) }), _jsx("td", { className: "px-6 py-4", children: new Intl.NumberFormat('ko-KR', {
                                                                style: 'currency',
                                                                currency: 'KRW'
                                                            }).format(item.etc) }), _jsx("td", { className: "px-6 py-4 font-medium", children: new Intl.NumberFormat('ko-KR', {
                                                                style: 'currency',
                                                                currency: 'KRW'
                                                            }).format(total) })] }, index));
                                            }) })] }) })] })] }))] }));
};
export default IntegratedDashboard;
