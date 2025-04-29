/**
 * 정비 기록 리포지토리 - N+1 문제 해결 및 쿼리 최적화 구현
 */
import { Prisma, MaintenanceRecord, MaintenanceStatus } from '@prisma/client';
import { prisma } from '../index';
import { BaseQueryParams, IBaseRepository, PaginationOptions } from './base-repository';

// 정비 기록 필터 인터페이스
export interface MaintenanceFilter extends PaginationOptions {
  vehicleId?: string;
  status?: MaintenanceStatus;
  fromDate?: Date;
  toDate?: Date;
  performedBy?: string;
  sortBy?: keyof MaintenanceRecord;
  sortDirection?: 'asc' | 'desc';
  includeParts?: boolean;
  includeDocuments?: boolean;
  includeVehicle?: boolean;
}

// 정비 기록 생성 입력 타입
export type MaintenanceCreateInput = Omit<Prisma.MaintenanceRecordCreateInput, 'vehicle' | 'parts' | 'documents'> & {
  vehicleID: string;
  parts?: Array<{
    name: string;
    partNumber?: string;
    quantity: number;
    unitCost?: number;
    totalCost?: number;
  }>;
};

// 정비 기록 업데이트 입력 타입
export type MaintenanceUpdateInput = Partial<Omit<MaintenanceCreateInput, 'vehicleID'>>;

/**
 * 정비 기록 리포지토리 클래스
 * N+1 문제 해결 및 최적화된 쿼리 패턴 구현
 */
export class MaintenanceRepository implements IBaseRepository<MaintenanceRecord, string, MaintenanceCreateInput, MaintenanceUpdateInput> {
  /**
   * 모든 정비 기록 검색 - 페이지네이션, 필터링, N+1 최적화 포함
   */
  async findAll(filter?: MaintenanceFilter): Promise<{ data: MaintenanceRecord[]; total: number }> {
    const { skip = 0, take = 10 } = filter || {};
    const where = this.buildWhereClause(filter);
    
    // 정렬 옵션 설정
    const orderBy: Prisma.Enumerable<Prisma.MaintenanceRecordOrderByWithRelationInput> = 
      filter?.sortBy 
        ? { [filter.sortBy]: filter.sortDirection || 'asc' } 
        : { date: 'desc' };
    
    // include 옵션 - N+1 문제 해결을 위한 관계 필드 선택적 포함
    const include: Prisma.MaintenanceRecordInclude = {};
    
    if (filter?.includeVehicle) {
      include.vehicle = true;
    }
    
    if (filter?.includeParts) {
      include.parts = true;
    }
    
    if (filter?.includeDocuments) {
      include.documents = true;
    }
    
    // 단일 트랜잭션에서 쿼리 실행 - 데이터베이스 라운드트립 최소화
    const [data, total] = await prisma.$transaction([
      prisma.maintenanceRecord.findMany({
        where,
        orderBy,
        skip,
        take,
        include: Object.keys(include).length > 0 ? include : undefined
      }),
      prisma.maintenanceRecord.count({ where })
    ]);
    
    return { data, total };
  }
  
  /**
   * ID로 정비 기록 검색 - 관련 데이터 포함 최적화
   */
  async findById(id: string, includeRelations = true): Promise<MaintenanceRecord | null> {
    return prisma.maintenanceRecord.findUnique({
      where: { id },
      include: includeRelations ? {
        vehicle: true,
        parts: true,
        documents: true
      } : undefined
    });
  }
  
  /**
   * 정비 기록 생성 - 부품 정보 포함
   */
  async create(data: MaintenanceCreateInput): Promise<MaintenanceRecord> {
    const { parts, vehicleID, ...maintenanceData } = data;
    
    // 트랜잭션으로 정비 기록과 부품을 함께 생성
    return prisma.$transaction(async (tx) => {
      // 정비 기록 생성
      const maintenanceRecord = await tx.maintenanceRecord.create({
        data: {
          ...maintenanceData,
          vehicle: {
            connect: { id: vehicleID }
          }
        }
      });
      
      // 부품 정보가 있으면 추가
      if (parts && parts.length > 0) {
        await tx.maintenancePart.createMany({
          data: parts.map(part => ({
            maintenanceID: maintenanceRecord.id,
            name: part.name,
            partNumber: part.partNumber,
            quantity: part.quantity,
            unitCost: part.unitCost,
            totalCost: part.totalCost || (part.unitCost ? part.unitCost * part.quantity : null)
          }))
        });
      }
      
      // 생성된 정비 기록과 부품 정보를 함께 반환
      return tx.maintenanceRecord.findUnique({
        where: { id: maintenanceRecord.id },
        include: {
          parts: true
        }
      }) as Promise<MaintenanceRecord>;
    });
  }
  
