import express from 'express';
import partRoutes from './partRoutes';
import partAnalysisRoutes from './partAnalysisRoutes';
import supplierRoutes from './supplierRoutes';
import stockAlertRoutes from './stockAlertRoutes';

const router = express.Router();

router.use('/maintenance/parts', partRoutes);
router.use('/maintenance/parts/analysis', partAnalysisRoutes);
router.use('/maintenance/suppliers', supplierRoutes);
router.use('/maintenance/alerts', stockAlertRoutes);

export default router; 