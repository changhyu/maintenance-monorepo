import { ApiClient } from '../client';

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  MOBILE_PAYMENT = 'MOBILE_PAYMENT',
  POINT = 'POINT',
  CASH = 'CASH',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentType {
  MAINTENANCE = 'MAINTENANCE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  DEPOSIT = 'DEPOSIT',
  OTHER = 'OTHER'
}

export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  // 카드 정보
  cardInfo?: {
    last4Digits: string;
    brand: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
  };
  // 은행 계좌 정보
  bankInfo?: {
    bankName: string;
    accountLastDigits: string;
    accountHolderName: string;
  };
  // 모바일 결제 정보
  mobilePaymentInfo?: {
    provider: string;
    phoneNumber: string;
  };
  // 메타데이터
  metadata?: Record<string, any>;
}

export interface PaymentReceipt {
  id: string;
  paymentId: string;
  receiptUrl: string;
  receiptNumber: string;
  issueDate: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  businessInfo: {
    name: string;
    registrationNumber: string;
    address: string;
    phoneNumber: string;
    email?: string;
  };
  customerInfo: {
    name: string;
    id?: string;
    email?: string;
    phoneNumber?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
    taxAmount: number;
  }>;
  additionalInfo?: Record<string, any>;
}

export interface PaymentDetails {
  id: string;
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  description?: string;
  reference?: string;
  invoiceId?: string;
  maintenanceId?: string;
  shopId?: string;
  vehicleId?: string;
  paymentMethodId: string;
  paymentMethodInfo: PaymentMethodInfo;
  transactionId?: string;
  transactionFee?: number;
  refundedAmount?: number;
  metadata?: Record<string, any>;
  receipt?: PaymentReceipt;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
}

export interface CreatePaymentRequest {
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paymentMethodId: string;
  description?: string;
  reference?: string;
  invoiceId?: string;
  maintenanceId?: string;
  shopId?: string;
  vehicleId?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentRequest {
  paymentId: string;
  confirmationDetails?: Record<string, any>;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // 미지정 시 전액 환불
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  success: boolean;
  paymentId: string;
  refundId: string;
  amount: number;
  status: PaymentStatus;
  refundedAt: string;
}

export interface PaymentFilter {
  userId?: string;
  status?: PaymentStatus | PaymentStatus[];
  type?: PaymentType | PaymentType[];
  method?: PaymentMethod | PaymentMethod[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  reference?: string;
  maintenanceId?: string;
  vehicleId?: string;
  shopId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePaymentMethodRequest {
  type: PaymentMethod;
  isDefault?: boolean;
  cardInfo?: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  };
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    routingNumber?: string;
  };
  mobilePaymentInfo?: {
    provider: string;
    phoneNumber: string;
    token?: string;
  };
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodRequest {
  isDefault?: boolean;
  cardInfo?: {
    expiryMonth?: string;
    expiryYear?: string;
    cardholderName?: string;
  };
  bankInfo?: {
    accountHolderName?: string;
  };
  metadata?: Record<string, any>;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
}

export interface Invoice {
  id: string;
  userId: string;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  businessInfo: {
    name: string;
    registrationNumber: string;
    address: string;
    phone: string;
    email?: string;
  };
  items: InvoiceItem[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
  dueDate: string;
  issueDate: string;
  paidDate?: string;
  paymentId?: string;
  maintenanceId?: string;
  vehicleId?: string;
  shopId?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  userId: string;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountAmount?: number;
  }>;
  currency: string;
  dueDate: string;
  issueDate?: string;
  maintenanceId?: string;
  vehicleId?: string;
  shopId?: string;
  notes?: string;
  terms?: string;
}

export interface UpdateInvoiceRequest {
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountAmount?: number;
  }>;
  currency?: string;
  dueDate?: string;
  issueDate?: string;
  notes?: string;
  terms?: string;
}

export class PaymentService {
  private client: ApiClient;
  private basePath = '/payments';
  private invoicesPath = '/invoices';
  private paymentMethodsPath = '/payment-methods';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 결제 관련 API
  
  // 결제 생성
  async createPayment(request: CreatePaymentRequest): Promise<PaymentDetails> {
    return this.client.post<PaymentDetails>(this.basePath, request);
  }

  // 결제 처리 (승인)
  async processPayment(request: ProcessPaymentRequest): Promise<PaymentDetails> {
    return this.client.post<PaymentDetails>(`${this.basePath}/${request.paymentId}/process`, request);
  }

  // 결제 취소
  async cancelPayment(paymentId: string, reason?: string): Promise<PaymentDetails> {
    return this.client.post<PaymentDetails>(`${this.basePath}/${paymentId}/cancel`, { reason });
  }

  // 결제 환불
  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    return this.client.post<RefundResponse>(`${this.basePath}/${request.paymentId}/refund`, request);
  }

  // 결제 정보 조회
  async getPayment(paymentId: string): Promise<PaymentDetails> {
    return this.client.get<PaymentDetails>(`${this.basePath}/${paymentId}`);
  }

  // 결제 목록 조회
  async getPayments(filter?: PaymentFilter): Promise<PaymentDetails[]> {
    return this.client.get<PaymentDetails[]>(this.basePath, { params: filter });
  }

