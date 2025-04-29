import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTodoService } from '../hooks/useTodoService';
import todoNotificationService from '../services/todoNotificationService';
import { TodoPriority, TodoStatus } from '../services/todoService';
import { isPastDate } from '../utils/dateUtils';
import logger from '../utils/logger';
import useNetwork from '../hooks/useNetwork';
import useLocalStorage from '../hooks/useLocalStorage';
import { startOfDay, isSameDay } from 'date-fns';
// 로컬 스토리지 키
const TODOS_STORAGE_KEY = 'vehicle_maintenance_todos';
const PENDING_CHANGES_KEY = 'vehicle_maintenance_pending_changes';
const LAST_SYNC_KEY = 'vehicle_maintenance_last_sync';
// 초기 컨텍스트 값
const initialContext = {
    todos: [],
    filteredTodos: [],
    loading: false,
    error: null,
    filter: {
        completed: 'all',
        priority: 'all',
        search: '',
        dueDate: 'all'
    },
    syncStatus: 'idle',
    lastSyncTime: null,
    isOnline: !navigator.onLine,
    pendingChanges: [],
    createTodo: async () => null,
    updateTodo: async () => null,
    deleteTodo: async () => false,
    toggleComplete: async () => null,
    setFilter: () => { },
    clearFilter: () => { },
    refreshTodos: () => { },
    requestNotificationPermission: async () => false
};
// 컨텍스트 생성
const TodoContext = createContext(initialContext);
/**
 * Todo 컨텍스트 프로바이더
 */
