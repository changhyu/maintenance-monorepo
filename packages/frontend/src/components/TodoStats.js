import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
/**
 * Todo 통계 대시보드 컴포넌트
 */
const TodoStats = ({ todos, className = '' }) => {
    // 통계 계산
    const stats = useMemo(() => {
        if (!todos || todos.length === 0) {
            return {
                total: 0,
                completed: 0,
                completionRate: 0,
                priorityDistribution: { high: 0, medium: 0, low: 0 },
                vehicleDistribution: {},
                upcomingDue: 0,
                overdue: 0
            };
        }
        // 기본 통계
        const total = todos.length;
        const completed = todos.filter(todo => todo.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        // 우선순위별 분포
        const priorityDistribution = {
            high: todos.filter(todo => todo.priority === 'high').length,
            medium: todos.filter(todo => todo.priority === 'medium').length,
            low: todos.filter(todo => todo.priority === 'low').length
        };
        // 차량별 분포
        const vehicleDistribution = {};
        todos.forEach(todo => {
            if (todo.vehicleId) {
                vehicleDistribution[todo.vehicleId] = (vehicleDistribution[todo.vehicleId] || 0) + 1;
            }
        });
        // 마감일 관련 통계
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingDue = todos.filter(todo => {
            if (!todo.completed && todo.dueDate) {
                const dueDate = new Date(todo.dueDate);
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7; // 7일 이내 마감
            }
            return false;
        }).length;
        const overdue = todos.filter(todo => {
            if (!todo.completed && todo.dueDate) {
                const dueDate = new Date(todo.dueDate);
                return dueDate < today;
            }
            return false;
        }).length;
        return {
            total,
            completed,
            completionRate,
            priorityDistribution,
            vehicleDistribution,
            upcomingDue,
            overdue
        };
    }, [todos]);
    // 우선순위에 따른 색상 클래스
    const getPriorityColorClass = (priority) => {
        switch (priority) {
            case 'high':
                return 'bg-red-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'low':
                return 'bg-green-500';
            default:
                return 'bg-gray-500';
        }
    };
    // 차량별 작업 수를 내림차순으로 정렬하고 상위 5개만 사용
    const topVehicles = useMemo(() => {
        return Object.entries(stats.vehicleDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [stats.vehicleDistribution]);
    return (_jsxs("div", { className: `todo-stats bg-white p-6 rounded-lg shadow-md ${className}`, children: [_jsx("h2", { className: "text-xl font-bold mb-6", children: "\uC815\uBE44 \uC791\uC5C5 \uD1B5\uACC4" }), stats.total === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-4", children: "\uD1B5\uACC4\uB97C \uACC4\uC0B0\uD560 \uC791\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "stat-card bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "\uC644\uB8CC\uC728" }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "relative w-32 h-32", children: _jsxs("svg", { className: "w-full h-full", viewBox: "0 0 36 36", children: [_jsx("circle", { cx: "18", cy: "18", r: "16", fill: "none", stroke: "#e0e0e0", strokeWidth: "2" }), _jsx("circle", { cx: "18", cy: "18", r: "16", fill: "none", stroke: "#3b82f6", strokeWidth: "2", strokeDasharray: `${(stats.completionRate * 100) / 100} 100`, strokeDashoffset: "25", transform: "rotate(-90 18 18)" }), _jsxs("text", { x: "18", y: "18", dominantBaseline: "middle", textAnchor: "middle", fontSize: "8", fontWeight: "bold", fill: "#3b82f6", children: [stats.completionRate, "%"] })] }) }), _jsx("div", { className: "text-center mt-2", children: _jsxs("p", { className: "text-sm text-gray-500", children: ["\uCD1D ", stats.total, "\uAC1C \uC911 ", stats.completed, "\uAC1C \uC644\uB8CC"] }) })] })] }), _jsxs("div", { className: "stat-card bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "\uC6B0\uC120\uC21C\uC704 \uBD84\uD3EC" }), _jsx("div", { className: "space-y-2", children: Object.entries(stats.priorityDistribution).map(([priority, count]) => (_jsxs("div", { className: "priority-bar", children: [_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("span", { className: "text-sm font-medium", children: priority === 'high' ? '높음' : priority === 'medium' ? '중간' : '낮음' }), _jsxs("span", { className: "text-sm text-gray-500", children: [count, "\uAC1C"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: `h-2.5 rounded-full ${getPriorityColorClass(priority)}`, style: { width: `${(count / stats.total) * 100}%` } }) })] }, priority))) })] }), _jsxs("div", { className: "stat-card bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "\uB9C8\uAC10\uC77C \uC0C1\uD0DC" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 mt-4", children: [_jsxs("div", { className: "text-center p-3 bg-yellow-50 rounded-lg", children: [_jsx("p", { className: "text-xl font-bold text-yellow-600", children: stats.upcomingDue }), _jsx("p", { className: "text-sm text-gray-600", children: "7\uC77C \uB0B4 \uB9C8\uAC10" })] }), _jsxs("div", { className: "text-center p-3 bg-red-50 rounded-lg", children: [_jsx("p", { className: "text-xl font-bold text-red-600", children: stats.overdue }), _jsx("p", { className: "text-sm text-gray-600", children: "\uAE30\uD55C \uCD08\uACFC" })] })] })] }), _jsxs("div", { className: "stat-card bg-gray-50 p-4 rounded-lg lg:col-span-3", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "\uCC28\uB7C9\uBCC4 \uC791\uC5C5 \uC218" }), topVehicles.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-4", children: "\uCC28\uB7C9 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-2", children: topVehicles.map(([vehicleId, count]) => (_jsxs("div", { className: "text-center p-3 bg-blue-50 rounded-lg", children: [_jsxs("p", { className: "text-sm font-medium text-gray-700", children: ["\uCC28\uB7C9 ", vehicleId] }), _jsxs("p", { className: "text-xl font-bold text-blue-600", children: [count, "\uAC1C"] }), _jsxs("p", { className: "text-xs text-gray-500", children: [Math.round((count / stats.total) * 100), "%"] })] }, vehicleId))) }))] })] }))] }));
};
export default TodoStats;
