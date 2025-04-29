import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Divider, Grid, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Paper, Typography, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon, DirectionsCar as CarIcon, Inventory as PartIcon, Description as DocumentIcon, Person as PersonIcon, Store as ShopIcon, EventAvailable as DateIcon, Build as BuildIcon, Receipt as ReceiptIcon, } from '@mui/icons-material';
// 테스트 데이터
const mockMaintenanceRecords = {
    '1': {
        id: '1',
        vehicleId: '1',
        vehicleName: '현대 소나타',
        vehicleLicensePlate: '서울 가 1234',
        type: '정기 점검',
        description: '엔진 오일 교체 및 기본 점검',
        date: '2023-05-15',
        status: 'completed',
        cost: 150000,
        technician: '김기술',
        shop: '현대 서비스센터',
        notes: '다음 점검은 10,000km 주행 후 권장',
        completionDate: '2023-05-15',
        mileage: 15000,
        parts: [
            {
                id: '1',
                name: '엔진 오일',
                partNumber: 'HMC-OIL-5W30',
                quantity: 5,
                unitCost: 15000,
                totalCost: 75000,
            },
            {
                id: '2',
                name: '오일 필터',
                partNumber: 'HMC-FILTER-001',
                quantity: 1,
                unitCost: 25000,
                totalCost: 25000,
            },
        ],
        documents: [
            {
                id: '1',
                name: '정비 영수증.pdf',
                fileUrl: '#',
                uploadedAt: '2023-05-15',
                size: 245000,
                type: 'application/pdf',
            },
            {
                id: '2',
                name: '점검표.jpg',
                fileUrl: '#',
                uploadedAt: '2023-05-15',
                size: 1245000,
                type: 'image/jpeg',
            },
        ],
    },
    '3': {
        id: '3',
        vehicleId: '3',
        vehicleName: '테슬라 모델 3',
        vehicleLicensePlate: '서울 다 9012',
        type: '타이어 교체',
        description: '4개 타이어 모두 교체',
        date: '2023-05-28',
        status: 'scheduled',
        cost: 560000,
        shop: '타이어뱅크',
        parts: [
            {
                id: '3',
                name: '미쉐린 타이어 225/45R17',
                partNumber: 'MICH-225-45-17',
                quantity: 4,
                unitCost: 140000,
                totalCost: 560000,
            },
        ],
    },
};
const MaintenanceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [maintenanceRecord, setMaintenanceRecord] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [statusChangeDialog, setStatusChangeDialog] = useState({ open: false, status: null });
    useEffect(() => {
        // API 호출 시뮬레이션
        const fetchData = async () => {
            try {
                setTimeout(() => {
                    if (id && mockMaintenanceRecords[id]) {
                        setMaintenanceRecord(mockMaintenanceRecords[id]);
                    }
                    setLoading(false);
                }, 1000);
            }
            catch (error) {
                console.error('정비 상세 정보 로딩 실패:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);
    const handleDeleteClick = () => {
        setDeleteDialog(true);
    };
    const confirmDelete = () => {
        // 실제로는 API 호출로 정비 기록 삭제
        navigate('/maintenance');
        setDeleteDialog(false);
    };
    const handleStatusChange = (status) => {
        setStatusChangeDialog({
            open: true,
            status,
        });
    };
    const confirmStatusChange = () => {
        if (maintenanceRecord && statusChangeDialog.status) {
            // 실제로는 API 호출로 상태 변경
            setMaintenanceRecord({
                ...maintenanceRecord,
                status: statusChangeDialog.status,
                completionDate: statusChangeDialog.status === 'completed' ? new Date().toISOString() : maintenanceRecord.completionDate,
            });
        }
        setStatusChangeDialog({ open: false, status: null });
    };
    const getStatusChip = (status) => {
        let color = 'default';
        let label = '';
        switch (status) {
            case 'scheduled':
                color = 'info';
                label = '예약됨';
                break;
            case 'in_progress':
                color = 'warning';
                label = '진행 중';
                break;
            case 'completed':
                color = 'success';
                label = '완료';
                break;
            case 'cancelled':
                color = 'error';
                label = '취소됨';
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
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
        }).format(amount);
    };
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    if (loading) {
        return (_jsxs(Box, { sx: { width: '100%' }, children: [_jsx(LinearProgress, {}), _jsx(Typography, { sx: { mt: 2 }, variant: "body1", children: "\uC815\uBE44 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    if (!maintenanceRecord) {
        return (_jsxs(Box, { children: [_jsx(Button, { startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate('/maintenance'), sx: { mb: 3 }, children: "\uC815\uBE44 \uBAA9\uB85D\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30" }), _jsx(Alert, { severity: "error", children: "\uD574\uB2F9 \uC815\uBE44 \uAE30\uB85D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
    }
    // 총 비용 계산
    const partsTotal = maintenanceRecord.parts?.reduce((sum, part) => sum + part.totalCost, 0) || 0;
    const laborCost = maintenanceRecord.cost - partsTotal;
    const totalCost = maintenanceRecord.cost;
    // 상태에 따른 액션 버튼 렌더링
    const renderActionButtons = () => {
        switch (maintenanceRecord.status) {
            case 'scheduled':
                return (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(BuildIcon, {}), onClick: () => handleStatusChange('in_progress'), sx: { mr: 1 }, children: "\uC791\uC5C5 \uC2DC\uC791" }), _jsx(Button, { variant: "outlined", color: "error", startIcon: _jsx(CancelIcon, {}), onClick: () => handleStatusChange('cancelled'), children: "\uCDE8\uC18C" })] }));
            case 'in_progress':
                return (_jsx(Button, { variant: "contained", color: "success", startIcon: _jsx(CheckCircleIcon, {}), onClick: () => handleStatusChange('completed'), children: "\uC791\uC5C5 \uC644\uB8CC" }));
            case 'completed':
            case 'cancelled':
                return null;
            default:
                return null;
        }
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Button, { startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate('/maintenance'), children: "\uC815\uBE44 \uBAA9\uB85D\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30" }), _jsxs(Box, { children: [_jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(EditIcon, {}), onClick: () => navigate(`/maintenance/${id}/edit`), sx: { mr: 1 }, children: "\uC218\uC815\uD558\uAE30" }), _jsx(IconButton, { color: "error", onClick: handleDeleteClick, children: _jsx(DeleteIcon, {}) })] })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 12, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h5", component: "h1", children: maintenanceRecord.type }), getStatusChip(maintenanceRecord.status)] }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: maintenanceRecord.description }), _jsx(Divider, { sx: { mb: 2 } })] }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'primary.main' }, children: _jsx(CarIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body1", fontWeight: "medium", children: maintenanceRecord.vehicleName }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: maintenanceRecord.vehicleLicensePlate })] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'info.main' }, children: _jsx(DateIcon, {}) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "body1", fontWeight: "medium", children: ["\uC608\uC815\uC77C: ", formatDate(maintenanceRecord.date)] }), maintenanceRecord.completionDate && (_jsxs(Typography, { variant: "body2", color: maintenanceRecord.status === 'completed' ? 'success.main' : 'text.secondary', children: ["\uC644\uB8CC\uC77C: ", formatDate(maintenanceRecord.completionDate)] }))] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [maintenanceRecord.shop ? (_jsx(Avatar, { sx: { mr: 2, bgcolor: 'secondary.main' }, children: _jsx(ShopIcon, {}) })) : (_jsx(Avatar, { sx: { mr: 2, bgcolor: 'secondary.main' }, children: _jsx(PersonIcon, {}) })), _jsxs(Box, { children: [maintenanceRecord.shop && (_jsx(Typography, { variant: "body1", fontWeight: "medium", children: maintenanceRecord.shop })), maintenanceRecord.technician && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\uB2F4\uB2F9: ", maintenanceRecord.technician] }))] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'success.main' }, children: _jsx(ReceiptIcon, {}) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "body1", fontWeight: "medium", children: ["\uCD1D \uBE44\uC6A9: ", formatCurrency(totalCost)] }), maintenanceRecord.mileage && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\uC8FC\uD589\uAC70\uB9AC: ", maintenanceRecord.mileage.toLocaleString(), " km"] }))] })] }) }), _jsxs(Grid, { item: true, xs: 12, children: [_jsx(Divider, { sx: { my: 2 } }), _jsx(Box, { sx: { display: 'flex', justifyContent: 'flex-end' }, children: renderActionButtons() })] })] }) }) }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { mb: 3, p: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(PartIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\uBD80\uD488 \uBAA9\uB85D" })] }), maintenanceRecord.parts && maintenanceRecord.parts.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(List, { disablePadding: true, children: maintenanceRecord.parts.map((part) => (_jsxs(ListItem, { sx: { px: 0, py: 1 }, children: [_jsx(ListItemText, { primary: _jsxs(Typography, { variant: "body1", component: "div", children: [part.name, " ", part.partNumber && `(${part.partNumber})`] }), secondary: _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [part.quantity, "\uAC1C \u00D7 ", formatCurrency(part.unitCost)] }) }), _jsx(Typography, { variant: "body1", children: formatCurrency(part.totalCost) })] }, part.id))) }), _jsx(Divider, { sx: { my: 1 } }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 2 }, children: [_jsx(Typography, { variant: "body1", children: "\uBD80\uD488 \uBE44\uC6A9" }), _jsx(Typography, { variant: "body1", fontWeight: "medium", children: formatCurrency(partsTotal) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 1 }, children: [_jsx(Typography, { variant: "body1", children: "\uC778\uAC74\uBE44" }), _jsx(Typography, { variant: "body1", fontWeight: "medium", children: formatCurrency(laborCost) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 1 }, children: [_jsx(Typography, { variant: "body1", fontWeight: "bold", children: "\uCD1D \uBE44\uC6A9" }), _jsx(Typography, { variant: "body1", fontWeight: "bold", children: formatCurrency(totalCost) })] })] })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "\uB4F1\uB85D\uB41C \uBD80\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }))] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { mb: 3, p: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(DocumentIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\uBB38\uC11C" })] }), maintenanceRecord.documents && maintenanceRecord.documents.length > 0 ? (_jsx(List, { children: maintenanceRecord.documents.map((doc) => (_jsxs(ListItem, { sx: { px: 0, py: 1 }, children: [_jsx(ListItemIcon, { children: _jsx(Avatar, { sx: { bgcolor: 'info.main', width: 36, height: 36 }, children: _jsx(DocumentIcon, { fontSize: "small" }) }) }), _jsx(ListItemText, { primary: doc.name, secondary: `${formatDate(doc.uploadedAt)} • ${formatFileSize(doc.size)}` }), _jsx(Button, { size: "small", href: doc.fileUrl, target: "_blank", children: "\uBCF4\uAE30" })] }, doc.id))) })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "\uB4F1\uB85D\uB41C \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }))] }) }), maintenanceRecord.notes && (_jsx(Grid, { item: true, xs: 12, children: _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uBA54\uBAA8" }), _jsx(Typography, { variant: "body1", sx: { whiteSpace: 'pre-line' }, children: maintenanceRecord.notes })] }) }))] }), _jsxs(Dialog, { open: deleteDialog, onClose: () => setDeleteDialog(false), children: [_jsx(DialogTitle, { children: "\uC815\uBE44 \uAE30\uB85D \uC0AD\uC81C" }), _jsx(DialogContent, { children: _jsx(DialogContentText, { children: "\uC774 \uC815\uBE44 \uAE30\uB85D\uC744 \uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setDeleteDialog(false), children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: confirmDelete, color: "error", children: "\uC0AD\uC81C" })] })] }), _jsxs(Dialog, { open: statusChangeDialog.open, onClose: () => setStatusChangeDialog({ open: false, status: null }), children: [_jsx(DialogTitle, { children: "\uC815\uBE44 \uC0C1\uD0DC \uBCC0\uACBD" }), _jsxs(DialogContent, { children: [statusChangeDialog.status === 'in_progress' && (_jsx(DialogContentText, { children: "\uC774 \uC815\uBE44 \uC791\uC5C5\uC744 \uC2DC\uC791\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC0C1\uD0DC\uAC00 '\uC9C4\uD589 \uC911'\uC73C\uB85C \uBCC0\uACBD\uB429\uB2C8\uB2E4." })), statusChangeDialog.status === 'completed' && (_jsx(DialogContentText, { children: "\uC774 \uC815\uBE44 \uC791\uC5C5\uC744 \uC644\uB8CC\uB85C \uD45C\uC2DC\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC644\uB8CC\uC77C\uC774 \uC624\uB298\uB85C \uC124\uC815\uB429\uB2C8\uB2E4." })), statusChangeDialog.status === 'cancelled' && (_jsx(DialogContentText, { children: "\uC774 \uC815\uBE44 \uC791\uC5C5\uC744 \uCDE8\uC18C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?" }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setStatusChangeDialog({ open: false, status: null }), children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: confirmStatusChange, color: statusChangeDialog.status === 'cancelled' ? 'error' : 'primary', children: "\uD655\uC778" })] })] })] }));
};
export default MaintenanceDetail;
