/**
 * 차량 모델 서비스
 */
import { Vehicle, VehicleStatus, VehicleType } from '@prisma/client';
import { 
  VehicleFilter as RepositoryFilter,
  VehicleRepository, 
  vehicleRepository, 
  queryOptimizer 
} from '../index';

// 차량 관련 타입 정의 (유지 - 하위 호환성)
interface MaintenanceRecord {
  id: string;
  vehicleID: string;
  date: Date;
  description: string;
  cost: number;
  // 기타 필요한 필드들
}

/**
 * 차량 필터 타입 정의 (유지 - 하위 호환성)
 */
export interface VehicleFilter {
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
}

/**
 * 차량 서비스 클래스 - 리팩토링 버전
 * 리포지토리 패턴을 사용하여 데이터 액세스 계층 분리
 */
export class VehicleService {
  private repository: VehicleRepository;

  constructor(repository = vehicleRepository) {
    this.repository = repository;
  }

  /**
   * 차량 목록 조회
   * N+1 문제를 해결하기 위한 최적화 적용
   */
  async getVehicles(filter?: VehicleFilter, skip = 0, take = 10): Promise<{
    vehicles: Vehicle[];
    total: number;
  }> {
    // 필터를 리포지토리 형식으로 변환
    const repositoryFilter: RepositoryFilter = {
      ...filter,
      skip,
      take,
      includeOwner: true,
      includeTelemetry: true
    };

    // 최적화된 리포지토리 메서드 호출
    const result = await this.repository.findAll(repositoryFilter);

    return {
      vehicles: result.data,
      total: result.total
    };
  }

  /**
   * 차량 상세 조회
   * 최적화된 관계 데이터 로딩
   */
  async getVehicleById(id: string, includeRelations = true): Promise<Vehicle | null> {
    return this.repository.findById(id, includeRelations);
  }

  /**
   * 차량 생성
   */
  async createVehicle(data: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    return this.repository.create(data);
  }

  /**
   * 차량 업데이트
   */
  async updateVehicle(id: string, data: Partial<Omit<Vehicle, 'id' | 'createdAt'>>): Promise<Vehicle | null> {
    return this.repository.update(id, data);
  }

  /**
   * 차량 삭제
   * 트랜잭션으로 최적화된 삭제 처리
   */
  async deleteVehicle(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * 차량 상태 변경
   */
  async updateVehicleStatus(id: string, status: VehicleStatus): Promise<Vehicle | null> {
    return this.repository.updateStatus(id, status);
  }

  /**
   * 차량의 정비 이력 조회
   * N+1 문제 해결을 위한 최적화 적용
   */
  async getVehicleMaintenanceHistory(
    vehicleId: string,
    skip = 0,
    take = 10
  ): Promise<{
    records: MaintenanceRecord[];
    total: number;
  }> {
    const result = await this.repository.getMaintenanceHistory(vehicleId, { skip, take });
    
    return {
      records: result.data as unknown as MaintenanceRecord[],
      total: result.total
    };
  }
  
  /**
   * 여러 차량 일괄 처리 (새로운 기능)
   * 배치 처리 최적화 사용
   */
  async processVehiclesBatch(vehicleIds: string[], processor: (vehicle: Vehicle) => Promise<any>): Promise<any[]> {
    const vehicles = await this.repository.findByIds(vehicleIds, false);
    
    return queryOptimizer.batchProcess(
      vehicles,
      async (batch) => {
        const results = [];
        for (const vehicle of batch) {
          results.push(await processor(vehicle));
        }
        return results;
      },
      { batchSize: 50, parallel: true, maxConcurrency: 5 }
    );
  }
  
  /**
   * 여러 차량 상태 일괄 업데이트 (새로운 기능)
   */
  async bulkUpdateStatus(vehicleIds: string[], status: VehicleStatus): Promise<number> {
    return this.repository.bulkUpdateStatus(vehicleIds, status);
  }
}

// 서비스 인스턴스 생성 및 내보내기
export const vehicleService = new VehicleService();