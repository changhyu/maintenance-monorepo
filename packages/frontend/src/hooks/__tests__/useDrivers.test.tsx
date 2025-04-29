import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import {
  useDrivers,
  useDriver,
  useDriverStats,
  useDriverDocuments,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
} from '../useDrivers';

// Mock driverService
jest.mock('../../services/driverService');

const mockDriver = {
  id: '1',
  name: '홍길동',
  email: 'hong@example.com',
  phone: '010-1234-5678',
  licenseNumber: 'DL-12345',
  status: 'active',
  birthDate: new Date('1990-01-01'),
  hireDate: new Date('2020-01-01'),
  licenseExpiry: new Date('2025-01-01'),
  createdAt: new Date('2020-01-01'),
  updatedAt: new Date('2020-01-01'),
};

const mockStats = {
  totalTrips: 100,
  totalDistance: 1500.5,
  averageRating: 4.5,
  incidentCount: 2,
  lastActive: new Date(),
};

const mockDocuments = [
  {
    id: '1',
    driverId: '1',
    type: 'license',
    name: '운전면허증.pdf',
    url: 'http://example.com/license.pdf',
    uploadedAt: new Date(),
  },
];

describe('Driver Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('useDrivers', () => {
    it('should fetch drivers successfully', async () => {
      (driverService.getAllDrivers as jest.Mock).mockResolvedValueOnce([mockDriver]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useDrivers(), { wrapper });

      await waitFor(() => result.current.isSuccess);

      expect(result.current.data).toEqual([mockDriver]);
      expect(driverService.getAllDrivers).toHaveBeenCalledTimes(1);
    });

    it('should handle error when fetching drivers', async () => {
      const error = new Error('Failed to fetch drivers');
      (driverService.getAllDrivers as jest.Mock).mockRejectedValueOnce(error);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useDrivers(), { wrapper });

      await waitFor(() => result.current.isError);

      expect(result.current.error).toBe(error);
    });
  });

  describe('useDriver', () => {
    it('should fetch single driver successfully', async () => {
      (driverService.getDriverById as jest.Mock).mockResolvedValueOnce(mockDriver);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useDriver('1'), { wrapper });

      await waitFor(() => result.current.isSuccess);

      expect(result.current.data).toEqual(mockDriver);
      expect(driverService.getDriverById).toHaveBeenCalledWith('1');
    });
  });

  describe('useDriverStats', () => {
    it('should fetch driver stats successfully', async () => {
      (driverService.getDriverStats as jest.Mock).mockResolvedValueOnce(mockStats);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useDriverStats('1'), { wrapper });

      await waitFor(() => result.current.isSuccess);

      expect(result.current.data).toEqual(mockStats);
      expect(driverService.getDriverStats).toHaveBeenCalledWith('1');
    });
  });

  describe('useCreateDriver', () => {
    it('should create driver successfully', async () => {
      const newDriver = { ...mockDriver };
      delete (newDriver as any).id;
      delete (newDriver as any).createdAt;
      delete (newDriver as any).updatedAt;

      (driverService.createDriver as jest.Mock).mockResolvedValueOnce(mockDriver);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useCreateDriver(), { wrapper });

      act(() => {
        result.current.mutate(newDriver);
      });

      await waitFor(() => result.current.isSuccess);

      expect(result.current.data).toEqual(mockDriver);
      expect(driverService.createDriver).toHaveBeenCalledWith(newDriver);
    });
  });

  describe('useUpdateDriver', () => {
    it('should update driver successfully', async () => {
      const updateData = { name: '김철수' };
      const updatedDriver = { ...mockDriver, ...updateData };

      (driverService.updateDriver as jest.Mock).mockResolvedValueOnce(updatedDriver);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useUpdateDriver('1'), { wrapper });

      act(() => {
        result.current.mutate(updateData);
      });

      await waitFor(() => result.current.isSuccess);

      expect(result.current.data).toEqual(updatedDriver);
      expect(driverService.updateDriver).toHaveBeenCalledWith('1', updateData);
    });
  });

  describe('useDeleteDriver', () => {
    it('should delete driver successfully', async () => {
      (driverService.deleteDriver as jest.Mock).mockResolvedValueOnce(true);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, waitFor } = renderHook(() => useDeleteDriver(), { wrapper });

      act(() => {
        result.current.mutate('1');
      });

      await waitFor(() => result.current.isSuccess);

      expect(driverService.deleteDriver).toHaveBeenCalledWith('1');
    });
  });
}); 