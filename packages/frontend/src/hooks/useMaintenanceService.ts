import { useState } from 'react';
import { api } from '../services/api';

/**
 * 정비 일정 인터페이스
 */
interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  scheduledDate: string;
  type: 'regular' | 'repair' | 'inspection';
  maintenanceType: string;
  description: string;
  estimatedCost?: number;
  status: 'scheduled' | 'completed' | 'canceled';
  assignedTechnician?: string;
  notes?: string;
  completionDate?: string;
  cost?: number;
}

/**
 * 정비 일정 생성 요청 인터페이스
 */
interface MaintenanceScheduleCreateRequest {
  vehicleId: string;
  scheduledDate: string;
  type: 'regular' | 'repair' | 'inspection';
  description: string;
  estimatedCost?: number;
  assignedTechnician?: string;
  notes?: string;
}

/**
 * 정비 일정 업데이트 요청 인터페이스
 */
interface MaintenanceScheduleUpdateRequest {
  scheduledDate?: string;
  type?: 'regular' | 'repair' | 'inspection';
  description?: string;
  estimatedCost?: number;
  status?: 'scheduled' | 'completed' | 'canceled';
  assignedTechnician?: string;
  notes?: string;
}

/**
 * 정비 보고서 인터페이스
 */
interface MaintenanceReport {
  id: string;
  maintenanceId: string;
  vehicleId: string;
  completionDate: string;
  actualCost: number;
  partsReplaced?: string[];
  issuesFound?: string[];
  recommendedFutureWork?: string[];
  technicianComments?: string;
}

/**
 * 정비 보고서 생성 요청 인터페이스
 */
interface MaintenanceReportCreateRequest {
  maintenanceId: string;
  vehicleId: string;
  completionDate: string;
  actualCost: number;
  partsReplaced?: string[];
  issuesFound?: string[];
  recommendedFutureWork?: string[];
  technicianComments?: string;
}

/**
 * 정비 서비스 훅
 * @returns 정비 관련 상태 및 메서드
 */
