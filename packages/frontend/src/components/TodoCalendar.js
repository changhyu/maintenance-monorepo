import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
/**
 * Todo 캘린더 컴포넌트
 */
const TodoCalendar = ({ todos, onTodoClick, className = '' }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // 현재 년/월 정보
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // 월 변경 핸들러
    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };
    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };
    // 현재 월의 날짜 그리드 생성
    const calendarDays = useMemo(() => {
        // 해당 월의 첫 날과 마지막 날
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        // 첫 날의 요일 (0: 일요일, 6: 토요일)
        const firstDayOfWeek = firstDayOfMonth.getDay();
        // 해당 월의 총 일수
        const daysInMonth = lastDayOfMonth.getDate();
        // 캘린더 그리드를 위한 날짜 배열 생성
        const days = [];
        // 이전 달의 날짜 추가 (빈 칸으로 표시)
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push({ date: null, isCurrentMonth: false });
        }
        // 현재 달의 날짜 추가
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true
            });
        }
        // 날짜별 Todo 매핑
        return days.map(day => {
            if (!day.date)
                return day;
            // 해당 날짜의 Todo 리스트
            const todosForDay = todos.filter(todo => {
                if (!todo.dueDate)
                    return false;
                const dueDate = new Date(todo.dueDate);
                return (dueDate.getFullYear() === day.date?.getFullYear() &&
                    dueDate.getMonth() === day.date?.getMonth() &&
                    dueDate.getDate() === day.date?.getDate());
            });
            return { ...day, todos: todosForDay };
        });
    }, [todos, year, month]);
    // 요일 헤더
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    // 월 이름
    const monthNames = [
        '1월',
        '2월',
        '3월',
        '4월',
        '5월',
        '6월',
        '7월',
        '8월',
        '9월',
        '10월',
        '11월',
        '12월'
    ];
    return (_jsxs("div", { className: `todo-calendar bg-white p-6 rounded-lg shadow-md ${className}`, children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-xl font-bold", children: "\uC815\uBE44 \uC791\uC5C5 \uCE98\uB9B0\uB354" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: handlePrevMonth, className: "p-2 rounded-full hover:bg-gray-100", children: "<" }), _jsxs("span", { className: "font-medium", children: [year, "\uB144 ", monthNames[month]] }), _jsx("button", { onClick: handleNextMonth, className: "p-2 rounded-full hover:bg-gray-100", children: ">" })] })] }), _jsxs("div", { className: "calendar-grid", children: [_jsx("div", { className: "grid grid-cols-7 text-center font-medium text-gray-500 border-b mb-2", children: weekdays.map(day => (_jsx("div", { className: "py-2", children: day }, day))) }), _jsx("div", { className: "grid grid-cols-7 gap-1 auto-rows-fr", children: calendarDays.map((day) => {
                            const dateKey = day.date ? day.date.toISOString() : `empty-${Math.random()}`;
                            const getTodoClassName = (todo) => {
                                if (todo.completed)
                                    return 'bg-green-100 text-green-800';
                                switch (todo.priority) {
                                    case 'high': return 'bg-red-100 text-red-800';
                                    case 'medium': return 'bg-yellow-100 text-yellow-800';
                                    default: return 'bg-blue-100 text-blue-800';
                                }
                            };
                            return (_jsx("div", { className: `calendar-day min-h-[100px] p-1 border ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${day.date && new Date().toDateString() === day.date.toDateString()
                                    ? 'ring-2 ring-blue-500'
                                    : ''}`, children: day.date && (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-right text-sm font-medium p-1", children: day.date.getDate() }), _jsx("div", { className: "todo-items space-y-1 overflow-y-auto max-h-[80px]", children: day.todos?.map(todo => (_jsx("button", { onClick: () => onTodoClick(todo), className: `w-full text-left text-xs p-1 rounded truncate ${getTodoClassName(todo)}`, "aria-label": `${todo.title} - ${todo.completed ? '완료됨' : `우선순위: ${todo.priority}`}`, children: todo.title }, todo.id))) })] })) }, dateKey));
                        }) })] }), _jsxs("div", { className: "legend mt-4 flex space-x-4 text-xs", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "inline-block w-3 h-3 bg-red-100 mr-1 rounded" }), _jsx("span", { children: "\uB192\uC740 \uC6B0\uC120\uC21C\uC704" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "inline-block w-3 h-3 bg-yellow-100 mr-1 rounded" }), _jsx("span", { children: "\uC911\uAC04 \uC6B0\uC120\uC21C\uC704" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "inline-block w-3 h-3 bg-blue-100 mr-1 rounded" }), _jsx("span", { children: "\uB0AE\uC740 \uC6B0\uC120\uC21C\uC704" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "inline-block w-3 h-3 bg-green-100 mr-1 rounded" }), _jsx("span", { children: "\uC644\uB8CC\uB428" })] })] })] }));
};
export default TodoCalendar;
