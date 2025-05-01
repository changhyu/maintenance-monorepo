import React, { createContext, useContext, useState, useEffect } from 'react';
import { MaintenanceReservation } from '../types/maintenance';
import { useOfflineManager } from './OfflineContext';
import { api } from '../services/api';

interface ReservationContextType {
  reservations: MaintenanceReservation[];
  loading: boolean;
  error: string | null;
  createReservation: (reservation: Omit<MaintenanceReservation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReservation: (id: string, updates: Partial<MaintenanceReservation>) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  getReservation: (id: string) => Promise<MaintenanceReservation | null>;
  getReservationsByDate: (date: Date) => Promise<MaintenanceReservation[]>;
  getReservationsByTechnician: (technicianId: string) => Promise<MaintenanceReservation[]>;
  getReservationsByCustomer: (customerId: string) => Promise<MaintenanceReservation[]>;
  syncReservations: () => Promise<void>;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reservations, setReservations] = useState<MaintenanceReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOffline, queueOperation, syncOperations } = useOfflineManager();

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/maintenance/reservations');
      setReservations(response.data);
    } catch (err) {
      setError('예약 목록을 불러오는데 실패했습니다.');
      console.error('예약 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (
    reservation: Omit<MaintenanceReservation, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      if (isOffline) {
        const operationId = await queueOperation('reservation', 'create', '', reservation);
        const newReservation: MaintenanceReservation = {
          ...reservation,
          id: operationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setReservations(prev => [...prev, newReservation]);
        return;
      }

      const response = await api.post('/maintenance/reservations', reservation);
      setReservations(prev => [...prev, response.data]);
    } catch (err) {
      console.error('예약 생성 실패:', err);
      throw err;
    }
  };

  const updateReservation = async (id: string, updates: Partial<MaintenanceReservation>) => {
    try {
      if (isOffline) {
        await queueOperation('reservation', 'update', id, updates);
        setReservations(prev => prev.map(reservation => 
          reservation.id === id ? { ...reservation, ...updates, updatedAt: new Date().toISOString() } : reservation
        ));
        return;
      }

      const response = await api.patch(`/maintenance/reservations/${id}`, updates);
      setReservations(prev => prev.map(reservation => 
        reservation.id === id ? response.data : reservation
      ));
    } catch (err) {
      console.error('예약 업데이트 실패:', err);
      throw err;
    }
  };

  const cancelReservation = async (id: string) => {
    try {
      if (isOffline) {
        await queueOperation('reservation', 'update', id, { status: 'cancelled' });
        setReservations(prev => prev.map(reservation => 
          reservation.id === id ? { ...reservation, status: 'cancelled', updatedAt: new Date().toISOString() } : reservation
        ));
        return;
      }

      const response = await api.patch(`/maintenance/reservations/${id}`, { status: 'cancelled' });
      setReservations(prev => prev.map(reservation => 
        reservation.id === id ? response.data : reservation
      ));
    } catch (err) {
      console.error('예약 취소 실패:', err);
      throw err;
    }
  };

  const getReservation = async (id: string): Promise<MaintenanceReservation | null> => {
    try {
      const response = await api.get(`/maintenance/reservations/${id}`);
      return response.data;
    } catch (err) {
      console.error('예약 조회 실패:', err);
      return null;
    }
  };

  const getReservationsByDate = async (date: Date): Promise<MaintenanceReservation[]> => {
    try {
      const response = await api.get('/maintenance/reservations', {
        params: { date: date.toISOString() },
      });
      return response.data;
    } catch (err) {
      console.error('날짜별 예약 조회 실패:', err);
      return [];
    }
  };

  const getReservationsByTechnician = async (technicianId: string): Promise<MaintenanceReservation[]> => {
    try {
      const response = await api.get('/maintenance/reservations', {
        params: { technicianId },
      });
      return response.data;
    } catch (err) {
      console.error('기술자별 예약 조회 실패:', err);
      return [];
    }
  };

  const getReservationsByCustomer = async (customerId: string): Promise<MaintenanceReservation[]> => {
    try {
      const response = await api.get('/maintenance/reservations', {
        params: { customerId },
      });
      return response.data;
    } catch (err) {
      console.error('고객별 예약 조회 실패:', err);
      return [];
    }
  };

  const syncReservations = async () => {
    await syncOperations();
    await fetchReservations();
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <ReservationContext.Provider
      value={{
        reservations,
        loading,
        error,
        createReservation,
        updateReservation,
        cancelReservation,
        getReservation,
        getReservationsByDate,
        getReservationsByTechnician,
        getReservationsByCustomer,
        syncReservations,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservation = () => {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}; 