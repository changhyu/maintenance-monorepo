import { ApiClient } from '../client';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

export enum BookingTimeSlotStatus {
  AVAILABLE = 'AVAILABLE',
  PARTIALLY_BOOKED = 'PARTIALLY_BOOKED',
  FULLY_BOOKED = 'FULLY_BOOKED',
  UNAVAILABLE = 'UNAVAILABLE'
}

export interface BookingTimeSlot {
  id: string;
  shopId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingTimeSlotStatus;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
}

export interface BookingMaintenanceService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category: string;
  shopId: string;
  isActive: boolean;
}

export interface Booking {
  id: string;
  shopId: string;
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  date: string;
  startTime: string;
  estimatedEndTime: string;
  actualEndTime?: string;
  status: BookingStatus;
  note?: string;
  servicesIds: string[];
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export interface BookingCreateRequest {
  shopId: string;
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  servicesIds: string[];
  note?: string;
}

export interface BookingUpdateRequest {
  timeSlotId?: string;
  note?: string;
  servicesIds?: string[];
}

export interface BookingCancellationRequest {
  cancelledBy: string;
  cancelReason?: string;
}

export interface BookingCompletionRequest {
  actualEndTime?: string;
  serviceNotes?: string;
}

export interface BookingTimeSlotCreateRequest {
  shopId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive?: boolean;
}

export interface BookingTimeSlotUpdateRequest {
  startTime?: string;
  endTime?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface MaintenanceServiceCreateRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category: string;
  shopId: string;
  isActive?: boolean;
}

export interface MaintenanceServiceUpdateRequest {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  category?: string;
  isActive?: boolean;
}

export interface BookingFilter {
  shopId?: string;
  userId?: string;
  vehicleId?: string;
  status?: BookingStatus | BookingStatus[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TimeSlotFilter {
  shopId?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingTimeSlotStatus | BookingTimeSlotStatus[];
  isActive?: boolean;
}

export class BookingService {
  private client: ApiClient;
  private basePath = '/bookings';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 예약 목록 조회
  async getBookings(filter?: BookingFilter): Promise<Booking[]> {
    return this.client.get<Booking[]>(this.basePath, { params: filter });
  }

  // 특정 예약 조회
  async getBookingById(id: string): Promise<Booking> {
    return this.client.get<Booking>(`${this.basePath}/${id}`);
  }

  // 예약 생성
  async createBooking(bookingData: BookingCreateRequest): Promise<Booking> {
    return this.client.post<Booking>(this.basePath, bookingData);
  }

  // 예약 업데이트
  async updateBooking(id: string, bookingData: BookingUpdateRequest): Promise<Booking> {
    return this.client.put<Booking>(`${this.basePath}/${id}`, bookingData);
  }

  // 예약 취소
  async cancelBooking(id: string, cancellationData: BookingCancellationRequest): Promise<Booking> {
    return this.client.post<Booking>(`${this.basePath}/${id}/cancel`, cancellationData);
  }

  // 예약 완료 처리
  async completeBooking(id: string, completionData?: BookingCompletionRequest): Promise<Booking> {
    return this.client.post<Booking>(`${this.basePath}/${id}/complete`, completionData || {});
  }

  // 예약 노쇼 처리
  async markBookingAsNoShow(id: string): Promise<Booking> {
    return this.client.post<Booking>(`${this.basePath}/${id}/no-show`, {});
  }

  // 특정 사용자의 예약 목록 조회
  async getUserBookings(userId: string, filter?: Omit<BookingFilter, 'userId'>): Promise<Booking[]> {
    return this.client.get<Booking[]>(`/users/${userId}/bookings`, { params: filter });
  }

  // 특정 차량의 예약 목록 조회
  async getVehicleBookings(vehicleId: string, filter?: Omit<BookingFilter, 'vehicleId'>): Promise<Booking[]> {
    return this.client.get<Booking[]>(`/vehicles/${vehicleId}/bookings`, { params: filter });
  }

  // 특정 정비소의 예약 목록 조회
  async getShopBookings(shopId: string, filter?: Omit<BookingFilter, 'shopId'>): Promise<Booking[]> {
    return this.client.get<Booking[]>(`/shops/${shopId}/bookings`, { params: filter });
  }

  // 타임슬롯 목록 조회
  async getTimeSlots(filter?: TimeSlotFilter): Promise<BookingTimeSlot[]> {
    return this.client.get<BookingTimeSlot[]>(`${this.basePath}/time-slots`, { params: filter });
  }

  // 특정 정비소의 타임슬롯 조회
  async getShopTimeSlots(shopId: string, filter?: Omit<TimeSlotFilter, 'shopId'>): Promise<BookingTimeSlot[]> {
    return this.client.get<BookingTimeSlot[]>(`/shops/${shopId}/time-slots`, { params: filter });
  }

  // 타임슬롯 생성
  async createTimeSlot(timeSlotData: BookingTimeSlotCreateRequest): Promise<BookingTimeSlot> {
    return this.client.post<BookingTimeSlot>(`${this.basePath}/time-slots`, timeSlotData);
  }

  // 타임슬롯 업데이트
  async updateTimeSlot(id: string, timeSlotData: BookingTimeSlotUpdateRequest): Promise<BookingTimeSlot> {
    return this.client.put<BookingTimeSlot>(`${this.basePath}/time-slots/${id}`, timeSlotData);
  }

  // 타임슬롯 삭제
  async deleteTimeSlot(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/time-slots/${id}`);
  }

  // 타임슬롯 활성화/비활성화
  async toggleTimeSlotActive(id: string, isActive: boolean): Promise<BookingTimeSlot> {
    return this.client.patch<BookingTimeSlot>(`${this.basePath}/time-slots/${id}/status`, { isActive });
  }

  // 정비 서비스 목록 조회
  async getMaintenanceServices(filter?: { shopId?: string; category?: string; isActive?: boolean }): Promise<BookingMaintenanceService[]> {
    return this.client.get<BookingMaintenanceService[]>(`${this.basePath}/services`, { params: filter });
  }

  // 특정 정비소의 정비 서비스 조회
  async getShopServices(shopId: string, filter?: { category?: string; isActive?: boolean }): Promise<BookingMaintenanceService[]> {
    return this.client.get<BookingMaintenanceService[]>(`/shops/${shopId}/services`, { params: filter });
  }

  // 정비 서비스 생성
  async createMaintenanceService(serviceData: MaintenanceServiceCreateRequest): Promise<BookingMaintenanceService> {
    return this.client.post<BookingMaintenanceService>(`${this.basePath}/services`, serviceData);
  }

  // 정비 서비스 업데이트
  async updateMaintenanceService(id: string, serviceData: MaintenanceServiceUpdateRequest): Promise<BookingMaintenanceService> {
    return this.client.put<BookingMaintenanceService>(`${this.basePath}/services/${id}`, serviceData);
  }

  // 정비 서비스 삭제
  async deleteMaintenanceService(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/services/${id}`);
  }

  // 정비 서비스 활성화/비활성화
  async toggleMaintenanceServiceActive(id: string, isActive: boolean): Promise<BookingMaintenanceService> {
    return this.client.patch<BookingMaintenanceService>(`${this.basePath}/services/${id}/status`, { isActive });
  }

  // 가용한 타임슬롯 조회
  async getAvailableTimeSlots(shopId: string, date: string, servicesIds?: string[]): Promise<BookingTimeSlot[]> {
    return this.client.get<BookingTimeSlot[]>(`/shops/${shopId}/available-time-slots`, { 
      params: { date, servicesIds: servicesIds ? servicesIds.join(',') : undefined }
    });
  }

  // 예약 일정 중복 확인
  async checkBookingConflicts(
    vehicleId: string, 
    date: string, 
    timeSlotId: string
  ): Promise<{ hasConflict: boolean; conflictingBooking?: Booking }> {
    return this.client.get<{ hasConflict: boolean; conflictingBooking?: Booking }>(
      `${this.basePath}/check-conflicts`,
      { params: { vehicleId, date, timeSlotId } }
    );
  }
} 