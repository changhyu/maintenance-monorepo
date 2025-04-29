import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, FormControl, FormControlLabel, FormHelperText, FormLabel, Grid, IconButton, InputAdornment, LinearProgress, MenuItem, Radio, RadioGroup, Select, TextField, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Build as BuildIcon, Add as AddIcon, Delete as DeleteIcon, } from '@mui/icons-material';
// @ts-ignore
import { useFormik } from 'formik';
// @ts-ignore
import * as Yup from 'yup';
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
    },
};
// 테스트 차량 데이터
const mockVehicles = [
    {
        id: '1',
        make: '현대',
        model: '소나타',
        licensePlate: '서울 가 1234',
        mileage: 15000,
        status: 'active',
    },
    {
        id: '2',
        make: '기아',
        model: 'K5',
        licensePlate: '경기 나 5678',
        mileage: 28000,
        status: 'active',
    },
    {
        id: '3',
        make: '테슬라',
        model: '모델 3',
        licensePlate: '서울 다 9012',
        mileage: 8000,
        status: 'active',
    },
];
// 정비 유형 목록 (예시)
const maintenanceTypes = [
    '정기 점검',
    '엔진 오일 교체',
    '타이어 교체',
    '브레이크 패드 교체',
    '에어컨 점검',
    '배터리 교체',
    '필터 교체',
    '벨트 교체',
    '변속기 오일 교체',
    '기타 수리',
];
// ValidationSchema
const validationSchema = Yup.object().shape({
    vehicleId: Yup.string().required('차량은 필수 항목입니다'),
    type: Yup.string().required('정비 유형은 필수 항목입니다'),
    description: Yup.string().required('설명은 필수 항목입니다'),
    date: Yup.date().required('날짜는 필수 항목입니다'),
    status: Yup.string().required('상태는 필수 항목입니다'),
    cost: Yup.number().min(0, '비용은 0 이상이어야 합니다').required('비용은 필수 항목입니다'),
});
// 초기 정비 데이터
const initialMaintenance = {
    vehicleId: '',
    type: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'scheduled',
    cost: 0,
    parts: [],
};
// 빈 부품 템플릿
const emptyPart = {
    id: '',
    name: '',
    partNumber: '',
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
};
// 화폐 표시 포맷 유틸리티 함수
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(amount);
};
const MaintenanceForm = () => {
    const { id, vehicleId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(id ? true : false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEdit, setIsEdit] = useState(Boolean(id));
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [parts, setParts] = useState([]);
    const [partDialog, setPartDialog] = useState({
        open: false,
        part: null,
        index: null,
    });
    // 폼 제출 핸들러
    const handleSubmit = async (values) => {
        try {
            setSubmitLoading(true);
            setError(null);
            if (parts.length === 0) {
                // 부품이 없는 경우 사용자에게 확인
                if (!window.confirm('부품 목록이 비어 있습니다. 계속 진행하시겠습니까?')) {
                    setSubmitLoading(false);
                    return;
                }
            }
            // 부품 목록 및 총 비용 추가
            const maintenanceData = {
                ...values,
                parts,
                // 부품 비용 외 추가적인 인건비 등이 있다면 여기서 계산
            };
            // 실제로는 API 호출
            console.log('정비 저장:', maintenanceData);
            // API 호출 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSubmitLoading(false);
            navigate(isEdit ? `/maintenance/${id}` : '/maintenance');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : '정비 정보 저장 중 오류가 발생했습니다.';
            setError(errorMessage);
            setSubmitLoading(false);
            console.error(err);
        }
    };
    const formik = useFormik({
        initialValues: initialMaintenance,
        validationSchema: validationSchema,
        onSubmit: handleSubmit
    });
    // 부품 총 비용 계산 - 메모이제이션
    const calculatePartsCost = React.useCallback((partsList = parts) => {
        return partsList.reduce((total, part) => total + part.totalCost, 0);
    }, [parts]);
    useEffect(() => {
        // 차량 목록 불러오기
        const fetchVehicles = async () => {
            try {
                // 실제로는 API 호출
                // API 호출 시뮬레이션
                setTimeout(() => {
                    setVehicles(mockVehicles);
                }, 500);
            }
            catch (err) {
                setError('차량 목록을 불러오는데 실패했습니다. 다시 시도해주세요.');
                console.error('차량 목록 로딩 실패:', err);
            }
        };
        fetchVehicles();
    }, []); // 비어있는 종속성 배열 유지 - 컴포넌트 마운트 시 한 번만 실행
    useEffect(() => {
        // 수정 모드일 경우 기존 정비 정보 불러오기
        const fetchMaintenance = async () => {
            if (!id && !vehicleId) {
                setLoading(false);
                return;
            }
            if (id) {
                try {
                    // 실제로는 API 호출
                    // API 호출 시뮬레이션
                    setTimeout(() => {
                        const maintenance = mockMaintenanceRecords[id];
                        if (!maintenance) {
                            setError('요청하신 정비 기록을 찾을 수 없습니다.');
                            setLoading(false);
                            return;
                        }
                        // Formik의 값을 설정
                        formik.setValues({
                            vehicleId: maintenance.vehicleId,
                            type: maintenance.type,
                            description: maintenance.description,
                            date: maintenance.date,
                            status: maintenance.status,
                            cost: maintenance.cost,
                            technician: maintenance.technician || '',
                            shop: maintenance.shop || '',
                            notes: maintenance.notes || '',
                            mileage: maintenance.mileage || 0,
                        });
                        // 부품 목록 설정
                        if (maintenance.parts) {
                            setParts(maintenance.parts);
                        }
                        // 선택된 차량 찾기
                        const vehicle = mockVehicles.find(v => v.id === maintenance.vehicleId);
                        if (vehicle) {
                            setSelectedVehicle(vehicle);
                        }
                        setLoading(false);
                    }, 1000);
                }
                catch (err) {
                    setError('정비 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
                    setLoading(false);
                    console.error(err);
                }
            }
            else if (vehicleId) {
                try {
                    // 특정 차량에 대한 정비 등록 시 해당 차량 정보 설정
                    formik.setFieldValue('vehicleId', vehicleId);
                    // 선택된 차량 찾기
                    const vehicle = mockVehicles.find(v => v.id === vehicleId);
                    if (vehicle) {
                        setSelectedVehicle(vehicle);
                        formik.setFieldValue('mileage', vehicle.mileage);
                    }
                    else {
                        setError('요청하신 차량 정보를 찾을 수 없습니다.');
                    }
                    setLoading(false);
                }
                catch (err) {
                    setError('차량 정보를 불러오는데 실패했습니다.');
                    setLoading(false);
                    console.error(err);
                }
            }
        };
        fetchMaintenance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, vehicleId]); // formik은 무한 루프를 방지하기 위해 의도적으로 제외, ESLint 경고 무시
    // 차량 선택 시 호출되는 함수
    const handleVehicleChange = useCallback((event) => {
        const vehicleId = event.target.value;
        formik.setFieldValue('vehicleId', vehicleId);
        // 선택된 차량 찾기
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            setSelectedVehicle(vehicle);
            formik.setFieldValue('mileage', vehicle.mileage);
        }
        else {
            setSelectedVehicle(null);
        }
    }, [vehicles, formik]);
    // 부품 추가/수정 다이얼로그 열기
    const handleOpenPartDialog = useCallback((part, index) => {
        setPartDialog({
            open: true,
            part: part ? { ...part } : { ...emptyPart, id: Date.now().toString() },
            index: index !== undefined ? index : null,
        });
    }, []);
    // 부품 다이얼로그 닫기
    const handleClosePartDialog = useCallback(() => {
        setPartDialog({
            open: false,
            part: null,
            index: null,
        });
    }, []);
    // 부품 정보 유효성 검증
    const validatePart = (part) => {
        return Boolean(part.name &&
            part.quantity > 0 &&
            part.unitCost >= 0);
    };
    // 부품 추가/수정
    const handleSavePart = useCallback(() => {
        if (!partDialog.part || !validatePart(partDialog.part))
            return;
        const newParts = [...parts];
        if (partDialog.index !== null) {
            // 기존 부품 수정
            newParts[partDialog.index] = partDialog.part;
        }
        else {
            // 새 부품 추가
            newParts.push(partDialog.part);
        }
        setParts(newParts);
        // 부품 비용 총합으로 정비 비용 업데이트
        const partsCost = calculatePartsCost(newParts);
        formik.setFieldValue('cost', partsCost);
        handleClosePartDialog();
    }, [parts, partDialog, calculatePartsCost, formik, handleClosePartDialog, validatePart]);
    // 부품 삭제
    const handleDeletePart = useCallback((index) => {
        const newParts = parts.filter((_, i) => i !== index);
        setParts(newParts);
        // 부품 비용 총합으로 정비 비용 업데이트
        const partsCost = calculatePartsCost(newParts);
        formik.setFieldValue('cost', partsCost);
    }, [parts, calculatePartsCost, formik]);
    // 부품 다이얼로그 내의 부품 정보 변경 핸들러
    const handlePartChange = useCallback((field, value) => {
        if (!partDialog.part)
            return;
        const updatedPart = { ...partDialog.part, [field]: value };
        // 수량이나 단가가 변경되면 총 비용 업데이트
        if (field === 'quantity' || field === 'unitCost') {
            const quantity = field === 'quantity' ? Number(value) : updatedPart.quantity;
            const unitCost = field === 'unitCost' ? Number(value) : updatedPart.unitCost;
            updatedPart.totalCost = quantity * unitCost;
        }
        setPartDialog(prev => ({
            ...prev,
            part: updatedPart
        }));
    }, [partDialog]);
    if (loading) {
        return (_jsxs(Box, { sx: { width: '100%' }, children: [_jsx(LinearProgress, {}), _jsx(Typography, { sx: { mt: 2 }, variant: "body1", children: "\uC815\uBE44 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Button, { startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate(id ? `/maintenance/${id}` : '/maintenance'), children: id ? '정비 상세로 돌아가기' : '정비 목록으로 돌아가기' }), _jsx(Typography, { variant: "h4", component: "h1", children: isEdit ? '정비 정보 수정' : '새 정비 등록' })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 3 }, children: error })), _jsxs("form", { onSubmit: formik.handleSubmit, children: [_jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { size: 12, children: _jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 3 }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'primary.main' }, children: _jsx(BuildIcon, {}) }), _jsx(Typography, { variant: "h6", children: "\uC815\uBE44 \uC815\uBCF4" })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: 12, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.vehicleId && formik.errors.vehicleId), children: [_jsx(FormLabel, { children: "\uCC28\uB7C9*" }), _jsxs(Select, { name: "vehicleId", value: formik.values.vehicleId, onChange: (e) => handleVehicleChange(e), onBlur: formik.handleBlur, displayEmpty: true, error: Boolean(formik.touched.vehicleId && formik.errors.vehicleId), disabled: isEdit || Boolean(vehicleId), children: [_jsx(MenuItem, { value: "", disabled: true, children: "\uCC28\uB7C9 \uC120\uD0DD" }), vehicles.map(vehicle => (_jsxs(MenuItem, { value: vehicle.id, children: [vehicle.make, " ", vehicle.model, " (", vehicle.licensePlate, ")"] }, vehicle.id)))] }), formik.touched.vehicleId && formik.errors.vehicleId && (_jsx(FormHelperText, { error: true, children: formik.errors.vehicleId }))] }) }), selectedVehicle && (_jsx(Grid, { size: 12, children: _jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 2 }, children: [_jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "\uC120\uD0DD\uB41C \uCC28\uB7C9:" }), " ", selectedVehicle.make, " ", selectedVehicle.model] }), _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "\uBC88\uD638\uD310:" }), " ", selectedVehicle.licensePlate] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "\uD604\uC7AC \uC8FC\uD589\uAC70\uB9AC:" }), " ", selectedVehicle.mileage.toLocaleString(), " km"] })] }) })), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.type && formik.errors.type), children: [_jsx(FormLabel, { children: "\uC815\uBE44 \uC720\uD615*" }), _jsxs(Select, { name: "type", value: formik.values.type, onChange: formik.handleChange, onBlur: formik.handleBlur, displayEmpty: true, error: Boolean(formik.touched.type && formik.errors.type), children: [_jsx(MenuItem, { value: "", disabled: true, children: "\uC815\uBE44 \uC720\uD615 \uC120\uD0DD" }), maintenanceTypes.map(type => (_jsx(MenuItem, { value: type, children: type }, type)))] }), formik.touched.type && formik.errors.type && (_jsx(FormHelperText, { error: true, children: formik.errors.type }))] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.date && formik.errors.date), children: [_jsx(FormLabel, { children: "\uB0A0\uC9DC*" }), _jsx(TextField, { name: "date", type: "date", value: formik.values.date, onChange: formik.handleChange, onBlur: formik.handleBlur, InputLabelProps: {
                                                                        shrink: true,
                                                                    }, error: Boolean(formik.touched.date && formik.errors.date), helperText: formik.touched.date && formik.errors.date })] }) }), _jsx(Grid, { size: 12, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.description && formik.errors.description), children: [_jsx(FormLabel, { children: "\uC124\uBA85*" }), _jsx(TextField, { name: "description", value: formik.values.description, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "\uC815\uBE44 \uB0B4\uC6A9\uC5D0 \uB300\uD55C \uC0C1\uC138 \uC124\uBA85", multiline: true, rows: 3, error: Boolean(formik.touched.description && formik.errors.description), helperText: formik.touched.description && formik.errors.description })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.status && formik.errors.status), children: [_jsx(FormLabel, { children: "\uC0C1\uD0DC*" }), _jsxs(RadioGroup, { name: "status", value: formik.values.status, onChange: formik.handleChange, row: true, children: [_jsx(FormControlLabel, { value: "scheduled", control: _jsx(Radio, {}), label: "\uC608\uC57D\uB428" }), _jsx(FormControlLabel, { value: "in_progress", control: _jsx(Radio, {}), label: "\uC9C4\uD589 \uC911" }), _jsx(FormControlLabel, { value: "completed", control: _jsx(Radio, {}), label: "\uC644\uB8CC" })] }), formik.touched.status && formik.errors.status && (_jsx(FormHelperText, { error: true, children: formik.errors.status }))] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uC8FC\uD589\uAC70\uB9AC" }), _jsx(TextField, { name: "mileage", type: "number", value: formik.values.mileage || '', onChange: formik.handleChange, placeholder: "\uC815\uBE44 \uC2DC\uC810\uC758 \uC8FC\uD589 \uAC70\uB9AC", InputProps: {
                                                                        endAdornment: _jsx(InputAdornment, { position: "end", children: "km" }),
                                                                    } })] }) })] })] }) }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", sx: { mb: 3 }, children: "\uCD94\uAC00 \uC815\uBCF4" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uC815\uBE44\uC18C" }), _jsx(TextField, { name: "shop", value: formik.values.shop || '', onChange: formik.handleChange, placeholder: "\uC815\uBE44\uC18C \uC774\uB984" })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uAE30\uC220\uC790" }), _jsx(TextField, { name: "technician", value: formik.values.technician || '', onChange: formik.handleChange, placeholder: "\uB2F4\uB2F9 \uAE30\uC220\uC790 \uC774\uB984" })] }) }), _jsx(Grid, { size: 12, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.cost && formik.errors.cost), children: [_jsx(FormLabel, { children: "\uCD1D \uBE44\uC6A9*" }), _jsx(TextField, { name: "cost", type: "number", value: formik.values.cost, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "\uCD1D \uC815\uBE44 \uBE44\uC6A9", InputProps: {
                                                                        startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A9" }),
                                                                    }, error: Boolean(formik.touched.cost && formik.errors.cost), helperText: formik.touched.cost && formik.errors.cost })] }) }), _jsx(Grid, { size: 12, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uBA54\uBAA8" }), _jsx(TextField, { name: "notes", value: formik.values.notes || '', onChange: formik.handleChange, placeholder: "\uCD94\uAC00 \uBA54\uBAA8", multiline: true, rows: 3 })] }) })] })] }) }) }), _jsx(Grid, { size: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", children: "\uBD80\uD488 \uBAA9\uB85D" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpenPartDialog(), children: "\uBD80\uD488 \uCD94\uAC00" })] }), _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\uBD80\uD488\uBA85" }), _jsx(TableCell, { children: "\uBD80\uD488 \uBC88\uD638" }), _jsx(TableCell, { align: "right", children: "\uC218\uB7C9" }), _jsx(TableCell, { align: "right", children: "\uB2E8\uAC00" }), _jsx(TableCell, { align: "right", children: "\uCD1D\uC561" }), _jsx(TableCell, { align: "right", children: "\uC561\uC158" })] }) }), _jsxs(TableBody, { children: [parts.map((part, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: part.name }), _jsx(TableCell, { children: part.partNumber || '-' }), _jsx(TableCell, { align: "right", children: part.quantity }), _jsx(TableCell, { align: "right", children: formatCurrency(part.unitCost) }), _jsx(TableCell, { align: "right", children: formatCurrency(part.totalCost) }), _jsx(TableCell, { align: "right", children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'flex-end' }, children: [_jsx(Button, { size: "small", onClick: () => handleOpenPartDialog(part, index), children: "\uC218\uC815" }), _jsx(IconButton, { size: "small", color: "error", onClick: () => handleDeletePart(index), children: _jsx(DeleteIcon, { fontSize: "small" }) })] }) })] }, part.id))), parts.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, align: "center", sx: { py: 2 }, children: "\uB4F1\uB85D\uB41C \uBD80\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }) })), parts.length > 0 && (_jsxs(TableRow, { children: [_jsx(TableCell, { colSpan: 4, align: "right", sx: { fontWeight: 'bold' }, children: "\uBD80\uD488 \uCD1D\uC561:" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 'bold' }, children: formatCurrency(calculatePartsCost()) }), _jsx(TableCell, {})] }))] })] })] }) }) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'flex-end', mt: 3 }, children: [_jsx(Button, { variant: "contained", color: "secondary", onClick: () => navigate(id ? `/maintenance/${id}` : '/maintenance'), sx: { mr: 2 }, children: "\uCDE8\uC18C" }), _jsx(Button, { variant: "contained", color: "primary", type: "submit", disabled: submitLoading || !formik.isValid || (parts.length === 0 && formik.values.cost === 0), startIcon: _jsx(SaveIcon, {}), children: submitLoading ? '저장 중...' : (isEdit ? '수정 완료' : '정비 등록') })] })] }), _jsxs(Dialog, { open: partDialog.open, onClose: handleClosePartDialog, children: [_jsx(DialogTitle, { children: partDialog.index !== null ? '부품 정보 수정' : '새 부품 추가' }), _jsx(DialogContent, { children: _jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [_jsx(Grid, { size: 12, children: _jsx(TextField, { fullWidth: true, label: "\uBD80\uD488\uBA85", value: partDialog.part?.name || '', onChange: (e) => handlePartChange('name', e.target.value), required: true }) }), _jsx(Grid, { size: 12, children: _jsx(TextField, { fullWidth: true, label: "\uBD80\uD488 \uBC88\uD638", value: partDialog.part?.partNumber || '', onChange: (e) => handlePartChange('partNumber', e.target.value), placeholder: "(\uC120\uD0DD\uC0AC\uD56D)" }) }), _jsx(Grid, { size: 6, children: _jsx(TextField, { fullWidth: true, label: "\uC218\uB7C9", type: "number", value: partDialog.part?.quantity || 0, onChange: (e) => handlePartChange('quantity', Number(e.target.value)), InputProps: { inputProps: { min: 1 } }, required: true }) }), _jsx(Grid, { size: 6, children: _jsx(TextField, { fullWidth: true, label: "\uB2E8\uAC00", type: "number", value: partDialog.part?.unitCost || 0, onChange: (e) => handlePartChange('unitCost', Number(e.target.value)), InputProps: {
                                            startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A9" }),
                                            inputProps: { min: 0 }
                                        }, required: true }) }), _jsx(Grid, { size: 12, children: _jsx(TextField, { fullWidth: true, label: "\uCD1D\uC561", type: "number", value: partDialog.part?.totalCost || 0, InputProps: {
                                            startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A9" }),
                                            readOnly: true,
                                        } }) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClosePartDialog, children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: handleSavePart, color: "primary", disabled: !partDialog.part || !validatePart(partDialog.part), children: "\uC800\uC7A5" })] })] })] }));
};
export default MaintenanceForm;
