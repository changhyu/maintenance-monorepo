import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenance';
import { vehicleService } from '../../services/vehicle';
import { MaintenanceType, MaintenanceStatus, MaintenancePriority } from '../../types/maintenance';
import { getTodayString } from '../../utils/dateUtils';
const MaintenanceForm = ({ initialData, vehicleId, onSubmit, onCancel, isEdit = false }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        type: MaintenanceType.REGULAR,
        title: '',
        description: '',
        status: MaintenanceStatus.SCHEDULED,
        priority: MaintenancePriority.MEDIUM,
        startDate: getTodayString(),
        mileage: 0,
        cost: 0,
        technicianName: '',
        shopName: '',
        notes: '',
        parts: [],
        documents: [],
        ...initialData
    });
    const [vehicle, setVehicle] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newPart, setNewPart] = useState({
        name: '',
        partNumber: '',
        quantity: 1,
        unitCost: 0,
        totalCost: 0
    });
    const [fileToUpload, setFileToUpload] = useState(null);
    useEffect(() => {
        const fetchVehicle = async () => {
            if (vehicleId || initialData?.vehicleId) {
                setIsLoading(true);
                try {
                    const data = await vehicleService.getVehicleById(vehicleId ?? initialData?.vehicleId);
                    if (data) {
                        setVehicle(data);
                        if (!initialData?.vehicleId && data.id) {
                            setFormData(prev => ({ ...prev, vehicleId: data.id }));
                        }
                    }
                }
                catch (err) {
                    setError('차량 정보를 불러오는데 실패했습니다.');
                    console.error(err);
                }
                finally {
                    setIsLoading(false);
                }
            }
        };
        fetchVehicle();
    }, [vehicleId, initialData?.vehicleId]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handlePartChange = (e) => {
        const { name, value } = e.target;
        setNewPart(prev => {
            const updated = {
                ...prev,
                [name]: name === 'quantity' || name === 'unitCost' ? Number(value) : value
            };
            // 수량이나 단가가 변경되면 총 비용 자동 계산
            if (name === 'quantity' || name === 'unitCost') {
                const quantity = name === 'quantity' ? Number(value) : (prev.quantity ?? 0);
                const unitCost = name === 'unitCost' ? Number(value) : (prev.unitCost ?? 0);
                updated.totalCost = quantity * unitCost;
            }
            return updated;
        });
    };
    const addPart = () => {
        if (!newPart.name || !newPart.quantity || !newPart.unitCost) {
            setError('부품 이름, 수량, 단가를 모두 입력해주세요.');
            return;
        }
        const partToAdd = {
            ...newPart,
            id: `temp-${Date.now()}`, // 임시 ID
            quantity: Number(newPart.quantity),
            unitCost: Number(newPart.unitCost),
            totalCost: Number(newPart.quantity) * Number(newPart.unitCost)
        };
        setFormData(prev => ({
            ...prev,
            parts: [...(prev.parts || []), partToAdd],
            cost: (prev.cost ?? 0) + partToAdd.totalCost
        }));
        setNewPart({
            name: '',
            partNumber: '',
            quantity: 1,
            unitCost: 0,
            totalCost: 0
        });
    };
    const removePart = (id) => {
        const partToRemove = formData.parts?.find(part => part.id === id);
        if (!partToRemove) {
            return;
        }
        setFormData(prev => ({
            ...prev,
            parts: prev.parts?.filter(part => part.id !== id),
            cost: (prev.cost ?? 0) - partToRemove.totalCost
        }));
    };
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileToUpload(e.target.files[0]);
        }
    };
    const uploadDocument = async () => {
        if (!fileToUpload) {
            setError('업로드할 파일을 선택해주세요.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (isEdit && formData.id) {
                // 기존 정비 기록에 문서 추가
                const result = await maintenanceService.attachDocument(formData.id, fileToUpload);
                if (result) {
                    setFormData(prev => ({
                        ...prev,
                        documents: [...(prev.documents ?? []), result]
                    }));
                }
            }
            else {
                // 아직 저장되지 않은 폼에는 임시로 문서 추가
                const tempDoc = {
                    id: `temp-${Date.now()}`,
                    name: fileToUpload.name,
                    fileUrl: URL.createObjectURL(fileToUpload),
                    uploadedAt: new Date().toISOString(),
                    size: fileToUpload.size,
                    type: fileToUpload.type
                };
                setFormData(prev => ({
                    ...prev,
                    documents: [...(prev.documents ?? []), tempDoc]
                }));
            }
            setFileToUpload(null);
            // 파일 입력 필드 초기화
            const fileInput = document.getElementById('file-upload');
            if (fileInput) {
                fileInput.value = '';
            }
        }
        catch (err) {
            setError('문서 업로드에 실패했습니다.');
            console.error(err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const removeDocument = async (docId) => {
        if (isEdit && formData.id) {
            try {
                const result = await maintenanceService.removeDocument(formData.id, docId);
                if (result) {
                    setFormData(prev => ({
                        ...prev,
                        documents: prev.documents?.filter(doc => doc.id !== docId)
                    }));
                }
            }
            catch (err) {
                setError('문서 삭제에 실패했습니다.');
                console.error(err);
            }
        }
        else {
            // 아직 저장되지 않은 상태에서는 그냥 목록에서 제거
            setFormData(prev => ({
                ...prev,
                documents: prev.documents?.filter(doc => doc.id !== docId)
            }));
        }
    };
    // isEdit에 따라 적절한 서비스 함수를 호출하는 함수
    const saveMaintenanceRecord = async () => {
        let result;
        if (isEdit && formData.id) {
            // 기존 정비 기록 업데이트
            const { id, vehicle, createdAt, updatedAt, ...updateData } = formData;
            result = await maintenanceService.updateMaintenanceRecord(id, updateData);
        }
        else {
            // 새 정비 기록 생성
            const { id, vehicle, createdAt, updatedAt, ...createData } = formData;
            result = await maintenanceService.createMaintenanceRecord(createData);
        }
        return result;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.vehicleId || !formData.title || !formData.description || !formData.startDate) {
            setError('필수 항목을 모두 입력해주세요.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await saveMaintenanceRecord();
            if (onSubmit && result) {
                onSubmit(result);
            }
            else if (result) {
                navigate(`/maintenance/${result.id}`);
            }
        }
        catch (err) {
            setError('정비 기록 저장에 실패했습니다.');
            console.error(err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const calculateTotalCost = () => {
        const partsCost = formData.parts?.reduce((sum, part) => sum + part.totalCost, 0) ?? 0;
        const laborCost = formData.cost ?? 0;
        return partsCost + laborCost;
    };
    // 라벨과 입력 필드를 연결하기 위한 고유 ID 생성
    const getLabelId = (fieldName) => {
        return `maintenance-${fieldName}`;
    };
    // 버튼 텍스트를 결정하는 함수
    const getSubmitButtonText = () => {
        if (isLoading) {
            return '처리 중...';
        }
        return isEdit ? '수정' : '저장';
    };
    return (_jsxs("div", { className: "p-4 bg-white rounded-lg shadow", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: isEdit ? '정비 기록 수정' : '새 정비 기록' }), error && _jsx("div", { className: "mb-4 p-3 bg-red-50 text-red-700 rounded", children: error }), isLoading && !vehicle && (_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" }) })), vehicle && (_jsxs("div", { className: "mb-4 p-3 bg-gray-50 rounded", children: [_jsx("h3", { className: "font-semibold", children: "\uCC28\uB7C9 \uC815\uBCF4" }), _jsxs("p", { children: [vehicle.year, " ", vehicle.make, " ", vehicle.model, " (", vehicle.licensePlate, ")"] })] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('type'), children: "\uC815\uBE44 \uC720\uD615*" }), _jsx("select", { id: getLabelId('type'), name: "type", value: formData.type, onChange: handleChange, className: "w-full p-2 border rounded", required: true, children: Object.values(MaintenanceType).map(type => (_jsx("option", { value: type, children: type }, type))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('status'), children: "\uC0C1\uD0DC*" }), _jsx("select", { id: getLabelId('status'), name: "status", value: formData.status, onChange: handleChange, className: "w-full p-2 border rounded", required: true, children: Object.values(MaintenanceStatus).map(status => (_jsx("option", { value: status, children: status }, status))) })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('title'), children: "\uC81C\uBAA9*" }), _jsx("input", { id: getLabelId('title'), type: "text", name: "title", value: formData.title, onChange: handleChange, className: "w-full p-2 border rounded", required: true })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('description'), children: "\uC124\uBA85*" }), _jsx("textarea", { id: getLabelId('description'), name: "description", value: formData.description, onChange: handleChange, rows: 4, className: "w-full p-2 border rounded", required: true })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('startDate'), children: "\uC2DC\uC791\uC77C*" }), _jsx("input", { id: getLabelId('startDate'), type: "date", name: "startDate", value: formData.startDate, onChange: handleChange, className: "w-full p-2 border rounded", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('endDate'), children: "\uC885\uB8CC\uC77C" }), _jsx("input", { id: getLabelId('endDate'), type: "date", name: "endDate", value: formData.endDate ?? '', onChange: handleChange, className: "w-full p-2 border rounded" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('mileage'), children: "\uC8FC\uD589\uAC70\uB9AC (km)*" }), _jsx("input", { id: getLabelId('mileage'), type: "number", name: "mileage", value: formData.mileage, onChange: handleChange, className: "w-full p-2 border rounded", required: true })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('technicianName'), children: "\uB2F4\uB2F9 \uAE30\uC220\uC790" }), _jsx("input", { id: getLabelId('technicianName'), type: "text", name: "technicianName", value: formData.technicianName ?? '', onChange: handleChange, className: "w-full p-2 border rounded" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('shopName'), children: "\uC815\uBE44\uC18C" }), _jsx("input", { id: getLabelId('shopName'), type: "text", name: "shopName", value: formData.shopName ?? '', onChange: handleChange, className: "w-full p-2 border rounded" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('priority'), children: "\uC6B0\uC120\uC21C\uC704" }), _jsx("select", { id: getLabelId('priority'), name: "priority", value: formData.priority, onChange: handleChange, className: "w-full p-2 border rounded", children: Object.values(MaintenancePriority).map(priority => (_jsx("option", { value: priority, children: priority }, priority))) })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('cost'), children: "\uC778\uAC74\uBE44 (\uC6D0)" }), _jsx("input", { id: getLabelId('cost'), type: "number", name: "cost", value: formData.cost, onChange: handleChange, className: "w-full p-2 border rounded" })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", htmlFor: getLabelId('notes'), children: "\uBA54\uBAA8" }), _jsx("textarea", { id: getLabelId('notes'), name: "notes", value: formData.notes ?? '', onChange: handleChange, rows: 3, className: "w-full p-2 border rounded" })] }), _jsxs("div", { className: "mb-6 p-4 border rounded bg-gray-50", children: [_jsx("h3", { className: "font-semibold mb-2", children: "\uBD80\uD488" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-2 mb-2", children: [_jsx("div", { className: "md:col-span-2", children: _jsx("input", { type: "text", name: "name", value: newPart.name, onChange: handlePartChange, placeholder: "\uBD80\uD488 \uC774\uB984", className: "w-full p-2 border rounded" }) }), _jsx("div", { children: _jsx("input", { type: "text", name: "partNumber", value: newPart.partNumber, onChange: handlePartChange, placeholder: "\uBD80\uD488 \uBC88\uD638", className: "w-full p-2 border rounded" }) }), _jsx("div", { children: _jsx("input", { type: "number", name: "quantity", value: newPart.quantity, onChange: handlePartChange, placeholder: "\uC218\uB7C9", className: "w-full p-2 border rounded" }) }), _jsx("div", { children: _jsx("input", { type: "number", name: "unitCost", value: newPart.unitCost, onChange: handlePartChange, placeholder: "\uB2E8\uAC00", className: "w-full p-2 border rounded" }) })] }), _jsx("div", { className: "flex justify-end mb-3", children: _jsx("button", { type: "button", onClick: addPart, className: "px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600", children: "\uBD80\uD488 \uCD94\uAC00" }) }), formData.parts && formData.parts.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full table-auto border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100", children: [_jsx("th", { className: "p-2 text-left", children: "\uBD80\uD488\uBA85" }), _jsx("th", { className: "p-2 text-left", children: "\uBD80\uD488 \uBC88\uD638" }), _jsx("th", { className: "p-2 text-right", children: "\uC218\uB7C9" }), _jsx("th", { className: "p-2 text-right", children: "\uB2E8\uAC00" }), _jsx("th", { className: "p-2 text-right", children: "\uCD1D\uC561" }), _jsx("th", { className: "p-2 text-center", children: "\uC0AD\uC81C" })] }) }), _jsxs("tbody", { children: [formData.parts.map(part => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "p-2", children: part.name }), _jsx("td", { className: "p-2", children: part.partNumber ?? '-' }), _jsx("td", { className: "p-2 text-right", children: part.quantity }), _jsxs("td", { className: "p-2 text-right", children: [part.unitCost.toLocaleString(), "\uC6D0"] }), _jsxs("td", { className: "p-2 text-right", children: [part.totalCost.toLocaleString(), "\uC6D0"] }), _jsx("td", { className: "p-2 text-center", children: _jsx("button", { type: "button", onClick: () => removePart(part.id), className: "text-red-500 hover:text-red-700", children: "\uC0AD\uC81C" }) })] }, part.id))), _jsxs("tr", { className: "border-t font-semibold", children: [_jsx("td", { colSpan: 4, className: "p-2 text-right", children: "\uCD1D \uBD80\uD488\uBE44:" }), _jsxs("td", { className: "p-2 text-right", children: [formData.parts
                                                                    .reduce((sum, part) => sum + part.totalCost, 0)
                                                                    .toLocaleString(), "\uC6D0"] }), _jsx("td", {})] })] })] }) })) : (_jsx("p", { className: "text-center text-gray-500 my-4", children: "\uB4F1\uB85D\uB41C \uBD80\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }))] }), _jsxs("div", { className: "mb-6 p-4 border rounded bg-gray-50", children: [_jsx("h3", { className: "font-semibold mb-2", children: "\uBB38\uC11C" }), _jsxs("div", { className: "flex flex-col md:flex-row gap-2 mb-3", children: [_jsx("input", { type: "file", id: "file-upload", onChange: handleFileChange, className: "flex-grow p-2 border rounded" }), _jsx("button", { type: "button", onClick: uploadDocument, className: "px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", disabled: !fileToUpload, children: "\uC5C5\uB85C\uB4DC" })] }), formData.documents && formData.documents.length > 0 ? (_jsx("ul", { className: "divide-y", children: formData.documents.map(doc => (_jsxs("li", { className: "py-2 flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: doc.name }), _jsxs("span", { className: "ml-2 text-sm text-gray-500", children: ["(", Math.round(doc.size / 1024), " KB)"] })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("a", { href: doc.fileUrl, target: "_blank", rel: "noopener noreferrer", className: "text-blue-500 hover:text-blue-700", children: "\uBCF4\uAE30" }), _jsx("button", { type: "button", onClick: () => removeDocument(doc.id), className: "text-red-500 hover:text-red-700", children: "\uC0AD\uC81C" })] })] }, doc.id))) })) : (_jsx("p", { className: "text-center text-gray-500 my-4", children: "\uB4F1\uB85D\uB41C \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }))] }), _jsxs("div", { className: "flex justify-between items-center mt-6", children: [_jsxs("div", { className: "font-semibold text-lg", children: ["\uCD1D \uBE44\uC6A9: ", calculateTotalCost().toLocaleString(), "\uC6D0"] }), _jsxs("div", { className: "flex space-x-3", children: [_jsx("button", { type: "button", onClick: onCancel ?? (() => navigate(-1)), className: "px-4 py-2 border rounded hover:bg-gray-100", children: "\uCDE8\uC18C" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", disabled: isLoading, children: getSubmitButtonText() })] })] })] })] }));
};
export default MaintenanceForm;
