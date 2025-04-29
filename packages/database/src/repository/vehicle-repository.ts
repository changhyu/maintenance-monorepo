/**
 * 차량 리포지토리 - N+1 문제 해결 및 쿼리 최적화 구현
 */
import { Prisma, Vehicle, VehicleStatus, VehicleType } from '@prisma/client';
import { prisma } from '../index';
import { BaseQueryParams, IBaseRepository, PaginationOptions } from './base-repository';

// 차량 필터 인터페이스
export interface VehicleFilter extends PaginationOptions {
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  status?: VehicleStatus;
  ownerId?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: keyof Vehicle;
  sortDirection?: 'asc' | 'desc';
  includeOwner?: boolean;
  includeTelemetry?: boolean; 
  includeDocuments?: boolean;
  includeMaintenanceRecords?: boolean;
  maintenanceRecordsLimit?: number;
}

// 차량 생성 입력 타입
export type VehicleCreateInput = Omit<Prisma.VehicleCreateInput, 'owner' | 'telemetry' | 'maintenanceRecords' | 'documents'> & {
  ownerID?: string;
};

// 차량 업데이트 입력 타입 
export type VehicleUpdateInput = Partial<Omit<VehicleCreateInput, 'vin'>>;

/**
 * 차량 리포지토리 클래스
 * N+1 문제 해결 및 최적화된 쿼리 패턴 구현
 */
