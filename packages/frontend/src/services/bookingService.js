import { api } from './api';
import { isValidDate, isValidTime, isFutureDateTime } from '../utils/dateUtils';
/**
 * 예약 상태 열거형
 */
export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["COMPLETED"] = "completed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["RESCHEDULED"] = "rescheduled"; // 일정 변경됨
})(BookingStatus || (BookingStatus = {}));
/**
 * 서비스 유형 열거형
 */
export var ServiceType;
(function (ServiceType) {
    ServiceType["REGULAR_MAINTENANCE"] = "regular_maintenance";
    ServiceType["REPAIR"] = "repair";
    ServiceType["INSPECTION"] = "inspection";
    ServiceType["TIRE_CHANGE"] = "tire_change";
    ServiceType["OIL_CHANGE"] = "oil_change";
    ServiceType["CUSTOM"] = "custom"; // 사용자 정의
})(ServiceType || (ServiceType = {}));
/**
 * 기본 페이지네이션 결과 객체
 */
const defaultPaginationResult = {
    bookings: [],
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false
};
/**
 * 예약 서비스 객체
 */
export const bookingService = {
    /**
     * 모든 예약 조회
     * @param filter 예약 필터
     * @returns 예약 페이지네이션 결과
     */
    async getBookings(filter) {
        try {
            const response = await api.get('/bookings', { params: filter });
            return response.data || defaultPaginationResult;
        }
        catch (error) {
            console.error('[bookingService] 예약 목록 조회 중 오류 발생:', error);
            return { ...defaultPaginationResult };
        }
    },
    /**
     * 고객 ID로 예약 조회
     * @param customerId 고객 ID
     * @param filter 추가 필터
     * @returns 예약 페이지네이션 결과
     */
    async getCustomerBookings(customerId, filter) {
        if (!customerId) {
            console.error('[bookingService] 고객 ID가 제공되지 않았습니다.');
            return { ...defaultPaginationResult };
        }
        try {
            return await this.getBookings({ ...filter, customerId });
        }
        catch (error) {
            console.error(`[bookingService] 고객 ID ${customerId} 예약 조회 중 오류 발생:`, error);
            return { ...defaultPaginationResult };
        }
    },
    /**
     * 차량 ID로 예약 조회
     * @param vehicleId 차량 ID
     * @param filter 추가 필터
     * @returns 예약 페이지네이션 결과
     */
    async getVehicleBookings(vehicleId, filter) {
        if (!vehicleId) {
            console.error('[bookingService] 차량 ID가 제공되지 않았습니다.');
            return { ...defaultPaginationResult };
        }
        try {
            return await this.getBookings({ ...filter, vehicleId });
        }
        catch (error) {
            console.error(`[bookingService] 차량 ID ${vehicleId} 예약 조회 중 오류 발생:`, error);
            return { ...defaultPaginationResult };
        }
    },
    /**
     * 정비소 ID로 예약 조회
     * @param shopId 정비소 ID
     * @param filter 추가 필터
     * @returns 예약 페이지네이션 결과
     */
    async getShopBookings(shopId, filter) {
        if (!shopId) {
            console.error('[bookingService] 정비소 ID가 제공되지 않았습니다.');
            return { ...defaultPaginationResult };
        }
        try {
            return await this.getBookings({ ...filter, shopId });
        }
        catch (error) {
            console.error(`[bookingService] 정비소 ID ${shopId} 예약 조회 중 오류 발생:`, error);
            return { ...defaultPaginationResult };
        }
    },
    /**
     * 예약 상세 조회
     * @param bookingId 예약 ID
     * @returns 예약 정보
     */
    async getBookingById(bookingId) {
        if (!bookingId) {
            console.error('[bookingService] 예약 ID가 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.get(`/bookings/${bookingId}`);
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId} 조회 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 예약 생성
     * @param bookingData 예약 생성 요청 데이터
     * @returns 생성된 예약 정보
     */
    async createBooking(bookingData) {
        if (!bookingData || !bookingData.shopId || !bookingData.customerId || !bookingData.vehicleId) {
            console.error('[bookingService] 필수 예약 데이터가 제공되지 않았습니다.');
            return null;
        }
        // 날짜 형식 검증
        if (!isValidDate(bookingData.scheduledDate)) {
            console.error('[bookingService] 유효하지 않은 날짜 형식입니다.');
            return null;
        }
        // 시간 형식 검증
        if (!isValidTime(bookingData.scheduledTime)) {
            console.error('[bookingService] 유효하지 않은 시간 형식입니다.');
            return null;
        }
        // 미래 시간 검증 (현재로부터 30분 이후)
        if (!isFutureDateTime(bookingData.scheduledDate, bookingData.scheduledTime, 30)) {
            console.error('[bookingService] 예약은 현재 시간으로부터 최소 30분 후부터 가능합니다.');
            return null;
        }
        try {
            const response = await api.post('/bookings', bookingData);
            return response.data || null;
        }
        catch (error) {
            console.error('[bookingService] 예약 생성 중 오류 발생:', error);
            return null;
        }
    },
    /**
     * 예약 업데이트
     * @param bookingData 예약 업데이트 요청 데이터
     * @returns 업데이트된 예약 정보
     */
    async updateBooking(bookingData) {
        if (!bookingData || !bookingData.id) {
            console.error('[bookingService] 유효하지 않은 예약 업데이트 데이터입니다.');
            return null;
        }
        // 날짜 형식 검증 (날짜가 제공된 경우에만)
        if (bookingData.scheduledDate && !isValidDate(bookingData.scheduledDate)) {
            console.error('[bookingService] 유효하지 않은 날짜 형식입니다.');
            return null;
        }
        // 시간 형식 검증 (시간이 제공된 경우에만)
        if (bookingData.scheduledTime && !isValidTime(bookingData.scheduledTime)) {
            console.error('[bookingService] 유효하지 않은 시간 형식입니다.');
            return null;
        }
        // 미래 시간 검증 (날짜와 시간이 모두 제공된 경우에만)
        if (bookingData.scheduledDate &&
            bookingData.scheduledTime &&
            !isFutureDateTime(bookingData.scheduledDate, bookingData.scheduledTime, 30)) {
            console.error('[bookingService] 예약은 현재 시간으로부터 최소 30분 후부터 가능합니다.');
            return null;
        }
        try {
            const response = await api.put(`/bookings/${bookingData.id}`, bookingData);
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingData.id} 업데이트 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 예약 취소
     * @param bookingId 예약 ID
     * @param reason 취소 사유 (선택)
     * @returns 취소된 예약 정보
     */
    async cancelBooking(bookingId, reason) {
        if (!bookingId) {
            console.error('[bookingService] 예약 ID가 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId} 취소 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 예약 확인
     * @param bookingId 예약 ID
     * @param estimatedDuration 예상 소요 시간 (분)
     * @param estimatedCost 예상 비용
     * @returns 확인된 예약 정보
     */
    async confirmBooking(bookingId, estimatedDuration, estimatedCost) {
        if (!bookingId) {
            console.error('[bookingService] 예약 ID가 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.post(`/bookings/${bookingId}/confirm`, {
                estimatedDuration,
                estimatedCost
            });
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId} 확인 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 예약 완료 처리
     * @param bookingId 예약 ID
     * @param actualDuration 실제 소요 시간 (분)
     * @param actualCost 실제 비용
     * @returns 완료된 예약 정보
     */
    async completeBooking(bookingId, actualDuration, actualCost) {
        if (!bookingId) {
            console.error('[bookingService] 예약 ID가 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.post(`/bookings/${bookingId}/complete`, {
                actualDuration,
                actualCost
            });
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId} 완료 처리 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 예약 일정 변경
     * @param bookingId 예약 ID
     * @param scheduledDate 새 예약 날짜
     * @param scheduledTime 새 예약 시간
     * @param reason 변경 사유 (선택)
     * @returns 일정 변경된 예약 정보
     */
    async rescheduleBooking(bookingId, scheduledDate, scheduledTime, reason) {
        if (!bookingId || !scheduledDate || !scheduledTime) {
            console.error('[bookingService] 예약 ID 또는 일정 데이터가 제공되지 않았습니다.');
            return null;
        }
        // 날짜 형식 검증
        if (!isValidDate(scheduledDate)) {
            console.error('[bookingService] 유효하지 않은 날짜 형식입니다.');
            return null;
        }
        // 시간 형식 검증
        if (!isValidTime(scheduledTime)) {
            console.error('[bookingService] 유효하지 않은 시간 형식입니다.');
            return null;
        }
        // 미래 시간 검증 (현재로부터 30분 이후)
        if (!isFutureDateTime(scheduledDate, scheduledTime, 30)) {
            console.error('[bookingService] 예약은 현재 시간으로부터 최소 30분 후부터 가능합니다.');
            return null;
        }
        try {
            const response = await api.post(`/bookings/${bookingId}/reschedule`, {
                scheduledDate,
                scheduledTime,
                reason
            });
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId} 일정 변경 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 특정 날짜 및 서비스 유형에 대한 가용 시간대 조회
     * @param shopId 정비소 ID
     * @param date 날짜 (YYYY-MM-DD)
     * @param serviceType 서비스 유형
     * @returns 가용 시간대 목록
     */
    async getAvailableTimeSlots(shopId, date, serviceType) {
        if (!shopId || !date) {
            console.error('[bookingService] 정비소 ID 또는 날짜가 제공되지 않았습니다.');
            return [];
        }
        try {
            const response = await api.get('/bookings/available-time-slots', {
                params: {
                    shopId,
                    date,
                    serviceType
                }
            });
            return response.data || [];
        }
        catch (error) {
            console.error('[bookingService] 가용 시간대 조회 중 오류 발생:', error);
            return [];
        }
    },
    /**
     * 예약 통계 조회
     * @param filter 예약 필터
     * @returns 예약 통계 정보
     */
    async getBookingStats(filter) {
        try {
            const response = await api.get('/bookings/stats', { params: filter });
            return response.data || null;
        }
        catch (error) {
            console.error('[bookingService] 예약 통계 조회 중 오류 발생:', error);
            return null;
        }
    },
    /**
     * 특정 기간의 예약 달력 조회
     * @param shopId 정비소 ID
     * @param startDate 시작일
     * @param endDate 종료일
     * @returns 기간별 예약 정보
     */
    async getBookingCalendar(shopId, startDate, endDate) {
        if (!shopId || !startDate || !endDate) {
            console.error('[bookingService] 정비소 ID 또는 날짜 범위가 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.get('/bookings/calendar', {
                params: {
                    shopId,
                    startDate,
                    endDate
                }
            });
            return response.data || {};
        }
        catch (error) {
            console.error('[bookingService] 예약 달력 조회 중 오류 발생:', error);
            return {};
        }
    },
    /**
     * 예약 내역 조회 (히스토리)
     * @param bookingId 예약 ID
     * @returns 예약 히스토리 정보
     */
    async getBookingHistory(bookingId) {
        if (!bookingId) {
            console.error('[bookingService] 예약 ID가 제공되지 않았습니다.');
            return [];
        }
        try {
            const response = await api.get(`/bookings/${bookingId}/history`);
            return response.data || [];
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId} 히스토리 조회 중 오류 발생:`, error);
            return [];
        }
    },
    /**
     * 가장 빠른 예약 가능 시간대 조회
     * @param shopId 정비소 ID
     * @param serviceType 서비스 유형
     * @returns 가장 빠른 가용 날짜 및 시간
     */
    async getEarliestAvailableSlot(shopId, serviceType) {
        if (!shopId) {
            console.error('[bookingService] 정비소 ID가 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.get(`/shops/${shopId}/earliest-slot`, {
                params: { serviceType }
            });
            return response.data && response.data.date && response.data.time ? response.data : null;
        }
        catch (error) {
            console.error(`[bookingService] 정비소 ID ${shopId}의 가장 빠른 예약 가능 시간 조회 중 오류 발생:`, error);
            return null;
        }
    },
    /**
     * 예약 알림 설정
     * @param bookingId 예약 ID
     * @param reminderTime 알림 시간 (예약 시간 기준 분 단위 이전 시간)
     * @returns 알림 설정 정보
     */
    async setBookingReminder(bookingId, reminderTime) {
        if (!bookingId || reminderTime === undefined) {
            console.error('[bookingService] 예약 ID 또는 알림 시간이 제공되지 않았습니다.');
            return null;
        }
        try {
            const response = await api.post(`/bookings/${bookingId}/reminder`, { reminderTime });
            return response.data || null;
        }
        catch (error) {
            console.error(`[bookingService] 예약 ID ${bookingId}의 알림 설정 중 오류 발생:`, error);
            return null;
        }
    }
};
