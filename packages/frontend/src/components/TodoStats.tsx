import React, { useMemo } from 'react';
import { Todo } from '../hooks/useTodoService';

interface TodoStatsProps {
  todos: Todo[];
  className?: string;
}

/**
 * Todo 통계 대시보드 컴포넌트
 */
const TodoStats: React.FC<TodoStatsProps> = ({ todos, className = '' }) => {
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
    const vehicleDistribution: Record<string, number> = {};
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
  const getPriorityColorClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 차량별 작업 수를 내림차순으로 정렬하고 상위 5개만 사용
  const topVehicles = useMemo(() => {
    return Object.entries(stats.vehicleDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats.vehicleDistribution]);

  return (
    <div className={`todo-stats bg-white p-6 rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-bold mb-6">정비 작업 통계</h2>
      
      {stats.total === 0 ? (
        <p className="text-gray-500 text-center py-4">통계를 계산할 작업이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 완료율 카드 */}
          <div className="stat-card bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">완료율</h3>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  {/* 배경 원 */}
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="2"
                  />
                  {/* 진행 원 */}
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray={`${stats.completionRate * 100 / 100} 100`}
                    strokeDashoffset="25"
                    transform="rotate(-90 18 18)"
                  />
                  {/* 텍스트 */}
                  <text
                    x="18"
                    y="18"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#3b82f6"
                  >
                    {stats.completionRate}%
                  </text>
                </svg>
              </div>
              <div className="text-center mt-2">
                <p className="text-sm text-gray-500">총 {stats.total}개 중 {stats.completed}개 완료</p>
              </div>
            </div>
          </div>
          
          {/* 우선순위 분포 카드 */}
          <div className="stat-card bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">우선순위 분포</h3>
            <div className="space-y-2">
              {Object.entries(stats.priorityDistribution).map(([priority, count]) => (
                <div key={priority} className="priority-bar">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">
                      {priority === 'high' ? '높음' : priority === 'medium' ? '중간' : '낮음'}
                    </span>
                    <span className="text-sm text-gray-500">{count}개</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${getPriorityColorClass(priority)}`}
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 마감일 상태 카드 */}
          <div className="stat-card bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">마감일 상태</h3>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-xl font-bold text-yellow-600">{stats.upcomingDue}</p>
                <p className="text-sm text-gray-600">7일 내 마감</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-sm text-gray-600">기한 초과</p>
              </div>
            </div>
          </div>
          
          {/* 차량별 작업 통계 카드 */}
          <div className="stat-card bg-gray-50 p-4 rounded-lg lg:col-span-3">
            <h3 className="text-lg font-semibold mb-2">차량별 작업 수</h3>
            {topVehicles.length === 0 ? (
              <p className="text-gray-500 text-center py-4">차량 정보가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                {topVehicles.map(([vehicleId, count]) => (
                  <div key={vehicleId} className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">차량 {vehicleId}</p>
                    <p className="text-xl font-bold text-blue-600">{count}개</p>
                    <p className="text-xs text-gray-500">
                      {Math.round((count / stats.total) * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoStats; 