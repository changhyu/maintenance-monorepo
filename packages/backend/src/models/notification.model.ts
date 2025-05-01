import mongoose, { Schema, Document } from 'mongoose';
import { 
  NotificationStatus, 
  NotificationType, 
  NotificationCategory,
  NotificationPriority,
  NotificationChannel 
} from '../types/notification';

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  isRead: boolean;
  userId: string;
  recipientIds: string[];
  link?: string;
  metadata?: Record<string, any>;
  thumbnail?: string;
  icon?: string;
  actionText?: string;
  secondaryActionText?: string;
  expiresAt?: Date;
  scheduledAt?: Date;
  channels: NotificationChannel[];
  batchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  category: {
    type: String,
    enum: Object.values(NotificationCategory),
    required: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true
  },
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.UNREAD
  },
  isRead: {
    type: Boolean,
    default: false
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  link: String,
  metadata: Schema.Types.Mixed,
  thumbnail: String,
  icon: String,
  actionText: String,
  secondaryActionText: String,
  expiresAt: Date,
  scheduledAt: Date,
  channels: [{
    type: String,
    enum: Object.values(NotificationChannel)
  }],
  batchId: String
}, {
  timestamps: true
});

// 인덱스 설정
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ batchId: 1 });

// 가상 필드: 읽지 않은 알림 수
NotificationSchema.virtual('unreadCount').get(function() {
  return this.model('Notification').countDocuments({
    userId: this.userId,
    isRead: false
  });
});

// 메서드: 알림 읽음 처리
NotificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.status = NotificationStatus.READ;
  await this.save();
};

// 정적 메서드: 사용자의 모든 알림 읽음 처리
NotificationSchema.statics.markAllAsRead = async function(userId: string) {
  return this.updateMany(
    { userId, isRead: false },
    { 
      $set: { 
        isRead: true,
        status: NotificationStatus.READ
      }
    }
  );
};

// 정적 메서드: 만료된 알림 처리
NotificationSchema.statics.handleExpiredNotifications = async function() {
  const now = new Date();
  return this.updateMany(
    { 
      expiresAt: { $lt: now },
      status: { $ne: NotificationStatus.ARCHIVED }
    },
    { 
      $set: { status: NotificationStatus.ARCHIVED }
    }
  );
};

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// 알림 환경설정 스키마
export interface INotificationPreferences extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  email: {
    enabled: { type: Boolean, default: true },
    types: [{ type: String, enum: Object.values(NotificationType) }],
    dailyDigest: { type: Boolean, default: false },
    digestTime: String
  },
  sms: {
    enabled: { type: Boolean, default: true },
    types: [{ type: String, enum: Object.values(NotificationType) }]
  },
  push: {
    enabled: { type: Boolean, default: true },
    types: [{ type: String, enum: Object.values(NotificationType) }],
    quiet_hours: {
      enabled: { type: Boolean, default: false },
      start: String,
      end: String,
      allowUrgent: { type: Boolean, default: true }
    }
  },
  app: {
    enabled: { type: Boolean, default: true },
    types: [{ type: String, enum: Object.values(NotificationType) }]
  }
}, {
  timestamps: true
});

export const NotificationPreferences = mongoose.model<INotificationPreferences>(
  'NotificationPreferences',
  NotificationPreferencesSchema
);

// 푸시 알림 구독 스키마
export interface IPushSubscription extends Document {
  userId: string;
  subscription: {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      p256dh: string;
      auth: string;
    }
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  subscription: {
    endpoint: {
      type: String,
      required: true,
      unique: true
    },
    expirationTime: {
      type: Number,
      default: null
    },
    keys: {
      p256dh: String,
      auth: String
    }
  },
  userAgent: String
}, {
  timestamps: true
});

// 인덱스 설정
PushSubscriptionSchema.index({ userId: 1, 'subscription.endpoint': 1 });

export const PushSubscription = mongoose.model<IPushSubscription>(
  'PushSubscription',
  PushSubscriptionSchema
);