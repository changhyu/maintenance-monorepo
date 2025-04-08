import axios, { AxiosInstance } from 'axios';
import { ApiClient } from '../../../api-client/src/client';

/**
 * 예약 상태 열거형
 */
export enum BookingStatus {
  PENDING = 'pending',   // 대기 중
  CONFIRMED = 'confirmed', // 확인됨
  COMPLETED = 'completed', // 완료됨
  CANCELLED = 'cancelled', // 취소됨
  RESCHEDULED = 'rescheduled' // 일정 변경됨
}

/**
 * 서비스 유형 열거형
 */
export enum ServiceType {
  REGULAR_MAINTENANCE = 'regular_maintenance', // 정기 유지보수
  REPAIR = 'repair',                           // 수리
  INSPECTION = 'inspection',                   // 검사
  TIRE_CHANGE = 'tire_change',                 // 타이어 교체
  OIL_CHANGE = 'oil_change',                   // 오일 교체
  CUSTOM = 'custom'                            // 사용자 정의
}

/**
 * 예약 인터페이스
 */
export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  shopId: string;
  serviceType: ServiceType;
  additionalServices?: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  estimatedDuration: number; // 분 단위
  estimatedCost: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 예약 생성 인터페이스
 */
export interface CreateBookingRequest {
  customerId: string;
  vehicleId: string;
  shopId: string;
  serviceType: ServiceType;
  additionalServices?: string[];
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
}

/**
 * 예약 업데이트 인터페이스
 */
export interface UpdateBookingRequest {
  id: string;
  serviceType?: ServiceType;
  additionalServices?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  status?: BookingStatus;
  estimatedDuration?: number;
  estimatedCost?: number;
  notes?: string;
}

/**
 * 가용 시간대 인터페이스
 */
export interface TimeSlot {
  time: string;
  available: boolean;
}

/**
 * 예약 필터 인터페이스
 */
export interface BookingFilter {
  customerId?: string;
  vehicleId?: string;
  shopId?: string;
  serviceType?: ServiceType;
  status?: BookingStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * 예약 페이지네이션 결과 인터페이스
 */
export interface BookingPaginationResult {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 예약 서비스 클래스
 */
export class BookingService {
  private apiClient: ApiClient;
  private basePath: string = '/bookings';

