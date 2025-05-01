import { Request, Response, NextFunction } from 'express';
import { NotificationType, NotificationPriority, NotificationChannel } from '../types/notification';

export const validateNotification = (req: Request, res: Response, next: NextFunction) => {
  const { title, message, type, priority, category } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ message: '제목은 필수이며 문자열이어야 합니다.' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: '내용은 필수이며 문자열이어야 합니다.' });
  }

  if (!type || !Object.values(NotificationType).includes(type)) {
    return res.status(400).json({ message: '유효하지 않은 알림 타입입니다.' });
  }

  if (priority && !Object.values(NotificationPriority).includes(priority)) {
    return res.status(400).json({ message: '유효하지 않은 우선순위입니다.' });
  }

  if (!category) {
    return res.status(400).json({ message: '카테고리는 필수입니다.' });
  }

  next();
};

export const validateNotificationPreferences = (req: Request, res: Response, next: NextFunction) => {
  const { email, sms, push, app } = req.body;

  // 이메일 설정 검증
  if (email && typeof email.enabled !== 'boolean') {
    return res.status(400).json({ message: '이메일 활성화 여부는 boolean이어야 합니다.' });
  }

  // SMS 설정 검증
  if (sms && typeof sms.enabled !== 'boolean') {
    return res.status(400).json({ message: 'SMS 활성화 여부는 boolean이어야 합니다.' });
  }

  // 푸시 알림 설정 검증
  if (push) {
    if (typeof push.enabled !== 'boolean') {
      return res.status(400).json({ message: '푸시 알림 활성화 여부는 boolean이어야 합니다.' });
    }

    if (push.quiet_hours) {
      if (typeof push.quiet_hours.enabled !== 'boolean') {
        return res.status(400).json({ message: '방해 금지 시간 활성화 여부는 boolean이어야 합니다.' });
      }

      if (!push.quiet_hours.start || !push.quiet_hours.end) {
        return res.status(400).json({ message: '방해 금지 시간의 시작과 종료 시간은 필수입니다.' });
      }
    }
  }

  // 앱 내 알림 설정 검증
  if (app && typeof app.enabled !== 'boolean') {
    return res.status(400).json({ message: '앱 내 알림 활성화 여부는 boolean이어야 합니다.' });
  }

  next();
};

export const validateNotificationBatch = (req: Request, res: Response, next: NextFunction) => {
  const { name, templateId, channels } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: '배치 이름은 필수이며 문자열이어야 합니다.' });
  }

  if (!templateId) {
    return res.status(400).json({ message: '템플릿 ID는 필수입니다.' });
  }

  if (channels && (!Array.isArray(channels) || !channels.every(channel => Object.values(NotificationChannel).includes(channel)))) {
    return res.status(400).json({ message: '유효하지 않은 알림 채널입니다.' });
  }

  next();
};

export const validateNotificationTemplate = (req: Request, res: Response, next: NextFunction) => {
  const { name, type, titleTemplate, bodyTemplate, variables } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: '템플릿 이름은 필수이며 문자열이어야 합니다.' });
  }

  if (!type || !Object.values(NotificationType).includes(type)) {
    return res.status(400).json({ message: '유효하지 않은 알림 타입입니다.' });
  }

  if (!titleTemplate || typeof titleTemplate !== 'string') {
    return res.status(400).json({ message: '제목 템플릿은 필수이며 문자열이어야 합니다.' });
  }

  if (!bodyTemplate || typeof bodyTemplate !== 'string') {
    return res.status(400).json({ message: '내용 템플릿은 필수이며 문자열이어야 합니다.' });
  }

  if (variables && (!Array.isArray(variables) || !variables.every(v => typeof v === 'string'))) {
    return res.status(400).json({ message: '변수 목록은 문자열 배열이어야 합니다.' });
  }

  next();
}; 