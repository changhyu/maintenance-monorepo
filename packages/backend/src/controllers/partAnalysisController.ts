import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PartAnalysisService } from '../services/partAnalysisService';

const prisma = new PrismaClient();
const partAnalysisService = new PartAnalysisService(prisma);

export class PartAnalysisController {
  // 재고 분석
  async getStockAnalysis(req: Request, res: Response) {
    try {
      const { startDate, category } = req.query;

      if (!startDate || typeof startDate !== 'string') {
        return res.status(400).json({ error: '시작 날짜는 필수입니다.' });
      }

      const analysis = await partAnalysisService.getStockAnalysis({
        startDate,
        category: category as string,
      });

      res.json(analysis);
    } catch (error) {
      console.error('재고 분석 조회 실패:', error);
      res.status(500).json({ error: '재고 분석 데이터를 불러오는데 실패했습니다.' });
    }
  }

  // 사용량 분석
  async getUsageAnalysis(req: Request, res: Response) {
    try {
      const { startDate, category } = req.query;

      if (!startDate || typeof startDate !== 'string') {
        return res.status(400).json({ error: '시작 날짜는 필수입니다.' });
      }

      const analysis = await partAnalysisService.getUsageAnalysis({
        startDate,
        category: category as string,
      });

      res.json(analysis);
    } catch (error) {
      console.error('사용량 분석 조회 실패:', error);
      res.status(500).json({ error: '사용량 분석 데이터를 불러오는데 실패했습니다.' });
    }
  }

  // 비용 분석
  async getCostAnalysis(req: Request, res: Response) {
    try {
      const { startDate, category } = req.query;

      if (!startDate || typeof startDate !== 'string') {
        return res.status(400).json({ error: '시작 날짜는 필수입니다.' });
      }

      const analysis = await partAnalysisService.getCostAnalysis({
        startDate,
        category: category as string,
      });

      res.json(analysis);
    } catch (error) {
      console.error('비용 분석 조회 실패:', error);
      res.status(500).json({ error: '비용 분석 데이터를 불러오는데 실패했습니다.' });
    }
  }
}

export default new PartAnalysisController(); 