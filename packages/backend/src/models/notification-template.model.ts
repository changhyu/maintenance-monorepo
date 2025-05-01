import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType, NotificationPriority, NotificationChannel } from '../types/notification';

export interface INotificationTemplate extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  titleTemplate: {
    type: String,
    required: true
  },
  bodyTemplate: {
    type: String,
    required: true
  },
  variables: [{
    type: String,
    trim: true
  }],
  defaultPriority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  defaultChannels: [{
    type: String,
    enum: Object.values(NotificationChannel)
  }],
  active: {
    type: Boolean,
    default: true
  },
  metadata: Schema.Types.Mixed,
  defaultIcon: String,
  defaultThumbnail: String,
  defaultActionText: String,
  defaultSecondaryActionText: String,
  defaultLinkTemplate: String
}, {
  timestamps: true
});

// 인덱스 설정
NotificationTemplateSchema.index({ type: 1 });
NotificationTemplateSchema.index({ active: 1 });

// 템플릿 렌더링 메서드
NotificationTemplateSchema.methods.render = function(variables: Record<string, any>) {
  let title = this.titleTemplate;
  let body = this.bodyTemplate;

  // 변수 치환
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(regex, String(value));
    body = body.replace(regex, String(value));
  }

  return { title, body };
};

export const NotificationTemplate = mongoose.model<INotificationTemplate>('NotificationTemplate', NotificationTemplateSchema); 