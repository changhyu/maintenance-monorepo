import { Request, Response } from 'express';
import { NotificationBatch } from '../models/notification-batch.model';
import { NotificationTemplate } from '../models/notification-template.model';
import { Notification } from '../models/notification.model';
import { NotificationBatchStatus } from '../types/notification';

export class NotificationBatchController {
  // 배치 목록 조회
  async getBatches(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 10,
        status,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const query: any = { createdById: req.user.id };

      if (status) {
        query.status = status;
      }

      const sortOption: any = {};
      sortOption[sort as string] = order === 'desc' ? -1 : 1;

      const skip = (Number(page) - 1) * Number(limit);

      const [batches, total] = await Promise.all([
        NotificationBatch.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .populate('templateId')
          .exec(),
        NotificationBatch.countDocuments(query)
      ]);

      res.json({
        batches,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      console.error('배치 목록 조회 실패:', error);
      res.status(500).json({ message: '배치 목록을 조회하는데 실패했습니다.' });
    }
  }

  // 배치 생성
  async createBatch(req: Request, res: Response) {
    try {
      const batch = new NotificationBatch({
        ...req.body,
        createdById: req.user.id,
        status: NotificationBatchStatus.DRAFT
      });

      await batch.save();
      res.status(201).json(batch);
    } catch (error) {
      console.error('배치 생성 실패:', error);
      res.status(500).json({ message: '배치를 생성하는데 실패했습니다.' });
    }
  }

  // 배치 실행
  async runBatch(req: Request, res: Response) {
    try {
      const batch = await NotificationBatch.findOne({
        _id: req.params.id,
        createdById: req.user.id
      }).populate('templateId');

      if (!batch) {
        return res.status(404).json({ message: '배치를 찾을 수 없습니다.' });
      }

      if (batch.status !== NotificationBatchStatus.DRAFT) {
        return res.status(400).json({ message: '이미 실행된 배치입니다.' });
      }

      const template = batch.templateId as any as typeof NotificationTemplate;
      if (!template) {
        return res.status(400).json({ message: '템플릿을 찾을 수 없습니다.' });
      }

      // 배치 상태 업데이트
      batch.status = NotificationBatchStatus.PROCESSING;
      await batch.save();

      try {
        // 필터 기준에 맞는 사용자 조회
        const users = await this.getUsersByFilter(batch.filterCriteria);

        // 각 사용자별로 알림 생성
        const notifications = [];
        for (const user of users) {
          const { title, body } = template.render({
            ...batch.variableData,
            userName: user.name
          });

          const notification = new Notification({
            userId: user.id,
            title,
            message: body,
            type: template.type,
            priority: template.defaultPriority,
            channels: batch.channels,
            metadata: {
              batchId: batch.id,
              templateId: template.id
            }
          });

          notifications.push(notification);
        }

        // 알림 일괄 생성
        await Notification.insertMany(notifications);

        // 배치 완료 처리
        batch.status = NotificationBatchStatus.COMPLETED;
        batch.notificationCount = notifications.length;
        batch.completedAt = new Date();
        await batch.save();

        res.json({
          message: '배치가 성공적으로 실행되었습니다.',
          notificationCount: notifications.length
        });
      } catch (error) {
        // 실행 실패 시 상태 업데이트
        batch.status = NotificationBatchStatus.FAILED;
        await batch.save();
        throw error;
      }
    } catch (error) {
      console.error('배치 실행 실패:', error);
      res.status(500).json({ message: '배치 실행에 실패했습니다.' });
    }
  }

  // 배치 취소
  async cancelBatch(req: Request, res: Response) {
    try {
      const batch = await NotificationBatch.findOne({
        _id: req.params.id,
        createdById: req.user.id
      });

      if (!batch) {
        return res.status(404).json({ message: '배치를 찾을 수 없습니다.' });
      }

      if (batch.status !== NotificationBatchStatus.DRAFT) {
        return res.status(400).json({ message: '이미 실행된 배치는 취소할 수 없습니다.' });
      }

      batch.status = NotificationBatchStatus.CANCELLED;
      await batch.save();

      res.json({ message: '배치가 취소되었습니다.' });
    } catch (error) {
      console.error('배치 취소 실패:', error);
      res.status(500).json({ message: '배치 취소에 실패했습니다.' });
    }
  }

  // 필터 기준에 맞는 사용자 조회 (예시 구현)
  private async getUsersByFilter(filterCriteria: any) {
    // 실제 구현에서는 사용자 모델과 필터 로직을 구현해야 함
    return []; // 임시 반환
  }
}

export default new NotificationBatchController(); 