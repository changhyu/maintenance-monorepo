export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["VIRTUAL_ACCOUNT"] = "VIRTUAL_ACCOUNT";
    PaymentMethod["MOBILE_PAYMENT"] = "MOBILE_PAYMENT";
    PaymentMethod["POINT"] = "POINT";
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["PARTIALLY_REFUNDED"] = "PARTIALLY_REFUNDED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
})(PaymentStatus || (PaymentStatus = {}));
export var PaymentType;
(function (PaymentType) {
    PaymentType["MAINTENANCE"] = "MAINTENANCE";
    PaymentType["SUBSCRIPTION"] = "SUBSCRIPTION";
    PaymentType["PRODUCT"] = "PRODUCT";
    PaymentType["SERVICE"] = "SERVICE";
    PaymentType["DEPOSIT"] = "DEPOSIT";
    PaymentType["OTHER"] = "OTHER";
})(PaymentType || (PaymentType = {}));
export class PaymentService {
    constructor(apiClient) {
        this.basePath = '/payments';
        this.invoicesPath = '/invoices';
        this.paymentMethodsPath = '/payment-methods';
        this.client = apiClient;
    }
    // 결제 관련 API
    // 결제 생성
    async createPayment(request) {
        return this.client.post(this.basePath, request);
    }
    // 결제 처리 (승인)
    async processPayment(request) {
        return this.client.post(`${this.basePath}/${request.paymentId}/process`, request);
    }
    // 결제 취소
    async cancelPayment(paymentId, reason) {
        return this.client.post(`${this.basePath}/${paymentId}/cancel`, { reason });
    }
    // 결제 환불
    async refundPayment(request) {
        return this.client.post(`${this.basePath}/${request.paymentId}/refund`, request);
    }
    // 결제 정보 조회
    async getPayment(paymentId) {
        return this.client.get(`${this.basePath}/${paymentId}`);
    }
    // 결제 목록 조회
    async getPayments(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 사용자별 결제 목록 조회
    async getUserPayments(userId, filter) {
        return this.client.get(`/users/${userId}/payments`, { params: filter });
    }
    // 정비 기록별 결제 목록 조회
    async getMaintenancePayments(maintenanceId) {
        return this.client.get(`/maintenance/${maintenanceId}/payments`);
    }
    // 결제 영수증 다운로드
    async downloadReceipt(paymentId, format = 'pdf') {
        if (format === 'pdf') {
            return this.client.get(`${this.basePath}/${paymentId}/receipt`, {
                responseType: 'blob'
            });
        }
        else {
            return this.client.get(`${this.basePath}/${paymentId}/receipt`);
        }
    }
    // 결제 방법 관련 API
    // 결제 방법 생성
    async createPaymentMethod(request) {
        return this.client.post(this.paymentMethodsPath, request);
    }
    // 결제 방법 업데이트
    async updatePaymentMethod(methodId, request) {
        return this.client.put(`${this.paymentMethodsPath}/${methodId}`, request);
    }
    // 결제 방법 삭제
    async deletePaymentMethod(methodId) {
        return this.client.delete(`${this.paymentMethodsPath}/${methodId}`);
    }
    // 결제 방법 목록 조회
    async getPaymentMethods() {
        return this.client.get(this.paymentMethodsPath);
    }
    // 특정 결제 방법 조회
    async getPaymentMethod(methodId) {
        return this.client.get(`${this.paymentMethodsPath}/${methodId}`);
    }
    // 기본 결제 방법 설정
    async setDefaultPaymentMethod(methodId) {
        return this.client.post(`${this.paymentMethodsPath}/${methodId}/set-default`, {});
    }
    // 인보이스 관련 API
    // 인보이스 생성
    async createInvoice(request) {
        return this.client.post(this.invoicesPath, request);
    }
    // 인보이스 조회
    async getInvoice(invoiceId) {
        return this.client.get(`${this.invoicesPath}/${invoiceId}`);
    }
    // 인보이스 목록 조회
    async getInvoices(filter) {
        return this.client.get(this.invoicesPath, { params: filter });
    }
    // 인보이스 업데이트
    async updateInvoice(invoiceId, request) {
        return this.client.put(`${this.invoicesPath}/${invoiceId}`, request);
    }
    // 인보이스 발행
    async issueInvoice(invoiceId) {
        return this.client.post(`${this.invoicesPath}/${invoiceId}/issue`, {});
    }
    // 인보이스 취소
    async voidInvoice(invoiceId, reason) {
        return this.client.post(`${this.invoicesPath}/${invoiceId}/void`, { reason });
    }
    // 인보이스로 결제 생성
    async payInvoice(invoiceId, paymentMethodId) {
        return this.client.post(`${this.invoicesPath}/${invoiceId}/pay`, { paymentMethodId });
    }
    // 인보이스 다운로드
    async downloadInvoice(invoiceId, format = 'pdf') {
        if (format === 'pdf') {
            return this.client.get(`${this.invoicesPath}/${invoiceId}/download`, {
                responseType: 'blob'
            });
        }
        else {
            return this.client.get(`${this.invoicesPath}/${invoiceId}`);
        }
    }
    // 인보이스 이메일 발송
    async sendInvoiceEmail(invoiceId, email) {
        return this.client.post(`${this.invoicesPath}/${invoiceId}/send`, { email });
    }
    // 정비 기록에 대한 인보이스 생성
    async createMaintenanceInvoice(maintenanceId) {
        return this.client.post(`/maintenance/${maintenanceId}/invoices`, {});
    }
    // 결제 통계 조회
    async getPaymentStats(filter) {
        return this.client.get(`${this.basePath}/stats`, { params: filter });
    }
}
