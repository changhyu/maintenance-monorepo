import { PrismaClient, StockAlert, StockAlertType, StockAlertStatus } from '@prisma/client';
import { sendEmail } from '../utils/emailService';
import { sendPushNotification } from '../utils/pushNotificationService';

export class StockAlertService {
  constructor(private prisma: PrismaClient) {}

  // 알림 설정 조회
  async getAlertSettings(userId: string) {
    return this.prisma.stockAlert.findMany({
      where: { userId },
      include: {
        part: true,
      },
    });
  }

  // 알림 설정 생성
  async createAlert(data: {
    userId: string;
    partId: string;
    type: StockAlertType;
    threshold: number;
    notificationChannels: string[];
  }) {
    return this.prisma.stockAlert.create({
      data: {
        ...data,
        status: StockAlertStatus.ACTIVE,
      },
      include: {
        part: true,
      },
    });
  }

  // 알림 설정 수정
  async updateAlert(id: string, data: Partial<StockAlert>) {
    return this.prisma.stockAlert.update({
      where: { id },
      data,
      include: {
        part: true,
      },
    });
  }

  // 알림 설정 삭제
  async deleteAlert(id: string) {
    return this.prisma.stockAlert.delete({
      where: { id },
    });
  }

  // 알림 상태 토글
  async toggleAlert(id: string) {
    const alert = await this.prisma.stockAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new Error('알림 설정을 찾을 수 없습니다.');
    }

    return this.prisma.stockAlert.update({
      where: { id },
      data: {
        status: alert.status === StockAlertStatus.ACTIVE
          ? StockAlertStatus.INACTIVE
          : StockAlertStatus.ACTIVE,
      },
    });
  }

  // 알림 이력 조회
  async getAlertHistory(params: {
    userId: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const { userId, startDate, endDate, status } = params;

    const where: any = {
      userId,
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
      ...(status && { status }),
    };

    return this.prisma.stockAlertHistory.findMany({
      where,
      include: {
        alert: {
          include: {
            part: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 재고 체크 및 알림 발송
  async checkAndSendAlerts() {
    // 활성화된 알림 설정 조회
    const activeAlerts = await this.prisma.stockAlert.findMany({
      where: {
        status: StockAlertStatus.ACTIVE,
      },
      include: {
        part: true,
        user: true,
      },
    });

    for (const alert of activeAlerts) {
      const { part, type, threshold, notificationChannels, user } = alert;

      let shouldSendAlert = false;

      // 알림 조건 체크
      switch (type) {
        case StockAlertType.LOW_STOCK:
          shouldSendAlert = part.currentStock <= threshold;
          break;
        case StockAlertType.HIGH_STOCK:
          shouldSendAlert = part.currentStock >= threshold;
          break;
        case StockAlertType.STOCK_OUT:
          shouldSendAlert = part.currentStock === 0;
          break;
      }

      if (shouldSendAlert) {
        // 알림 이력 생성
        const alertHistory = await this.prisma.stockAlertHistory.create({
          data: {
            alertId: alert.id,
            message: `[${part.name}] ${type}: 현재 재고 ${part.currentStock}개`,
            status: 'SENT',
          },
        });

        // 알림 채널별 발송
        for (const channel of notificationChannels) {
          switch (channel) {
            case 'EMAIL':
              await sendEmail({
                to: user.email,
                subject: '재고 알림',
                text: alertHistory.message,
              });
              break;
            case 'PUSH':
              await sendPushNotification({
                userId: user.id,
                title: '재고 알림',
                body: alertHistory.message,
              });
              break;
          }
        }
      }
    }
  }

  // 알림 통계
  async getAlertStats(userId: string) {
    const [totalAlerts, activeAlerts, alertHistory] = await Promise.all([
      this.prisma.stockAlert.count({
        where: { userId },
      }),
      this.prisma.stockAlert.count({
        where: {
          userId,
          status: StockAlertStatus.ACTIVE,
        },
      }),
      this.prisma.stockAlertHistory.findMany({
        where: {
          alert: {
            userId,
          },
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)), // 최근 30일
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      totalAlerts,
      activeAlerts,
      recentAlerts: alertHistory.length,
      alertHistory: alertHistory.map(history => ({
        id: history.id,
        message: history.message,
        status: history.status,
        createdAt: history.createdAt,
      })),
    };
  }
}

export default StockAlertService; 