const useMaintenanceService = () => {
  // 상태 관리
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<MaintenanceSchedule | null>(null);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 모든 정비 일정 조회
   */
  const getAllMaintenanceSchedules = async (): Promise<MaintenanceSchedule[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/maintenance');
      const result = response.data;
      setSchedules(result);
      return result;
    } catch (err) {
      console.error('정비 일정 목록 조회 중 오류 발생:', err);
      setError('정비 일정 목록을 조회하는 데 실패했습니다.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 차량별 정비 일정 조회
   * @param vehicleId 차량 ID
   */
  const getVehicleMaintenanceSchedules = async (vehicleId: string): Promise<MaintenanceSchedule[]> => {
    if (!vehicleId) {
      setError('차량 ID가 제공되지 않았습니다.');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/maintenance/vehicle/${vehicleId}`);
      const result = response.data;
      setSchedules(result);
      return result;
    } catch (err) {
      console.error(`차량(ID: ${vehicleId})의 정비 일정 조회 중 오류 발생:`, err);
      setError('차량의 정비 일정을 조회하는 데 실패했습니다.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 일정 상세 조회
   * @param id 정비 일정 ID
   */
  const getMaintenanceScheduleById = async (id: string): Promise<MaintenanceSchedule | null> => {
    if (!id) {
      setError('정비 일정 ID가 제공되지 않았습니다.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/maintenance/${id}`);
      const result = response.data;
      setCurrentSchedule(result);
      return result;
    } catch (err) {
      console.error(`정비 일정(ID: ${id}) 상세 조회 중 오류 발생:`, err);
      setError('정비 일정 상세 정보를 조회하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 일정 생성
   * @param data 정비 일정 생성 데이터
   */
  const createMaintenanceSchedule = async (data: MaintenanceScheduleCreateRequest): Promise<MaintenanceSchedule | null> => {
    if (!data.vehicleId) {
      setError('차량 ID가 제공되지 않았습니다.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/maintenance', data);
      const result = response.data;
      setSchedules(prev => [...prev, result]);
      return result;
    } catch (err) {
      console.error('정비 일정 생성 중 오류 발생:', err);
      setError('정비 일정을 생성하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 일정 업데이트
   * @param id 정비 일정 ID
   * @param data 업데이트 데이터
   */
  const updateMaintenanceSchedule = async (id: string, data: MaintenanceScheduleUpdateRequest): Promise<MaintenanceSchedule | null> => {
    if (!id) {
      setError('정비 일정 ID가 제공되지 않았습니다.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put(`/maintenance/${id}`, data);
      const result = response.data;
      
      if (result) {
        // 목록 업데이트
        setSchedules(prev => prev.map(schedule => schedule.id === id ? result : schedule));
        
        // 현재 선택된 일정 업데이트
        if (currentSchedule && currentSchedule.id === id) {
          setCurrentSchedule(result);
        }
      }
      
      return result;
    } catch (err) {
      console.error(`정비 일정(ID: ${id}) 업데이트 중 오류 발생:`, err);
      setError('정비 일정을 업데이트하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 일정 삭제
   * @param id 정비 일정 ID
   */
  const deleteMaintenanceSchedule = async (id: string): Promise<boolean> => {
    if (!id) {
      setError('정비 일정 ID가 제공되지 않았습니다.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.delete(`/maintenance/${id}`);
      
      // 목록에서 제거
      setSchedules(prev => prev.filter(schedule => schedule.id !== id));
      
      // 현재 선택된 일정인 경우 초기화
      if (currentSchedule && currentSchedule.id === id) {
        setCurrentSchedule(null);
      }
      
      return true;
    } catch (err) {
      console.error(`정비 일정(ID: ${id}) 삭제 중 오류 발생:`, err);
      setError('정비 일정을 삭제하는 데 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 일정 상태 변경
   * @param id 정비 일정 ID
   * @param status 변경할 상태
   */
  const changeMaintenanceStatus = async (id: string, status: 'scheduled' | 'completed' | 'canceled'): Promise<MaintenanceSchedule | null> => {
    if (!id) {
      setError('정비 일정 ID가 제공되지 않았습니다.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.patch(`/maintenance/${id}/status`, { status });
      const result = response.data;
      
      if (result) {
        // 목록 업데이트
        setSchedules(prev => prev.map(schedule => schedule.id === id ? result : schedule));
        
        // 현재 선택된 일정 업데이트
        if (currentSchedule && currentSchedule.id === id) {
          setCurrentSchedule(result);
        }
      }
      
      return result;
    } catch (err) {
      console.error(`정비 일정(ID: ${id}) 상태 변경 중 오류 발생:`, err);
      setError('정비 일정 상태를 변경하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 보고서 생성
   * @param data 정비 보고서 생성 데이터
   */
  const createMaintenanceReport = async (data: MaintenanceReportCreateRequest): Promise<MaintenanceReport | null> => {
    if (!data.maintenanceId || !data.vehicleId) {
      setError('정비 ID 또는 차량 ID가 제공되지 않았습니다.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post(`/maintenance/${data.maintenanceId}/reports`, data);
      const result = response.data;
      setReports(prev => [...prev, result]);
      return result;
    } catch (err) {
      console.error('정비 보고서 생성 중 오류 발생:', err);
      setError('정비 보고서를 생성하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 정비 보고서 조회
   * @param maintenanceId 정비 일정 ID
   */
  const getMaintenanceReport = async (maintenanceId: string): Promise<MaintenanceReport | null> => {
    if (!maintenanceId) {
      setError('정비 일정 ID가 제공되지 않았습니다.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/maintenance/${maintenanceId}/reports`);
      const result = response.data;
      return result;
    } catch (err) {
      console.error(`정비 보고서(정비 ID: ${maintenanceId}) 조회 중 오류 발생:`, err);
      setError('정비 보고서를 조회하는 데 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // 상태
    schedules,
    currentSchedule,
    reports,
    isLoading,
    error,
    
    // 메서드
    getAllMaintenanceSchedules,
    getVehicleMaintenanceSchedules,
    getMaintenanceScheduleById,
    createMaintenanceSchedule,
    updateMaintenanceSchedule,
    deleteMaintenanceSchedule,
    changeMaintenanceStatus,
    createMaintenanceReport,
    getMaintenanceReport
  };
};

export default useMaintenanceService; 