import { useState, useCallback } from 'react';
import * as exportUtils from '../utils/exportUtils';
import logger from '../utils/logger';
/**
 * 데이터 내보내기 기능을 위한 훅
 * @returns 내보내기 관련 함수와 상태
 */
export const useExport = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);
    /**
     * 일반 데이터 내보내기
     * @param data 내보낼 데이터 배열
     * @param filename 파일 이름
     * @param format 내보내기 형식
     */
    const exportData = useCallback((data, filename, format = 'json') => {
        setIsExporting(true);
        setError(null);
        try {
            exportUtils.exportData(data, filename, format);
            return true;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            logger.error('데이터 내보내기 실패:', error);
            return false;
        }
        finally {
            setIsExporting(false);
        }
    }, []);
    /**
     * Todo 오프라인 캐시 데이터 내보내기
     * @param format 내보내기 형식
     */
    const exportTodoCache = useCallback(async (format = 'json') => {
        setIsExporting(true);
        setError(null);
        try {
            const result = await exportUtils.exportCachedTodos(format);
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            logger.error('Todo 캐시 내보내기 실패:', error);
            return false;
        }
        finally {
            setIsExporting(false);
        }
    }, []);
    /**
     * 차량 오프라인 캐시 데이터 내보내기
     * @param format 내보내기 형식
     */
    const exportVehicleCache = useCallback(async (format = 'json') => {
        setIsExporting(true);
        setError(null);
        try {
            const result = await exportUtils.exportCachedVehicles(format);
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            logger.error('차량 캐시 내보내기 실패:', error);
            return false;
        }
        finally {
            setIsExporting(false);
        }
    }, []);
    /**
     * 오프라인 작업 큐 내보내기
     * @param format 내보내기 형식
     */
    const exportPendingOperations = useCallback(async (format = 'json') => {
        setIsExporting(true);
        setError(null);
        try {
            const result = await exportUtils.exportPendingOperations(format);
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            logger.error('대기 중인 작업 내보내기 실패:', error);
            return false;
        }
        finally {
            setIsExporting(false);
        }
    }, []);
    /**
     * 모든 오프라인 데이터 내보내기
     * @param format 내보내기 형식
     */
    const exportAllOfflineData = useCallback(async (format = 'json') => {
        setIsExporting(true);
        setError(null);
        try {
            const result = await exportUtils.exportAllOfflineData(format);
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            logger.error('모든 오프라인 데이터 내보내기 실패:', error);
            return false;
        }
        finally {
            setIsExporting(false);
        }
    }, []);
    /**
     * 특정 IndexedDB 저장소 데이터 내보내기
     * @param storeName 저장소 이름
     * @param filename 파일 이름
     * @param format 내보내기 형식
     */
    const exportStore = useCallback(async (storeName, filename, format = 'json') => {
        setIsExporting(true);
        setError(null);
        try {
            const result = await exportUtils.exportIndexedDBStore({
                storeName,
                filename,
                format
            });
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            logger.error(`${storeName} 저장소 내보내기 실패:`, error);
            return false;
        }
        finally {
            setIsExporting(false);
        }
    }, []);
    return {
        isExporting,
        error,
        exportData,
        exportTodoCache,
        exportVehicleCache,
        exportPendingOperations,
        exportAllOfflineData,
        exportStore
    };
};
export default useExport;
