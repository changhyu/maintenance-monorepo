import React, { createContext, useContext, useState, useEffect } from 'react';
import { MaintenanceReservation } from '../types/maintenance';
import { useReservation } from './ReservationContext';

interface ReservationStats {
  totalCount: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  serviceTypeCounts: {
    regular: number;
    emergency: number;
    inspection: number;
    repair: number;
  };
  priorityCounts: {
    high: number;
    medium: number;
    low: number;
  };
  averageDuration: number;
  completionRate: number;
  monthlyStats: {
    month: string;
    count: number;
    completionRate: number;
  }[];
  technicianStats: {
    technicianId: string;
    completedCount: number;
    averageDuration: number;
  }[];
}

interface ReservationStatsContextType {
  stats: ReservationStats | null;
  loading: boolean;
  error: string | null;
  calculateStats: (startDate?: Date, endDate?: Date) => Promise<void>;
  getCompletionTrend: (period: 'week' | 'month' | 'year') => Promise<{ date: string; rate: number }[]>;
  getTechnicianPerformance: () => Promise<{ technicianId: string; performance: number }[]>;
}

const ReservationStatsContext = createContext<ReservationStatsContextType | undefined>(undefined);

export const ReservationStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reservations } = useReservation();
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = async (startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true);
      setError(null);

      let filteredReservations = [...reservations];
      if (startDate && endDate) {
        filteredReservations = reservations.filter(reservation => {
          const date = new Date(reservation.scheduledDate);
          return date >= startDate && date <= endDate;
        });
      }

      const statusCounts = {
        pending: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      const serviceTypeCounts = {
        regular: 0,
        emergency: 0,
        inspection: 0,
        repair: 0,
      };

      const priorityCounts = {
        high: 0,
        medium: 0,
        low: 0,
      };

      let totalDuration = 0;
      let completedCount = 0;

      filteredReservations.forEach(reservation => {
        // 상태별 카운트
        statusCounts[reservation.status]++;

        // 서비스 유형별 카운트
        serviceTypeCounts[reservation.serviceType]++;

        // 우선순위별 카운트
        priorityCounts[reservation.priority]++;

        // 평균 소요 시간 계산
        if (reservation.actualDuration) {
          totalDuration += reservation.actualDuration;
        }

        // 완료된 예약 카운트
        if (reservation.status === 'completed') {
          completedCount++;
        }
      });

      // 월별 통계 계산
      const monthlyStats = calculateMonthlyStats(filteredReservations);

      // 기술자별 통계 계산
      const technicianStats = calculateTechnicianStats(filteredReservations);

      setStats({
        totalCount: filteredReservations.length,
        statusCounts,
        serviceTypeCounts,
        priorityCounts,
        averageDuration: completedCount > 0 ? totalDuration / completedCount : 0,
        completionRate: filteredReservations.length > 0 
          ? (completedCount / filteredReservations.length) * 100 
          : 0,
        monthlyStats,
        technicianStats,
      });
    } catch (err) {
      setError('통계 계산 중 오류가 발생했습니다.');
      console.error('통계 계산 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (reservations: MaintenanceReservation[]) => {
    const monthlyData: { [key: string]: { count: number; completed: number } } = {};

    reservations.forEach(reservation => {
      const date = new Date(reservation.scheduledDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, completed: 0 };
      }

      monthlyData[monthKey].count++;
      if (reservation.status === 'completed') {
        monthlyData[monthKey].completed++;
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      completionRate: (data.completed / data.count) * 100,
    }));
  };

  const calculateTechnicianStats = (reservations: MaintenanceReservation[]) => {
    const technicianData: { 
      [key: string]: { 
        completedCount: number; 
        totalDuration: number;
      } 
    } = {};

    reservations.forEach(reservation => {
      if (reservation.technicianId) {
        if (!technicianData[reservation.technicianId]) {
          technicianData[reservation.technicianId] = {
            completedCount: 0,
            totalDuration: 0,
          };
        }

        if (reservation.status === 'completed' && reservation.actualDuration) {
          technicianData[reservation.technicianId].completedCount++;
          technicianData[reservation.technicianId].totalDuration += reservation.actualDuration;
        }
      }
    });

    return Object.entries(technicianData).map(([technicianId, data]) => ({
      technicianId,
      completedCount: data.completedCount,
      averageDuration: data.completedCount > 0 
        ? data.totalDuration / data.completedCount 
        : 0,
    }));
  };

  const getCompletionTrend = async (period: 'week' | 'month' | 'year') => {
    const now = new Date();
    const trends: { date: string; rate: number }[] = [];

    let startDate: Date;
    let dateFormat: (date: Date) => string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = (date: Date) => 
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFormat = (date: Date) => 
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        dateFormat = (date: Date) => 
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    const filteredReservations = reservations.filter(reservation => {
      const date = new Date(reservation.scheduledDate);
      return date >= startDate && date <= now;
    });

    const groupedReservations: { [key: string]: { total: number; completed: number } } = {};

    filteredReservations.forEach(reservation => {
      const date = new Date(reservation.scheduledDate);
      const key = dateFormat(date);

      if (!groupedReservations[key]) {
        groupedReservations[key] = { total: 0, completed: 0 };
      }

      groupedReservations[key].total++;
      if (reservation.status === 'completed') {
        groupedReservations[key].completed++;
      }
    });

    Object.entries(groupedReservations).forEach(([date, data]) => {
      trends.push({
        date,
        rate: (data.completed / data.total) * 100,
      });
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getTechnicianPerformance = async () => {
    const technicianData: { [key: string]: { completed: number; total: number } } = {};

    reservations.forEach(reservation => {
      if (reservation.technicianId) {
        if (!technicianData[reservation.technicianId]) {
          technicianData[reservation.technicianId] = { completed: 0, total: 0 };
        }

        technicianData[reservation.technicianId].total++;
        if (reservation.status === 'completed') {
          technicianData[reservation.technicianId].completed++;
        }
      }
    });

    return Object.entries(technicianData).map(([technicianId, data]) => ({
      technicianId,
      performance: (data.completed / data.total) * 100,
    }));
  };

  useEffect(() => {
    calculateStats();
  }, [reservations]);

  return (
    <ReservationStatsContext.Provider
      value={{
        stats,
        loading,
        error,
        calculateStats,
        getCompletionTrend,
        getTechnicianPerformance,
      }}
    >
      {children}
    </ReservationStatsContext.Provider>
  );
};

export const useReservationStats = () => {
  const context = useContext(ReservationStatsContext);
  if (context === undefined) {
    throw new Error('useReservationStats must be used within a ReservationStatsProvider');
  }
  return context;
}; 