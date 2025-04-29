import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Form, Input, Select, DatePicker, Button } from 'antd';
import { TodoPriority } from '../../services/todoService';
export const AddTodoForm = ({ onCreateTodo, templateState, templateDispatch }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            const todoData = {
                title: values.title,
                description: values.description,
                priority: values.priority || TodoPriority.MEDIUM,
                dueDate: values.dueDate?.format('YYYY-MM-DD'),
                category: values.category
            };
            await onCreateTodo(todoData);
            form.resetFields();
        }
        catch (error) {
            console.error('Todo 생성 실패:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleTemplateSelect = () => {
        templateDispatch({ type: 'SET_TEMPLATE_VISIBLE', payload: true });
    };
    return (_jsxs("div", { className: "add-todo-form", children: [_jsx("h3", { className: "mb-4 text-lg font-medium", children: "\uC0C8 \uC815\uBE44 \uC791\uC5C5 \uCD94\uAC00" }), _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSubmit, children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Form.Item, { name: "title", label: "\uC81C\uBAA9", rules: [{ required: true, message: '제목을 입력해주세요' }], children: _jsx(Input, { placeholder: "\uC815\uBE44 \uC791\uC5C5 \uC81C\uBAA9" }) }), _jsx(Form.Item, { name: "category", label: "\uCE74\uD14C\uACE0\uB9AC", children: _jsxs(Select, { placeholder: "\uCE74\uD14C\uACE0\uB9AC \uC120\uD0DD", children: [_jsx(Select.Option, { value: "\uC815\uAE30 \uC810\uAC80", children: "\uC815\uAE30 \uC810\uAC80" }), _jsx(Select.Option, { value: "\uC77C\uC0C1 \uC810\uAC80", children: "\uC77C\uC0C1 \uC810\uAC80" }), _jsx(Select.Option, { value: "\uBD80\uD488 \uAD50\uCCB4", children: "\uBD80\uD488 \uAD50\uCCB4" }), _jsx(Select.Option, { value: "\uC0AC\uACE0 \uC218\uB9AC", children: "\uC0AC\uACE0 \uC218\uB9AC" })] }) }), _jsx(Form.Item, { name: "description", label: "\uC124\uBA85", children: _jsx(Input.TextArea, { placeholder: "\uC815\uBE44 \uC791\uC5C5\uC5D0 \uB300\uD55C \uC0C1\uC138 \uC124\uBA85", rows: 4 }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Form.Item, { name: "priority", label: "\uC6B0\uC120\uC21C\uC704", children: _jsxs(Select, { placeholder: "\uC6B0\uC120\uC21C\uC704 \uC120\uD0DD", defaultValue: TodoPriority.MEDIUM, children: [_jsx(Select.Option, { value: TodoPriority.HIGH, children: "\uB192\uC74C" }), _jsx(Select.Option, { value: TodoPriority.MEDIUM, children: "\uC911\uAC04" }), _jsx(Select.Option, { value: TodoPriority.LOW, children: "\uB0AE\uC74C" })] }) }), _jsx(Form.Item, { name: "dueDate", label: "\uB9C8\uAC10\uC77C", children: _jsx(DatePicker, { style: { width: '100%' } }) })] })] }), _jsxs("div", { className: "flex justify-between mt-4", children: [_jsx(Button, { type: "primary", htmlType: "submit", loading: loading, icon: _jsx(PlusOutlined, {}), children: "\uC791\uC5C5 \uCD94\uAC00" }), _jsx(Button, { onClick: handleTemplateSelect, children: "\uD15C\uD50C\uB9BF\uC5D0\uC11C \uCD94\uAC00" })] })] })] }));
};
export default AddTodoForm;
