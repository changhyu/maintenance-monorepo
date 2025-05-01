import express from 'express';
import stockAlertController from '../controllers/stockAlertController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticate);

// 알림 설정 관리
router.get('/settings', stockAlertController.getAlertSettings);
router.post('/settings', stockAlertController.createAlert);
router.put('/settings/:id', stockAlertController.updateAlert);
router.delete('/settings/:id', stockAlertController.deleteAlert);
router.post('/settings/:id/toggle', stockAlertController.toggleAlert);

// 알림 이력
router.get('/history', stockAlertController.getAlertHistory);

// 알림 통계
router.get('/stats', stockAlertController.getAlertStats);

// 수동 알림 체크 (관리자 전용)
router.post('/check', stockAlertController.checkAlerts);

export default router; 