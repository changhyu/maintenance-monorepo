#!/usr/bin/env node
/**
 * Prisma 클라이언트 생성 스크립트 개선 버전
 * 의존성 충돌 및 오류 처리 추가
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'prisma/schema.prisma');

console.log('Prisma 클라이언트 생성을 시작합니다...');
console.log(`스키마 파일 경로: ${schemaPath}`);

// schema.prisma 파일 존재 확인
try {
  if (!fs.existsSync(schemaPath)) {
    console.error('오류: schema.prisma 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
} catch (err) {
  console.error('오류: 스키마 파일 확인 중 예외 발생:', err);
  process.exit(1);
}

// 클라이언트 생성을 위한 명령어
const generateCommand = 'npx prisma generate --schema="' + schemaPath + '"';

console.log('실행할 명령어:', generateCommand);

// 명령 실행
exec(generateCommand, { cwd: rootDir }, (error, stdout, stderr) => {
  if (error) {
    console.error('Prisma 클라이언트 생성 중 오류가 발생했습니다:');
    console.error(error.message);
    console.error('표준 오류 출력:');
    console.error(stderr);
    
    if (error.message.includes('npm i @prisma/client')) {
      console.log('Prisma 클라이언트 패키지 설치를 시도합니다...');
      
      // Prisma 클라이언트 직접 설치 시도
      exec('npm install @prisma/client@5.10.2 --save-exact', { cwd: rootDir }, (installError, installStdout, installStderr) => {
        if (installError) {
          console.error('Prisma 클라이언트 설치 중 오류가 발생했습니다:');
          console.error(installError.message);
          process.exit(1);
        }
        
        console.log('Prisma 클라이언트가 설치되었습니다. 클라이언트 생성을 재시도합니다...');
        
        // 클라이언트 생성 재시도
        exec(generateCommand, { cwd: rootDir }, (retryError, retryStdout, retryStderr) => {
          if (retryError) {
            console.error('Prisma 클라이언트 재생성 중 오류가 발생했습니다:');
            console.error(retryError.message);
            process.exit(1);
          }
          
          console.log('Prisma 클라이언트가 성공적으로 생성되었습니다.');
          console.log(retryStdout);
        });
      });
      
      return;
    }
    
    process.exit(1);
  }
  
  console.log('Prisma 클라이언트가 성공적으로 생성되었습니다.');
  console.log(stdout);
});