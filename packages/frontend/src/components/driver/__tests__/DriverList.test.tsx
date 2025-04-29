import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import DriverList from '../DriverList';
import { useDrivers, useDeleteDriver } from '../../../hooks/useDrivers';
import { DriverStatus } from '../../../types/driver';

// Mock hooks
jest.mock('../../../hooks/useDrivers');

const mockDriver = {
  id: '1',
  firstName: '길동',
  lastName: '홍',
  email: 'hong@example.com',
  phoneNumber: '010-1234-5678',
  licenseNumber: 'DL-12345',
  status: 'ACTIVE' as DriverStatus,
  licenseExpiry: new Date('2025-01-01'),
  createdAt: new Date('2020-01-01'),
  updatedAt: new Date('2020-01-01'),
  safetyScore: 85
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('DriverList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    });

    renderWithProviders(<DriverList />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Failed to fetch drivers'),
      isError: true,
    });

    renderWithProviders(<DriverList />);

    expect(screen.getByText(/운전자 목록을 불러오는데 실패했습니다/i)).toBeInTheDocument();
  });

  it('renders driver list', () => {
    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { 
        items: [mockDriver],
        totalCount: 1
      },
      error: null,
      isSuccess: true,
    });

    renderWithProviders(<DriverList />);

    expect(screen.getByText(`${mockDriver.firstName} ${mockDriver.lastName}`)).toBeInTheDocument();
    expect(screen.getByText(mockDriver.email)).toBeInTheDocument();
    expect(screen.getByText(mockDriver.licenseNumber)).toBeInTheDocument();
    expect(screen.getByText('활성')).toBeInTheDocument(); // 번역된 상태 라벨
  });

  it('handles search', async () => {
    const mockUseDrivers = useDrivers as jest.Mock;
    mockUseDrivers.mockReturnValue({
      isLoading: false,
      data: { 
        items: [mockDriver],
        totalCount: 1
      },
      error: null,
      isSuccess: true,
    });

    renderWithProviders(<DriverList />);

    const searchInput = screen.getByPlaceholderText(/운전자 검색/i);
    fireEvent.change(searchInput, { target: { value: '홍길동' } });

    await waitFor(() => {
      expect(mockUseDrivers).toHaveBeenCalledWith({
        search: '홍길동',
        status: undefined,
        limit: 10,
        page: 1,
      });
    });
  });

  it('handles delete driver', async () => {
    const mockDeleteMutation = {
      mutateAsync: jest.fn().mockResolvedValue(true),
      isLoading: false,
    };

    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { 
        items: [mockDriver],
        totalCount: 1
      },
      error: null,
      isSuccess: true,
    });

    (useDeleteDriver as jest.Mock).mockReturnValue(mockDeleteMutation);

    renderWithProviders(<DriverList />);

    // 메뉴 버튼 클릭
    const menuButton = screen.getByLabelText('더 보기');
    fireEvent.click(menuButton);

    // 삭제 메뉴 아이템 클릭
    const deleteButton = screen.getByText('삭제');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith(mockDriver.id);
    });
  });

  it('handles pagination', () => {
    const drivers = Array(15).fill(null).map((_, index) => ({
      ...mockDriver,
      id: String(index + 1),
      firstName: `Driver ${index + 1}`,
      lastName: '',
    }));

    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { 
        items: drivers.slice(0, 10), // 첫 페이지에 10개 항목
        totalCount: 15
      },
      error: null,
      isSuccess: true,
    });

    renderWithProviders(<DriverList />);

    // 첫 페이지에 표시되는 항목 확인
    expect(screen.getByText('Driver 1')).toBeInTheDocument();
    expect(screen.getByText('Driver 10')).toBeInTheDocument();
    expect(screen.queryByText('Driver 11')).not.toBeInTheDocument();

    // 다음 페이지로 네비게이션 준비
    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { 
        items: drivers.slice(10, 15), // 두 번째 페이지에 5개 항목
        totalCount: 15
      },
      error: null,
      isSuccess: true,
    });

    // 다음 페이지로 이동
    const nextPageButton = screen.getByRole('button', { name: /다음 페이지/i });
    fireEvent.click(nextPageButton);
  });

  it('displays safety score correctly', () => {
    (useDrivers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { 
        items: [mockDriver],
        totalCount: 1
      },
      error: null,
      isSuccess: true,
    });

    renderWithProviders(<DriverList />);

    expect(screen.getByText(`${mockDriver.safetyScore}%`)).toBeInTheDocument();
  });
}); 