  // 사용자별 결제 목록 조회
  async getUserPayments(userId: string, filter?: Omit<PaymentFilter, 'userId'>): Promise<PaymentDetails[]> {
    return this.client.get<PaymentDetails[]>(`/users/${userId}/payments`, { params: filter });
  }

  // 정비 기록별 결제 목록 조회
  async getMaintenancePayments(maintenanceId: string): Promise<PaymentDetails[]> {
    return this.client.get<PaymentDetails[]>(`/maintenance/${maintenanceId}/payments`);
  }

  // 결제 영수증 다운로드
  async downloadReceipt(paymentId: string, format: 'pdf' | 'json' = 'pdf'): Promise<Blob | PaymentReceipt> {
    if (format === 'pdf') {
      return this.client.get<Blob>(`${this.basePath}/${paymentId}/receipt`, { 
        responseType: 'blob' 
      });
    } else {
      return this.client.get<PaymentReceipt>(`${this.basePath}/${paymentId}/receipt`);
    }
  }

  // 결제 방법 관련 API
  
  // 결제 방법 생성
  async createPaymentMethod(request: CreatePaymentMethodRequest): Promise<PaymentMethodInfo> {
    return this.client.post<PaymentMethodInfo>(this.paymentMethodsPath, request);
  }

  // 결제 방법 업데이트
  async updatePaymentMethod(methodId: string, request: UpdatePaymentMethodRequest): Promise<PaymentMethodInfo> {
    return this.client.put<PaymentMethodInfo>(`${this.paymentMethodsPath}/${methodId}`, request);
  }

  // 결제 방법 삭제
  async deletePaymentMethod(methodId: string): Promise<void> {
    return this.client.delete(`${this.paymentMethodsPath}/${methodId}`);
  }

  // 결제 방법 목록 조회
  async getPaymentMethods(): Promise<PaymentMethodInfo[]> {
    return this.client.get<PaymentMethodInfo[]>(this.paymentMethodsPath);
  }

  // 특정 결제 방법 조회
  async getPaymentMethod(methodId: string): Promise<PaymentMethodInfo> {
    return this.client.get<PaymentMethodInfo>(`${this.paymentMethodsPath}/${methodId}`);
  }

  // 기본 결제 방법 설정
  async setDefaultPaymentMethod(methodId: string): Promise<PaymentMethodInfo> {
    return this.client.post<PaymentMethodInfo>(`${this.paymentMethodsPath}/${methodId}/set-default`, {});
  }

  // 인보이스 관련 API
  
  // 인보이스 생성
  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    return this.client.post<Invoice>(this.invoicesPath, request);
  }

  // 인보이스 조회
  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.client.get<Invoice>(`${this.invoicesPath}/${invoiceId}`);
  }

  // 인보이스 목록 조회
  async getInvoices(filter?: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<Invoice[]> {
    return this.client.get<Invoice[]>(this.invoicesPath, { params: filter });
  }

  // 인보이스 업데이트
  async updateInvoice(invoiceId: string, request: UpdateInvoiceRequest): Promise<Invoice> {
    return this.client.put<Invoice>(`${this.invoicesPath}/${invoiceId}`, request);
  }

  // 인보이스 발행
  async issueInvoice(invoiceId: string): Promise<Invoice> {
    return this.client.post<Invoice>(`${this.invoicesPath}/${invoiceId}/issue`, {});
  }

  // 인보이스 취소
  async voidInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    return this.client.post<Invoice>(`${this.invoicesPath}/${invoiceId}/void`, { reason });
  }

  // 인보이스로 결제 생성
  async payInvoice(invoiceId: string, paymentMethodId: string): Promise<PaymentDetails> {
    return this.client.post<PaymentDetails>(`${this.invoicesPath}/${invoiceId}/pay`, { paymentMethodId });
  }

  // 인보이스 다운로드
  async downloadInvoice(invoiceId: string, format: 'pdf' | 'json' = 'pdf'): Promise<Blob | Invoice> {
    if (format === 'pdf') {
      return this.client.get<Blob>(`${this.invoicesPath}/${invoiceId}/download`, { 
        responseType: 'blob' 
      });
    } else {
      return this.client.get<Invoice>(`${this.invoicesPath}/${invoiceId}`);
    }
  }

  // 인보이스 이메일 발송
  async sendInvoiceEmail(invoiceId: string, email?: string): Promise<{ success: boolean; message: string }> {
    return this.client.post<{ success: boolean; message: string }>(`${this.invoicesPath}/${invoiceId}/send`, { email });
  }

  // 정비 기록에 대한 인보이스 생성
  async createMaintenanceInvoice(maintenanceId: string): Promise<Invoice> {
    return this.client.post<Invoice>(`/maintenance/${maintenanceId}/invoices`, {});
  }

  // 결제 통계 조회
  async getPaymentStats(filter?: {
    startDate?: string;
    endDate?: string;
    type?: PaymentType;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    totalAmount: number;
    count: number;
    averageAmount: number;
    byStatus: Record<PaymentStatus, { count: number; amount: number }>;
    byMethod: Record<PaymentMethod, { count: number; amount: number }>;
    byType: Record<PaymentType, { count: number; amount: number }>;
    timeline: Array<{ period: string; count: number; amount: number }>;
  }> {
    return this.client.get(`${this.basePath}/stats`, { params: filter });
  }
} 