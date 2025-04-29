import { useState, useEffect, useCallback } from 'react';
import * as indexedDBUtils from '../utils/indexedDBUtils';
/**
 * IndexedDB 스토어를 쉽게 사용하기 위한 훅
 * @param storeName 저장소 이름
 * @returns IndexedDB 작업 관련 함수들과 상태
 */
export const useIndexedDB = (storeName) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);
    // 모든 데이터 불러오기
    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const items = await indexedDBUtils.getAllData(storeName);
            setData(items);
            return items;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error(`${storeName} 데이터 불러오기 실패:`, error);
            return [];
        }
        finally {
            setIsLoading(false);
        }
    }, [storeName]);
    // 단일 항목 불러오기
    const getItem = useCallback(async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            return await indexedDBUtils.getData(storeName, id);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error(`${storeName} 항목 불러오기 실패:`, error);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, [storeName]);
    // 인덱스를 통한 데이터 불러오기
    const getByIndex = useCallback(async (indexName, value) => {
        setIsLoading(true);
        setError(null);
        try {
            const items = await indexedDBUtils.getDataByIndex(storeName, indexName, value);
            return items;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error(`${storeName} 인덱스 검색 실패:`, error);
            return [];
        }
        finally {
            setIsLoading(false);
        }
    }, [storeName]);
    // 항목 저장 (추가 또는 업데이트)
    const saveItem = useCallback(async (item) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await indexedDBUtils.saveData(storeName, item);
            // 최신 데이터로 상태 업데이트
            fetchAll();
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error(`${storeName} 항목 저장 실패:`, error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [storeName, fetchAll]);
    // 항목 삭제
    const deleteItem = useCallback(async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            await indexedDBUtils.deleteData(storeName, id);
            // 최신 데이터로 상태 업데이트
            fetchAll();
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error(`${storeName} 항목 삭제 실패:`, error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [storeName, fetchAll]);
    // 저장소 초기화
    const clearAll = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await indexedDBUtils.clearStore(storeName);
            setData([]);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error(`${storeName} 저장소 초기화 실패:`, error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [storeName]);
    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);
    return {
        data,
        isLoading,
        error,
        fetchAll,
        getItem,
        getByIndex,
        saveItem,
        deleteItem,
        clearAll
    };
};
/**
 * 오프라인 모드 상태를 관리하는 훅
 * @returns 오프라인 모드 상태 및 관련 함수
 */
export const useOfflineMode = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    // 오프라인 모드 상태 초기화
    useEffect(() => {
        const initOfflineMode = async () => {
            try {
                const offlineStatus = await indexedDBUtils.getOfflineMode();
                setIsOffline(offlineStatus);
            }
            catch (error) {
                console.error('오프라인 모드 상태 초기화 실패:', error);
            }
            finally {
                setIsInitialized(true);
            }
        };
        initOfflineMode();
    }, []);
    // 오프라인 모드 설정
    const setOfflineMode = useCallback(async (newOfflineStatus) => {
        try {
            await indexedDBUtils.setOfflineMode(newOfflineStatus);
            setIsOffline(newOfflineStatus);
        }
        catch (error) {
            console.error('오프라인 모드 변경 실패:', error);
            throw error;
        }
    }, []);
    // 네트워크 연결 상태 변경 이벤트 리스너
    useEffect(() => {
        const handleConnectionChange = () => {
            if (navigator.onLine) {
                // 온라인 상태로 변경됨
                // 오프라인 모드를 자동으로 해제하지는 않음 (사용자 제어)
                console.log('네트워크 연결이 복구되었습니다.');
            }
            else {
                // 오프라인 상태로 변경됨
                console.log('네트워크 연결이 끊겼습니다.');
                // 자동으로 오프라인 모드 활성화 (선택 사항)
                // setOfflineMode(true); 
            }
        };
        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
        return () => {
            window.removeEventListener('online', handleConnectionChange);
            window.removeEventListener('offline', handleConnectionChange);
        };
    }, []);
    return {
        isOffline,
        isInitialized,
        setOfflineMode,
        isNetworkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    };
};
/**
 * 오프라인 작업 관리를 위한 훅
 * @returns 오프라인 작업 관련 함수들과 상태
 */
