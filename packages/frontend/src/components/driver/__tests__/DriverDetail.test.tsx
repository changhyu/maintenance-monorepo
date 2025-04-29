import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import DriverDetail from '../DriverDetail';
import { useDriver, useDriverStats } from '../../../hooks/useDrivers';

// Mock hooks
jest.mock('../../../hooks/useDrivers');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
  useNavigate: () => jest.fn(),
}));

const mockDriver = {
  id: '1',
  firstName: '길동',
  lastName: '홍',
  email: 'hong@example.com',
  phoneNumber: '010-1234-5678',
  licenseNumber: 'DL-12345',
  status: 'ACTIVE',
  address: '서울시 강남구',
  emergencyContact: {
    name: '홍부모',
    relationship: '부모',
    phoneNumber: '010-8765-4321'
  },
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

describe('DriverDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    (useDriver as jest.Mock).mockReturnValue({
      isLoading: true,
      data: null,
    });
    (useDriverStats as jest.Mock).mockReturnValue({
      isLoading: true,
      data: null,
    });

    renderWithProviders(<DriverDetail />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useDriver as jest.Mock).mockReturnValue({
      isLoading: false,
      error: new Error('Failed to fetch driver'),
      data: null,
    });

    renderWithProviders(<DriverDetail />);

    expect(screen.getByText(/운전자 정보를 불러오는데 실패했습니다/i)).toBeInTheDocument();
  });

  it('renders driver details correctly', () => {
    (useDriver as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDriver,
    });
    (useDriverStats as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockStats,
    });

    renderWithProviders(<DriverDetail />);

    // 기본 정보 확인
    expect(screen.getByText(`${mockDriver.firstName} ${mockDriver.lastName}`)).toBeInTheDocument();
    expect(screen.getByText(mockDriver.email)).toBeInTheDocument();
    expect(screen.getByText(mockDriver.phoneNumber)).toBeInTheDocument();
    expect(screen.getByText(mockDriver.licenseNumber)).toBeInTheDocument();
    expect(screen.getByText(mockDriver.address)).toBeInTheDocument();

    // 상태 확인
    expect(screen.getByText('활성')).toBeInTheDocument();

    // 통계 정보 확인
    expect(screen.getByText('100')).toBeInTheDocument(); // totalTrips
    expect(screen.getByText('1500.5km')).toBeInTheDocument(); // totalDistance
    expect(screen.getByText('4.5')).toBeInTheDocument(); // averageRating
    expect(screen.getByText('2')).toBeInTheDocument(); // incidentCount
  });

  it('handles navigation buttons correctly', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);

    (useDriver as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDriver,
    });
    (useDriverStats as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockStats,
    });

    renderWithProviders(<DriverDetail />);

    // 목록으로 버튼 클릭
    fireEvent.click(screen.getByText('목록으로'));
    expect(mockNavigate).toHaveBeenCalledWith('/drivers');

    // 정보 수정 버튼 클릭
    fireEvent.click(screen.getByText('정보 수정'));
    expect(mockNavigate).toHaveBeenCalledWith('/drivers/1/edit');
  });

  it('handles missing data gracefully', () => {
    const incompleteDriver = {
      ...mockDriver,
      address: undefined,
      emergencyContact: undefined,
    };

    (useDriver as jest.Mock).mockReturnValue({
      isLoading: false,
      data: incompleteDriver,
    });
    (useDriverStats as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockStats,
    });

    renderWithProviders(<DriverDetail />);

    // 선택적 필드가 없는 경우 '-' 표시 확인
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    (useDriver as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDriver,
    });
    (useDriverStats as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockStats,
    });

    renderWithProviders(<DriverDetail />);

    // 날짜 형식 확인
    expect(screen.getByText('2025년 01월 01일')).toBeInTheDocument(); // licenseExpiry
  });
}); 