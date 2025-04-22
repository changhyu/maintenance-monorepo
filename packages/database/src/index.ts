/**
 * 데이터베이스 패키지 진입점
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

// PrismaClient 인스턴스를 싱글톤으로 내보냄
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// 개발 환경에서 핫 리로드 사용 시 여러 인스턴스 생성 방지
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// 모델 타입 다시 내보내기
export * from '@prisma/client';

// Repository 및 유틸리티 내보내기
export * from './repository/base-repository';
export * from './repository/vehicle-repository';
export * from './repository/maintenance-repository';
export * from './repository/user-repository';
export * from './utils/query-optimizer';

// 데이터베이스 연결 테스트 유틸리티 함수
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}