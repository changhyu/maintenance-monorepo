import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, CardHeader, Chip, Divider, Grid, IconButton, LinearProgress, List, ListItem, ListItemText, Paper, Tab, Tabs, Typography, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Build as BuildIcon, DirectionsCar as CarIcon, Delete as DeleteIcon, } from '@mui/icons-material';
// 테스트 데이터
const mockVehicles = {
    '1': {
        id: '1',
        vin: 'JH4DA9370MS016526',
        make: '현대',
        model: '소나타',
        year: 2021,
        licensePlate: '서울 가 1234',
        color: '흰색',
        type: 'sedan',
        status: 'active',
        mileage: 15000,
        lastMaintenance: '2023-03-15',
        owner: '홍길동',
        purchaseDate: '2021-01-15',
        insuranceExpiry: '2024-01-14',
        fuelType: '가솔린',
        transmission: '자동',
        engineSize: '2.0L',
        notes: '회사 임원용 차량',
    },
};
const mockMaintenance = [
    {
        id: '1',
        vehicleId: '1',
        type: '정기 점검',
        description: '엔진 오일 교체 및 기본 점검',
        date: '2023-03-15',
        status: 'completed',
        cost: 150000,
        technician: '김기술',
        shop: '현대 서비스센터',
        notes: '다음 점검은 10,000km 주행 후 권장'
    },
    {
        id: '2',
        vehicleId: '1',
        type: '브레이크 패드 교체',
        description: '전방 브레이크 패드 마모로 교체',
        date: '2022-12-10',
        status: 'completed',
        cost: 280000,
        technician: '박정비',
        shop: '현대 서비스센터',
    },
    {
        id: '3',
        vehicleId: '1',
        type: '타이어 교체',
        description: '4개 타이어 모두 교체',
        date: '2023-05-28',
        status: 'scheduled',
        cost: 560000,
        shop: '타이어뱅크',
    },
];
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `vehicle-tabpanel-${index}`, "aria-labelledby": `vehicle-tab-${index}`, ...other, children: value === index && (_jsx(Box, { sx: { py: 3 }, children: children })) }));
}
const VehicleDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [vehicle, setVehicle] = useState(null);
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [statusDialog, setStatusDialog] = useState(false);
    const [newStatus, setNewStatus] = useState(null);
    useEffect(() => {
        // API 호출 시뮬레이션
        const fetchData = async () => {
            try {
                setTimeout(() => {
                    if (id && mockVehicles[id]) {
                        setVehicle(mockVehicles[id]);
                        setMaintenanceRecords(mockMaintenance.filter(m => m.vehicleId === id));
                    }
                    setLoading(false);
                }, 1000);
            }
            catch (error) {
                console.error('차량 상세 정보 로딩 실패:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const handleStatusChange = (status) => {
        setNewStatus(status);
        setStatusDialog(true);
    };
    const confirmStatusChange = () => {
        if (vehicle && newStatus) {
            // 실제로는 API 호출로 상태 변경
            setVehicle({
                ...vehicle,
                status: newStatus,
            });
        }
        setStatusDialog(false);
        setNewStatus(null);
    };
    const handleDeleteClick = () => {
        setDeleteDialog(true);
    };
    const confirmDelete = () => {
        // 실제로는 API 호출로 차량 삭제
        navigate('/vehicles');
        setDeleteDialog(false);
    };
    const getStatusChip = (status) => {
        let color = 'default';
        let label = '';
        switch (status) {
            case 'active':
                color = 'success';
                label = '활성';
                break;
            case 'maintenance':
                color = 'warning';
                label = '정비 중';
                break;
            case 'inactive':
                color = 'error';
                label = '비활성';
                break;
            case 'recalled':
                color = 'error';
                label = '리콜';
                break;
            default:
                label = status;
        }
        return _jsx(Chip, { color: color, label: label });
    };
    const formatDate = (dateString) => {
        if (!dateString)
            return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
    };
    if (loading) {
        return (_jsxs(Box, { sx: { width: '100%' }, children: [_jsx(LinearProgress, {}), _jsx(Typography, { sx: { mt: 2 }, variant: "body1", children: "\uCC28\uB7C9 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    if (!vehicle) {
        return (_jsxs(Box, { children: [_jsx(Button, { startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate('/vehicles'), sx: { mb: 3 }, children: "\uCC28\uB7C9 \uBAA9\uB85D\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30" }), _jsx(Typography, { variant: "h5", component: "h1", children: "\uCC28\uB7C9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
    }
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Button, { startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate('/vehicles'), children: "\uCC28\uB7C9 \uBAA9\uB85D\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30" }), _jsxs(Box, { children: [_jsx(Button, { variant: "outlined", color: "primary", startIcon: _jsx(BuildIcon, {}), onClick: () => navigate(`/vehicles/${id}/maintenance/new`), sx: { mr: 1 }, children: "\uC815\uBE44 \uB4F1\uB85D" }), _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(EditIcon, {}), onClick: () => navigate(`/vehicles/${id}/edit`), children: "\uC218\uC815\uD558\uAE30" })] })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: _jsxs(Typography, { variant: "h5", component: "h1", children: [vehicle.make, " ", vehicle.model] }), subheader: `${vehicle.year}년형 ${vehicle.color || ''}`, avatar: _jsx(Avatar, { sx: { bgcolor: 'primary.main' }, children: _jsx(CarIcon, {}) }), action: _jsx(IconButton, { "aria-label": "delete", onClick: handleDeleteClick, children: _jsx(DeleteIcon, {}) }) }), _jsxs(CardContent, { children: [_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, children: "\uC0C1\uD0DC" }), getStatusChip(vehicle.status)] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, children: "\uBC88\uD638\uD310" }), _jsx(Typography, { variant: "h6", children: vehicle.licensePlate })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, children: "VIN" }), _jsx(Typography, { variant: "body1", children: vehicle.vin })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, children: "\uC8FC\uD589 \uAC70\uB9AC" }), _jsxs(Typography, { variant: "h6", children: [vehicle.mileage.toLocaleString(), " km"] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Button, { fullWidth: true, variant: "outlined", onClick: () => setStatusDialog(true), children: "\uC0C1\uD0DC \uBCC0\uACBD" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 8, children: _jsxs(Paper, { children: [_jsxs(Tabs, { value: tabValue, onChange: handleTabChange, indicatorColor: "primary", textColor: "primary", children: [_jsx(Tab, { label: "\uC0C1\uC138 \uC815\uBCF4" }), _jsx(Tab, { label: "\uC815\uBE44 \uC774\uB825" }), _jsx(Tab, { label: "\uBB38\uC11C" })] }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uC18C\uC720\uC790" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: vehicle.owner || '-' }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uAD6C\uB9E4 \uC77C\uC790" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: formatDate(vehicle.purchaseDate) }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uBCF4\uD5D8 \uB9CC\uB8CC\uC77C" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: formatDate(vehicle.insuranceExpiry) })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uC5F0\uB8CC \uC720\uD615" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: vehicle.fuelType || '-' }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uBCC0\uC18D\uAE30" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: vehicle.transmission || '-' }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uC5D4\uC9C4" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: vehicle.engineSize || '-' })] }), vehicle.notes && (_jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uBA54\uBAA8" }), _jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: _jsx(Typography, { variant: "body1", children: vehicle.notes }) })] }))] }) }), _jsxs(TabPanel, { value: tabValue, index: 1, children: [_jsx(Box, { sx: { display: 'flex', justifyContent: 'flex-end', mb: 2 }, children: _jsx(Button, { variant: "contained", startIcon: _jsx(BuildIcon, {}), onClick: () => navigate(`/vehicles/${id}/maintenance/new`), children: "\uC0C8 \uC815\uBE44 \uB4F1\uB85D" }) }), _jsxs(List, { children: [maintenanceRecords.map((record) => (_jsxs(React.Fragment, { children: [_jsx(ListItem, { alignItems: "flex-start", secondaryAction: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: new Intl.NumberFormat('ko-KR', {
                                                                            style: 'currency',
                                                                            currency: 'KRW',
                                                                            maximumFractionDigits: 0,
                                                                        }).format(record.cost) }), _jsx(Button, { size: "small", onClick: () => navigate(`/maintenance/${record.id}`), children: "\uC0C1\uC138 \uBCF4\uAE30" })] }), children: _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "body1", fontWeight: "medium", children: record.type }), record.status === 'completed' ? (_jsx(Chip, { size: "small", color: "success", label: "\uC644\uB8CC" })) : record.status === 'scheduled' ? (_jsx(Chip, { size: "small", color: "info", label: "\uC608\uC57D\uB428" })) : (_jsx(Chip, { size: "small", color: "warning", label: "\uC9C4\uD589 \uC911" }))] }), secondary: _jsxs(_Fragment, { children: [_jsx(Typography, { component: "span", variant: "body2", color: "text.primary", children: formatDate(record.date) }), " — ", record.description, record.shop && _jsxs("div", { children: ["\uC815\uBE44\uC18C: ", record.shop] })] }) }) }), _jsx(Divider, { component: "li" })] }, record.id))), maintenanceRecords.length === 0 && (_jsx(ListItem, { children: _jsx(ListItemText, { primary: "\uC815\uBE44 \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", secondary: "\uC0C8 \uC815\uBE44 \uC774\uB825\uC744 \uB4F1\uB85D\uD558\uB824\uBA74 '\uC0C8 \uC815\uBE44 \uB4F1\uB85D' \uBC84\uD2BC\uC744 \uD074\uB9AD\uD558\uC138\uC694." }) }))] })] }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }, children: _jsx(Typography, { variant: "body1", color: "text.secondary", children: "\uB4F1\uB85D\uB41C \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }) }) })] }) })] }), _jsxs(Dialog, { open: deleteDialog, onClose: () => setDeleteDialog(false), children: [_jsx(DialogTitle, { children: "\uCC28\uB7C9 \uC0AD\uC81C" }), _jsx(DialogContent, { children: _jsxs(DialogContentText, { children: [vehicle.make, " ", vehicle.model, " (", vehicle.licensePlate, ") \uCC28\uB7C9\uC744 \uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setDeleteDialog(false), children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: confirmDelete, color: "error", children: "\uC0AD\uC81C" })] })] }), _jsxs(Dialog, { open: statusDialog, onClose: () => setStatusDialog(false), children: [_jsx(DialogTitle, { children: "\uCC28\uB7C9 \uC0C1\uD0DC \uBCC0\uACBD" }), _jsxs(DialogContent, { children: [_jsx(DialogContentText, { sx: { mb: 2 }, children: "\uCC28\uB7C9 \uC0C1\uD0DC\uB97C \uC120\uD0DD\uD558\uC138\uC694:" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 1 }, children: [_jsx(Button, { variant: newStatus === 'active' ? 'contained' : 'outlined', color: "success", onClick: () => handleStatusChange('active'), children: "\uD65C\uC131" }), _jsx(Button, { variant: newStatus === 'maintenance' ? 'contained' : 'outlined', color: "warning", onClick: () => handleStatusChange('maintenance'), children: "\uC815\uBE44 \uC911" }), _jsx(Button, { variant: newStatus === 'inactive' ? 'contained' : 'outlined', color: "error", onClick: () => handleStatusChange('inactive'), children: "\uBE44\uD65C\uC131" }), _jsx(Button, { variant: newStatus === 'recalled' ? 'contained' : 'outlined', color: "error", onClick: () => handleStatusChange('recalled'), children: "\uB9AC\uCF5C" })] })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setStatusDialog(false), children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: confirmStatusChange, color: "primary", disabled: !newStatus, children: "\uC800\uC7A5" })] })] })] }));
};
export default VehicleDetail;
