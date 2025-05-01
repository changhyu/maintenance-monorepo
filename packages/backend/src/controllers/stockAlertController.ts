import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StockAlertService } from '../services/stockAlertService';

const prisma = new PrismaClient();
const stockAlertService = new StockAlertService(prisma);

export class StockAlertController {
  // 알림 설정 조회
  async getAlertSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // 인증 미들웨어에서 설정된 사용자 정보
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const settings = await stockAlertService.getAlertSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error('알림 설정 조회 실패:', error);
      res.status(500).json({ error: '알림 설정을 불러오는데 실패했습니다.' });
    }
  }

  // 알림 설정 생성
  async createAlert(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const alert = await stockAlertService.createAlert({
        ...req.body,
        userId,
      });
      res.status(201).json(alert);
    } catch (error) {
      console.error('알림 설정 생성 실패:', error);
      res.status(500).json({ error: '알림 설정 생성에 실패했습니다.' });
    }
  }

  // 알림 설정 수정
  async updateAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const alert = await stockAlertService.updateAlert(id, req.body);
      res.json(alert);
    } catch (error) {
      console.error('알림 설정 수정 실패:', error);
      res.status(500).json({ error: '알림 설정 수정에 실패했습니다.' });
    }
  }

  // 알림 설정 삭제
  async deleteAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await stockAlertService.deleteAlert(id);
      res.status(204).send();
    } catch (error) {
      console.error('알림 설정 삭제 실패:', error);
      res.status(500).json({ error: '알림 설정 삭제에 실패했습니다.' });
    }
  }

  // 알림 상태 토글
  async toggleAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const alert = await stockAlertService.toggleAlert(id);
      res.json(alert);
    } catch (error) {
      console.error('알림 상태 변경 실패:', error);
      res.status(500).json({ error: '알림 상태 변경에 실패했습니다.' });
    }
  }

  // 알림 이력 조회
  async getAlertHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const { startDate, endDate, status } = req.query;
      const history = await stockAlertService.getAlertHistory({
        userId,
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
      });
      res.json(history);
    } catch (error) {
      console.error('알림 이력 조회 실패:', error);
      res.status(500).json({ error: '알림 이력을 불러오는데 실패했습니다.' });
    }
  }

  // 알림 통계 조회
  async getAlertStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const stats = await stockAlertService.getAlertStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('알림 통계 조회 실패:', error);
      res.status(500).json({ error: '알림 통계를 불러오는데 실패했습니다.' });
    }
  }

  // 수동으로 알림 체크 실행
  async checkAlerts(req: Request, res: Response) {
    try {
      await stockAlertService.checkAndSendAlerts();
      res.json({ message: '알림 체크가 완료되었습니다.' });
    } catch (error) {
      console.error('알림 체크 실패:', error);
      res.status(500).json({ error: '알림 체크에 실패했습니다.' });
    }
  }
}

export default new StockAlertController(); 