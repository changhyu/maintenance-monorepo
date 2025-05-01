import express from 'express';
import supplierController from '../controllers/supplierController';

const router = express.Router();

// 공급업체 목록
router.get('/', supplierController.getSuppliers);

// 공급업체 상세 정보
router.get('/:id', supplierController.getSupplierById);

// 공급업체 등록
router.post('/', supplierController.createSupplier);

// 공급업체 수정
router.put('/:id', supplierController.updateSupplier);

// 공급업체 삭제
router.delete('/:id', supplierController.deleteSupplier);

// 공급업체 연락처 관리
router.post('/:id/contacts', supplierController.addSupplierContact);
router.put('/contacts/:id', supplierController.updateSupplierContact);
router.delete('/contacts/:id', supplierController.deleteSupplierContact);

// 공급업체 평가
router.post('/:id/ratings', supplierController.rateSupplier);

// 공급업체 실적
router.get('/:id/performance', supplierController.getSupplierPerformance);

export default router; 