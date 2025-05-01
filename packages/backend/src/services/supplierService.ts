import { PrismaClient, Supplier, SupplierContact, SupplierRating } from '@prisma/client';

export class SupplierService {
  constructor(private prisma: PrismaClient) {}

  // 공급업체 목록 조회
  async getSuppliers(params: {
    search?: string;
    category?: string;
    status?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const {
      search,
      category,
      status,
      page,
      limit,
      sortBy,
      sortOrder
    } = params;

    const skip = (page - 1) * limit;

    // 검색 조건 구성
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { businessNumber: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    // 정렬 조건 구성
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          contacts: true,
          ratings: {
            orderBy: {
              date: 'desc',
            },
            take: 1,
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 공급업체 상세 정보 조회
  async getSupplierById(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: {
        contacts: true,
        ratings: {
          orderBy: {
            date: 'desc',
          },
        },
        parts: true,
        orders: {
          orderBy: {
            orderDate: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  // 공급업체 등록
  async createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.supplier.create({
      data,
      include: {
        contacts: true,
      },
    });
  }

  // 공급업체 정보 수정
  async updateSupplier(id: string, data: Partial<Supplier>) {
    return this.prisma.supplier.update({
      where: { id },
      data,
      include: {
        contacts: true,
      },
    });
  }

  // 공급업체 삭제
  async deleteSupplier(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }

  // 공급업체 연락처 등록
  async addSupplierContact(data: Omit<SupplierContact, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.supplierContact.create({
      data,
    });
  }

  // 공급업체 연락처 수정
  async updateSupplierContact(id: string, data: Partial<SupplierContact>) {
    return this.prisma.supplierContact.update({
      where: { id },
      data,
    });
  }

  // 공급업체 연락처 삭제
  async deleteSupplierContact(id: string) {
    return this.prisma.supplierContact.delete({
      where: { id },
    });
  }

  // 공급업체 평가 등록
  async rateSupplier(data: Omit<SupplierRating, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.supplierRating.create({
      data,
    });
  }

  // 공급업체 실적 분석
  async getSupplierPerformance(id: string, params: {
    startDate: string;
    endDate: string;
  }) {
    const { startDate, endDate } = params;

    const orders = await this.prisma.partOrder.findMany({
      where: {
        supplierId: id,
        orderDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        part: true,
      },
    });

    const ratings = await this.prisma.supplierRating.findMany({
      where: {
        supplierId: id,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // 주문 실적 계산
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.quantity * order.part.price), 0);
    const onTimeDelivery = orders.filter(order => order.deliveryDate <= order.expectedDeliveryDate).length;
    const onTimeDeliveryRate = totalOrders > 0 ? (onTimeDelivery / totalOrders) * 100 : 0;

    // 평가 점수 계산
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length
      : 0;

    return {
      totalOrders,
      totalAmount,
      onTimeDeliveryRate,
      averageRating,
      orderHistory: orders.map(order => ({
        id: order.id,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
        deliveryDate: order.deliveryDate,
        quantity: order.quantity,
        amount: order.quantity * order.part.price,
        status: order.status,
      })),
      ratingHistory: ratings.map(rating => ({
        id: rating.id,
        date: rating.date,
        score: rating.score,
        comment: rating.comment,
      })),
    };
  }
}

export default SupplierService; 