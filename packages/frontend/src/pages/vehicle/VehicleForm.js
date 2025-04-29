import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, FormControl, FormControlLabel, FormHelperText, FormLabel, Grid, InputAdornment, LinearProgress, MenuItem, Radio, RadioGroup, Select, TextField, Typography, } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, DirectionsCar as CarIcon, } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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
// 차량 제조사 목록 (예시)
const carMakes = [
    '현대', '기아', '쉐보레', '르노삼성', '쌍용',
    'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Toyota',
    'Honda', 'Nissan', 'Ford', 'Tesla',
];
// 차량 유형 목록
const vehicleTypes = [
    { value: 'sedan', label: '승용차' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: '트럭' },
    { value: 'van', label: '밴' },
    { value: 'hatchback', label: '해치백' },
    { value: 'coupe', label: '쿠페' },
    { value: 'convertible', label: '컨버터블' },
    { value: 'wagon', label: '왜건' },
    { value: 'electric', label: '전기차' },
    { value: 'hybrid', label: '하이브리드' },
];
// 연료 유형 목록
const fuelTypes = [
    { value: '가솔린', label: '가솔린' },
    { value: '디젤', label: '디젤' },
    { value: 'LPG', label: 'LPG' },
    { value: '전기', label: '전기' },
    { value: '하이브리드', label: '하이브리드' },
    { value: '수소', label: '수소' },
];
// 변속기 유형 목록
const transmissionTypes = [
    { value: '자동', label: '자동' },
    { value: '수동', label: '수동' },
    { value: 'DCT', label: '듀얼 클러치 (DCT)' },
    { value: 'CVT', label: 'CVT' },
];
// 현재 연도 계산
const currentYear = new Date().getFullYear();
// ValidationSchema
const validationSchema = Yup.object().shape({
    make: Yup.string().required('제조사는 필수 항목입니다'),
    model: Yup.string().required('모델명은 필수 항목입니다'),
    year: Yup.number()
        .required('연식은 필수 항목입니다')
        .min(1900, '유효한 연식을 입력하세요')
        .max(currentYear + 1, '유효한 연식을 입력하세요'),
    licensePlate: Yup.string().required('번호판은 필수 항목입니다'),
    vin: Yup.string()
        .required('VIN은 필수 항목입니다')
        .min(17, '정확한 17자리 VIN을 입력하세요')
        .max(17, '정확한 17자리 VIN을 입력하세요'),
    mileage: Yup.number()
        .required('주행거리는 필수 항목입니다')
        .min(0, '주행거리는 0 이상이어야 합니다'),
    type: Yup.string().required('차량 유형은 필수 항목입니다'),
    status: Yup.string().required('차량 상태는 필수 항목입니다'),
});
// 초기 차량 데이터
const initialVehicle = {
    vin: '',
    make: '',
    model: '',
    year: currentYear,
    licensePlate: '',
    color: '',
    type: 'sedan',
    status: 'active',
    mileage: 0,
    owner: '',
    fuelType: '',
    transmission: '',
    engineSize: '',
    notes: '',
};
const VehicleForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(id ? true : false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEdit, setIsEdit] = useState(Boolean(id));
    const formik = useFormik({
        initialValues: initialVehicle,
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                setSubmitLoading(true);
                setError(null);
                // 실제로는 API 호출
                console.log('차량 저장:', values);
                // API 호출 시뮬레이션
                await new Promise(resolve => setTimeout(resolve, 1000));
                setSubmitLoading(false);
                navigate(isEdit ? `/vehicles/${id}` : '/vehicles');
            }
            catch (err) {
                setError('차량 정보 저장 중 오류가 발생했습니다.');
                setSubmitLoading(false);
                console.error(err);
            }
        }
    });
    useEffect(() => {
        // 수정 모드일 경우 기존 차량 정보 불러오기
        const fetchVehicle = async () => {
            if (id) {
                try {
                    // 실제로는 API 호출
                    // API 호출 시뮬레이션
                    setTimeout(() => {
                        const vehicle = mockVehicles[id];
                        if (vehicle) {
                            // Formik의 값을 설정
                            formik.setValues(vehicle);
                        }
                        setLoading(false);
                    }, 1000);
                }
                catch (err) {
                    setError('차량 정보를 불러오는데 실패했습니다.');
                    setLoading(false);
                    console.error(err);
                }
            }
        };
        fetchVehicle();
    }, [id]);
    if (loading) {
        return (_jsxs(Box, { sx: { width: '100%' }, children: [_jsx(LinearProgress, {}), _jsx(Typography, { sx: { mt: 2 }, variant: "body1", children: "\uCC28\uB7C9 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Button, { startIcon: _jsx(ArrowBackIcon, {}), onClick: () => navigate(id ? `/vehicles/${id}` : '/vehicles'), children: id ? '차량 상세로 돌아가기' : '차량 목록으로 돌아가기' }), _jsx(Typography, { variant: "h4", component: "h1", children: isEdit ? '차량 정보 수정' : '새 차량 등록' })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 3 }, children: error })), _jsxs("form", { onSubmit: formik.handleSubmit, children: [_jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 3 }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'primary.main' }, children: _jsx(CarIcon, {}) }), _jsx(Typography, { variant: "h6", children: "\uAE30\uBCF8 \uC815\uBCF4" })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.make && formik.errors.make), children: [_jsx(FormLabel, { children: "\uC81C\uC870\uC0AC*" }), _jsxs(Select, { name: "make", value: formik.values.make, onChange: formik.handleChange, onBlur: formik.handleBlur, displayEmpty: true, error: Boolean(formik.touched.make && formik.errors.make), children: [_jsx(MenuItem, { value: "", disabled: true, children: "\uC81C\uC870\uC0AC \uC120\uD0DD" }), carMakes.map(make => (_jsx(MenuItem, { value: make, children: make }, make)))] }), formik.touched.make && formik.errors.make && (_jsx(FormHelperText, { error: true, children: formik.errors.make }))] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.model && formik.errors.model), children: [_jsx(FormLabel, { children: "\uBAA8\uB378*" }), _jsx(TextField, { name: "model", value: formik.values.model, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "\uBAA8\uB378\uBA85", error: Boolean(formik.touched.model && formik.errors.model), helperText: formik.touched.model && formik.errors.model })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.year && formik.errors.year), children: [_jsx(FormLabel, { children: "\uC5F0\uC2DD*" }), _jsx(TextField, { name: "year", type: "number", value: formik.values.year, onChange: formik.handleChange, onBlur: formik.handleBlur, inputProps: { min: 1900, max: currentYear + 1 }, error: Boolean(formik.touched.year && formik.errors.year), helperText: formik.touched.year && formik.errors.year })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uC0C9\uC0C1" }), _jsx(TextField, { name: "color", value: formik.values.color, onChange: formik.handleChange, placeholder: "\uC0C9\uC0C1" })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.licensePlate && formik.errors.licensePlate), children: [_jsx(FormLabel, { children: "\uBC88\uD638\uD310*" }), _jsx(TextField, { name: "licensePlate", value: formik.values.licensePlate, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "\uBC88\uD638\uD310", error: Boolean(formik.touched.licensePlate && formik.errors.licensePlate), helperText: formik.touched.licensePlate && formik.errors.licensePlate })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.vin && formik.errors.vin), children: [_jsx(FormLabel, { children: "VIN*" }), _jsx(TextField, { name: "vin", value: formik.values.vin, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "Vehicle Identification Number", inputProps: { maxLength: 17 }, error: Boolean(formik.touched.vin && formik.errors.vin), helperText: formik.touched.vin && formik.errors.vin })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.mileage && formik.errors.mileage), children: [_jsx(FormLabel, { children: "\uC8FC\uD589\uAC70\uB9AC*" }), _jsx(TextField, { name: "mileage", type: "number", value: formik.values.mileage, onChange: formik.handleChange, onBlur: formik.handleBlur, inputProps: { min: 0 }, InputProps: {
                                                                        endAdornment: _jsx(InputAdornment, { position: "end", children: "km" }),
                                                                    }, error: Boolean(formik.touched.mileage && formik.errors.mileage), helperText: formik.touched.mileage && formik.errors.mileage })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, error: Boolean(formik.touched.type && formik.errors.type), children: [_jsx(FormLabel, { children: "\uCC28\uB7C9 \uC720\uD615*" }), _jsx(Select, { name: "type", value: formik.values.type, onChange: formik.handleChange, onBlur: formik.handleBlur, error: Boolean(formik.touched.type && formik.errors.type), children: vehicleTypes.map(type => (_jsx(MenuItem, { value: type.value, children: type.label }, type.value))) }), formik.touched.type && formik.errors.type && (_jsx(FormHelperText, { error: true, children: formik.errors.type }))] }) }), _jsx(Grid, { size: { xs: 12 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uCC28\uB7C9 \uC0C1\uD0DC*" }), _jsxs(RadioGroup, { name: "status", value: formik.values.status, onChange: formik.handleChange, row: true, children: [_jsx(FormControlLabel, { value: "active", control: _jsx(Radio, {}), label: "\uD65C\uC131" }), _jsx(FormControlLabel, { value: "maintenance", control: _jsx(Radio, {}), label: "\uC815\uBE44 \uC911" }), _jsx(FormControlLabel, { value: "inactive", control: _jsx(Radio, {}), label: "\uBE44\uD65C\uC131" }), _jsx(FormControlLabel, { value: "recalled", control: _jsx(Radio, {}), label: "\uB9AC\uCF5C" })] })] }) })] })] }) }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", sx: { mb: 3 }, children: "\uCD94\uAC00 \uC815\uBCF4" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: { xs: 12 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uC18C\uC720\uC790" }), _jsx(TextField, { name: "owner", value: formik.values.owner || '', onChange: formik.handleChange, placeholder: "\uC18C\uC720\uC790 \uC774\uB984" })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uAD6C\uB9E4\uC77C" }), _jsx(TextField, { name: "purchaseDate", type: "date", value: formik.values.purchaseDate || '', onChange: formik.handleChange, InputLabelProps: {
                                                                        shrink: true,
                                                                    } })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uBCF4\uD5D8 \uB9CC\uB8CC\uC77C" }), _jsx(TextField, { name: "insuranceExpiry", type: "date", value: formik.values.insuranceExpiry || '', onChange: formik.handleChange, InputLabelProps: {
                                                                        shrink: true,
                                                                    } })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uC5F0\uB8CC \uC720\uD615" }), _jsxs(Select, { name: "fuelType", value: formik.values.fuelType || '', onChange: formik.handleChange, displayEmpty: true, children: [_jsx(MenuItem, { value: "", disabled: true, children: "\uC5F0\uB8CC \uC720\uD615 \uC120\uD0DD" }), fuelTypes.map(type => (_jsx(MenuItem, { value: type.value, children: type.label }, type.value)))] })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uBCC0\uC18D\uAE30" }), _jsxs(Select, { name: "transmission", value: formik.values.transmission || '', onChange: formik.handleChange, displayEmpty: true, children: [_jsx(MenuItem, { value: "", disabled: true, children: "\uBCC0\uC18D\uAE30 \uC720\uD615 \uC120\uD0DD" }), transmissionTypes.map(type => (_jsx(MenuItem, { value: type.value, children: type.label }, type.value)))] })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uC5D4\uC9C4" }), _jsx(TextField, { name: "engineSize", value: formik.values.engineSize || '', onChange: formik.handleChange, placeholder: "\uC5D4\uC9C4 \uD06C\uAE30 (\uC608: 2.0L)" })] }) }), _jsx(Grid, { size: { xs: 12 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(FormLabel, { children: "\uBA54\uBAA8" }), _jsx(TextField, { name: "notes", value: formik.values.notes || '', onChange: formik.handleChange, placeholder: "\uCC28\uB7C9\uC5D0 \uB300\uD55C \uCD94\uAC00 \uBA54\uBAA8", multiline: true, rows: 4 })] }) })] })] }) }) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'flex-end', mt: 3 }, children: [_jsx(Button, { variant: "contained", color: "secondary", onClick: () => navigate(id ? `/vehicles/${id}` : '/vehicles'), sx: { mr: 2 }, children: "\uCDE8\uC18C" }), _jsx(Button, { variant: "contained", color: "primary", type: "submit", disabled: submitLoading || !formik.isValid || !formik.dirty, startIcon: _jsx(SaveIcon, {}), children: submitLoading ? '저장 중...' : (isEdit ? '수정 완료' : '차량 등록') })] })] })] }));
};
export default VehicleForm;
