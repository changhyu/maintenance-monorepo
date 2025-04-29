import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Divider, Grid, IconButton, InputAdornment, LinearProgress, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, FormControl, Select, InputLabel, } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, MoreVert as MoreVertIcon, Sort as SortIcon, CalendarMonth as CalendarIcon, ViewList as ListIcon, } from '@mui/icons-material';
// 테스트 데이터
const mockMaintenanceRecords = [
    {
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
        notes: '다음 점검은 10,000km 주행 후 권장'
    },
    {
        id: '2',
        vehicleId: '2',
        vehicleName: '기아 K5',
        vehicleLicensePlate: '경기 나 5678',
        type: '브레이크 패드 교체',
        description: '전방 브레이크 패드 마모로 교체',
        date: '2023-05-10',
        status: 'completed',
        cost: 280000,
        technician: '박정비',
        shop: '기아 서비스센터',
    },
    {
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
    },
    {
        id: '4',
        vehicleId: '2',
        vehicleName: '기아 K5',
        vehicleLicensePlate: '경기 나 5678',
        type: '에어컨 점검',
        description: '에어컨 가스 충전 및 필터 교체',
        date: '2023-05-20',
        status: 'in_progress',
        cost: 120000,
        technician: '이수리',
        shop: '기아 서비스센터',
    },
    {
        id: '5',
        vehicleId: '4',
        vehicleName: '쉐보레 트래버스',
        vehicleLicensePlate: '부산 라 3456',
        type: '엔진 오일 교체',
        description: '정기 엔진 오일 교체',
        date: '2023-04-15',
        status: 'completed',
        cost: 180000,
        technician: '최오일',
        shop: '쉐보레 서비스센터',
    },
];
const MaintenanceList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState(null);
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
    const [actionMenuAnchor, setActionMenuAnchor] = useState({ element: null, recordId: null });
    useEffect(() => {
        // URL 쿼리 파라미터에서 필터 상태 가져오기
        const params = new URLSearchParams(location.search);
        const statusFilter = params.get('filter');
        if (statusFilter) {
            setFilterStatus(statusFilter);
        }
    }, [location]);
    useEffect(() => {
        // API 호출 시뮬레이션
        const fetchMaintenanceRecords = async () => {
            try {
                // API 호출 대신 목업 데이터 사용
                setTimeout(() => {
                    setMaintenanceRecords(mockMaintenanceRecords);
                    setLoading(false);
                }, 1000);
            }
            catch (error) {
                console.error('정비 목록 로딩 실패:', error);
                setLoading(false);
            }
        };
        fetchMaintenanceRecords();
    }, []);
    // 검색 및 필터링
    const filteredRecords = maintenanceRecords.filter((record) => {
        const matchesSearch = record.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (record.shop && record.shop.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = !filterStatus || record.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    // 정렬
    const sortedRecords = [...filteredRecords].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }
        else if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc'
                ? aValue - bValue
                : bValue - aValue;
        }
        return 0;
    });
    // 페이지네이션 핸들러
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    // 정렬 메뉴 핸들러
    const handleSortMenuOpen = (event) => {
        setSortMenuAnchor(event.currentTarget);
    };
    const handleSortMenuClose = () => {
        setSortMenuAnchor(null);
    };
    const handleSortSelect = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortField(field);
            setSortDirection('asc');
        }
        setSortMenuAnchor(null);
    };
    // 액션 메뉴 핸들러
    const handleActionMenuOpen = (event, recordId) => {
        setActionMenuAnchor({ element: event.currentTarget, recordId });
    };
    const handleActionMenuClose = () => {
        setActionMenuAnchor({ element: null, recordId: null });
    };
    // 상태 표시 칩 렌더링
    const renderStatusChip = (status) => {
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
        return _jsx(Chip, { size: "small", color: color, label: label });
    };
    // 날짜 포맷 함수
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR');
    };
    // 금액 포맷 함수
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
        }).format(amount);
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "\uC815\uBE44 \uAD00\uB9AC" }), _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(AddIcon, {}), onClick: () => navigate('/maintenance/new'), children: "\uC0C8 \uC815\uBE44 \uB4F1\uB85D" })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, md: 5, children: _jsx(TextField, { fullWidth: true, placeholder: "\uC815\uBE44 \uAC80\uC0C9 (\uCC28\uB7C9\uBA85, \uC720\uD615, \uC124\uBA85 \uB4F1)", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                        startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                    }, variant: "outlined", size: "small" }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(FormControl, { fullWidth: true, size: "small", children: [_jsx(InputLabel, { children: "\uC0C1\uD0DC \uD544\uD130" }), _jsxs(Select, { value: filterStatus || '', onChange: (e) => setFilterStatus(e.target.value || null), label: "\uC0C1\uD0DC \uD544\uD130", children: [_jsx(MenuItem, { value: "", children: "\uBAA8\uB4E0 \uC0C1\uD0DC" }), _jsx(MenuItem, { value: "scheduled", children: "\uC608\uC57D\uB428" }), _jsx(MenuItem, { value: "in_progress", children: "\uC9C4\uD589 \uC911" }), _jsx(MenuItem, { value: "completed", children: "\uC644\uB8CC" }), _jsx(MenuItem, { value: "cancelled", children: "\uCDE8\uC18C\uB428" })] })] }) }), _jsxs(Grid, { item: true, xs: 12, md: 3, sx: { display: 'flex', justifyContent: 'flex-end', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(SortIcon, {}), onClick: handleSortMenuOpen, children: "\uC815\uB82C" }), _jsxs(Menu, { anchorEl: sortMenuAnchor, open: Boolean(sortMenuAnchor), onClose: handleSortMenuClose, children: [_jsxs(MenuItem, { onClick: () => handleSortSelect('date'), children: ["\uB0A0\uC9DC ", sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')] }), _jsxs(MenuItem, { onClick: () => handleSortSelect('vehicleName'), children: ["\uCC28\uB7C9 ", sortField === 'vehicleName' && (sortDirection === 'asc' ? '↑' : '↓')] }), _jsxs(MenuItem, { onClick: () => handleSortSelect('type'), children: ["\uC720\uD615 ", sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')] }), _jsxs(MenuItem, { onClick: () => handleSortSelect('cost'), children: ["\uBE44\uC6A9 ", sortField === 'cost' && (sortDirection === 'asc' ? '↑' : '↓')] })] }), _jsxs(Box, { sx: { display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1 }, children: [_jsx(Button, { variant: viewMode === 'list' ? 'contained' : 'outlined', onClick: () => setViewMode('list'), size: "small", sx: { borderRadius: '4px 0 0 4px', minWidth: '40px' }, children: _jsx(ListIcon, {}) }), _jsx(Button, { variant: viewMode === 'calendar' ? 'contained' : 'outlined', onClick: () => setViewMode('calendar'), size: "small", sx: { borderRadius: '0 4px 4px 0', minWidth: '40px' }, children: _jsx(CalendarIcon, {}) })] })] })] }) }) }), loading ? (_jsx(LinearProgress, { sx: { mb: 2 } })) : viewMode === 'list' ? (_jsxs(_Fragment, { children: [_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { sx: { minWidth: 650 }, "aria-label": "\uC815\uBE44 \uBAA9\uB85D \uD14C\uC774\uBE14", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\uC815\uBE44 \uC815\uBCF4" }), _jsx(TableCell, { children: "\uCC28\uB7C9" }), _jsx(TableCell, { children: "\uB0A0\uC9DC" }), _jsx(TableCell, { children: "\uC0C1\uD0DC" }), _jsx(TableCell, { align: "right", children: "\uBE44\uC6A9" }), _jsx(TableCell, { align: "right", children: "\uC561\uC158" })] }) }), _jsxs(TableBody, { children: [sortedRecords
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                            .map((record) => (_jsxs(TableRow, { hover: true, sx: { cursor: 'pointer' }, onClick: () => navigate(`/maintenance/${record.id}`), children: [_jsx(TableCell, { component: "th", scope: "row", children: _jsxs(Box, { children: [_jsx(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: record.type }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: record.description }), record.shop && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: record.shop }))] }) }), _jsxs(TableCell, { children: [_jsx(Typography, { variant: "body2", children: record.vehicleName }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: record.vehicleLicensePlate })] }), _jsx(TableCell, { children: formatDate(record.date) }), _jsx(TableCell, { children: renderStatusChip(record.status) }), _jsx(TableCell, { align: "right", children: formatCurrency(record.cost) }), _jsx(TableCell, { align: "right", children: _jsx(IconButton, { "aria-label": "\uB354 \uBCF4\uAE30", onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleActionMenuOpen(e, record.id);
                                                        }, children: _jsx(MoreVertIcon, {}) }) })] }, record.id))), filteredRecords.length === 0 && (_jsx(TableRow, { children: _jsxs(TableCell, { colSpan: 6, align: "center", sx: { py: 3 }, children: [_jsx(Typography, { variant: "body1", children: searchQuery || filterStatus
                                                            ? '검색 조건에 맞는 정비 기록이 없습니다.'
                                                            : '등록된 정비 기록이 없습니다.' }), _jsx(Button, { variant: "text", color: "primary", sx: { mt: 1 }, onClick: () => navigate('/maintenance/new'), children: "\uC0C8 \uC815\uBE44 \uB4F1\uB85D\uD558\uAE30" })] }) }))] })] }) }), _jsx(TablePagination, { rowsPerPageOptions: [5, 10, 25], component: "div", count: filteredRecords.length, rowsPerPage: rowsPerPage, page: page, onPageChange: handleChangePage, onRowsPerPageChange: handleChangeRowsPerPage, labelRowsPerPage: "\uD398\uC774\uC9C0\uB2F9 \uD589 \uC218:", labelDisplayedRows: ({ from, to, count }) => `${from}-${to} / ${count}` })] })) : (_jsx(Box, { sx: { p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "\uCE98\uB9B0\uB354 \uBDF0\uB294 \uAD6C\uD604 \uC608\uC815\uC785\uB2C8\uB2E4." }) })), _jsxs(Menu, { anchorEl: actionMenuAnchor.element, open: Boolean(actionMenuAnchor.element), onClose: handleActionMenuClose, children: [_jsx(MenuItem, { onClick: () => {
                            navigate(`/maintenance/${actionMenuAnchor.recordId}`);
                            handleActionMenuClose();
                        }, children: "\uC0C1\uC138 \uC815\uBCF4" }), _jsx(MenuItem, { onClick: (e) => {
                            e.stopPropagation();
                            navigate(`/maintenance/${actionMenuAnchor.recordId}/edit`);
                            handleActionMenuClose();
                        }, children: "\uC218\uC815\uD558\uAE30" }), _jsx(Divider, {}), _jsx(MenuItem, { onClick: (e) => {
                            e.stopPropagation();
                            // 상태 변경 로직 구현 필요
                            alert('정비 상태 변경 기능은 추후 구현할 예정입니다.');
                            handleActionMenuClose();
                        }, children: "\uC0C1\uD0DC \uBCC0\uACBD" }), _jsx(MenuItem, { onClick: (e) => {
                            e.stopPropagation();
                            // 삭제 로직 구현 필요
                            alert('정비 기록 삭제 기능은 추후 구현할 예정입니다.');
                            handleActionMenuClose();
                        }, children: "\uC0AD\uC81C" })] })] }));
};
export default MaintenanceList;
