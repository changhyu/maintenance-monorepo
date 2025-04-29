import { jsx as _jsx } from "react/jsx-runtime";
import TodoItem from '../TodoItem';
// 우선순위에 따른 색상 클래스 반환 함수
const getPriorityClass = (priority) => {
    switch (priority) {
        case 'high':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'medium':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'low':
            return 'bg-green-100 text-green-800 border-green-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};
// 명시적 타입 정의를 사용한 함수 컴포넌트
const TodoList = (props) => {
    const { loading, todos, filterState, onTodoClick, onUpdateTodo, onDeleteTodo, onToggleComplete } = props;
    if (loading) {
        return _jsx("p", { className: "text-gray-500", children: "\uB85C\uB529 \uC911..." });
    }
    if (todos.length === 0) {
        return _jsx("p", { className: "text-gray-500", children: "\uB4F1\uB85D\uB41C \uC815\uBE44 \uC791\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    const handleToggle = async (id, e) => {
        e.preventDefault();
        if (onToggleComplete) {
            await onToggleComplete(id);
        }
    };
    const handleDelete = async (id) => {
        if (onDeleteTodo) {
            await onDeleteTodo(id);
        }
    };
    const handleClick = (todo) => {
        if (onTodoClick) {
            onTodoClick(todo);
        }
    };
    const handleViewVehicle = (e, vehicleId) => {
        e.stopPropagation();
        // 차량 상세 페이지로 이동하는 로직은 별도로 구현
        console.log('차량 상세 보기:', vehicleId);
    };
    return (_jsx("ul", { className: "space-y-2", children: todos.map(todo => (_jsx(TodoItem, { todo: todo, onToggle: handleToggle, onDelete: handleDelete, onClick: handleClick, onViewVehicle: handleViewVehicle, getPriorityClass: getPriorityClass }, todo.id))) }));
};
export default TodoList;
