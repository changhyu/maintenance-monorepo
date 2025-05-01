import { Router } from 'express';
import NotificationBatchController from '../controllers/notification-batch.controller';
import { authenticate } from '../middleware/auth';
import { validateNotificationBatch } from '../middleware/validation';

const router = Router();

// 인증이 필요한 모든 라우트에 미들웨어 적용
router.use(authenticate);

// 배치 목록 조회
router.get('/', NotificationBatchController.getBatches);

// 배치 생성
router.post('/', validateNotificationBatch, NotificationBatchController.createBatch);

// 배치 실행
router.post('/:id/run', NotificationBatchController.runBatch);

// 배치 취소
router.post('/:id/cancel', NotificationBatchController.cancelBatch);

export default router; 