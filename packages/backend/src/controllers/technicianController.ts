import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TechnicianService } from '../services/technicianService';

const prisma = new PrismaClient();
const technicianService = new TechnicianService(prisma);

export class TechnicianController {
  // 정비사 목록 조회
  async getTechnicians(req: Request, res: Response) {
    try {
      const { 
        search,
        status,
        shopId,
        specialty,
        page = 1,
        limit = 10,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const technicians = await technicianService.getTechnicians({
        search: search as string,
        status: status as string,
        shopId: shopId as string,
        specialty: specialty as string,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json(technicians);
    } catch (error) {
      console.error('정비사 목록 조회 실패:', error);
      res.status(500).json({ error: '정비사 목록을 불러오는데 실패했습니다.' });
    }
  }

  // 정비사 상세 정보 조회
  async getTechnicianById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const technician = await technicianService.getTechnicianById(id);

      if (!technician) {
        return res.status(404).json({ error: '정비사를 찾을 수 없습니다.' });
      }

      res.json(technician);
    } catch (error) {
      console.error('정비사 상세 정보 조회 실패:', error);
      res.status(500).json({ error: '정비사 정보를 불러오는데 실패했습니다.' });
    }
  }

  // 정비사 등록
  async createTechnician(req: Request, res: Response) {
    try {
      const technicianData = req.body;
      const technician = await technicianService.createTechnician(technicianData);
      res.status(201).json(technician);
    } catch (error) {
      console.error('정비사 등록 실패:', error);
      res.status(500).json({ error: '정비사 등록에 실패했습니다.' });
    }
  }

  // 정비사 정보 수정
  async updateTechnician(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const technicianData = req.body;
      const technician = await technicianService.updateTechnician(id, technicianData);

      if (!technician) {
        return res.status(404).json({ error: '정비사를 찾을 수 없습니다.' });
      }

      res.json(technician);
    } catch (error) {
      console.error('정비사 정보 수정 실패:', error);
      res.status(500).json({ error: '정비사 정보 수정에 실패했습니다.' });
    }
  }

  // 정비사 삭제
  async deleteTechnician(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await technicianService.deleteTechnician(id);
      res.status(204).send();
    } catch (error) {
      console.error('정비사 삭제 실패:', error);
      res.status(500).json({ error: '정비사 삭제에 실패했습니다.' });
    }
  }

  // 정비사 실적 조회
  async getTechnicianPerformance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const performance = await technicianService.getTechnicianPerformance(id, {
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json(performance);
    } catch (error) {
      console.error('정비사 실적 조회 실패:', error);
      res.status(500).json({ error: '정비사 실적을 불러오는데 실패했습니다.' });
    }
  }

  // 정비사 일정 조회
  async getTechnicianSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const schedule = await technicianService.getTechnicianSchedule(id, {
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json(schedule);
    } catch (error) {
      console.error('정비사 일정 조회 실패:', error);
      res.status(500).json({ error: '정비사 일정을 불러오는데 실패했습니다.' });
    }
  }

  // 정비사 평가 등록
  async createTechnicianReview(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reviewData = req.body;
      
      const review = await technicianService.createTechnicianReview(id, reviewData);
      res.status(201).json(review);
    } catch (error) {
      console.error('정비사 평가 등록 실패:', error);
      res.status(500).json({ error: '정비사 평가 등록에 실패했습니다.' });
    }
  }

  // 정비사 자격증 관리
  async updateTechnicianCertifications(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const certifications = req.body;
      
      const technician = await technicianService.updateTechnicianCertifications(id, certifications);
      res.json(technician);
    } catch (error) {
      console.error('정비사 자격증 업데이트 실패:', error);
      res.status(500).json({ error: '정비사 자격증 정보 업데이트에 실패했습니다.' });
    }
  }
}

export default new TechnicianController(); 