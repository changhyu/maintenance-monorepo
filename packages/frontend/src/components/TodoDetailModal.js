import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const TodoDetailModal = ({ todo, isOpen, onClose, onUpdate, isLoading = false }) => {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState(null);
    // todo 데이터가 변경될 때마다 폼 데이터 업데이트
    useEffect(() => {
        if (todo) {
            setFormData({
                title: todo.title,
                description: todo.description,
                priority: todo.priority,
                dueDate: todo.dueDate,
                assignedTo: todo.assignedTo,
                vehicleId: todo.vehicleId,
                completed: todo.completed
            });
        }
    }, [todo]);
    // 입력 변경 처리
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    // 체크박스 변경 처리
    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };
    // 업데이트 제출 처리
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!todo)
            return;
        setError(null);
        try {
            await onUpdate(todo.id, formData);
            onClose();
        }
        catch (err) {
            setError('정비 작업을 업데이트하는 중 오류가 발생했습니다.');
            console.error(err);
        }
    };
    // 모달이 닫혀있으면 아무것도 렌더링하지 않음
    if (!isOpen || !todo) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-xl font-bold", children: "\uC815\uBE44 \uC791\uC5C5 \uC0C1\uC138" }), _jsx("button", { onClick: onClose, className: "text-gray-500 hover:text-gray-700", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC81C\uBAA9" }), _jsx("input", { type: "text", name: "title", value: formData.title || '', onChange: handleInputChange, className: "block w-full border border-gray-300 rounded-md shadow-sm p-2", required: true })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC124\uBA85" }), _jsx("textarea", { name: "description", value: formData.description || '', onChange: handleInputChange, rows: 3, className: "block w-full border border-gray-300 rounded-md shadow-sm p-2" })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC6B0\uC120\uC21C\uC704" }), _jsxs("select", { name: "priority", value: formData.priority || 'medium', onChange: handleInputChange, className: "block w-full border border-gray-300 rounded-md shadow-sm p-2", children: [_jsx("option", { value: "high", children: "\uB192\uC74C" }), _jsx("option", { value: "medium", children: "\uC911\uAC04" }), _jsx("option", { value: "low", children: "\uB0AE\uC74C" })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\uB9C8\uAC10\uC77C" }), _jsx("input", { type: "date", name: "dueDate", value: formData.dueDate || '', onChange: handleInputChange, className: "block w-full border border-gray-300 rounded-md shadow-sm p-2" })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\uCC28\uB7C9 ID" }), _jsx("input", { type: "text", name: "vehicleId", value: formData.vehicleId || '', onChange: handleInputChange, className: "block w-full border border-gray-300 rounded-md shadow-sm p-2" })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\uB2F4\uB2F9\uC790" }), _jsx("input", { type: "text", name: "assignedTo", value: formData.assignedTo || '', onChange: handleInputChange, className: "block w-full border border-gray-300 rounded-md shadow-sm p-2" })] }), _jsx("div", { className: "mb-4", children: _jsxs("label", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", name: "completed", checked: !!formData.completed, onChange: handleCheckboxChange, className: "h-4 w-4 text-blue-600 border-gray-300 rounded" }), _jsx("span", { className: "ml-2 text-sm text-gray-700", children: "\uC644\uB8CC\uB428" })] }) }), error && _jsx("div", { className: "mb-4 text-sm text-red-600", children: error }), _jsxs("div", { className: "mb-4 pt-4 border-t border-gray-200", children: [_jsxs("p", { className: "text-xs text-gray-500", children: ["\uC0DD\uC131\uC77C: ", new Date(todo.createdAt).toLocaleString()] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["\uCD5C\uC885 \uC218\uC815\uC77C: ", new Date(todo.updatedAt).toLocaleString()] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50", disabled: isLoading, children: "\uCDE8\uC18C" }), _jsx("button", { type: "submit", className: "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400", disabled: isLoading, children: isLoading ? '처리 중...' : '저장' })] })] })] }) }));
};
export default TodoDetailModal;