export const TodoProvider = ({ children, initialTodos = [] }) => {
    const todoServiceHook = useTodoService();
    const { isOnline } = useNetwork();
    const [isTransitionPending, setIsTransitionPending] = useState(false);
    // 로컬 스토리지 훅 활용
    const [localTodos, setLocalTodos] = useLocalStorage(TODOS_STORAGE_KEY, []);
    const [pendingChanges, setPendingChanges] = useLocalStorage(PENDING_CHANGES_KEY, []);
    const [lastSyncTime, setLastSyncTime] = useLocalStorage(LAST_SYNC_KEY, null);
    // 상태 관리
    const [todos, setTodos] = useState(() => initialTodos.length > 0 ? initialTodos : localTodos);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [filter, setFilterState] = useState({
        completed: 'all',
        priority: 'all',
        search: '',
        dueDate: 'all'
    });
    // 로컬 스토리지 동기화
    useEffect(() => {
        const todosString = JSON.stringify(todos);
        const localTodosString = JSON.stringify(localTodos);
        if (todosString !== localTodosString) {
            setLocalTodos(todos);
        }
    }, [todos]);
    // 필터링된 할 일 목록
    const filteredTodos = useMemo(() => {
        return todos.filter(todo => {
            if (filter.completed !== 'all' && todo.completed !== (filter.completed === 'completed')) {
                return false;
            }
            if (filter.priority !== 'all' && todo.priority !== filter.priority) {
                return false;
            }
            if (filter.search && !(todo.title.toLowerCase().includes(filter.search.toLowerCase()) ||
                (todo.description && todo.description.toLowerCase().includes(filter.search.toLowerCase())))) {
                return false;
            }
            if (filter.dueDate === 'today') {
                if (!todo.dueDate)
                    return false;
                const today = startOfDay(new Date());
                const dueDate = startOfDay(new Date(todo.dueDate));
                return isSameDay(today, dueDate);
            }
            if (filter.dueDate === 'overdue') {
                return todo.dueDate ? isPastDate(todo.dueDate) : false;
            }
            return true;
        });
    }, [todos, filter]);
    // 필터 설정
    const setFilter = useCallback((newFilter) => {
        setFilterState(prevFilter => ({
            ...prevFilter,
            ...newFilter
        }));
    }, []);
    // 필터 초기화
    const clearFilter = useCallback(() => {
        setFilterState({
            completed: 'all',
            priority: 'all',
            search: '',
            dueDate: 'all'
        });
    }, []);
    // 데이터 가져오기
    const fetchTodos = useCallback(async (newFilter) => {
        if (loading || !isOnline)
            return;
        setLoading(true);
        setError(null);
        try {
            const fetchedTodos = await todoServiceHook.fetchTodos(newFilter);
            setTodos(prevTodos => {
                const prevTodosString = JSON.stringify(prevTodos);
                const fetchedTodosString = JSON.stringify(fetchedTodos);
                return prevTodosString === fetchedTodosString ? prevTodos : fetchedTodos;
            });
            setLastSyncTime(new Date().toISOString());
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('투두 조회 실패');
            setError(error);
            logger.error('투두 조회 실패:', error);
        }
        finally {
            setLoading(false);
        }
    }, [todoServiceHook, isOnline]);
    // 초기 데이터 로드 - 한 번만 실행
    useEffect(() => {
        if (todos.length === 0 && !loading) {
            fetchTodos();
        }
    }, []);
    // 변경사항 처리
    const processPendingChanges = useCallback(async () => {
        if (!isOnline || pendingChanges.length === 0 || syncStatus === 'syncing') {
            return false;
        }
        setSyncStatus('syncing');
        const failedChanges = [];
        try {
            const sortedChanges = [...pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
            for (const change of sortedChanges) {
                try {
                    switch (change.action) {
                        case 'create':
                            await todoServiceHook.createTodo(change.data);
                            break;
                        case 'update':
                            await todoServiceHook.updateTodo(change.id, change.data);
                            break;
                        case 'delete':
                            await todoServiceHook.deleteTodo(change.id);
                            break;
                    }
                }
                catch (err) {
                    logger.error(`변경사항 동기화 실패 (${change.action})`, err);
                    failedChanges.push(change);
                }
            }
            setPendingChanges(failedChanges);
            if (failedChanges.length === 0) {
                await fetchTodos();
            }
            return failedChanges.length === 0;
        }
        catch (error) {
            logger.error('변경사항 처리 중 오류 발생:', error);
            return false;
        }
        finally {
            setSyncStatus('idle');
        }
    }, [isOnline, pendingChanges, syncStatus, todoServiceHook, fetchTodos]);
    // 오프라인/온라인 전환 시 동기화
    useEffect(() => {
        if (isOnline && pendingChanges.length > 0 && syncStatus === 'idle') {
            processPendingChanges();
        }
    }, [isOnline, pendingChanges.length, syncStatus]);
    // 로컬 임시 ID 생성
    const generateTempId = () => `temp-${uuidv4()}`;
    const createTodoWithTempId = (todoData) => {
        const tempId = generateTempId();
        return {
            ...todoData,
            id: tempId,
            status: TodoStatus.PENDING,
            completed: false,
            priority: todoData.priority || TodoPriority.MEDIUM,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _tempId: tempId
        };
    };
    // 변경사항 추가 함수
    const addPendingChange = useCallback((change) => {
        setPendingChanges(prev => {
            // 동일 ID에 대한 이전 변경사항 제거 (최신 것만 유지)
            const filtered = prev.filter(c => c.id !== change.id ||
                (c.tempId && c.tempId !== change.tempId));
            return [...filtered, change];
        });
    }, [setPendingChanges]);
    // Todo 생성
    const createTodo = useCallback(async (todo) => {
        setError(null);
        if (!isOnline) {
            const tempId = generateTempId();
            const timestamp = Date.now();
            const newTodo = {
                id: tempId,
                title: todo.title,
                description: todo.description || '',
                priority: todo.priority || TodoPriority.MEDIUM,
                status: TodoStatus.PENDING,
                completed: false,
                dueDate: todo.dueDate || null,
                vehicleId: todo.vehicleId || '',
                createdAt: new Date(timestamp).toISOString(),
                updatedAt: new Date(timestamp).toISOString(),
                _tempId: tempId
            };
            addPendingChange({
                id: tempId,
                tempId: tempId,
                action: 'create',
                data: todo,
                timestamp
            });
            setTodos(prevTodos => [...prevTodos, newTodo]);
            return newTodo;
        }
        setLoading(true);
        try {
            const newTodo = await todoServiceHook.createTodo(todo);
            setTodos(prevTodos => [...prevTodos, newTodo]);
            if (todo.priority === TodoPriority.HIGH) {
                todoNotificationService.notifyHighPriorityTodo(newTodo);
            }
            return newTodo;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('투두 생성 실패');
            setError(error);
            logger.error('투두 생성 실패:', error);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, [isOnline, todoServiceHook, generateTempId, addPendingChange]);
    /**
     * Todo 수정
     */
    const updateTodo = useCallback(async (id, updates) => {
        setError(null);
        // 임시 ID로 시작하는 경우 로컬 업데이트
        const isTempId = id.startsWith('temp-');
        // 오프라인 모드 처리
        if (!isOnline || isTempId) {
            const timestamp = Date.now();
            const existingTodoIndex = todos.findIndex(t => t.id === id);
            if (existingTodoIndex === -1) {
                return null;
            }
            const existingTodo = todos[existingTodoIndex];
            const updatedTodo = {
                ...existingTodo,
                ...updates,
                updatedAt: new Date(timestamp).toISOString()
            };
            // 변경사항 큐에 추가
            addPendingChange({
                id,
                tempId: existingTodo._tempId,
                action: 'update',
                data: updates,
                timestamp
            });
            // 로컬 상태 업데이트
            setTodos(prevTodos => prevTodos.map(todo => todo.id === id ? updatedTodo : todo));
            return updatedTodo;
        }
        setLoading(true);
        try {
            const oldTodo = todos.find(t => t.id === id);
            const updatedTodo = await todoServiceHook.updateTodo(id, updates);
            // 상태 업데이트
            setTodos(prevTodos => prevTodos.map(todo => todo.id === id ? updatedTodo : todo));
            // 상태 변경 시 알림 생성
            if (oldTodo && oldTodo.status !== updates.status && updatedTodo) {
                todoNotificationService.notifyStatusChange(updatedTodo, oldTodo.completed);
            }
            return updatedTodo;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('투두 수정 실패');
            setError(error);
            logger.error('투두 수정 실패:', error);
            // 오프라인으로 전환된 경우 로컬에 저장
            if (!navigator.onLine) {
                return updateTodo(id, updates);
            }
            return null;
        }
        finally {
            setLoading(false);
        }
    }, [isOnline, todos, todoServiceHook, addPendingChange]);
    /**
     * Todo 삭제
     */
    const deleteTodo = useCallback(async (id) => {
        setError(null);
        // 임시 ID로 시작하는 경우 로컬 삭제
        const isTempId = id.startsWith('temp-');
        // 오프라인 모드 처리
        if (!isOnline || isTempId) {
            const timestamp = Date.now();
            const existingTodoIndex = todos.findIndex(t => t.id === id);
            if (existingTodoIndex === -1) {
                return false;
            }
            const existingTodo = todos[existingTodoIndex];
            // 이미 임시 ID인 경우 대기 목록에서 제거, 아니면 삭제 요청 추가
            if (isTempId) {
                // 임시 ID 항목은 대기열에서 해당 생성 요청 제거
                setPendingChanges(prev => prev.filter(change => !(change.tempId === id && change.action === 'create')));
            }
            else {
                // 실제 ID인 경우 삭제 요청 추가
                addPendingChange({
                    id,
                    action: 'delete',
                    data: {},
                    timestamp
                });
            }
            // 로컬 상태 업데이트
            setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
            return true;
        }
        setLoading(true);
        try {
            const success = await todoServiceHook.deleteTodo(id);
            if (success) {
                // 상태 업데이트
                setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
            }
            return success;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('투두 삭제 실패');
            setError(error);
            logger.error('투두 삭제 실패:', error);
            // 오프라인으로 전환된 경우 로컬에 저장
            if (!navigator.onLine) {
                return deleteTodo(id);
            }
            return false;
        }
        finally {
            setLoading(false);
        }
    }, [isOnline, todos, todoServiceHook, addPendingChange]);
    /**
     * Todo 완료 상태 토글
     */
    const toggleComplete = useCallback(async (id) => {
        // 상태 업데이트 함수에 위임
        return updateTodo(id, { completed: !todos.find(t => t.id === id)?.completed });
    }, [updateTodo, todos]);
    /**
     * 템플릿으로부터 Todo 생성
     */
    const createTodosFromTemplate = useCallback(async (template, vehicleId) => {
        setLoading(true);
        setError(null);
        try {
            const createdTodos = [];
            // 각 템플릿 항목에 대해 Todo 생성
            for (const item of template.items) {
                const todoData = {
                    title: item.title,
                    description: item.description || '',
                    priority: item.priority,
                    status: item.status || TodoStatus.PENDING,
                    dueDate: item.dueDate,
                    vehicleId: vehicleId
                };
                const newTodo = await createTodo(todoData);
                if (newTodo) {
                    createdTodos.push(newTodo);
                }
            }
            return createdTodos;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('템플릿 적용 실패');
            setError(error);
            logger.error('템플릿 적용 실패:', error);
            return [];
        }
        finally {
            setLoading(false);
        }
    }, [createTodo]);
    /**
     * 마감일이 임박한 Todo 확인 및 알림
     */
    const checkUpcomingDueTodos = useCallback(() => {
        if (todos.length > 0) {
            todoNotificationService.checkAndNotifyUpcomingDue(todos);
        }
    }, [todos]);
    /**
     * 마감일이 지난 Todo 확인 및 알림
     */
    const checkOverdueTodos = useCallback(() => {
        if (todos.length > 0) {
            todoNotificationService.checkAndNotifyOverdue(todos);
        }
    }, [todos]);
    // Todo 데이터 로드 후 알림 체크
    useEffect(() => {
        if (todos.length > 0) {
            checkUpcomingDueTodos();
            checkOverdueTodos();
        }
    }, [todos, checkUpcomingDueTodos, checkOverdueTodos]);
    // 정기적인 알림 체크 (1시간마다)
    useEffect(() => {
        const intervalId = setInterval(() => {
            checkUpcomingDueTodos();
            checkOverdueTodos();
        }, 60 * 60 * 1000); // 1시간마다
        return () => clearInterval(intervalId);
    }, [checkUpcomingDueTodos, checkOverdueTodos]);
    // 정기적인 데이터 동기화 (10분마다)
    useEffect(() => {
        if (!isOnline)
            return;
        const intervalId = setInterval(() => {
            fetchTodos();
        }, 10 * 60 * 1000); // 10분마다
        return () => clearInterval(intervalId);
    }, [isOnline, fetchTodos]);
    /**
     * 알림 권한 요청
     */
    const requestNotificationPermission = useCallback(async () => {
        try {
            return await todoNotificationService.requestNotificationPermission();
        }
        catch (error) {
            logger.error('알림 권한 요청 실패:', error);
            return false;
        }
    }, []);
    // 컨텍스트 값
    const contextValue = {
        todos,
        filteredTodos,
        loading,
        error,
        filter,
        syncStatus,
        lastSyncTime,
        isOnline,
        pendingChanges,
        createTodo,
        updateTodo,
        deleteTodo,
        toggleComplete,
        setFilter,
        clearFilter,
        refreshTodos: fetchTodos,
        requestNotificationPermission
    };
    return (_jsx(TodoContext.Provider, { value: contextValue, children: children }));
};
/**
 * Todo 컨텍스트 사용 훅
 */
export const useTodoContext = () => {
    const context = useContext(TodoContext);
    if (context === undefined) {
        throw new Error('useTodoContext는 TodoProvider 내부에서 사용해야 합니다');
    }
    return context;
};
export default TodoContext;
