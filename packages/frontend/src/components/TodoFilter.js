import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { Form, Input, Select, Space, Collapse, Button } from 'antd';
import { TodoPriority } from '../services/todoService';
/**
 * 할 일 목록 필터 컴포넌트
 */
const TodoFilter = ({ onFilterChange, className = '', initialFilter = {} }) => {
    const [form] = Form.useForm();
    const [isOpen, setIsOpen] = useState(false);
    // 필터 변경 시 콜백 호출
    const handleFilterChange = (values) => {
        const filter = {};
        if (values.search?.trim()) {
            filter.search = values.search.trim();
        }
        if (values.priority && values.priority !== 'all') {
            filter.priority = values.priority;
        }
        if (values.completed !== undefined && values.completed !== null && values.completed !== 'all') {
            filter.completed = values.completed === 'completed' ? 'completed' : 'pending';
        }
        if (values.dueDate && values.dueDate !== 'all') {
            filter.dueDate = values.dueDate;
        }
        if (values.vehicleId) {
            filter.vehicleId = values.vehicleId;
        }
        onFilterChange(filter);
    };
    // 필터 초기화
    const handleReset = () => {
        form.resetFields();
        onFilterChange({});
    };
    // 초기 필터 적용
    useEffect(() => {
        if (initialFilter && Object.keys(initialFilter).length > 0) {
            // 초기 필터 있으면 폼 초기값 설정
            const formValues = {};
            if (initialFilter.search) {
                formValues.search = initialFilter.search;
            }
            if (initialFilter.priority) {
                formValues.priority = initialFilter.priority;
            }
            if (initialFilter.completed) {
                formValues.completed = initialFilter.completed;
            }
            if (initialFilter.dueDate) {
                formValues.dueDate = initialFilter.dueDate;
            }
            if (initialFilter.vehicleId) {
                formValues.vehicleId = initialFilter.vehicleId;
            }
            form.setFieldsValue(formValues);
            // 필터가 있으면 패널 펼치기
            if (Object.keys(formValues).length > 0) {
                setIsOpen(true);
            }
        }
    }, [initialFilter, form]);
    return (_jsx("div", { className: `todo-filter ${className}`, children: _jsx(Collapse, { activeKey: isOpen ? ['1'] : [], onChange: () => setIsOpen(!isOpen), ghost: true, children: _jsx(Collapse.Panel, { header: _jsxs("div", { className: "flex items-center", children: [_jsx(FilterOutlined, {}), _jsx("span", { className: "ml-2", children: "\uD544\uD130\uB9C1 \uC635\uC158" })] }), children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleFilterChange, onValuesChange: (_, allValues) => handleFilterChange(allValues), children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [_jsx(Form.Item, { name: "search", label: "\uAC80\uC0C9\uC5B4", children: _jsx(Input, { placeholder: "\uC81C\uBAA9\uC774\uB098 \uC124\uBA85\uC73C\uB85C \uAC80\uC0C9", allowClear: true }) }), _jsx(Form.Item, { name: "priority", label: "\uC6B0\uC120\uC21C\uC704", children: _jsxs(Select, { placeholder: "\uC6B0\uC120\uC21C\uC704 \uC120\uD0DD", allowClear: true, children: [_jsx(Select.Option, { value: "all", children: "\uBAA8\uB4E0 \uC6B0\uC120\uC21C\uC704" }), _jsx(Select.Option, { value: TodoPriority.HIGH, children: "\uB192\uC74C" }), _jsx(Select.Option, { value: TodoPriority.MEDIUM, children: "\uC911\uAC04" }), _jsx(Select.Option, { value: TodoPriority.LOW, children: "\uB0AE\uC74C" })] }) }), _jsx(Form.Item, { name: "completed", label: "\uC644\uB8CC \uC5EC\uBD80", children: _jsxs(Select, { placeholder: "\uC644\uB8CC \uC5EC\uBD80 \uC120\uD0DD", allowClear: true, children: [_jsx(Select.Option, { value: "all", children: "\uBAA8\uB450 \uBCF4\uAE30" }), _jsx(Select.Option, { value: "pending", children: "\uC9C4\uD589 \uC911" }), _jsx(Select.Option, { value: "completed", children: "\uC644\uB8CC\uB428" })] }) }), _jsx(Form.Item, { name: "dueDate", label: "\uB9C8\uAC10\uC77C", children: _jsxs(Select, { placeholder: "\uB9C8\uAC10\uC77C \uC120\uD0DD", allowClear: true, children: [_jsx(Select.Option, { value: "all", children: "\uBAA8\uB4E0 \uB9C8\uAC10\uC77C" }), _jsx(Select.Option, { value: "today", children: "\uC624\uB298" }), _jsx(Select.Option, { value: "overdue", children: "\uAE30\uD55C \uCD08\uACFC" })] }) }), _jsx(Form.Item, { name: "vehicleId", label: "\uCC28\uB7C9", children: _jsxs(Select, { placeholder: "\uCC28\uB7C9 \uC120\uD0DD", allowClear: true, children: [_jsx(Select.Option, { value: "", children: "\uBAA8\uB4E0 \uCC28\uB7C9" }), _jsx(Select.Option, { value: "v1", children: "\uCC28\uB7C9 1" }), _jsx(Select.Option, { value: "v2", children: "\uCC28\uB7C9 2" })] }) })] }), _jsx("div", { className: "flex justify-end mt-4", children: _jsx(Space, { children: _jsx(Button, { onClick: handleReset, icon: _jsx(ClearOutlined, {}), children: "\uCD08\uAE30\uD654" }) }) })] }) }, "1") }) }));
};
export default TodoFilter;
