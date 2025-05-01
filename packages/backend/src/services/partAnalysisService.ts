import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export class PartAnalysisService {
  constructor(private prisma: PrismaClient) {}

  // 재고 분석
  async getStockAnalysis(params: {
    startDate: string;
    category?: string;
  }) {
    const { startDate, category } = params;
    const where = category ? { category } : {};

    // 전체 부품 조회
    const parts = await this.prisma.maintenancePart.findMany({
      where,
      include: {
        usageHistory: {
          where: {
            date: {
              gte: new Date(startDate),
            },
          },
        },
      },
    });

    // 카테고리별 재고 현황
    const categoryStocks = await this.prisma.maintenancePart.groupBy({
      by: ['category'],
      where,
      _sum: {
        currentStock: true,
        minStock: true,
      },
    });

    // 재고 상태 분포 계산
    const stockStatus = parts.reduce((acc: any[], part) => {
      const status = part.currentStock <= part.minStock ? 'LOW'
        : part.currentStock <= part.minStock * 1.2 ? 'WARNING'
        : 'NORMAL';
      
      const statusIndex = acc.findIndex(item => item.name === status);
      if (statusIndex === -1) {
        acc.push({ name: status, value: 1 });
      } else {
        acc[statusIndex].value++;
      }
      return acc;
    }, []);

    // 재고 부족 예상 계산
    const lowStockPredictions = parts
      .filter(part => part.currentStock <= part.minStock * 1.2)
      .map(part => {
        const monthlyUsage = part.usageHistory.length > 0
          ? part.usageHistory.reduce((sum, usage) => sum + usage.quantity, 0) / 
            (new Date().getMonth() - new Date(startDate).getMonth() + 1)
          : 0;

        const daysUntilStockout = monthlyUsage > 0
          ? (part.currentStock / monthlyUsage) * 30
          : Infinity;

        return {
          id: part.id,
          name: part.name,
          currentStock: part.currentStock,
          minStock: part.minStock,
          expectedStockoutDate: new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000),
        };
      })
      .sort((a, b) => a.expectedStockoutDate.getTime() - b.expectedStockoutDate.getTime())
      .slice(0, 10);

    return {
      categoryStocks: categoryStocks.map(cs => ({
        category: cs.category,
        currentStock: cs._sum.currentStock,
        minStock: cs._sum.minStock,
      })),
      stockStatus,
      lowStockCount: parts.filter(p => p.currentStock <= p.minStock).length,
      lowStockPredictions,
    };
  }

  // 사용량 분석
  async getUsageAnalysis(params: {
    startDate: string;
    category?: string;
  }) {
    const { startDate, category } = params;
    const where = {
      ...(category && { part: { category } }),
      date: {
        gte: new Date(startDate),
      },
    };

    // 월별 사용량
    const monthlyUsage = await this.prisma.partUsage.groupBy({
      by: ['date'],
      where,
      _sum: {
        quantity: true,
      },
    });

    // 전체 사용량
    const totalUsage = await this.prisma.partUsage.aggregate({
      where,
      _sum: {
        quantity: true,
      },
    });

    // 월 수 계산
    const monthCount = new Date().getMonth() - new Date(startDate).getMonth() + 1;

    return {
      monthlyUsage: monthlyUsage.map(mu => ({
        month: format(mu.date, 'yyyy-MM'),
        quantity: mu._sum.quantity,
      })),
      averageMonthlyUsage: Math.round((totalUsage._sum.quantity || 0) / monthCount),
    };
  }

  // 비용 분석
  async getCostAnalysis(params: {
    startDate: string;
    category?: string;
  }) {
    const { startDate, category } = params;
    const where = category ? { category } : {};

    // 총 재고 금액
    const totalStockValue = await this.prisma.maintenancePart.aggregate({
      where,
      _sum: {
        currentStock: true,
        price: true,
      },
    });

    // 월별 발주 금액
    const monthlyOrders = await this.prisma.partOrder.groupBy({
      by: ['orderDate'],
      where: {
        ...(category && { part: { category } }),
        orderDate: {
          gte: new Date(startDate),
        },
      },
      _sum: {
        quantity: true,
      },
    });

    // 월 수 계산
    const monthCount = new Date().getMonth() - new Date(startDate).getMonth() + 1;

    // 총 발주 금액
    const totalOrderCost = await this.prisma.partOrder.aggregate({
      where: {
        ...(category && { part: { category } }),
        orderDate: {
          gte: new Date(startDate),
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return {
      totalStockValue: (totalStockValue._sum.currentStock || 0) * (totalStockValue._sum.price || 0),
      monthlyOrderCosts: monthlyOrders.map(mo => ({
        month: format(mo.orderDate, 'yyyy-MM'),
        cost: mo._sum.quantity,
      })),
      averageMonthlyOrderCost: Math.round((totalOrderCost._sum.quantity || 0) / monthCount),
    };
  }
}

export default PartAnalysisService; 