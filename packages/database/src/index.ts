import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

// PrismaClient 싱글톤 인스턴스 생성 및 로그 활성화
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// 싱글톤 패턴을 위한 전역 변수 타입 선언
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// 개발 환경에서는 핫 리로딩을 위해 전역 객체에 저장, 
// 프로덕션에서는 모듈 스코프에 유지
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export * from '@prisma/client';
export { prisma };

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