  /**
   * 생성자
   * @param apiClient API 클라이언트
   */
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 모든 예약 조회
   * @param filter 예약 필터
   * @returns 예약 페이지네이션 결과
   */
  async getBookings(filter?: BookingFilter): Promise<BookingPaginationResult> {
    try {
      const response = await this.apiClient.get(this.basePath, { params: filter });
      return response.data;
    } catch (error) {
      console.error('예약 목록 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 고객 ID로 예약 조회
   * @param customerId 고객 ID
   * @param filter 추가 필터
   * @returns 예약 페이지네이션 결과
   */
  async getCustomerBookings(customerId: string, filter?: Omit<BookingFilter, 'customerId'>): Promise<BookingPaginationResult> {
    return this.getBookings({ ...filter, customerId });
  }

  /**
   * 차량 ID로 예약 조회
   * @param vehicleId 차량 ID
   * @param filter 추가 필터
   * @returns 예약 페이지네이션 결과
   */
  async getVehicleBookings(vehicleId: string, filter?: Omit<BookingFilter, 'vehicleId'>): Promise<BookingPaginationResult> {
    return this.getBookings({ ...filter, vehicleId });
  }

  /**
   * 정비소 ID로 예약 조회
   * @param shopId 정비소 ID
   * @param filter 추가 필터
   * @returns 예약 페이지네이션 결과
   */
  async getShopBookings(shopId: string, filter?: Omit<BookingFilter, 'shopId'>): Promise<BookingPaginationResult> {
    return this.getBookings({ ...filter, shopId });
  }

  /**
   * 예약 상세 조회
   * @param bookingId 예약 ID
   * @returns 예약 정보
   */
  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const response = await this.apiClient.get(`${this.basePath}/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingId} 조회 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 예약 생성
   * @param bookingData 예약 생성 요청 데이터
   * @returns 생성된 예약 정보
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    try {
      const response = await this.apiClient.post(this.basePath, bookingData);
      return response.data;
    } catch (error) {
      console.error('예약 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 예약 업데이트
   * @param bookingData 예약 업데이트 요청 데이터
   * @returns 업데이트된 예약 정보
   */
  async updateBooking(bookingData: UpdateBookingRequest): Promise<Booking> {
    try {
      const response = await this.apiClient.put(`${this.basePath}/${bookingData.id}`, bookingData);
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingData.id} 업데이트 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 예약 취소
   * @param bookingId 예약 ID
   * @param reason 취소 사유
   * @returns 취소된 예약 정보
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    try {
      const response = await this.apiClient.post(`${this.basePath}/${bookingId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingId} 취소 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 예약 확인
   * @param bookingId 예약 ID
   * @param estimatedDuration 예상 소요 시간(분)
   * @param estimatedCost 예상 비용
   * @returns 확인된 예약 정보
   */
  async confirmBooking(bookingId: string, estimatedDuration: number, estimatedCost: number): Promise<Booking> {
    try {
      const response = await this.apiClient.post(`${this.basePath}/${bookingId}/confirm`, {
        estimatedDuration,
        estimatedCost
      });
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingId} 확인 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 예약 완료 처리
   * @param bookingId 예약 ID
   * @param actualDuration 실제 소요 시간(분)
   * @param actualCost 실제 비용
   * @returns 완료된 예약 정보
   */
  async completeBooking(bookingId: string, actualDuration?: number, actualCost?: number): Promise<Booking> {
    try {
      const response = await this.apiClient.post(`${this.basePath}/${bookingId}/complete`, {
        actualDuration,
        actualCost
      });
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingId} 완료 처리 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 예약 일정 변경
   * @param bookingId 예약 ID
   * @param scheduledDate 새 예약 날짜
   * @param scheduledTime 새 예약 시간
   * @param reason 변경 사유
   * @returns 일정이 변경된 예약 정보
   */
  async rescheduleBooking(bookingId: string, scheduledDate: string, scheduledTime: string, reason?: string): Promise<Booking> {
    try {
      const response = await this.apiClient.post(`${this.basePath}/${bookingId}/reschedule`, {
        scheduledDate,
        scheduledTime,
        reason
      });
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingId} 일정 변경 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 특정 날짜에 정비소의 예약 가능 시간대 조회
   * @param shopId 정비소 ID
   * @param date 날짜
   * @param serviceType 서비스 유형
   * @returns 가용 시간대 목록
   */
  async getAvailableTimeSlots(shopId: string, date: string, serviceType?: ServiceType): Promise<TimeSlot[]> {
    try {
      const response = await this.apiClient.get(`/shops/${shopId}/time-slots`, {
        params: { date, serviceType }
      });
      return response.data;
    } catch (error) {
      console.error(`정비소 ID ${shopId}의 ${date} 가용 시간대 조회 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 가장 빠른 예약 가능 날짜 및 시간 조회
   * @param shopId 정비소 ID
   * @param serviceType 서비스 유형
   * @returns 가장 빠른 예약 가능 날짜 및 시간
   */
  async getEarliestAvailableSlot(shopId: string, serviceType: ServiceType): Promise<{ date: string, time: string }> {
    try {
      const response = await this.apiClient.get(`/shops/${shopId}/earliest-slot`, {
        params: { serviceType }
      });
      return response.data;
    } catch (error) {
      console.error(`정비소 ID ${shopId}의 가장 빠른 예약 가능 시간 조회 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 예약 미리 알림 설정
   * @param bookingId 예약 ID
   * @param reminderTime 알림 시간(분 단위, 예약 시간 이전)
   * @returns 설정된 알림 정보
   */
  async setBookingReminder(bookingId: string, reminderTime: number): Promise<{ bookingId: string, reminderTime: number }> {
    try {
      const response = await this.apiClient.post(`${this.basePath}/${bookingId}/reminder`, { reminderTime });
      return response.data;
    } catch (error) {
      console.error(`예약 ID ${bookingId}의 알림 설정 중 오류 발생:`, error);
      throw error;
    }
  }
} 