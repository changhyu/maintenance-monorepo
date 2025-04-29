import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, DatePicker, Button, Space, message } from 'antd';
import TodoList from './todo/TodoList';
import TodoCalendar from './TodoCalendar';
import TodoDetailModal from './TodoDetailModal';
import TodoFilter from './TodoFilter';
import TodoNotifications from './TodoNotifications';
import TodoStats from './TodoStats';
import TodoTemplates from './TodoTemplates';
import { useTodoContext } from '../context/TodoContext';
/**
 * Todo 통합 대시보드 컴포넌트
 */
const TodoDashboard = ({ className = '' }) => {
    const { todos, loading, error, filter, setFilter, fetchTodos, createTodo, updateTodo, deleteTodo, toggleComplete, createTodosFromTemplate, requestNotificationPermission } = useTodoContext();
    // 현재 선택된 탭
    const [activeTab, setActiveTab] = useState('list');
    // 모달 상태
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // 할 일 추가 모달 상태
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();
    const [createLoading, setCreateLoading] = useState(false);
    // 브라우저 알림 권한 요청 (컴포넌트 마운트 시 한 번만 실행)
    useEffect(() => {
        requestNotificationPermission();
    }, [requestNotificationPermission]);
    // Todo 항목 클릭 처리
    const handleTodoClick = (todo) => {
        setSelectedTodo(todo);
        setIsModalOpen(true);
    };
    // 모달 닫기
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTodo(null);
    };
    // 알림의 Todo 항목 클릭 처리
    const handleNotificationTodoClick = (todoId) => {
        const todo = todos.find(t => t.id === todoId);
        if (todo) {
            setSelectedTodo(todo);
            setIsModalOpen(true);
        }
    };
    // 필터 변경 핸들러
    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        fetchTodos(newFilter);
    };
    // 할 일 추가 폼 제출 처리
    const handleCreateFormSubmit = async (values) => {
        try {
            setCreateLoading(true);
            const todoData = {
                title: values.title,
                description: values.description ?? '',
                priority: values.priority ?? 'medium',
                dueDate: values.dueDate ? values.dueDate : undefined,
                category: values.category ?? '일반',
                completed: false
            };
            await createTodo(todoData);
            message.success('할 일이 성공적으로 생성되었습니다');
            setCreateModalVisible(false);
            createForm.resetFields();
        }
        catch (err) {
            console.error('Todo 생성 중 오류가 발생했습니다:', err);
            message.error('할 일 생성 중 오류가 발생했습니다');
        }
        finally {
            setCreateLoading(false);
        }
    };
    // 할 일 업데이트 처리
    const handleTodoEdit = async (id, updates) => {
        try {
            return await updateTodo(id, updates);
        }
        catch (err) {
            console.error('Todo 업데이트 중 오류가 발생했습니다:', err);
            return null;
        }
    };
    // 할 일 삭제 처리
    const handleTodoDelete = async (id) => {
        try {
            await deleteTodo(id);
        }
        catch (err) {
            console.error('Todo 삭제 중 오류가 발생했습니다:', err);
        }
    };
    // Todo 완료 상태 토글 처리
    const handleToggleComplete = async (id) => {
        try {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                return await toggleComplete(id, !todo.completed);
            }
            return false;
        }
        catch (err) {
            console.error('Todo 완료 상태 변경 중 오류가 발생했습니다:', err);
            return false;
        }
    };
    // 탭 버튼 클래스
    const getTabClass = (tab) => {
        return `px-4 py-2 font-medium rounded-t-lg ${activeTab === tab
            ? 'bg-white text-blue-600 border-t border-l border-r'
            : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`;
    };
    // 할 일 목록 탭 렌더링
    const renderTodoList = () => {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4", children: _jsx(TodoFilter, { onFilterChange: handleFilterChange, initialFilter: filter }) }), _jsxs("div", { className: "mb-4 flex justify-between items-center", children: [_jsx("div", { children: _jsx("button", { className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", onClick: () => setCreateModalVisible(true), children: "\uC0C8 \uD560 \uC77C \uCD94\uAC00" }) }), _jsx("div", { children: _jsxs("span", { className: "mr-2", children: ["\uCD1D ", todos.length, "\uAC1C\uC758 \uD560 \uC77C"] }) })] }), _jsx(TodoList, { todos: todos, loading: loading, onTodoClick: handleTodoClick, onUpdateTodo: handleTodoEdit, onDeleteTodo: handleTodoDelete, onToggleComplete: handleToggleComplete })] }));
    };
    // 캘린더 탭 렌더링
    const renderCalendar = () => {
        return _jsx(TodoCalendar, { todos: todos, onTodoClick: handleTodoClick, className: "mt-4" });
    };
    // 템플릿 탭 렌더링
    const renderTemplates = () => {
        return (_jsx(TodoTemplates, { className: "mt-4", onTemplateSelect: (template) => {
                // 템플릿 선택 시 기본 탭으로 이동하고 템플릿에서 할 일 생성
                setActiveTab('list');
                // 진행 상황 표시
                const key = `template-${Date.now()}`;
                message.open({
                    key,
                    type: 'loading',
                    content: `템플릿 '${template.name}'의 ${template.items.length}개 항목 생성 중...`,
                    duration: 0
                });
                // 템플릿 항목 생성
                createTodosFromTemplate(template)
                    .then(() => {
                    message.open({
                        key,
                        type: 'success',
                        content: `템플릿 '${template.name}'에서 ${template.items.length}개의 할 일이 생성되었습니다`
                    });
                })
                    .catch(() => {
                    message.open({
                        key,
                        type: 'error',
                        content: '템플릿 적용 중 오류가 발생했습니다'
                    });
                });
            } }));
    };
    return (_jsxs("div", { className: `todo-dashboard ${className}`, children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uC815\uBE44 \uC791\uC5C5 \uAD00\uB9AC" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("div", { className: "tabs flex space-x-1", children: [_jsx("button", { onClick: () => setActiveTab('list'), className: getTabClass('list'), children: "\uBAA9\uB85D" }), _jsx("button", { onClick: () => setActiveTab('stats'), className: getTabClass('stats'), children: "\uD1B5\uACC4" }), _jsx("button", { onClick: () => setActiveTab('calendar'), className: getTabClass('calendar'), children: "\uCE98\uB9B0\uB354" }), _jsx("button", { onClick: () => setActiveTab('templates'), className: getTabClass('templates'), children: "\uD15C\uD50C\uB9BF" })] }), _jsx(TodoNotifications, { onTodoClick: handleNotificationTodoClick, className: "ml-4" })] })] }), loading && _jsx("div", { className: "text-center py-4", children: "\uB85C\uB529 \uC911..." }), error && (_jsx("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4", children: error.message || '할 일을 불러오는 중 오류가 발생했습니다.' })), _jsxs("div", { className: "tab-content", children: [activeTab === 'list' && renderTodoList(), activeTab === 'stats' && _jsx(TodoStats, { todos: todos, className: "mt-4" }), activeTab === 'calendar' && renderCalendar(), activeTab === 'templates' && renderTemplates()] }), _jsx(TodoDetailModal, { todo: selectedTodo, isOpen: isModalOpen, onClose: handleCloseModal, onUpdate: handleTodoEdit, isLoading: loading }), _jsx(Modal, { title: "\uC0C8 \uD560 \uC77C \uCD94\uAC00", open: createModalVisible, onCancel: () => setCreateModalVisible(false), footer: null, width: 700, children: _jsxs(Form, { form: createForm, layout: "vertical", onFinish: handleCreateFormSubmit, children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Form.Item, { name: "title", label: "\uC81C\uBAA9", rules: [{ required: true, message: '제목을 입력해주세요' }], children: _jsx(Input, { placeholder: "\uD560 \uC77C \uC81C\uBAA9" }) }), _jsx(Form.Item, { name: "category", label: "\uCE74\uD14C\uACE0\uB9AC", children: _jsxs(Select, { placeholder: "\uCE74\uD14C\uACE0\uB9AC \uC120\uD0DD", children: [_jsx(Select.Option, { value: "\uC815\uAE30 \uC810\uAC80", children: "\uC815\uAE30 \uC810\uAC80" }), _jsx(Select.Option, { value: "\uC77C\uC0C1 \uC810\uAC80", children: "\uC77C\uC0C1 \uC810\uAC80" }), _jsx(Select.Option, { value: "\uBD80\uD488 \uAD50\uCCB4", children: "\uBD80\uD488 \uAD50\uCCB4" }), _jsx(Select.Option, { value: "\uC0AC\uACE0 \uC218\uB9AC", children: "\uC0AC\uACE0 \uC218\uB9AC" }), _jsx(Select.Option, { value: "\uC77C\uBC18", children: "\uC77C\uBC18" })] }) })] }), _jsx(Form.Item, { name: "description", label: "\uC124\uBA85", children: _jsx(Input.TextArea, { placeholder: "\uD560 \uC77C\uC5D0 \uB300\uD55C \uC0C1\uC138 \uC124\uBA85", rows: 4 }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Form.Item, { name: "priority", label: "\uC6B0\uC120\uC21C\uC704", children: _jsxs(Select, { placeholder: "\uC6B0\uC120\uC21C\uC704 \uC120\uD0DD", defaultValue: "medium", children: [_jsx(Select.Option, { value: "high", children: "\uB192\uC74C" }), _jsx(Select.Option, { value: "medium", children: "\uC911\uAC04" }), _jsx(Select.Option, { value: "low", children: "\uB0AE\uC74C" })] }) }), _jsx(Form.Item, { name: "dueDate", label: "\uB9C8\uAC10\uC77C", children: _jsx(DatePicker, { style: { width: '100%' } }) })] }), _jsxs("div", { className: "flex justify-between mt-4", children: [_jsx(Button, { onClick: () => setCreateModalVisible(false), children: "\uCDE8\uC18C" }), _jsxs(Space, { children: [_jsx(Button, { onClick: () => {
                                                setCreateModalVisible(false);
                                                setActiveTab('templates');
                                            }, children: "\uD15C\uD50C\uB9BF\uC5D0\uC11C \uCD94\uAC00" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: createLoading, icon: _jsx(PlusOutlined, {}), children: "\uD560 \uC77C \uCD94\uAC00" })] })] })] }) })] }));
};
export default TodoDashboard;
