import { useState } from 'react';
import { 
  inspectionService, 
  InspectionCreateRequest,
  InspectionUpdateRequest,
  InspectionCompleteRequest,
  InspectionFilter,
  Inspection,
  UpcomingInspection,
  InspectionStatus,
  InspectionType
} from '../services/inspectionService';

/**
 * 차량 법정검사 관리 훅
 */
export const useInspectionService = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [upcomingInspections, setUpcomingInspections] = useState<UpcomingInspection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 모든 법정검사 목록 조회
   */
  const getAllInspections = async (filter?: InspectionFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.getAllInspections(filter);
      setInspections(result);
      return result;
    } catch (err) {
      console.error('법정검사 목록 조회 중 오류 발생:', err);
      setError('법정검사 목록을 조회하는 데 실패했습니다.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 특정 법정검사 조회
   */
  const getInspection = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.getInspectionById(id);
      setCurrentInspection(result);
      return result;
    } catch (err) {
      console.error(`법정검사(ID: ${id}) 조회 중 오류 발생:`, err);
      setError('법정검사 정보를 조회하는 데 실패했습니다.');
      setCurrentInspection(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 특정 차량의 법정검사 이력 조회
   */
  const getInspectionsForVehicle = async (vehicleId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.getInspectionsForVehicle(vehicleId);
      setInspections(result);
      return result;
    } catch (err) {
      console.error(`차량(ID: ${vehicleId}) 법정검사 이력 조회 중 오류 발생:`, err);
      setError('차량의 법정검사 이력을 조회하는 데 실패했습니다.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 곧 다가오는 법정검사 일정 조회
   */
  const getUpcomingInspections = async (days: number = 30) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.getUpcomingInspections(days);
      setUpcomingInspections(result);
      return result;
    } catch (err) {
      console.error('다가오는 법정검사 조회 중 오류 발생:', err);
      setError('다가오는 법정검사를 조회하는 데 실패했습니다.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 법정검사 일정 생성
   */
  const createInspection = async (data: InspectionCreateRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.createInspection(data);
      if (result) {
        setInspections(prev => [...prev, result]);
        setCurrentInspection(result);
      }
      return result;
    } catch (err) {
      console.error('법정검사 일정 생성 중 오류 발생:', err);
      setError('법정검사 일정을 생성하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 법정검사 정보 업데이트
   */
  const updateInspection = async (id: string, data: InspectionUpdateRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.updateInspection(id, data);
      if (result) {
        setInspections(prev => prev.map(item => item.id === id ? result : item));
        setCurrentInspection(result);
      }
      return result;
    } catch (err) {
      console.error(`법정검사(ID: ${id}) 업데이트 중 오류 발생:`, err);
      setError('법정검사 정보를 업데이트하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 법정검사 완료 처리
   */
  const completeInspection = async (id: string, data: InspectionCompleteRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await inspectionService.completeInspection(id, data);
      if (result) {
        setInspections(prev => prev.map(item => item.id === id ? result : item));
        setCurrentInspection(result);
      }
      return result;
    } catch (err) {
      console.error(`법정검사(ID: ${id}) 완료 처리 중 오류 발생:`, err);
      setError('법정검사 완료 처리에 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 법정검사 일정 삭제
   */
  const deleteInspection = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await inspectionService.deleteInspection(id);
      if (success) {
        setInspections(prev => prev.filter(item => item.id !== id));
        if (currentInspection?.id === id) {
          setCurrentInspection(null);
        }
      }
      return success;
    } catch (err) {
      console.error(`법정검사(ID: ${id}) 삭제 중 오류 발생:`, err);
      setError('법정검사 일정을 삭제하는 데 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    inspections,
    currentInspection,
    upcomingInspections,
    isLoading,
    error,
    getAllInspections,
    getInspection,
    getInspectionsForVehicle,
    getUpcomingInspections,
    createInspection,
    updateInspection,
    completeInspection,
    deleteInspection,
  };
};