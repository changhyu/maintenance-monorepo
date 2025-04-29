import { useState } from 'react';
import { importDataFromJSON, importFromLocalStorage, mergeStores, STORES } from '../utils/indexedDBUtils';
/**
 * IndexedDB로 데이터 가져오기 기능을 제공하는 훅
 */
export const useImport = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState(null);
    /**
     * JSON 파일에서 데이터 가져오기
     */
    const importFromFile = async (file) => {
        setIsImporting(true);
        setError(null);
        try {
            const result = await importDataFromJSON(file);
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('데이터 가져오기 실패');
            setError(error);
            return false;
        }
        finally {
            setIsImporting(false);
        }
    };
    /**
     * LocalStorage에서 데이터 가져오기
     */
    const importFromLS = async () => {
        setIsImporting(true);
        setError(null);
        try {
            const result = await importFromLocalStorage();
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('LocalStorage에서 가져오기 실패');
            setError(error);
            return false;
        }
        finally {
            setIsImporting(false);
        }
    };
    /**
     * 스토어 간 데이터 병합
     */
    const mergeStoresFunc = async (sourceStore, targetStore) => {
        setIsImporting(true);
        setError(null);
        try {
            // 유효한 스토어인지 확인
            if (!Object.values(STORES).includes(sourceStore)) {
                throw new Error(`유효하지 않은 원본 스토어: ${sourceStore}`);
            }
            if (!Object.values(STORES).includes(targetStore)) {
                throw new Error(`유효하지 않은 대상 스토어: ${targetStore}`);
            }
            const result = await mergeStores(sourceStore, targetStore);
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('스토어 병합 실패');
            setError(error);
            throw error;
        }
        finally {
            setIsImporting(false);
        }
    };
    return {
        isImporting,
        importFromFile,
        importFromLocalStorage: importFromLS,
        mergeStores: mergeStoresFunc,
        error
    };
};
