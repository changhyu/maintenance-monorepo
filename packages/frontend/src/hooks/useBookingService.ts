import { useState } from 'react';

import {
  bookingService,
  Booking,
  BookingFilter,
  BookingPaginationResult,
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingStatus,
  ServiceType,
  TimeSlot
} from '../services/bookingService';
import { isValidDate, isValidTime, isFutureDateTime } from '../utils/dateUtils';

interface UseBookingServiceResult {
  // 상태
  bookings: Booking[];
  selectedBooking: Booking | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };

  // 액션
  getBookings: (filter?: BookingFilter) => Promise<BookingPaginationResult>;
  getBookingById: (id: string) => Promise<Booking | null>;
  getCustomerBookings: (
    customerId: string,
    filter?: Omit<BookingFilter, 'customerId'>
  ) => Promise<BookingPaginationResult>;
  createBooking: (bookingData: CreateBookingRequest) => Promise<Booking | null>;
  updateBooking: (bookingData: UpdateBookingRequest) => Promise<Booking | null>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<Booking | null>;
  getAvailableTimeSlots: (
    shopId: string,
    date: string,
    serviceType: ServiceType
  ) => Promise<TimeSlot[]>;
  setSelectedBooking: (booking: Booking | null) => void;
}

export const useBookingService = (): UseBookingServiceResult => {
  // 상태 관리
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false
  });

  // 기본 결과 객체
  const defaultPaginationResult: BookingPaginationResult = {
    bookings: [],
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false
  };

  // 모든 예약 조회
  const getBookings = async (filter?: BookingFilter): Promise<BookingPaginationResult> => {
    try {
      setLoading(true);
      setError(null);

      const result = await bookingService.getBookings(filter);

      if (!result) {
        return defaultPaginationResult;
      }

      setBookings(result.bookings);
      setPagination({
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore
      });

      return result;
    } catch (err) {
      const errorMessage = '예약 목록을 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error(errorMessage, err);

      // 상태 업데이트
      setBookings([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      });

      return defaultPaginationResult;
    } finally {
      setLoading(false);
    }
  };

  // 예약 ID로 예약 조회
  const getBookingById = async (id: string): Promise<Booking | null> => {
    if (!id) {
      const errorMessage = '예약 ID가 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const booking = await bookingService.getBookingById(id);

      if (booking) {
        setSelectedBooking(booking);
      } else {
        // 예약이 없을 경우에도 처리
        setSelectedBooking(null);
      }

      return booking;
    } catch (err) {
      const errorMessage = `예약 정보(ID: ${id})를 불러오는 중 오류가 발생했습니다.`;
      setError(errorMessage);
      console.error(errorMessage, err);

      // 에러 발생 시 선택된 예약 초기화
      setSelectedBooking(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 고객 ID로 예약 조회
  const getCustomerBookings = async (
    customerId: string,
    filter?: Omit<BookingFilter, 'customerId'>
  ): Promise<BookingPaginationResult> => {
    if (!customerId) {
      const errorMessage = '고객 ID가 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return defaultPaginationResult;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await bookingService.getCustomerBookings(customerId, filter);

      if (!result) {
        return defaultPaginationResult;
      }

      setBookings(result.bookings);
      setPagination({
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore
      });

      return result;
    } catch (err) {
      const errorMessage = `고객(ID: ${customerId})의 예약 목록을 불러오는 중 오류가 발생했습니다.`;
      setError(errorMessage);
      console.error(errorMessage, err);

      // 상태 업데이트
      setBookings([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      });

      return defaultPaginationResult;
    } finally {
      setLoading(false);
    }
  };

  // 예약 생성
  const createBooking = async (bookingData: CreateBookingRequest): Promise<Booking | null> => {
    if (!bookingData) {
      const errorMessage = '예약 데이터가 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    // 날짜 유효성 검사
    if (!bookingData.scheduledDate || !isValidDate(bookingData.scheduledDate)) {
      const errorMessage = '유효하지 않은 예약 날짜입니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    // 시간 유효성 검사
    if (!bookingData.scheduledTime || !isValidTime(bookingData.scheduledTime)) {
      const errorMessage = '유효하지 않은 예약 시간입니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    // 미래 시간 검사
    if (!isFutureDateTime(bookingData.scheduledDate, bookingData.scheduledTime, 30)) {
      const errorMessage = '예약은 현재 시간으로부터 최소 30분 후부터 가능합니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const newBooking = await bookingService.createBooking(bookingData);

      if (newBooking) {
        setBookings(prev => [newBooking, ...prev]);
        setSelectedBooking(newBooking);
      }

      return newBooking;
    } catch (err) {
      const errorMessage = '예약을 생성하는 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error(errorMessage, err);

      // 상태 변경 없음 - 실패한 생성 작업이므로 기존 상태 유지
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 예약 업데이트
  const updateBooking = async (bookingData: UpdateBookingRequest): Promise<Booking | null> => {
    if (!bookingData || !bookingData.id) {
      const errorMessage = '예약 데이터가 올바르지 않습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    // 날짜 유효성 검사
    if (bookingData.scheduledDate && !isValidDate(bookingData.scheduledDate)) {
      const errorMessage = '유효하지 않은 예약 날짜입니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    // 시간 유효성 검사
    if (bookingData.scheduledTime && !isValidTime(bookingData.scheduledTime)) {
      const errorMessage = '유효하지 않은 예약 시간입니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    // 미래 시간 검사 (날짜와 시간이 모두 있는 경우에만)
    if (
      bookingData.scheduledDate &&
      bookingData.scheduledTime &&
      !isFutureDateTime(bookingData.scheduledDate, bookingData.scheduledTime, 30)
    ) {
      const errorMessage = '예약은 현재 시간으로부터 최소 30분 후부터 가능합니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedBooking = await bookingService.updateBooking(bookingData);

      if (updatedBooking) {
        setBookings(prev =>
          prev.map(booking => (booking.id === updatedBooking.id ? updatedBooking : booking))
        );

        if (selectedBooking?.id === updatedBooking.id) {
          setSelectedBooking(updatedBooking);
        }
      }

      return updatedBooking;
    } catch (err) {
      const errorMessage = `예약(ID: ${bookingData.id})을 업데이트하는 중 오류가 발생했습니다.`;
      setError(errorMessage);
      console.error(errorMessage, err);

      // 기존 예약 데이터 유지, 실패한 업데이트는 변경사항을 적용하지 않음
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 예약 취소
  const cancelBooking = async (bookingId: string, reason?: string): Promise<Booking | null> => {
    if (!bookingId) {
      const errorMessage = '예약 ID가 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const cancelledBooking = await bookingService.cancelBooking(bookingId, reason);

      if (cancelledBooking) {
        setBookings(prev =>
          prev.map(booking => (booking.id === cancelledBooking.id ? cancelledBooking : booking))
        );

        if (selectedBooking?.id === cancelledBooking.id) {
          setSelectedBooking(cancelledBooking);
        }
      }

      return cancelledBooking;
    } catch (err) {
      const errorMessage = `예약(ID: ${bookingId})을 취소하는 중 오류가 발생했습니다.`;
      setError(errorMessage);
      console.error(errorMessage, err);

      // 상태 변경 없음 - 취소 실패 시 기존 상태 유지
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 가용 시간대 조회
  const getAvailableTimeSlots = async (
    shopId: string,
    date: string,
    serviceType: ServiceType
  ): Promise<TimeSlot[]> => {
    if (!shopId) {
      const errorMessage = '매장 ID가 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    }

    if (!date) {
      const errorMessage = '날짜가 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    }

    // 날짜 유효성 검사
    if (!isValidDate(date)) {
      const errorMessage = '유효하지 않은 날짜 형식입니다. (YYYY-MM-DD 형식이어야 합니다)';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    }

    // 과거 날짜 검사 - 어제까지의 날짜는 조회 불가
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < yesterday) {
      const errorMessage = '과거 날짜에 대한 시간대는 조회할 수 없습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    }

    // 너무 먼 미래 날짜 검사 (3개월 이후)
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    if (selectedDate > threeMonthsLater) {
      const errorMessage = '3개월 이후의 날짜는 조회할 수 없습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    }

    if (!serviceType) {
      const errorMessage = '서비스 유형이 제공되지 않았습니다.';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      const timeSlots = await bookingService.getAvailableTimeSlots(shopId, date, serviceType);
      return timeSlots || [];
    } catch (err) {
      const errorMessage = '가용 시간대를 조회하는 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error(errorMessage, err);

      // 빈 배열 반환
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    // 상태
    bookings,
    selectedBooking,
    loading,
    error,
    pagination,

    // 액션
    getBookings,
    getBookingById,
    getCustomerBookings,
    createBooking,
    updateBooking,
    cancelBooking,
    getAvailableTimeSlots,
    setSelectedBooking
  };
};
