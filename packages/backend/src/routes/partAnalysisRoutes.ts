import express from 'express';
import partAnalysisController from '../controllers/partAnalysisController';

const router = express.Router();

// 재고 분석
router.get('/stock', partAnalysisController.getStockAnalysis);

// 사용량 분석
router.get('/usage', partAnalysisController.getUsageAnalysis);

// 비용 분석
router.get('/cost', partAnalysisController.getCostAnalysis);

export default router; 