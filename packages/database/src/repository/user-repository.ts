/**
 * 사용자 리포지토리 - N+1 문제 해결 및 쿼리 최적화 구현
 */
import { Prisma, User, UserRole } from '@prisma/client';
import { prisma } from '../index';
import { BaseQueryParams, IBaseRepository, PaginationOptions } from './base-repository';

// 사용자 필터 인터페이스
export interface UserFilter extends PaginationOptions {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  sortBy?: keyof User;
  sortDirection?: 'asc' | 'desc';
  includeProfile?: boolean;
  includeVehicles?: boolean;
  includeNotifications?: boolean;
}

// 사용자 생성 입력 타입
export type UserCreateInput = Omit<
  Prisma.UserCreateInput, 
  'profile' | 'vehicles' | 'notifications' | 'todos' | 'documents' | 'predictions' | 'mobileDevices' | 'securityLogs'
> & {
  profile?: {
    phone?: string;
    address?: string;
    company?: string;
    avatarURL?: string;
  };
};

// 사용자 업데이트 입력 타입
export type UserUpdateInput = Partial<Omit<UserCreateInput, 'email'>>;

/**
 * 사용자 리포지토리 클래스
 */
export class UserRepository implements IBaseRepository<User, string, UserCreateInput, UserUpdateInput> {
  /**
   * 모든 사용자 조회 - 페이지네이션, 필터링, N+1 최적화 포함
   */
  async findAll(filter?: UserFilter): Promise<{ data: User[]; total: number }> {
    const { skip = 0, take = 10 } = filter || {};
    const where = this.buildWhereClause(filter);
    
    // 정렬 옵션
    const orderBy: Prisma.Enumerable<Prisma.UserOrderByWithRelationInput> = 
      filter?.sortBy 
        ? { [filter.sortBy]: filter.sortDirection || 'asc' } 
        : { createdAt: 'desc' };
    
    // include 옵션 - N+1 문제 해결
    const include: Prisma.UserInclude = {};
    
    if (filter?.includeProfile) {
      include.profile = true;
    }
    
    if (filter?.includeVehicles) {
      include.vehicles = true;
    }
    
    if (filter?.includeNotifications) {
      include.notifications = {
        orderBy: { createdAt: 'desc' },
        take: 10,
      };
    }
    
    // 단일 트랜잭션에서 쿼리 실행 - 데이터베이스 라운드트립 최소화
    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        include: Object.keys(include).length > 0 ? include : undefined
      }),
      prisma.user.count({ where })
    ]);
    
    return { data, total };
  }
  
  /**
   * ID로 사용자 조회
   */
  async findById(id: string, includeRelations = true): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: includeRelations ? {
        profile: true,
        vehicles: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        notifications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          where: { isRead: false }
        }
      } : undefined
    });
  }
  
  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string, includeRelations = true): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: includeRelations ? {
        profile: true,
        vehicles: true,
        notifications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          where: { isRead: false }
        }
      } : undefined
    });
  }
  
  /**
   * 사용자 생성 - 프로필 포함
   */
  async create(data: UserCreateInput): Promise<User> {
    const { profile, ...userData } = data;
    
    return prisma.user.create({
      data: {
        ...userData,
        profile: profile ? {
          create: profile
        } : undefined
      },
      include: {
        profile: true
      }
    });
  }
  
  /**
   * 사용자 업데이트 - 프로필 포함
   */
  async update(id: string, data: UserUpdateInput): Promise<User | null> {
    const { profile, ...userData } = data;
    
    // 먼저 사용자가 존재하는지 확인
    const exists = await this.findById(id, false);
    if (!exists) return null;
    
    // 트랜잭션으로 사용자와 프로필 함께 업데이트
    return prisma.$transaction(async (tx) => {
      // 사용자 정보 업데이트
      const updatedUser = await tx.user.update({
        where: { id },
        data: userData
      });
      
      // 프로필 정보가 제공되면 upsert (생성 또는 업데이트)
      if (profile) {
        await tx.userProfile.upsert({
          where: { userId: id },
          create: {
            ...profile,
            userId: id
          },
          update: profile
        });
      }
      
      // 업데이트된 사용자와 프로필 정보 함께 반환
      return tx.user.findUnique({
        where: { id },
        include: {
          profile: true
        }
      });
    });
  }
  
  /**
   * 사용자 삭제 - 관련 데이터 일괄 삭제
   */
  async delete(id: string): Promise<boolean> {
    try {
      // 트랜잭션으로 사용자와 연관 데이터 일괄 삭제
      await prisma.$transaction([
        // 관련된 프로필 삭제
        prisma.userProfile.deleteMany({ where: { userId: id } }),
        
        // 관련된 알림 삭제
        prisma.notification.deleteMany({ where: { userId: id } }),
        
        // 관련된 할일 템플릿 아이템 삭제
        prisma.todoTemplateItem.deleteMany({
          where: {
            template: {
              userId: id
            }
          }
        }),
        
        // 관련된 할일 템플릿 삭제
        prisma.todoTemplate.deleteMany({ where: { userId: id } }),
        
        // 관련된 할일 삭제
        prisma.todo.deleteMany({ where: { userId: id } }),
        
        // 관련된 모바일 장치 삭제
        prisma.mobileDevice.deleteMany({ where: { userId: id } }),
        
        // 관련된 보안 로그 처리 (사용자 ID null로 설정)
        prisma.securityAuditLog.updateMany({
          where: { userId: id },
          data: { userId: null }
        }),
        
        // 사용자가 소유한 차량 업데이트
        prisma.vehicle.updateMany({
          where: { ownerID: id },
          data: { ownerID: null }
        }),
        
        // 마지막으로 사용자 삭제
        prisma.user.delete({ where: { id } })
      ]);
      
      return true;
    } catch (error) {
      console.error('사용자 삭제 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 사용자 수 카운트
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }
  
  /**
   * 사용자 활성화 상태 변경
   */
  async updateActiveStatus(id: string, isActive: boolean): Promise<User | null> {
    return this.update(id, { isActive });
  }
  
  /**
   * 사용자 역할 변경
   */
  async updateRole(id: string, role: UserRole): Promise<User | null> {
    return this.update(id, { role });
  }
  
  /**
   * 비밀번호 변경
   */
  async updatePassword(id: string, password: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: { passwordHash: password }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 특정 역할을 가진 사용자 조회
   */
  async findByRole(role: UserRole, filter?: PaginationOptions): Promise<{ data: User[]; total: number }> {
    const { skip = 0, take = 10 } = filter || {};
    
    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: { role },
        orderBy: { name: 'asc' },
        skip,
        take,
        include: {
          profile: true
        }
      }),
      prisma.user.count({
        where: { role }
      })
    ]);
    
    return { data, total };
  }
  
  /**
   * 검색 조건 생성
   */
  private buildWhereClause(filter?: UserFilter): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    
    if (!filter) return where;
    
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };
    if (filter.email) where.email = { contains: filter.email, mode: 'insensitive' };
    if (filter.role) where.role = filter.role;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    
    // 통합 검색
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { 
          profile: {
            OR: [
              { phone: { contains: filter.search, mode: 'insensitive' } },
              { company: { contains: filter.search, mode: 'insensitive' } }
            ]
          } 
        }
      ];
    }
    
    return where;
  }
}

// 리포지토리 인스턴스 싱글톤 생성
export const userRepository = new UserRepository();