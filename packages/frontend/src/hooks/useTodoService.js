import { useState, useCallback, useMemo } from 'react';
import { TodoService } from '../services/todoService';
// TodoFilterType을 TodoFilter로 변환하는 어댑터 함수
const adaptContextFilterToServiceFilter = (filter) => {
    if (!filter)
        return undefined;
    const serviceFilter = {};
    if (filter.completed && filter.completed !== 'all') {
        serviceFilter.completed = filter.completed === 'completed';
    }
    if (filter.priority && filter.priority !== 'all') {
        serviceFilter.priority = filter.priority;
    }
    if (filter.search) {
        serviceFilter.searchText = filter.search;
    }
    if (filter.dueDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        serviceFilter.dueFrom = today.toISOString().split('T')[0];
        today.setHours(23, 59, 59, 999);
        serviceFilter.dueTo = today.toISOString().split('T')[0];
    }
    else if (filter.dueDate === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        serviceFilter.dueTo = today.toISOString().split('T')[0];
    }
    if (filter.vehicleId) {
        serviceFilter.vehicleId = filter.vehicleId;
    }
    return serviceFilter;
};
/**
 * Todo 서비스 관련 상태와 기능을 제공하는 커스텀 훅
 */
export const useTodoService = () => {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // TodoService 인스턴스 생성 - useMemo로 감싸서 재렌더링 시 새로 생성되지 않도록 함
    const todoService = useMemo(() => new TodoService(), []);
    /**
     * Todo 목록 조회
     */
    const fetchTodos = useCallback(async (filter) => {
        setLoading(true);
        setError(null);
        try {
            const serviceFilter = adaptContextFilterToServiceFilter(filter);
            const fetchedTodos = await todoService.getTodos(serviceFilter);
            setTodos(fetchedTodos);
            return fetchedTodos;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('할 일 목록을 불러오는 데 실패했습니다.');
            setError(error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [todoService]);
    /**
     * 특정 Todo 항목 조회
     */
    const fetchTodoById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            return await todoService.getTodoById(id);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('할 일을 불러오는 데 실패했습니다.');
            setError(error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [todoService]);
    /**
     * Todo 생성
     */
    const createTodo = useCallback(async (todoData) => {
        setLoading(true);
        setError(null);
        try {
            const newTodo = await todoService.createTodo(todoData);
            setTodos(prevTodos => [...prevTodos, newTodo]);
            return newTodo;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('할 일을 생성하는 데 실패했습니다.');
            setError(error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [todoService]);
    /**
     * Todo 업데이트
     */
    const updateTodo = useCallback(async (id, updates) => {
        setLoading(true);
        setError(null);
        try {
            const updatedTodo = await todoService.updateTodo(id, updates);
            setTodos(prevTodos => prevTodos.map(todo => (todo.id === id ? updatedTodo : todo)));
            return updatedTodo;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('할 일을 업데이트하는 데 실패했습니다.');
            setError(error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [todoService]);
    /**
     * Todo 삭제
     */
    const deleteTodo = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const success = await todoService.deleteTodo(id);
            if (success) {
                setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
            }
            return success;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('할 일을 삭제하는 데 실패했습니다.');
            setError(error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [todoService]);
    /**
     * Todo 완료 상태 토글
     */
    const toggleComplete = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            // 현재 상태를 확인
            const currentTodo = todos.find(todo => todo.id === id);
            if (!currentTodo) {
                throw new Error(`ID: ${id}에 해당하는 할 일을 찾을 수 없습니다.`);
            }
            // 상태를 반전
            const newCompleted = !currentTodo.completed;
            // 서비스를 통해 업데이트
            const updatedTodo = await todoService.updateTodo(id, { completed: newCompleted });
            // 상태 업데이트
            setTodos(prevTodos => prevTodos.map(todo => todo.id === id ? updatedTodo : todo));
            return updatedTodo;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('할 일 완료 상태 변경에 실패했습니다.');
            setError(error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [todoService, todos]);
    return {
        todos,
        loading,
        error,
        fetchTodos,
        fetchTodoById,
        createTodo,
        updateTodo,
        deleteTodo,
        toggleComplete
    };
};
