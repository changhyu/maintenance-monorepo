import { Request, Response } from 'express';
import { Notification, NotificationPreferences, PushSubscription } from '../models/notification.model';
import { NotificationStatus } from '../types/notification';
import webpush from 'web-push';

// VAPID 키 설정 (환경변수에서 가져오거나 하드코딩)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLb0rWoJ7qPt_iQF31pw-1GFM2SzxN_jI8Q6OK4IZy7Or1IW3k-gE8ZaO0MFFrSV5bOsEseiLd40SmE8rw1E4VA';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'VQBgZLsRdJ8TuCxXmvrsp9VvgYRQKWx_hkiP4MKuHig';

// Web Push 설정
webpush.setVapidDetails(
  'mailto:admin@yourcompany.com', // 연락처 이메일 변경 필요
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export class NotificationController {
  // VAPID 공개 키 제공
  async getVapidPublicKey(req: Request, res: Response) {
    try {
      res.json({ public_key: VAPID_PUBLIC_KEY });
    } catch (error) {
      console.error('VAPID 키 제공 실패:', error);
      res.status(500).json({ message: 'VAPID 키를 제공하는데 실패했습니다.' });
    }
  }

  // 푸시 알림 구독 등록
  async subscribe(req: Request, res: Response) {
    try {
      const subscription = req.body;
      const userId = req.user?.id || 'anonymous'; // 인증이 없을 경우 익명 사용자 처리

      // 구독 정보 저장
      await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { 
          userId,
          subscription,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      res.status(201).json({ message: '푸시 알림 구독이 등록되었습니다.' });
    } catch (error) {
      console.error('푸시 알림 구독 등록 실패:', error);
      res.status(500).json({ message: '푸시 알림 구독을 등록하는데 실패했습니다.' });
    }
  }

  // 푸시 알림 전송
  async sendPushNotification(req: Request, res: Response) {
    try {
      const { title, body, icon, url, tag, actions } = req.body;
      const userId = req.user.id;

      // 사용자 구독 정보 조회
      const subscriptions = await PushSubscription.find({ userId });

      if (!subscriptions.length) {
        return res.status(404).json({ message: '구독된 기기가 없습니다.' });
      }

      // 각 구독에 알림 전송
      const notifications = subscriptions.map(async (sub) => {
        try {
          const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/logo192.png',
            badge: '/notification-badge.png',
            data: { url: url || '/' },
            tag,
            actions
          });

          await webpush.sendNotification(sub.subscription, payload);
          return { success: true, endpoint: sub.subscription.endpoint };
        } catch (error) {
          console.error('푸시 알림 전송 오류:', error);
          
          // 만료된 구독인 경우 삭제
          if (error.statusCode === 410) {
            await PushSubscription.deleteOne({ endpoint: sub.subscription.endpoint });
          }
          
          return { success: false, endpoint: sub.subscription.endpoint, error };
        }
      });

      const results = await Promise.all(notifications);

      // 알림 내역 저장
      const notification = new Notification({
        userId,
        title,
        message: body,
        type: 'push',
        status: NotificationStatus.SENT
      });
      
      await notification.save();

      res.json({ 
        message: '푸시 알림이 전송되었습니다.',
        results,
        notification
      });
    } catch (error) {
      console.error('푸시 알림 전송 실패:', error);
      res.status(500).json({ message: '푸시 알림을 전송하는데 실패했습니다.' });
    }
  }

  // 알림 목록 조회
  async getNotifications(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 10,
        status,
        type,
        category,
        priority,
        search,
        startDate,
        endDate,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const query: any = { userId: req.user.id };

      if (status) {
        query.status = status;
      }

      if (type) {
        query.type = type;
      }

      if (category) {
        query.category = category;
      }

      if (priority) {
        query.priority = priority;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate as string);
        }
      }

      const sortOption: any = {};
      sortOption[sort as string] = order === 'desc' ? -1 : 1;

      const skip = (Number(page) - 1) * Number(limit);

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .exec(),
        Notification.countDocuments(query)
      ]);

      res.json({
        notifications,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      console.error('알림 목록 조회 실패:', error);
      res.status(500).json({ message: '알림 목록을 조회하는데 실패했습니다.' });
    }
  }

  // 단일 알림 조회
  async getNotificationById(req: Request, res: Response) {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!notification) {
        return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
      }

      res.json(notification);
    } catch (error) {
      console.error('알림 조회 실패:', error);
      res.status(500).json({ message: '알림을 조회하는데 실패했습니다.' });
    }
  }

  // 알림 생성
  async createNotification(req: Request, res: Response) {
    try {
      const notification = new Notification({
        ...req.body,
        userId: req.user.id
      });

      await notification.save();
      res.status(201).json(notification);
    } catch (error) {
      console.error('알림 생성 실패:', error);
      res.status(500).json({ message: '알림을 생성하는데 실패했습니다.' });
    }
  }

  // 알림 읽음 처리
  async markAsRead(req: Request, res: Response) {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!notification) {
        return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
      }

      await notification.markAsRead();
      res.json({ message: '알림이 읽음 처리되었습니다.' });
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      res.status(500).json({ message: '알림을 읽음 처리하는데 실패했습니다.' });
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(req: Request, res: Response) {
    try {
      await Notification.markAllAsRead(req.user.id);
      res.json({ message: '모든 알림이 읽음 처리되었습니다.' });
    } catch (error) {
      console.error('전체 알림 읽음 처리 실패:', error);
      res.status(500).json({ message: '전체 알림을 읽음 처리하는데 실패했습니다.' });
    }
  }

  // 알림 삭제
  async deleteNotification(req: Request, res: Response) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!notification) {
        return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
      }

      res.json({ message: '알림이 삭제되었습니다.' });
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      res.status(500).json({ message: '알림을 삭제하는데 실패했습니다.' });
    }
  }

  // 알림 통계 조회
  async getNotificationStats(req: Request, res: Response) {
    try {
      const [total, unread, byType, byPriority] = await Promise.all([
        Notification.countDocuments({ userId: req.user.id }),
        Notification.countDocuments({ userId: req.user.id, isRead: false }),
        Notification.aggregate([
          { $match: { userId: req.user.id } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $match: { userId: req.user.id } },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
      ]);

      const stats = {
        total,
        unread,
        byType: byType.reduce((acc: any, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc: any, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      };

      res.json(stats);
    } catch (error) {
      console.error('알림 통계 조회 실패:', error);
      res.status(500).json({ message: '알림 통계를 조회하는데 실패했습니다.' });
    }
  }

  // 알림 설정 조회
  async getNotificationPreferences(req: Request, res: Response) {
    try {
      let preferences = await NotificationPreferences.findOne({
        userId: req.user.id
      });

      if (!preferences) {
        // 기본 설정으로 생성
        preferences = await NotificationPreferences.create({
          userId: req.user.id
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error('알림 설정 조회 실패:', error);
      res.status(500).json({ message: '알림 설정을 조회하는데 실패했습니다.' });
    }
  }

  // 알림 설정 업데이트
  async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const preferences = await NotificationPreferences.findOneAndUpdate(
        { userId: req.user.id },
        { $set: req.body },
        { new: true, upsert: true }
      );

      res.json(preferences);
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
      res.status(500).json({ message: '알림 설정을 업데이트하는데 실패했습니다.' });
    }
  }
}

export default new NotificationController();