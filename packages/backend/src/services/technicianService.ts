import { PrismaClient, Technician, TechnicianReview, TechnicianSchedule } from '@prisma/client';

export class TechnicianService {
  constructor(private prisma: PrismaClient) {}

  // 정비사 목록 조회
  async getTechnicians(params: {
    search?: string;
    status?: string;
    shopId?: string;
    specialty?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const {
      search,
      status,
      shopId,
      specialty,
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
        { employeeId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (shopId) {
      where.shopId = shopId;
    }

    if (specialty) {
      where.specialties = {
        some: {
          name: specialty
        }
      };
    }

    // 정렬 조건 구성
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [technicians, total] = await Promise.all([
      this.prisma.technician.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          specialties: true,
          certifications: true,
          shop: true,
        },
      }),
      this.prisma.technician.count({ where }),
    ]);

    return {
      technicians,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 정비사 상세 정보 조회
  async getTechnicianById(id: string) {
    return this.prisma.technician.findUnique({
      where: { id },
      include: {
        specialties: true,
        certifications: true,
        shop: true,
        reviews: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10,
        },
      },
    });
  }

  // 정비사 등록
  async createTechnician(data: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.technician.create({
      data,
      include: {
        specialties: true,
        certifications: true,
      },
    });
  }

  // 정비사 정보 수정
  async updateTechnician(id: string, data: Partial<Technician>) {
    return this.prisma.technician.update({
      where: { id },
      data,
      include: {
        specialties: true,
        certifications: true,
      },
    });
  }

  // 정비사 삭제
  async deleteTechnician(id: string) {
    return this.prisma.technician.delete({
      where: { id },
    });
  }

  // 정비사 실적 조회
  async getTechnicianPerformance(id: string, params: {
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = params;

    const where: any = {
      technicianId: id,
    };

    if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      };
    }

    const maintenances = await this.prisma.maintenance.findMany({
      where,
      include: {
        reviews: true,
      },
    });

    // 월별 통계 계산
    const monthlyStats = maintenances.reduce((acc: any, maintenance) => {
      const month = maintenance.date.toISOString().slice(0, 7);
      
      if (!acc[month]) {
        acc[month] = {
          month,
          completedCount: 0,
          satisfactionRate: 0,
          totalReviews: 0,
          averageCompletionTime: 0,
          totalCompletionTime: 0,
        };
      }

      acc[month].completedCount++;

      if (maintenance.reviews.length > 0) {
        const avgRating = maintenance.reviews.reduce((sum, review) => sum + review.rating, 0) / maintenance.reviews.length;
        acc[month].satisfactionRate = (acc[month].satisfactionRate * acc[month].totalReviews + avgRating) / (acc[month].totalReviews + 1);
        acc[month].totalReviews++;
      }

      if (maintenance.completedAt) {
        const completionTime = maintenance.completedAt.getTime() - maintenance.date.getTime();
        acc[month].totalCompletionTime += completionTime;
        acc[month].averageCompletionTime = acc[month].totalCompletionTime / acc[month].completedCount;
      }

      return acc;
    }, {});

    return Object.values(monthlyStats);
  }

  // 정비사 일정 조회
  async getTechnicianSchedule(id: string, params: {
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = params;

    const where: any = {
      technicianId: id,
    };

    if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      };
    }

    return this.prisma.technicianSchedule.findMany({
      where,
      include: {
        maintenance: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  // 정비사 평가 등록
  async createTechnicianReview(id: string, data: Omit<TechnicianReview, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.technicianReview.create({
      data: {
        ...data,
        technicianId: id,
      },
    });
  }

  // 정비사 자격증 관리
  async updateTechnicianCertifications(id: string, certifications: {
    name: string;
    issuedBy: string;
    issuedDate: Date;
    expiryDate?: Date;
  }[]) {
    // 기존 자격증 삭제
    await this.prisma.technicianCertification.deleteMany({
      where: { technicianId: id },
    });

    // 새 자격증 등록
    await this.prisma.technicianCertification.createMany({
      data: certifications.map(cert => ({
        ...cert,
        technicianId: id,
      })),
    });

    return this.getTechnicianById(id);
  }

  // 정비사 근무 일정 등록
  async createTechnicianSchedule(data: Omit<TechnicianSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prisma.technicianSchedule.create({
      data,
      include: {
        maintenance: true,
      },
    });
  }

  // 정비사 근무 일정 수정
  async updateTechnicianSchedule(id: string, data: Partial<TechnicianSchedule>) {
    return this.prisma.technicianSchedule.update({
      where: { id },
      data,
      include: {
        maintenance: true,
      },
    });
  }

  // 정비사 근무 일정 삭제
  async deleteTechnicianSchedule(id: string) {
    return this.prisma.technicianSchedule.delete({
      where: { id },
    });
  }
}

export default TechnicianService; 