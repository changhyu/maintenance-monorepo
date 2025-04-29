import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { formatDate, isPastDate } from '../utils/dateUtils';
// 명시적 타입 정의를 사용한 컴포넌트
const TodoItemComponent = (props) => {
    const { todo, onToggle, onDelete, onClick, onViewVehicle, getPriorityClass } = props;
    const handleDelete = async (e) => {
        e.stopPropagation();
        await onDelete(todo.id);
    };
    const handleToggle = async (e) => {
        e.stopPropagation();
        await onToggle(todo.id, e);
    };
    const handleViewVehicle = (e) => {
        if (todo.vehicleId) {
            onViewVehicle(e, todo.vehicleId);
        }
    };
    return (_jsxs("li", { onClick: () => onClick(todo), className: `border p-3 rounded flex items-center justify-between ${todo.completed ? 'bg-gray-100' : ''} cursor-pointer hover:bg-gray-50`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: todo.completed, onChange: handleToggle, onClick: (e) => e.stopPropagation() }), _jsxs("div", { children: [_jsx("p", { className: todo.completed ? 'line-through text-gray-500' : '', children: todo.title }), _jsxs("div", { className: "flex gap-2 mt-1", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded ${getPriorityClass(todo.priority)}`, children: todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '중간' : '낮음' }), todo.dueDate && (_jsxs("span", { className: `text-xs ${isPastDate(todo.dueDate) ? 'text-red-600 font-semibold' : 'text-gray-600'}`, children: ["\uB9C8\uAC10\uC77C: ", formatDate(todo.dueDate)] })), todo.vehicleId && (_jsx("button", { onClick: handleViewVehicle, className: "text-xs text-blue-600 hover:underline", children: "\uCC28\uB7C9 \uBCF4\uAE30" }))] })] })] }), _jsx("button", { onClick: handleDelete, className: "text-red-500 hover:text-red-700", children: "\uC0AD\uC81C" })] }));
};
// memo로 감싸서 내보내기
const TodoItem = memo(TodoItemComponent);
export default TodoItem;
