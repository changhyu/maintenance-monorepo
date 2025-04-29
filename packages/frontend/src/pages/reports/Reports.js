import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Button, Box, Tab, Tabs, MenuItem, Select, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { CloudDownload as DownloadIcon, Print as PrintIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `report-tabpanel-${index}`, "aria-labelledby": `report-tab-${index}`, ...other, children: value === index && (_jsx(Box, { sx: { p: 3 }, children: children })) }));
}
// 샘플 보고서 데이터
const sampleVehicleReport = {
    totalVehicles: 125,
    activeVehicles: 98,
    inMaintenance: 15,
    recalled: 12,
    byType: {
        SEDAN: 45,
        SUV: 38,
        TRUCK: 22,
        VAN: 10,
        ELECTRIC: 8,
        HYBRID: 2
    }
};
const sampleMaintenanceReport = {
    totalRecords: 342,
    completedMaintenance: 315,
    scheduledMaintenance: 27,
    averageCost: 254000,
    byMonth: {
        '1월': 28,
        '2월': 31,
        '3월': 26,
        '4월': 30,
        '5월': 32,
        '6월': 35,
        '7월': 38,
        '8월': 29,
        '9월': 32,
        '10월': 27,
        '11월': 18,
        '12월': 16
    }
};
const Reports = () => {
    const [tabValue, setTabValue] = useState(0);
    const [period, setPeriod] = useState('year');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    // 페이지 로드시 데이터 가져오기
    useEffect(() => {
        // 실제 구현에서는 API 호출
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    }, []);
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const handlePeriodChange = (event) => {
        setPeriod(event.target.value);
    };
    const handleRefresh = () => {
        setRefreshing(true);
        // 실제 구현에서는 API 호출
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    };
    const handleDownloadReport = () => {
        const doc = new jsPDF();
        doc.text('차량 정비 관리 보고서', 20, 20);
        doc.text(`생성 일자: ${new Date().toLocaleDateString()}`, 20, 30);
        if (tabValue === 0) {
            // 차량 보고서
            doc.text('차량 현황 보고서', 20, 40);
            const vehicleData = [
                ['총 차량', sampleVehicleReport.totalVehicles],
                ['활성 차량', sampleVehicleReport.activeVehicles],
                ['정비 중', sampleVehicleReport.inMaintenance],
                ['리콜', sampleVehicleReport.recalled]
            ];
            // autoTable 메서드에 타입 적용
            doc.autoTable({
                head: [['구분', '수량']],
                body: vehicleData,
                startY: 50
            });
            const typeData = Object.entries(sampleVehicleReport.byType).map(([type, count]) => [type, count]);
            doc.autoTable({
                head: [['차종', '수량']],
                body: typeData,
                startY: 110
            });
        }
        else {
            // 정비 보고서
            doc.text('정비 현황 보고서', 20, 40);
            const maintenanceData = [
                ['총 정비 건수', sampleMaintenanceReport.totalRecords],
                ['완료된 정비', sampleMaintenanceReport.completedMaintenance],
                ['예정된 정비', sampleMaintenanceReport.scheduledMaintenance],
                ['평균 정비 비용', `${sampleMaintenanceReport.averageCost.toLocaleString()}원`]
            ];
            doc.autoTable({
                head: [['구분', '수량/금액']],
                body: maintenanceData,
                startY: 50
            });
            const monthlyData = Object.entries(sampleMaintenanceReport.byMonth).map(([month, count]) => [month, count]);
            doc.autoTable({
                head: [['월별', '정비 건수']],
                body: monthlyData,
                startY: 110
            });
        }
        doc.save('maintenance-report.pdf');
    };
    const handlePrintReport = () => {
        window.print();
    };
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', mt: 10 }, children: _jsx(CircularProgress, {}) }));
    }
    return (_jsxs(Container, { maxWidth: "lg", sx: { mt: 4, mb: 4 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", component: "h1", children: "\uBCF4\uACE0\uC11C" }), _jsxs(Box, { children: [_jsxs(FormControl, { sx: { minWidth: 120, mr: 2 }, size: "small", children: [_jsx(InputLabel, { id: "period-select-label", children: "\uAE30\uAC04" }), _jsxs(Select, { labelId: "period-select-label", id: "period-select", value: period, label: "\uAE30\uAC04", onChange: handlePeriodChange, children: [_jsx(MenuItem, { value: "month", children: "\uC6D4\uAC04" }), _jsx(MenuItem, { value: "quarter", children: "\uBD84\uAE30" }), _jsx(MenuItem, { value: "year", children: "\uC5F0\uAC04" }), _jsx(MenuItem, { value: "custom", children: "\uC0AC\uC6A9\uC790 \uC9C0\uC815" })] })] }), _jsx(Button, { variant: "outlined", startIcon: _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, sx: { mr: 1 }, children: refreshing ? _jsx(CircularProgress, { size: 24 }) : '새로고침' }), _jsx(Button, { variant: "outlined", startIcon: _jsx(PrintIcon, {}), onClick: handlePrintReport, sx: { mr: 1 }, children: "\uC778\uC1C4" }), _jsx(Button, { variant: "contained", startIcon: _jsx(DownloadIcon, {}), onClick: handleDownloadReport, children: "\uB2E4\uC6B4\uB85C\uB4DC" })] })] }), _jsxs(Paper, { sx: { mb: 3 }, children: [_jsxs(Tabs, { value: tabValue, onChange: handleTabChange, indicatorColor: "primary", textColor: "primary", centered: true, children: [_jsx(Tab, { label: "\uCC28\uB7C9 \uBCF4\uACE0\uC11C" }), _jsx(Tab, { label: "\uC815\uBE44 \uBCF4\uACE0\uC11C" }), _jsx(Tab, { label: "\uC6B4\uC601 \uBCF4\uACE0\uC11C" })] }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 2 }, children: [_jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uCD1D \uCC28\uB7C9" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleVehicleReport.totalVehicles })] }) }), _jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uD65C\uC131 \uCC28\uB7C9" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleVehicleReport.activeVehicles })] }) }), _jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uC815\uBE44 \uC911" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleVehicleReport.inMaintenance })] }) }), _jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uB9AC\uCF5C" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleVehicleReport.recalled })] }) }), _jsx(Box, { sx: { width: '100%' }, children: _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uCC28\uC885\uBCC4 \uD604\uD669" }), _jsx(Box, { sx: { mt: 2, height: 300 }, children: _jsx(Typography, { variant: "body1", children: "\uCC28\uD2B8 \uC601\uC5ED" }) })] }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 2 }, children: [_jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uCD1D \uC815\uBE44 \uAC74\uC218" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleMaintenanceReport.totalRecords })] }) }), _jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uC644\uB8CC\uB41C \uC815\uBE44" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleMaintenanceReport.completedMaintenance })] }) }), _jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uC608\uC815\uB41C \uC815\uBE44" }), _jsx(Typography, { variant: "h3", component: "div", children: sampleMaintenanceReport.scheduledMaintenance })] }) }), _jsx(Box, { sx: { flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }, children: _jsxs(Paper, { sx: { p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uD3C9\uADE0 \uC815\uBE44 \uBE44\uC6A9" }), _jsxs(Typography, { variant: "h3", component: "div", children: [sampleMaintenanceReport.averageCost.toLocaleString(), "\uC6D0"] })] }) }), _jsx(Box, { sx: { width: '100%' }, children: _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC6D4\uBCC4 \uC815\uBE44 \uAC74\uC218" }), _jsx(Box, { sx: { mt: 2, height: 300 }, children: _jsx(Typography, { variant: "body1", children: "\uCC28\uD2B8 \uC601\uC5ED" }) })] }) })] }) }), _jsxs(TabPanel, { value: tabValue, index: 2, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC6B4\uC601 \uBCF4\uACE0\uC11C\uB294 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4." }), _jsx(Typography, { variant: "body1", children: "\uD5A5\uD6C4 \uC5C5\uB370\uC774\uD2B8\uC5D0\uC11C \uC81C\uACF5\uB420 \uC608\uC815\uC785\uB2C8\uB2E4." })] })] })] }));
};
export default Reports;
