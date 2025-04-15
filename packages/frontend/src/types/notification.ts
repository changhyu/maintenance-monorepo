/**
 * 알림 상태 enum
 */
export enum NotificationStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  UNREAD = 'unread',
  READ = 'read'
}

/**
 * 알림 타입 enum
 */
export enum NotificationType {
  MAINTENANCE = 'maintenance',
  VEHICLE = 'vehicle',
  SYSTEM = 'system',
  APPOINTMENT = 'appointment',
  SERVICE = 'service',
  RECALL = 'recall',
  PAYMENT = 'payment',
  MESSAGE = 'message',
  ACCOUNT = 'account'
}

/**
 * 알림 우선순위 enum
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * 알림 카테고리 enum
 */
export enum NotificationCategory {
  TASK = 'task',
  ALERT = 'alert',
  UPDATE = 'update',
  REMINDER = 'reminder'
}

/**
 * 알림 엔티티 타입
 */
export enum NotificationEntityType {
  VEHICLE = 'vehicle',
  MAINTENANCE = 'maintenance',
  INVOICE = 'invoice',
  APPOINTMENT = 'appointment',
  USER = 'user',
  SHOP = 'shop'
}

/**
 * 알림 채널 enum
 */
export enum NotificationChannel {
  APP = 'app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

/**
 * 알림 정보 인터페이스
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  status: NotificationStatus;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  createdAt: Date;
  expiresAt?: Date;
  isRead: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  link?: string;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  userId: string;
  groupId?: string;
  thumbnail?: string;
  sound?: string;
}

/**
 * 알림 생성 인터페이스
 */
export interface NotificationCreate {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  recipientIds?: string[];
  link?: string;
  channels?: NotificationChannel[];
  thumbnail?: string;
  icon?: string;
  actionText?: string;
  secondaryActionText?: string;
  batchId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  expiresAt?: string;
  scheduledAt?: string;
}

/**
 * 알림 업데이트 인터페이스
 */
export interface NotificationUpdate {
  status?: NotificationStatus;
  title?: string;
  message?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  link?: string;
  thumbnail?: string;
  icon?: string;
  actionText?: string;
  secondaryActionText?: string;
  expiresAt?: string;
  scheduledAt?: string;
}

/**
 * 알림 필터 인터페이스
 */
export interface NotificationFilter {
  userId?: string;
  types?: NotificationType[];
  status?: NotificationStatus[];
  priority?: NotificationPriority[];
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  page?: number;
  sort?: 'createdAt' | 'priority' | 'status';
  order?: 'asc' | 'desc';
  channel?: NotificationChannel;
  relatedEntityType?: string;
  relatedEntityId?: string;
  batchId?: string;
}

/**
 * 알림 환경설정 인터페이스
 */
export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    types?: NotificationType[];
    dailyDigest?: boolean;
    digestTime?: string;
  };
  sms: {
    enabled: boolean;
    types?: NotificationType[];
  };
  push: {
    enabled: boolean;
    types?: NotificationType[];
    quiet_hours?: {
      enabled: boolean;
      start: string;
      end: string;
      allowUrgent?: boolean;
    };
  };
  app: {
    enabled: boolean;
    types?: NotificationType[];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 알림 그룹 인터페이스
 */
export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

/**
 * 알림 통계 인터페이스
 */
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  byCategory?: Record<string, number>;
}

/**
 * 알림 개수 인터페이스
 */
export interface NotificationCount {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  read: number;
  unread: number;
  severity: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * 웹 푸시 구독 인터페이스
 */
export interface NotificationSubscription {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime?: number;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 알림 템플릿 인터페이스
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  defaultPriority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  active: boolean;
  metadata?: Record<string, any>;
  defaultIcon?: string;
  defaultThumbnail?: string;
  defaultActionText?: string;
  defaultSecondaryActionText?: string;
  defaultLinkTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 알림 배치 인터페이스
 */
export interface NotificationBatch {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  status: NotificationBatchStatus;
  notificationCount: number;
  filterCriteria?: Record<string, any>;
  variableData?: Record<string, any>;
  channels: NotificationChannel[];
  scheduledAt?: string;
  completedAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 알림 배치 상태 enum
 */
export enum NotificationBatchStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 알림 액션 인터페이스
 */
export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
  icon?: string;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}
