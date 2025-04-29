import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Divider, Grid, IconButton, InputAdornment, LinearProgress, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, FilterList as FilterListIcon, MoreVert as MoreVertIcon, Sort as SortIcon, } from '@mui/icons-material';
// 테스트 데이터
const mockVehicles = [
    {
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
    },
    {
        id: '2',
        vin: 'WBADT53452GD13836',
        make: '기아',
        model: 'K5',
        year: 2020,
        licensePlate: '경기 나 5678',
        color: '검정',
        type: 'sedan',
        status: 'maintenance',
        mileage: 28000,
        lastMaintenance: '2023-05-10',
        owner: '김철수',
    },
    {
        id: '3',
        vin: '5YJSA1E64MF410149',
        make: '테슬라',
        model: '모델 3',
        year: 2022,
        licensePlate: '서울 다 9012',
        color: '빨강',
        type: 'electric',
        status: 'active',
        mileage: 8000,
        lastMaintenance: '2023-04-20',
        owner: '이영희',
    },
    {
        id: '4',
        vin: '5GAKRAKDXFJ123456',
        make: '쉐보레',
        model: '트래버스',
        year: 2019,
        licensePlate: '부산 라 3456',
        color: '파랑',
        type: 'suv',
        status: 'inactive',
        mileage: 42000,
        lastMaintenance: '2022-12-05',
        owner: '박민수',
    },
    {
        id: '5',
        vin: 'WAUAH74F77N903876',
        make: '기아',
        model: '쏘렌토',
        year: 2021,
        licensePlate: '인천 마 7890',
        color: '회색',
        type: 'suv',
        status: 'active',
        mileage: 18000,
        lastMaintenance: '2023-02-18',
        owner: '최정아',
    },
];
const VehicleList = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
    const [sortField, setSortField] = useState('make');
    const [sortDirection, setSortDirection] = useState('asc');
    const [actionMenuAnchor, setActionMenuAnchor] = useState({ element: null, vehicleId: null });
    useEffect(() => {
        // API 호출 시뮬레이션
        const fetchVehicles = async () => {
            try {
                // API 호출 대신 목업 데이터 사용
                setTimeout(() => {
                    setVehicles(mockVehicles);
                    setLoading(false);
                }, 1000);
            }
            catch (error) {
                console.error('차량 목록 로딩 실패:', error);
                setLoading(false);
            }
        };
        fetchVehicles();
    }, []);
    // 검색 필터링
    const filteredVehicles = vehicles.filter((vehicle) => {
        const matchesSearch = vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (vehicle.owner && vehicle.owner.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = !filterStatus || vehicle.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    // 정렬
    const sortedVehicles = [...filteredVehicles].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }
        else {
            return sortDirection === 'asc'
                ? aValue - bValue
                : bValue - aValue;
        }
    });
    // 페이지네이션
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    // 필터 메뉴
    const handleFilterMenuOpen = (event) => {
        setFilterMenuAnchor(event.currentTarget);
    };
    const handleFilterMenuClose = () => {
        setFilterMenuAnchor(null);
    };
    const handleFilterSelect = (status) => {
        setFilterStatus(status);
        setFilterMenuAnchor(null);
    };
    // 정렬 메뉴
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
    // 차량 액션 메뉴
    const handleActionMenuOpen = (event, vehicleId) => {
        setActionMenuAnchor({ element: event.currentTarget, vehicleId });
    };
    const handleActionMenuClose = () => {
        setActionMenuAnchor({ element: null, vehicleId: null });
    };
    // 상태 표시 칩 렌더링
    const renderStatusChip = (status) => {
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
        return _jsx(Chip, { size: "small", color: color, label: label });
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "\uCC28\uB7C9 \uAD00\uB9AC" }), _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(AddIcon, {}), onClick: () => navigate('/vehicles/new'), children: "\uC0C8 \uCC28\uB7C9 \uB4F1\uB85D" })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, placeholder: "\uCC28\uB7C9 \uAC80\uC0C9 (\uC81C\uC870\uC0AC, \uBAA8\uB378, \uBC88\uD638\uD310, VIN \uB4F1)", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                        startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                    }, variant: "outlined", size: "small" }) }), _jsxs(Grid, { item: true, xs: 12, md: 6, sx: { display: 'flex', justifyContent: 'flex-end', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(FilterListIcon, {}), onClick: handleFilterMenuOpen, color: filterStatus ? 'primary' : 'inherit', children: filterStatus ? `상태: ${filterStatus}` : '필터' }), _jsxs(Menu, { anchorEl: filterMenuAnchor, open: Boolean(filterMenuAnchor), onClose: handleFilterMenuClose, children: [_jsx(MenuItem, { onClick: () => handleFilterSelect(null), children: "\uBAA8\uB4E0 \uC0C1\uD0DC" }), _jsx(MenuItem, { onClick: () => handleFilterSelect('active'), children: "\uD65C\uC131" }), _jsx(MenuItem, { onClick: () => handleFilterSelect('maintenance'), children: "\uC815\uBE44 \uC911" }), _jsx(MenuItem, { onClick: () => handleFilterSelect('inactive'), children: "\uBE44\uD65C\uC131" }), _jsx(MenuItem, { onClick: () => handleFilterSelect('recalled'), children: "\uB9AC\uCF5C" })] }), _jsx(Button, { variant: "outlined", startIcon: _jsx(SortIcon, {}), onClick: handleSortMenuOpen, children: "\uC815\uB82C" }), _jsxs(Menu, { anchorEl: sortMenuAnchor, open: Boolean(sortMenuAnchor), onClose: handleSortMenuClose, children: [_jsxs(MenuItem, { onClick: () => handleSortSelect('make'), children: ["\uC81C\uC870\uC0AC ", sortField === 'make' && (sortDirection === 'asc' ? '↓' : '↑')] }), _jsxs(MenuItem, { onClick: () => handleSortSelect('model'), children: ["\uBAA8\uB378 ", sortField === 'model' && (sortDirection === 'asc' ? '↓' : '↑')] }), _jsxs(MenuItem, { onClick: () => handleSortSelect('year'), children: ["\uC5F0\uC2DD ", sortField === 'year' && (sortDirection === 'asc' ? '↓' : '↑')] }), _jsxs(MenuItem, { onClick: () => handleSortSelect('mileage'), children: ["\uC8FC\uD589\uAC70\uB9AC ", sortField === 'mileage' && (sortDirection === 'asc' ? '↓' : '↑')] })] })] })] }) }) }), loading ? (_jsx(LinearProgress, { sx: { mb: 2 } })) : (_jsxs(_Fragment, { children: [_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { sx: { minWidth: 650 }, "aria-label": "\uCC28\uB7C9 \uBAA9\uB85D \uD14C\uC774\uBE14", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\uCC28\uB7C9 \uC815\uBCF4" }), _jsx(TableCell, { children: "\uBC88\uD638\uD310" }), _jsx(TableCell, { children: "VIN" }), _jsx(TableCell, { align: "right", children: "\uC8FC\uD589\uAC70\uB9AC" }), _jsx(TableCell, { children: "\uC0C1\uD0DC" }), _jsx(TableCell, { align: "right", children: "\uC561\uC158" })] }) }), _jsxs(TableBody, { children: [sortedVehicles
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                            .map((vehicle) => (_jsxs(TableRow, { hover: true, sx: { cursor: 'pointer' }, onClick: () => navigate(`/vehicles/${vehicle.id}`), children: [_jsx(TableCell, { component: "th", scope: "row", children: _jsxs(Box, { children: [_jsxs(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: [vehicle.make, " ", vehicle.model] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [vehicle.year, "\uB144\uD615 ", vehicle.color] })] }) }), _jsx(TableCell, { children: vehicle.licensePlate }), _jsx(TableCell, { children: vehicle.vin }), _jsxs(TableCell, { align: "right", children: [vehicle.mileage.toLocaleString(), " km"] }), _jsx(TableCell, { children: renderStatusChip(vehicle.status) }), _jsx(TableCell, { align: "right", children: _jsx(IconButton, { "aria-label": "\uB354 \uBCF4\uAE30", onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleActionMenuOpen(e, vehicle.id);
                                                        }, children: _jsx(MoreVertIcon, {}) }) })] }, vehicle.id))), sortedVehicles.length === 0 && (_jsx(TableRow, { children: _jsxs(TableCell, { colSpan: 6, align: "center", sx: { py: 3 }, children: [_jsx(Typography, { variant: "body1", children: searchQuery || filterStatus
                                                            ? '검색 조건에 맞는 차량이 없습니다.'
                                                            : '등록된 차량이 없습니다.' }), _jsx(Button, { variant: "text", color: "primary", sx: { mt: 1 }, onClick: () => navigate('/vehicles/new'), children: "\uC0C8 \uCC28\uB7C9 \uB4F1\uB85D\uD558\uAE30" })] }) }))] })] }) }), _jsx(TablePagination, { rowsPerPageOptions: [5, 10, 25], component: "div", count: sortedVehicles.length, rowsPerPage: rowsPerPage, page: page, onPageChange: handleChangePage, onRowsPerPageChange: handleChangeRowsPerPage, labelRowsPerPage: "\uD398\uC774\uC9C0\uB2F9 \uD589 \uC218:", labelDisplayedRows: ({ from, to, count }) => `${from}-${to} / ${count}` })] })), _jsxs(Menu, { anchorEl: actionMenuAnchor.element, open: Boolean(actionMenuAnchor.element), onClose: handleActionMenuClose, children: [_jsx(MenuItem, { onClick: () => {
                            navigate(`/vehicles/${actionMenuAnchor.vehicleId}`);
                            handleActionMenuClose();
                        }, children: "\uC0C1\uC138 \uC815\uBCF4" }), _jsx(MenuItem, { onClick: (e) => {
                            e.stopPropagation();
                            navigate(`/vehicles/${actionMenuAnchor.vehicleId}/edit`);
                            handleActionMenuClose();
                        }, children: "\uC218\uC815\uD558\uAE30" }), _jsx(Divider, {}), _jsx(MenuItem, { onClick: (e) => {
                            e.stopPropagation();
                            navigate(`/vehicles/${actionMenuAnchor.vehicleId}/maintenance/new`);
                            handleActionMenuClose();
                        }, children: "\uC815\uBE44 \uB4F1\uB85D" }), _jsx(MenuItem, { onClick: (e) => {
                            e.stopPropagation();
                            handleActionMenuClose();
                            // 상태 변경 로직 구현 필요
                            alert('차량 상태 변경 기능은 추후 구현할 예정입니다.');
                        }, children: "\uC0C1\uD0DC \uBCC0\uACBD" })] })] }));
};
export default VehicleList;
