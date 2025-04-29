import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../services/driverService';
import { Driver, DriverCreate, DriverUpdate, DriverStats, DriverFilters, PaginatedDrivers } from '../types/driver';

export const useDrivers = (filters?: DriverFilters) => {
  return useQuery<PaginatedDrivers>(['drivers', filters], () => driverService.getAllDrivers(filters), {
    staleTime: 1000 * 60 * 5, // 5분
  });
};

export const useDriver = (driverId: string) => {
  return useQuery<Driver>(
    ['driver', driverId],
    () => driverService.getDriverById(driverId),
    {
      enabled: !!driverId,
      staleTime: 1000 * 60 * 5,
    }
  );
};

export const useDriverStats = (driverId: string) => {
  return useQuery<DriverStats>(
    ['driver-stats', driverId],
    () => driverService.getDriverStats(driverId),
    {
      enabled: !!driverId,
      staleTime: 1000 * 60 * 5,
    }
  );
};

export const useDriverDocuments = (driverId: string) => {
  return useQuery(
    ['driver-documents', driverId],
    () => driverService.getDriverDocuments(driverId),
    {
      enabled: !!driverId,
      staleTime: 1000 * 60 * 5,
    }
  );
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (data: DriverCreate) => driverService.createDriver(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['drivers']);
      },
    }
  );
};

export const useUpdateDriver = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation(
    (data: DriverUpdate) => driverService.updateDriver(driverId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['drivers']);
        queryClient.invalidateQueries(['driver', driverId]);
      },
    }
  );
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (driverId: string) => driverService.deleteDriver(driverId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['drivers']);
      },
    }
  );
};

export const useUploadDocument = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ file, type }: { file: File; type: string }) =>
      driverService.uploadDriverDocument(driverId, file, type),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driver-documents', driverId]);
      },
    }
  );
};

export const useDeleteDocument = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation(
    (documentId: string) => driverService.deleteDocument(driverId, documentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driver-documents', driverId]);
      },
    }
  );
}; 