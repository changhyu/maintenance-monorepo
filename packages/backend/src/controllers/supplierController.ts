import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SupplierService } from '../services/supplierService';

const prisma = new PrismaClient();
const supplierService = new SupplierService(prisma);

export class SupplierController {
  // 공급업체 목록 조회
  async getSuppliers(req: Request, res: Response) {
    try {
      const { 
        search,
        category,
        status,
        page = 1,
        limit = 10,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const suppliers = await supplierService.getSuppliers({
        search: search as string,
        category: category as string,
        status: status as string,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json(suppliers);
    } catch (error) {
      console.error('공급업체 목록 조회 실패:', error);
      res.status(500).json({ error: '공급업체 목록을 불러오는데 실패했습니다.' });
    }
  }

  // 공급업체 상세 정보 조회
  async getSupplierById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const supplier = await supplierService.getSupplierById(id);

      if (!supplier) {
        return res.status(404).json({ error: '공급업체를 찾을 수 없습니다.' });
      }

      res.json(supplier);
    } catch (error) {
      console.error('공급업체 상세 정보 조회 실패:', error);
      res.status(500).json({ error: '공급업체 정보를 불러오는데 실패했습니다.' });
    }
  }

  // 공급업체 등록
  async createSupplier(req: Request, res: Response) {
    try {
      const supplier = await supplierService.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (error) {
      console.error('공급업체 등록 실패:', error);
      res.status(500).json({ error: '공급업체 등록에 실패했습니다.' });
    }
  }

  // 공급업체 정보 수정
  async updateSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const supplier = await supplierService.updateSupplier(id, req.body);

      if (!supplier) {
        return res.status(404).json({ error: '공급업체를 찾을 수 없습니다.' });
      }

      res.json(supplier);
    } catch (error) {
      console.error('공급업체 정보 수정 실패:', error);
      res.status(500).json({ error: '공급업체 정보 수정에 실패했습니다.' });
    }
  }

  // 공급업체 삭제
  async deleteSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await supplierService.deleteSupplier(id);
      res.status(204).send();
    } catch (error) {
      console.error('공급업체 삭제 실패:', error);
      res.status(500).json({ error: '공급업체 삭제에 실패했습니다.' });
    }
  }

  // 공급업체 연락처 등록
  async addSupplierContact(req: Request, res: Response) {
    try {
      const contact = await supplierService.addSupplierContact(req.body);
      res.status(201).json(contact);
    } catch (error) {
      console.error('공급업체 연락처 등록 실패:', error);
      res.status(500).json({ error: '공급업체 연락처 등록에 실패했습니다.' });
    }
  }

  // 공급업체 연락처 수정
  async updateSupplierContact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const contact = await supplierService.updateSupplierContact(id, req.body);
      res.json(contact);
    } catch (error) {
      console.error('공급업체 연락처 수정 실패:', error);
      res.status(500).json({ error: '공급업체 연락처 수정에 실패했습니다.' });
    }
  }

  // 공급업체 연락처 삭제
  async deleteSupplierContact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await supplierService.deleteSupplierContact(id);
      res.status(204).send();
    } catch (error) {
      console.error('공급업체 연락처 삭제 실패:', error);
      res.status(500).json({ error: '공급업체 연락처 삭제에 실패했습니다.' });
    }
  }

  // 공급업체 평가
  async rateSupplier(req: Request, res: Response) {
    try {
      const rating = await supplierService.rateSupplier(req.body);
      res.status(201).json(rating);
    } catch (error) {
      console.error('공급업체 평가 등록 실패:', error);
      res.status(500).json({ error: '공급업체 평가 등록에 실패했습니다.' });
    }
  }

  // 공급업체 실적 조회
  async getSupplierPerformance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
        return res.status(400).json({ error: '시작 날짜와 종료 날짜는 필수입니다.' });
      }

      const performance = await supplierService.getSupplierPerformance(id, {
        startDate,
        endDate,
      });

      res.json(performance);
    } catch (error) {
      console.error('공급업체 실적 조회 실패:', error);
      res.status(500).json({ error: '공급업체 실적을 불러오는데 실패했습니다.' });
    }
  }
}

export default new SupplierController(); 