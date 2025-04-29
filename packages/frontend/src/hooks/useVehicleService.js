import { useState } from 'react';
import { vehicleService } from '../services/vehicle';
import { convertServiceVehicleToFrontend } from '../types/vehicle';
/**
 * 차량 관리 서비스 커스텀 훅
 * @returns 차량 관리 관련 상태 및 함수들
 */
const useVehicleService = () => {
    // 상태 관리
    const [vehicles, setVehicles] = useState([]);
    const [currentVehicle, setCurrentVehicle] = useState(null);
    const [stats, setStats] = useState({
        totalVehicles: 0,
        activeVehicles: 0,
        inMaintenanceVehicles: 0,
        outOfServiceVehicles: 0
    });
    const [documents, setDocuments] = useState([]);
    // 로딩 상태 관리
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    /**
     * 차량 통계 조회
     */
    const getVehicleStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.getVehicleStats();
            setStats(result);
            return result;
        }
        catch (err) {
            console.error('차량 통계 조회 중 오류 발생:', err);
            setError('차량 통계를 조회하는 데 실패했습니다.');
            return {
                totalVehicles: 0,
                activeVehicles: 0,
                inMaintenanceVehicles: 0,
                outOfServiceVehicles: 0
            };
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 목록 조회
     * @param filter 차량 필터링 옵션
     */
    const getVehicles = async (filter) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.getVehicles(filter);
            // 서비스 Vehicle을 Frontend Vehicle로 변환
            const frontendVehicles = result
                .map(vehicle => convertServiceVehicleToFrontend(vehicle))
                .filter(Boolean);
            setVehicles(frontendVehicles);
            return frontendVehicles;
        }
        catch (err) {
            console.error('차량 목록 조회 중 오류 발생:', err);
            setError('차량 목록을 조회하는 데 실패했습니다.');
            return [];
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 단일 차량 정보 조회
     * @param id 차량 ID
     */
    const getVehicleById = async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.getVehicleById(id);
            if (result) {
                // 서비스 Vehicle을 Frontend Vehicle로 변환
                const frontendVehicle = convertServiceVehicleToFrontend(result);
                setCurrentVehicle(frontendVehicle);
                return frontendVehicle;
            }
            setCurrentVehicle(null);
            return null;
        }
        catch (err) {
            console.error(`차량(ID: ${id}) 조회 중 오류 발생:`, err);
            setError('차량 정보를 조회하는 데 실패했습니다.');
            setCurrentVehicle(null);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 생성
     * @param data 차량 생성 데이터
     */
    const createVehicle = async (data) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.createVehicle(data);
            if (result) {
                // 서비스 Vehicle을 Frontend Vehicle로 변환
                const frontendVehicle = convertServiceVehicleToFrontend(result);
                if (frontendVehicle) {
                    setVehicles(prev => [...prev, frontendVehicle]);
                    setCurrentVehicle(frontendVehicle);
                }
                return frontendVehicle;
            }
            return null;
        }
        catch (err) {
            console.error('차량 생성 중 오류 발생:', err);
            setError('차량을 생성하는 데 실패했습니다.');
            return null;
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 업데이트
     * @param id 차량 ID
     * @param data 업데이트할 차량 데이터
     */
    const updateVehicle = async (id, data) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.updateVehicle(id, data);
            if (result) {
                // 서비스 Vehicle을 Frontend Vehicle로 변환
                const frontendVehicle = convertServiceVehicleToFrontend(result);
                if (frontendVehicle) {
                    setCurrentVehicle(frontendVehicle);
                    setVehicles(prev => prev.map(vehicle => (vehicle.id === id ? frontendVehicle : vehicle)));
                }
                return frontendVehicle;
            }
            return null;
        }
        catch (err) {
            console.error(`차량(ID: ${id}) 업데이트 중 오류 발생:`, err);
            setError('차량을 업데이트하는 데 실패했습니다.');
            return null;
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 삭제
     * @param id 차량 ID
     */
    const deleteVehicle = async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            const success = await vehicleService.deleteVehicle(id);
            if (success) {
                // 목록에서 제거
                setVehicles(prev => prev.filter(vehicle => vehicle.id !== id));
                // 현재 차량인 경우 상태 초기화
                if (currentVehicle && currentVehicle.id === id) {
                    setCurrentVehicle(null);
                }
            }
            return success;
        }
        catch (err) {
            console.error(`차량(ID: ${id}) 삭제 중 오류 발생:`, err);
            setError('차량을 삭제하는 데 실패했습니다.');
            return false;
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 문서 목록 조회
     * @param vehicleId 차량 ID
     */
    const getVehicleDocuments = async (vehicleId) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.getVehicleDocuments(vehicleId);
            setDocuments(result);
            return result;
        }
        catch (err) {
            console.error(`차량 문서 목록(차량 ID: ${vehicleId}) 조회 중 오류 발생:`, err);
            setError('차량 문서 목록을 조회하는 데 실패했습니다.');
            return [];
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 문서 업로드
     * @param vehicleId 차량 ID
     * @param file 첨부 파일
     * @param metadata 문서 메타데이터
     */
    const uploadVehicleDocument = async (vehicleId, file, metadata) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await vehicleService.uploadVehicleDocument(vehicleId, file, metadata);
            if (result) {
                setDocuments(prev => [...prev, result]);
            }
            return result;
        }
        catch (err) {
            console.error(`차량 문서 업로드(차량 ID: ${vehicleId}) 중 오류 발생:`, err);
            setError('차량 문서를 업로드하는 데 실패했습니다.');
            return null;
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 차량 문서 삭제
     * @param vehicleId 차량 ID
     * @param documentId 문서 ID
     */
    const removeVehicleDocument = async (vehicleId, documentId) => {
        setIsLoading(true);
        setError(null);
        try {
            const success = await vehicleService.removeVehicleDocument(vehicleId, documentId);
            if (success) {
                setDocuments(prev => prev.filter(doc => doc.id !== documentId));
            }
            return success;
        }
        catch (err) {
            console.error(`차량 문서 삭제(차량 ID: ${vehicleId}, 문서 ID: ${documentId}) 중 오류 발생:`, err);
            setError('차량 문서를 삭제하는 데 실패했습니다.');
            return false;
        }
        finally {
            setIsLoading(false);
        }
    };
    return {
        // 상태
        vehicles,
        currentVehicle,
        stats,
        documents,
        isLoading,
        error,
        // 함수
        getVehicleStats,
        getVehicles,
        getVehicleById,
        createVehicle,
        updateVehicle,
        deleteVehicle,
        getVehicleDocuments,
        uploadVehicleDocument,
        removeVehicleDocument
    };
};
export default useVehicleService;
