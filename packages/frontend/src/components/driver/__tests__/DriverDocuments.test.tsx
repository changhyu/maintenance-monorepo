import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import DriverDocuments from '../DriverDocuments';
import { useDriverDocuments, useUploadDocument, useDeleteDocument } from '../../../hooks/useDrivers';

// Mock hooks
jest.mock('../../../hooks/useDrivers');

const mockDocuments = [
  {
    id: '1',
    driverId: '1',
    type: 'license',
    name: '운전면허증.pdf',
    url: '/uploads/drivers/홍길동/운전면허증.pdf',
    uploadedAt: new Date('2024-03-21T10:00:00Z'),
  },
  {
    id: '2',
    driverId: '1',
    type: 'insurance',
    name: '보험증서.pdf',
    url: '/uploads/drivers/홍길동/보험증서.pdf',
    uploadedAt: new Date('2024-03-21T10:00:00Z'),
  },
];

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
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('DriverDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    window.open = jest.fn();
  });

  it('renders loading state', () => {
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: true,
      data: null,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      error: new Error('Failed to fetch documents'),
      data: null,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    expect(screen.getByText(/문서를 불러오는데 실패했습니다/i)).toBeInTheDocument();
  });

  it('renders document list correctly', () => {
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDocuments,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    expect(screen.getByText('운전면허증')).toBeInTheDocument();
    expect(screen.getByText('보험증서')).toBeInTheDocument();
    expect(screen.getByText(/운전면허증\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/보험증서\.pdf/)).toBeInTheDocument();
  });

  it('handles document upload', async () => {
    const mockUploadMutation = {
      mutateAsync: jest.fn().mockResolvedValue({ url: '/uploads/test.pdf' }),
      isLoading: false,
    };
    (useUploadDocument as jest.Mock).mockReturnValue(mockUploadMutation);
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDocuments,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    // 업로드 버튼 클릭
    fireEvent.click(screen.getByText('문서 업로드'));

    // 문서 종류 선택
    fireEvent.mouseDown(screen.getByLabelText('문서 종류'));
    fireEvent.click(screen.getByText('운전면허증'));

    // 파일 선택
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('file-input');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockUploadMutation.mutateAsync).toHaveBeenCalledWith({
        file,
        type: 'license',
      });
    });
  });

  it('handles document deletion', async () => {
    const mockDeleteMutation = {
      mutateAsync: jest.fn().mockResolvedValue(true),
      isLoading: false,
    };
    (useDeleteDocument as jest.Mock).mockReturnValue(mockDeleteMutation);
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDocuments,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    // 삭제 버튼 클릭
    const deleteButtons = screen.getAllByLabelText('삭제');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith('1');
    });
  });

  it('handles document preview', () => {
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDocuments,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    // 보기 버튼 클릭
    const viewButtons = screen.getAllByLabelText('보기');
    fireEvent.click(viewButtons[0]);

    expect(window.open).toHaveBeenCalledWith(mockDocuments[0].url, '_blank');
  });

  it('displays empty state when no documents', () => {
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [],
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    expect(screen.getByText('등록된 문서가 없습니다.')).toBeInTheDocument();
  });

  it('handles upload error', async () => {
    const mockError = new Error('Upload failed');
    const mockUploadMutation = {
      mutateAsync: jest.fn().mockRejectedValue(mockError),
      isLoading: false,
    };
    (useUploadDocument as jest.Mock).mockReturnValue(mockUploadMutation);
    (useDriverDocuments as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockDocuments,
    });

    renderWithProviders(<DriverDocuments driverId="1" />);

    // 업로드 시도
    fireEvent.click(screen.getByText('문서 업로드'));
    fireEvent.mouseDown(screen.getByLabelText('문서 종류'));
    fireEvent.click(screen.getByText('운전면허증'));

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('file-input');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });
}); 