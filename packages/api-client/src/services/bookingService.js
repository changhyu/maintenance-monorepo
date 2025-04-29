export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "PENDING";
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["CANCELLED"] = "CANCELLED";
    BookingStatus["COMPLETED"] = "COMPLETED";
    BookingStatus["NO_SHOW"] = "NO_SHOW";
})(BookingStatus || (BookingStatus = {}));
export var BookingTimeSlotStatus;
(function (BookingTimeSlotStatus) {
    BookingTimeSlotStatus["AVAILABLE"] = "AVAILABLE";
    BookingTimeSlotStatus["PARTIALLY_BOOKED"] = "PARTIALLY_BOOKED";
    BookingTimeSlotStatus["FULLY_BOOKED"] = "FULLY_BOOKED";
    BookingTimeSlotStatus["UNAVAILABLE"] = "UNAVAILABLE";
})(BookingTimeSlotStatus || (BookingTimeSlotStatus = {}));
export class BookingService {
    constructor(apiClient) {
        this.basePath = '/bookings';
        this.client = apiClient;
    }
    // 예약 목록 조회
    async getBookings(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 특정 예약 조회
    async getBookingById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 예약 생성
    async createBooking(bookingData) {
        return this.client.post(this.basePath, bookingData);
    }
    // 예약 업데이트
    async updateBooking(id, bookingData) {
        return this.client.put(`${this.basePath}/${id}`, bookingData);
    }
    // 예약 취소
    async cancelBooking(id, cancellationData) {
        return this.client.post(`${this.basePath}/${id}/cancel`, cancellationData);
    }
    // 예약 완료 처리
    async completeBooking(id, completionData) {
        return this.client.post(`${this.basePath}/${id}/complete`, completionData || {});
    }
    // 예약 노쇼 처리
    async markBookingAsNoShow(id) {
        return this.client.post(`${this.basePath}/${id}/no-show`, {});
    }
    // 특정 사용자의 예약 목록 조회
    async getUserBookings(userId, filter) {
        return this.client.get(`/users/${userId}/bookings`, { params: filter });
    }
    // 특정 차량의 예약 목록 조회
    async getVehicleBookings(vehicleId, filter) {
        return this.client.get(`/vehicles/${vehicleId}/bookings`, { params: filter });
    }
    // 특정 정비소의 예약 목록 조회
    async getShopBookings(shopId, filter) {
        return this.client.get(`/shops/${shopId}/bookings`, { params: filter });
    }
    // 타임슬롯 목록 조회
    async getTimeSlots(filter) {
        return this.client.get(`${this.basePath}/time-slots`, { params: filter });
    }
    // 특정 정비소의 타임슬롯 조회
    async getShopTimeSlots(shopId, filter) {
        return this.client.get(`/shops/${shopId}/time-slots`, { params: filter });
    }
    // 타임슬롯 생성
    async createTimeSlot(timeSlotData) {
        return this.client.post(`${this.basePath}/time-slots`, timeSlotData);
    }
    // 타임슬롯 업데이트
    async updateTimeSlot(id, timeSlotData) {
        return this.client.put(`${this.basePath}/time-slots/${id}`, timeSlotData);
    }
    // 타임슬롯 삭제
    async deleteTimeSlot(id) {
        return this.client.delete(`${this.basePath}/time-slots/${id}`);
    }
    // 타임슬롯 활성화/비활성화
    async toggleTimeSlotActive(id, isActive) {
        return this.client.patch(`${this.basePath}/time-slots/${id}/status`, { isActive });
    }
    // 정비 서비스 목록 조회
    async getMaintenanceServices(filter) {
        return this.client.get(`${this.basePath}/services`, { params: filter });
    }
    // 특정 정비소의 정비 서비스 조회
    async getShopServices(shopId, filter) {
        return this.client.get(`/shops/${shopId}/services`, { params: filter });
    }
    // 정비 서비스 생성
    async createMaintenanceService(serviceData) {
        return this.client.post(`${this.basePath}/services`, serviceData);
    }
    // 정비 서비스 업데이트
    async updateMaintenanceService(id, serviceData) {
        return this.client.put(`${this.basePath}/services/${id}`, serviceData);
    }
    // 정비 서비스 삭제
    async deleteMaintenanceService(id) {
        return this.client.delete(`${this.basePath}/services/${id}`);
    }
    // 정비 서비스 활성화/비활성화
    async toggleMaintenanceServiceActive(id, isActive) {
        return this.client.patch(`${this.basePath}/services/${id}/status`, { isActive });
    }
    // 가용한 타임슬롯 조회
    async getAvailableTimeSlots(shopId, date, servicesIds) {
        return this.client.get(`/shops/${shopId}/available-time-slots`, {
            params: { date, servicesIds: servicesIds ? servicesIds.join(',') : undefined }
        });
    }
    // 예약 일정 중복 확인
    async checkBookingConflicts(vehicleId, date, timeSlotId) {
        return this.client.get(`${this.basePath}/check-conflicts`, { params: { vehicleId, date, timeSlotId } });
    }
}