export const usePendingOperations = () => {
    const [pendingOperations, setPendingOperations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // 대기 중인 작업 불러오기
    const fetchPendingOperations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const operations = await indexedDBUtils.getPendingOperations();
            setPendingOperations(operations);
            return operations;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('대기 중인 작업 불러오기 실패:', error);
            return [];
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    // 작업 큐에 추가
    const queueOperation = useCallback(async (method, url, data) => {
        setIsLoading(true);
        setError(null);
        try {
            const id = await indexedDBUtils.queueOfflineOperation(method, url, data);
            await fetchPendingOperations(); // 작업 목록 새로고침
            return id;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('작업 큐 추가 실패:', error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [fetchPendingOperations]);
    // 작업 큐에서 제거
    const removeOperations = useCallback(async (operationIds) => {
        setIsLoading(true);
        setError(null);
        try {
            await indexedDBUtils.removeOperationsFromQueue(operationIds);
            await fetchPendingOperations(); // 작업 목록 새로고침
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('작업 큐 제거 실패:', error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [fetchPendingOperations]);
    // 컴포넌트 마운트 시 작업 목록 로드
    useEffect(() => {
        fetchPendingOperations();
    }, [fetchPendingOperations]);
    return {
        pendingOperations,
        isLoading,
        error,
        fetchPendingOperations,
        queueOperation,
        removeOperations
    };
};
/**
 * Todo 항목을 캐시하고 관리하는 훅
 * @returns Todo 관련 캐시 함수들과 상태
 */
export const useTodoCache = () => {
    const { data: todos, isLoading, error, fetchAll, getItem, getByIndex, saveItem, deleteItem, clearAll } = useIndexedDB(indexedDBUtils.STORES.TODOS);
    // 캐시 새로고침
    const refreshCache = useCallback(async () => {
        return await fetchAll();
    }, [fetchAll]);
    // Todo 항목 캐싱
    const cacheTodo = useCallback(async (todo) => {
        return await saveItem(todo);
    }, [saveItem]);
    // Todo 항목 조회
    const getCachedTodo = useCallback(async (todoId) => {
        return await getItem(todoId);
    }, [getItem]);
    // 특정 차량의 Todo 항목 조회
    const getTodosByVehicleId = useCallback(async (vehicleId) => {
        return await getByIndex('vehicleId', vehicleId);
    }, [getByIndex]);
    // 완료/미완료 Todo 항목 조회
    const getTodosByCompletion = useCallback(async (completed) => {
        return await getByIndex('completed', completed);
    }, [getByIndex]);
    // 특정 기한의 Todo 항목 조회
    const getTodosByDueDate = useCallback(async (dueDate) => {
        const dateString = typeof dueDate === 'string' ? dueDate : dueDate.toISOString().split('T')[0];
        return await getByIndex('dueDate', dateString);
    }, [getByIndex]);
    // Todo 항목 삭제
    const removeTodo = useCallback(async (todoId) => {
        await deleteItem(todoId);
    }, [deleteItem]);
    // 모든 Todo 항목 삭제
    const clearAllTodos = useCallback(async () => {
        await clearAll();
    }, [clearAll]);
    return {
        todos,
        isLoading,
        error,
        refreshCache,
        cacheTodo,
        getCachedTodo,
        getTodosByVehicleId,
        getTodosByCompletion,
        getTodosByDueDate,
        removeTodo,
        clearAllTodos
    };
};
/**
 * 차량 정보를 캐시하고 관리하는 훅
 * @returns 차량 관련 캐시 함수들과 상태
 */
export const useVehicleCache = () => {
    const { data: vehicles, isLoading, error, fetchAll, getItem, getByIndex, saveItem, deleteItem, clearAll } = useIndexedDB(indexedDBUtils.STORES.VEHICLES);
    // 캐시 새로고침
    const refreshCache = useCallback(async () => {
        return await fetchAll();
    }, [fetchAll]);
    // 차량 정보 캐싱
    const cacheVehicle = useCallback(async (vehicle) => {
        return await saveItem(vehicle);
    }, [saveItem]);
    // 차량 정보 조회
    const getCachedVehicle = useCallback(async (vehicleId) => {
        return await getItem(vehicleId);
    }, [getItem]);
    // 사용자의 차량 목록 조회
    const getVehiclesByUserId = useCallback(async (userId) => {
        return await getByIndex('userId', userId);
    }, [getByIndex]);
    // 제조사별 차량 목록 조회
    const getVehiclesByMake = useCallback(async (make) => {
        return await getByIndex('make', make);
    }, [getByIndex]);
    // 연식별 차량 목록 조회
    const getVehiclesByYear = useCallback(async (year) => {
        return await getByIndex('year', year);
    }, [getByIndex]);
    // 차량 정보 삭제
    const removeVehicle = useCallback(async (vehicleId) => {
        await deleteItem(vehicleId);
    }, [deleteItem]);
    // 모든 차량 정보 삭제
    const clearAllVehicles = useCallback(async () => {
        await clearAll();
    }, [clearAll]);
    return {
        vehicles,
        isLoading,
        error,
        refreshCache,
        cacheVehicle,
        getCachedVehicle,
        getVehiclesByUserId,
        getVehiclesByMake,
        getVehiclesByYear,
        removeVehicle,
        clearAllVehicles
    };
};
/**
 * 사용자 설정을 관리하는 훅
 * @returns 사용자 설정 관련 함수들과 상태
 */
export const useUserSettings = () => {
    const { data: settings, isLoading, error, fetchAll, getItem, saveItem, clearAll } = useIndexedDB(indexedDBUtils.STORES.USER_SETTINGS);
    // 전역 설정 ID
    const GLOBAL_SETTINGS_ID = 'global';
    // 설정 불러오기
    const getSettings = useCallback(async () => {
        const globalSettings = await getItem(GLOBAL_SETTINGS_ID);
        return globalSettings || { id: GLOBAL_SETTINGS_ID };
    }, [getItem]);
    // 설정 저장
    const updateSettings = useCallback(async (newSettings) => {
        const settings = {
            ...await getSettings(),
            ...newSettings,
            id: GLOBAL_SETTINGS_ID
        };
        return await saveItem(settings);
    }, [getSettings, saveItem]);
    // 설정 초기화
    const resetSettings = useCallback(async () => {
        await saveItem({ id: GLOBAL_SETTINGS_ID });
    }, [saveItem]);
    // 컴포넌트 마운트 시 설정 로드
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);
    return {
        settings: settings.length > 0 ? settings[0] : { id: GLOBAL_SETTINGS_ID },
        isLoading,
        error,
        getSettings,
        updateSettings,
        resetSettings
    };
};
export default useIndexedDB;
