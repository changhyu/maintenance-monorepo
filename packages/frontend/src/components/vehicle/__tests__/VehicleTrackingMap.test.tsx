import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VehicleTrackingMap from '../VehicleTrackingMap';

describe('VehicleTrackingMap', () => {
  it('renders loading state initially', () => {
    render(<VehicleTrackingMap />);
    expect(screen.getByText(/지도를 불러오는 중/)).toBeInTheDocument();
  });

  it('renders map after loading', async () => {
    render(<VehicleTrackingMap />);
    await waitFor(() => {
      expect(screen.getByText(/지도가 여기에 표시됩니다/)).toBeInTheDocument();
    });
  });

  it('renders with custom height', () => {
    const { container } = render(<VehicleTrackingMap height="600px" />);
    const card = container.querySelector('.ant-card');
    expect(card).toHaveStyle({ height: '600px' });
  });

  it('shows error message when loading fails', async () => {
    // TODO: Mock API failure
    render(<VehicleTrackingMap vehicleId="invalid-id" />);
    await waitFor(() => {
      expect(screen.getByText(/지도 데이터를 불러오는데 실패했습니다/)).toBeInTheDocument();
    });
  });
}); 