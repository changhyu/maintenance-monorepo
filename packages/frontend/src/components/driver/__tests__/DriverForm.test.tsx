import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { theme } from '../../../theme';
import DriverForm from '../DriverForm';
import { useDriver, useCreateDriver, useUpdateDriver } from '../../../hooks/useDrivers';

// Mock hooks
jest.mock('../../../hooks/useDrivers');

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

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
          <BrowserRouter>
            {component}
          </BrowserRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('DriverForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      const mockCreateDriver = {
        mutateAsync: jest.fn().mockResolvedValue(mockDriver),
        isLoading: false,
      };
      (useCreateDriver as jest.Mock).mockReturnValue(mockCreateDriver);
    });

    it('renders create form correctly', () => {
      renderWithProviders(<DriverForm />);

      expect(screen.getByText('새 운전자 등록')).toBeInTheDocument();
      expect(screen.getByLabelText('이름')).toBeInTheDocument();
      expect(screen.getByLabelText('이메일')).toBeInTheDocument();
      expect(screen.getByLabelText('연락처')).toBeInTheDocument();
      expect(screen.getByLabelText('운전면허 번호')).toBeInTheDocument();
    });

    it('handles form submission correctly', async () => {
      const mockCreateMutation = {
        mutateAsync: jest.fn().mockResolvedValue(mockDriver),
        isLoading: false,
      };
      (useCreateDriver as jest.Mock).mockReturnValue(mockCreateMutation);

      renderWithProviders(<DriverForm />);

      // 폼 입력
      fireEvent.change(screen.getByLabelText('이름'), {
        target: { value: '홍길동' },
      });
      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'hong@example.com' },
      });
      fireEvent.change(screen.getByLabelText('연락처'), {
        target: { value: '010-1234-5678' },
      });
      fireEvent.change(screen.getByLabelText('운전면허 번호'), {
        target: { value: 'DL-12345' },
      });

      // 폼 제출
      fireEvent.click(screen.getByText('등록'));

      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/drivers');
      });
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      (useDriver as jest.Mock).mockReturnValue({
        data: mockDriver,
        isLoading: false,
      });
      const mockUpdateDriver = {
        mutateAsync: jest.fn().mockResolvedValue(mockDriver),
        isLoading: false,
      };
      (useUpdateDriver as jest.Mock).mockReturnValue(mockUpdateDriver);
    });

    it('renders edit form correctly', () => {
      renderWithProviders(<DriverForm driverId="1" />);

      expect(screen.getByText('운전자 정보 수정')).toBeInTheDocument();
      expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
      expect(screen.getByDisplayValue('hong@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('010-1234-5678')).toBeInTheDocument();
      expect(screen.getByDisplayValue('DL-12345')).toBeInTheDocument();
    });

    it('handles form update correctly', async () => {
      const mockUpdateMutation = {
        mutateAsync: jest.fn().mockResolvedValue({
          ...mockDriver,
          name: '김길동',
        }),
        isLoading: false,
      };
      (useUpdateDriver as jest.Mock).mockReturnValue(mockUpdateMutation);

      renderWithProviders(<DriverForm driverId="1" />);

      // 이름 수정
      fireEvent.change(screen.getByDisplayValue('홍길동'), {
        target: { value: '김길동' },
      });

      // 폼 제출
      fireEvent.click(screen.getByText('수정'));

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/drivers');
      });
    });
  });

  it('handles form validation', async () => {
    renderWithProviders(<DriverForm />);

    // 빈 폼 제출
    fireEvent.click(screen.getByText('등록'));

    await waitFor(() => {
      expect(screen.getByText('이름을 입력해주세요.')).toBeInTheDocument();
      expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument();
      expect(screen.getByText('연락처를 입력해주세요.')).toBeInTheDocument();
      expect(screen.getByText('운전면허 번호를 입력해주세요.')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const mockError = new Error('서버 오류가 발생했습니다.');
    const mockCreateMutation = {
      mutateAsync: jest.fn().mockRejectedValue(mockError),
      isLoading: false,
    };
    (useCreateDriver as jest.Mock).mockReturnValue(mockCreateMutation);

    renderWithProviders(<DriverForm />);

    // 폼 입력 및 제출
    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: '홍길동' },
    });
    fireEvent.click(screen.getByText('등록'));

    await waitFor(() => {
      expect(screen.getByText('서버 오류가 발생했습니다.')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    const mockCreateMutation = {
      mutateAsync: jest.fn(),
      isLoading: true,
    };
    (useCreateDriver as jest.Mock).mockReturnValue(mockCreateMutation);

    renderWithProviders(<DriverForm />);

    expect(screen.getByText('저장 중...')).toBeInTheDocument();
    expect(screen.getByText('저장 중...')).toBeDisabled();
  });
}); 