import mongoose, { Schema, Document } from 'mongoose';
import { NotificationBatchStatus, NotificationChannel, NotificationType, NotificationPriority } from '../types/notification';

export interface INotificationBatch extends Document {
  name: string;
  description?: string;
  templateId: string;
  status: NotificationBatchStatus;
  notificationCount: number;
  filterCriteria?: Record<string, any>;
  variableData?: Record<string, any>;
  channels: NotificationChannel[];
  scheduledAt?: Date;
  completedAt?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationBatchSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'NotificationTemplate',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(NotificationBatchStatus),
    default: NotificationBatchStatus.DRAFT
  },
  notificationCount: {
    type: Number,
    default: 0
  },
  filterCriteria: Schema.Types.Mixed,
  variableData: Schema.Types.Mixed,
  channels: [{
    type: String,
    enum: Object.values(NotificationChannel)
  }],
  scheduledAt: Date,
  completedAt: Date,
  createdById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// 인덱스 설정
NotificationBatchSchema.index({ status: 1 });
NotificationBatchSchema.index({ scheduledAt: 1 });
NotificationBatchSchema.index({ createdById: 1 });

export const NotificationBatch = mongoose.model<INotificationBatch>('NotificationBatch', NotificationBatchSchema); 