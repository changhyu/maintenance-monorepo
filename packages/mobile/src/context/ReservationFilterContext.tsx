import React, { createContext, useContext, useState, useEffect } from 'react';
import { MaintenanceReservation } from '../types/maintenance';
import { useReservation } from './ReservationContext';

interface FilterOptions {
  status: ('pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled')[];
  serviceType: ('regular' | 'emergency' | 'inspection' | 'repair')[];
  priority: ('high' | 'medium' | 'low')[];
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  technicianId: string | null;
  customerId: string | null;
  vehicleId: string | null;
}

interface SortOptions {
  field: 'scheduledDate' | 'priority' | 'status' | 'serviceType';
  order: 'asc' | 'desc';
}

interface ReservationFilterContextType {
  searchQuery: string;
  filterOptions: FilterOptions;
  sortOptions: SortOptions;
  filteredReservations: MaintenanceReservation[];
  setSearchQuery: (query: string) => void;
  updateFilterOptions: (options: Partial<FilterOptions>) => void;
  updateSortOptions: (options: Partial<SortOptions>) => void;
  resetFilters: () => void;
  clearDateRange: () => void;
}

const defaultFilterOptions: FilterOptions = {
  status: [],
  serviceType: [],
  priority: [],
  dateRange: {
    startDate: null,
    endDate: null,
  },
  technicianId: null,
  customerId: null,
  vehicleId: null,
};

const defaultSortOptions: SortOptions = {
  field: 'scheduledDate',
  order: 'desc',
};

const ReservationFilterContext = createContext<ReservationFilterContextType | undefined>(undefined);

export const ReservationFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reservations } = useReservation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions);
  const [sortOptions, setSortOptions] = useState<SortOptions>(defaultSortOptions);
  const [filteredReservations, setFilteredReservations] = useState<MaintenanceReservation[]>([]);

  useEffect(() => {
    filterAndSortReservations();
  }, [reservations, searchQuery, filterOptions, sortOptions]);

  const filterAndSortReservations = () => {
    let filtered = [...reservations];

    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation =>
        reservation.vehicleId.toLowerCase().includes(query) ||
        reservation.customerId.toLowerCase().includes(query) ||
        (reservation.technicianId && reservation.technicianId.toLowerCase().includes(query))
      );
    }

    // 상태 필터링
    if (filterOptions.status.length > 0) {
      filtered = filtered.filter(reservation =>
        filterOptions.status.includes(reservation.status)
      );
    }

    // 서비스 유형 필터링
    if (filterOptions.serviceType.length > 0) {
      filtered = filtered.filter(reservation =>
        filterOptions.serviceType.includes(reservation.serviceType)
      );
    }

    // 우선순위 필터링
    if (filterOptions.priority.length > 0) {
      filtered = filtered.filter(reservation =>
        filterOptions.priority.includes(reservation.priority)
      );
    }

    // 날짜 범위 필터링
    if (filterOptions.dateRange.startDate && filterOptions.dateRange.endDate) {
      filtered = filtered.filter(reservation => {
        const date = new Date(reservation.scheduledDate);
        return (
          date >= filterOptions.dateRange.startDate! &&
          date <= filterOptions.dateRange.endDate!
        );
      });
    }

    // 기술자 ID 필터링
    if (filterOptions.technicianId) {
      filtered = filtered.filter(reservation =>
        reservation.technicianId === filterOptions.technicianId
      );
    }

    // 고객 ID 필터링
    if (filterOptions.customerId) {
      filtered = filtered.filter(reservation =>
        reservation.customerId === filterOptions.customerId
      );
    }

    // 차량 ID 필터링
    if (filterOptions.vehicleId) {
      filtered = filtered.filter(reservation =>
        reservation.vehicleId === filterOptions.vehicleId
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortOptions.field) {
        case 'scheduledDate':
          comparison = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder = {
            pending: 1,
            confirmed: 2,
            in_progress: 3,
            completed: 4,
            cancelled: 5,
          };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'serviceType':
          const serviceTypeOrder = {
            emergency: 1,
            repair: 2,
            inspection: 3,
            regular: 4,
          };
          comparison = serviceTypeOrder[a.serviceType] - serviceTypeOrder[b.serviceType];
          break;
      }
      return sortOptions.order === 'asc' ? comparison : -comparison;
    });

    setFilteredReservations(filtered);
  };

  const updateFilterOptions = (options: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...options }));
  };

  const updateSortOptions = (options: Partial<SortOptions>) => {
    setSortOptions(prev => ({ ...prev, ...options }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterOptions(defaultFilterOptions);
    setSortOptions(defaultSortOptions);
  };

  const clearDateRange = () => {
    setFilterOptions(prev => ({
      ...prev,
      dateRange: { startDate: null, endDate: null },
    }));
  };

  return (
    <ReservationFilterContext.Provider
      value={{
        searchQuery,
        filterOptions,
        sortOptions,
        filteredReservations,
        setSearchQuery,
        updateFilterOptions,
        updateSortOptions,
        resetFilters,
        clearDateRange,
      }}
    >
      {children}
    </ReservationFilterContext.Provider>
  );
};

export const useReservationFilter = () => {
  const context = useContext(ReservationFilterContext);
  if (context === undefined) {
    throw new Error('useReservationFilter must be used within a ReservationFilterProvider');
  }
  return context;
}; 