import { Router } from 'express';
import NotificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { validateNotification, validateNotificationPreferences } from '../middleware/validation';

const router = Router();

// 웹 푸시 알림 공개 키 제공 (인증 불필요)
router.get('/vapid-public-key', NotificationController.getVapidPublicKey);

// 푸시 알림 구독 등록 (인증 불필요)
router.post('/subscribe', NotificationController.subscribe);

// 푸시 알림 전송 (인증 필요)
router.post('/send', authenticate, NotificationController.sendPushNotification);

// 인증이 필요한 모든 라우트에 미들웨어 적용
router.use(authenticate);

// 알림 목록 조회
router.get('/', NotificationController.getNotifications);

// 알림 통계 조회
router.get('/stats', NotificationController.getNotificationStats);

// 알림 설정 조회
router.get('/preferences', NotificationController.getNotificationPreferences);

// 단일 알림 조회
router.get('/:id', NotificationController.getNotificationById);

// 알림 생성
router.post('/', validateNotification, NotificationController.createNotification);

// 알림 읽음 처리
router.put('/:id/read', NotificationController.markAsRead);

// 모든 알림 읽음 처리
router.put('/read-all', NotificationController.markAllAsRead);

// 알림 설정 업데이트
router.put('/preferences', validateNotificationPreferences, NotificationController.updateNotificationPreferences);

// 알림 삭제
router.delete('/:id', NotificationController.deleteNotification);

export default router;