  /**
   * 정비 기록 업데이트 - 부품 정보 포함
   */
  async update(id: string, data: MaintenanceUpdateInput): Promise<MaintenanceRecord | null> {
    const { parts, ...maintenanceData } = data;
    
    // 먼저 정비 기록이 존재하는지 확인
    const exists = await this.findById(id, false);
    if (!exists) return null;
    
    return prisma.$transaction(async (tx) => {
      // 정비 기록 업데이트
      const updatedRecord = await tx.maintenanceRecord.update({
        where: { id },
        data: maintenanceData
      });
      
      // 부품 정보가 있으면 기존 부품 삭제 후 새로 추가
      if (parts) {
        // 기존 부품 삭제
        await tx.maintenancePart.deleteMany({
          where: { maintenanceID: id }
        });
        
        // 새 부품 추가
        if (parts.length > 0) {
          await tx.maintenancePart.createMany({
            data: parts.map(part => ({
              maintenanceID: id,
              name: part.name,
              partNumber: part.partNumber,
              quantity: part.quantity,
              unitCost: part.unitCost,
              totalCost: part.totalCost || (part.unitCost ? part.unitCost * part.quantity : null)
            }))
          });
        }
      }
      
      // 업데이트된 정비 기록과 부품 정보를 함께 반환
      return tx.maintenanceRecord.findUnique({
        where: { id },
        include: {
          parts: true,
          documents: true
        }
      });
    });
  }
  
  /**
   * 정비 기록 삭제 - 관련 데이터 일괄 삭제 최적화
   */
  async delete(id: string): Promise<boolean> {
    try {
      // 트랜잭션을 사용하여 원자적 삭제 수행
      await prisma.$transaction([
        // 중첩 관계에서 시작하여 부모로 이동
        prisma.maintenancePart.deleteMany({
          where: { maintenanceID: id }
        }),
        prisma.maintenanceDocument.deleteMany({
          where: { maintenanceID: id }
        }),
        prisma.document.deleteMany({
          where: { maintenanceID: id }
        }),
        // 마지막으로 정비 기록 삭제
        prisma.maintenanceRecord.delete({ where: { id } })
      ]);
      
      return true;
    } catch (error) {
      console.error('정비 기록 삭제 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 정비 기록 수 카운트
   */
  async count(where?: Prisma.MaintenanceRecordWhereInput): Promise<number> {
    return prisma.maintenanceRecord.count({ where });
  }
  
  /**
   * 정비 기록 상태 업데이트
   */
  async updateStatus(id: string, status: MaintenanceStatus): Promise<MaintenanceRecord | null> {
    return this.update(id, { status });
  }
  
  /**
   * 차량별 정비 기록 조회
   */
  async findByVehicleId(vehicleId: string, filter?: PaginationOptions): Promise<{ data: MaintenanceRecord[]; total: number }> {
    const { skip = 0, take = 10 } = filter || {};
    
    const [data, total] = await prisma.$transaction([
      prisma.maintenanceRecord.findMany({
        where: { vehicleID: vehicleId },
        orderBy: { date: 'desc' },
        skip,
        take,
        include: {
          parts: true,
          documents: true
        }
      }),
      prisma.maintenanceRecord.count({
        where: { vehicleID: vehicleId }
      })
    ]);
    
    return { data, total };
  }
  
  /**
   * 예정된 정비 작업 조회
   */
  async findScheduledMaintenance(filter?: PaginationOptions): Promise<{ data: MaintenanceRecord[]; total: number }> {
    const { skip = 0, take = 10 } = filter || {};
    
    const today = new Date();
    
    const [data, total] = await prisma.$transaction([
      prisma.maintenanceRecord.findMany({
        where: { 
          status: 'SCHEDULED',
          date: { gte: today }
        },
        orderBy: { date: 'asc' },
        skip,
        take,
        include: {
          vehicle: true,
          parts: true
        }
      }),
      prisma.maintenanceRecord.count({
        where: { 
          status: 'SCHEDULED',
          date: { gte: today }
        }
      })
    ]);
    
    return { data, total };
  }
  
  /**
   * 여러 정비 기록 일괄 상태 업데이트 - 배치 처리
   */
  async bulkUpdateStatus(ids: string[], status: MaintenanceStatus): Promise<number> {
    const result = await prisma.maintenanceRecord.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
    
    return result.count;
  }
  
  /**
   * 필터링을 위한 WHERE 절 생성
   */
  private buildWhereClause(filter?: MaintenanceFilter): Prisma.MaintenanceRecordWhereInput {
    const where: Prisma.MaintenanceRecordWhereInput = {};
    
    if (!filter) return where;
    
    // 기본 필터
    if (filter.vehicleId) where.vehicleID = filter.vehicleId;
    if (filter.status) where.status = filter.status;
    if (filter.performedBy) where.performedBy = { contains: filter.performedBy, mode: 'insensitive' };
    
    // 날짜 범위 필터
    if (filter.fromDate || filter.toDate) {
      where.date = {};
      if (filter.fromDate) where.date.gte = filter.fromDate;
      if (filter.toDate) where.date.lte = filter.toDate;
    }
    
    return where;
  }
}

// 리포지토리 인스턴스 싱글톤 생성
export const maintenanceRepository = new MaintenanceRepository();