export class VehicleRepository implements IBaseRepository<Vehicle, string, VehicleCreateInput, VehicleUpdateInput> {
  /**
   * 모든 차량 검색 - 페이지네이션, 필터링, N+1 최적화 포함
   */
  async findAll(filter?: VehicleFilter): Promise<{ data: Vehicle[]; total: number }> {
    const { skip = 0, take = 10 } = filter || {};
    const where = this.buildWhereClause(filter);
    
    // 정렬 옵션 설정
    const orderBy: Prisma.Enumerable<Prisma.VehicleOrderByWithRelationInput> = 
      filter?.sortBy 
        ? { [filter.sortBy]: filter.sortDirection || 'asc' } 
        : { createdAt: 'desc' };
    
    // include 옵션 - N+1 문제 해결을 위한 관계 필드 선택적 포함
    const include: Prisma.VehicleInclude = {};
    
    if (filter?.includeOwner) {
      include.owner = true;
    }
    
    if (filter?.includeTelemetry) {
      include.telemetries = true;
    }
    
    if (filter?.includeDocuments) {
      include.vehicleDocuments = true;
    }
    
    if (filter?.includeMaintenanceRecords) {
      include.maintenanceRecords = {
        orderBy: { date: 'desc' },
        take: filter.maintenanceRecordsLimit || 5,
        include: {
          // 중첩된 관계도 한 번의 쿼리로 가져오기 (N+1 방지)
          parts: true,
          documents: true
        }
      };
    }
    
    // 단일 트랜잭션에서 쿼리 실행 - 데이터베이스 라운드트립 최소화
    const [data, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where,
        orderBy,
        skip,
        take,
        include: Object.keys(include).length > 0 ? include : undefined
      }),
      prisma.vehicle.count({ where })
    ]);
    
    return { data, total };
  }
  
  /**
   * ID로 차량 검색 - 관련 데이터 포함 최적화
   */
  async findById(id: string, includeRelations = true): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: { id },
      include: includeRelations ? {
        owner: true,
        telemetries: true,
        vehicleDocuments: true,
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
          include: {
            parts: true,
            documents: true
          }
        },
      } : undefined
    });
  }
  
  /**
   * 차량 생성
   */
  async create(data: VehicleCreateInput): Promise<Vehicle> {
    const { ownerID, ...vehicleData } = data;
    
    return prisma.vehicle.create({
      data: {
        ...vehicleData,
        ...(ownerID ? { owner: { connect: { id: ownerID } } } : {})
      }
    });
  }
  
  /**
   * 차량 업데이트 
   */
  async update(id: string, data: VehicleUpdateInput): Promise<Vehicle | null> {
    const { ownerID, ...vehicleData } = data;
    
    // 먼저 차량이 존재하는지 확인
    const exists = await this.findById(id, false);
    if (!exists) return null;
    
    return prisma.vehicle.update({
      where: { id },
      data: {
        ...vehicleData,
        ...(ownerID !== undefined ? {
          owner: ownerID ? { connect: { id: ownerID } } : { disconnect: true }
        } : {})
      }
    });
  }
  
  /**
   * 차량 삭제 - 관련 데이터 일괄 삭제 최적화
   */
  async delete(id: string): Promise<boolean> {
    try {
      // 트랜잭션을 사용하여 원자적 삭제 수행
      await prisma.$transaction([
        prisma.maintenancePart.deleteMany({ where: { maintenance: { vehicleID: id } } }),
        prisma.maintenanceDocument.deleteMany({ where: { maintenance: { vehicleID: id } } }),
        prisma.maintenanceRecord.deleteMany({ where: { vehicleID: id } }),
        // TelemetryHistory는 Telemetry onDelete: Cascade로 자동 삭제
        prisma.telemetry.deleteMany({ where: { vehicleId: id } }),
        prisma.vehicleDocument.deleteMany({ where: { vehicleId: id } }),
        // generic Document는 MaintenanceRecord 관계로 삭제
        prisma.document.deleteMany({ where: { maintenance: { vehicleID: id } } }),
        // 마지막으로 차량 삭제
        prisma.vehicle.delete({ where: { id } })
      ]);
      
      return true;
    } catch (error) {
      console.error('차량 삭제 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 차량 수 카운트
   */
  async count(where?: Prisma.VehicleWhereInput): Promise<number> {
    return prisma.vehicle.count({ where });
  }
  
  /**
   * 차량 상태 업데이트
   */
  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle | null> {
    return this.update(id, { status });
  }
  
  /**
   * 차량별 정비 기록 조회 - 배치 처리 최적화
   */
  async getMaintenanceHistory(vehicleId: string, params?: BaseQueryParams) {
    const { skip = 0, take = 10 } = params || {};
    
    const [records, total] = await prisma.$transaction([
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
    
    return { data: records, total };
  }
  
  /**
   * 여러 차량 일괄 조회 - N+1 문제 해결
   */
  async findByIds(ids: string[], includeRelations = false): Promise<Vehicle[]> {
    return prisma.vehicle.findMany({
      where: { id: { in: ids } },
      include: includeRelations ? {
        owner: true,
        telemetries: true
      } : undefined
    });
  }
  
  /**
   * 여러 차량 상태 일괄 업데이트 - 배치 처리
   */
  async bulkUpdateStatus(ids: string[], status: VehicleStatus): Promise<number> {
    const result = await prisma.vehicle.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
    
    return result.count;
  }
  
  /**
   * 필터링을 위한 WHERE 절 생성
   */
  private buildWhereClause(filter?: VehicleFilter): Prisma.VehicleWhereInput {
    const where: Prisma.VehicleWhereInput = {};
    
    if (!filter) return where;
    
    // 기본 필터
    if (filter.make) where.make = { contains: filter.make, mode: 'insensitive' };
    if (filter.model) where.model = { contains: filter.model, mode: 'insensitive' };
    if (filter.year) where.year = filter.year;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.ownerId) where.ownerID = filter.ownerId;
    
    // 날짜 범위 필터
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = filter.fromDate;
      if (filter.toDate) where.createdAt.lte = filter.toDate;
    }
    
    // 통합 검색
    if (filter.search) {
      where.OR = [
        { make: { contains: filter.search, mode: 'insensitive' } },
        { model: { contains: filter.search, mode: 'insensitive' } },
        { vin: { contains: filter.search, mode: 'insensitive' } },
        { plate: { contains: filter.search, mode: 'insensitive' } }
      ];
    }
    
    return where;
  }
}

// 리포지토리 인스턴스 싱글톤 생성
export const vehicleRepository = new VehicleRepository();