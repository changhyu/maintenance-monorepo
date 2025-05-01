#!/usr/bin/env node

/**
 * 커스텀 빌드 스크립트
 * 웹팩 호환성 문제를 위한 환경 설정을 포함합니다.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// 필요한 모듈들이 설치되어 있는지 확인
const requiredModules = [
  'path-browserify', 
  'stream-browserify', 
  'buffer', 
  'util', 
  'url'
];

let missingModules = [];

requiredModules.forEach(module => {
  try {
    require.resolve(module);
  } catch (e) {
    missingModules.push(module);
  }
});

// 누락된 모듈 설치
if (missingModules.length > 0) {
  console.log(`필요한 모듈을 설치합니다: ${missingModules.join(', ')}`);
  try {
    execSync(`npm install --save-dev ${missingModules.join(' ')}`, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
  } catch (e) {
    console.error('모듈 설치 실패:', e);
    process.exit(1);
  }
}

console.log('빌드를 시작합니다...');

// src/polyfills.js 생성
const polyfillsPath = path.resolve(__dirname, '../src/polyfills.js');
const polyfillsContent = `
// 브라우저 환경을 위한 폴리필
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || require('buffer').Buffer;
  window.process = window.process || require('process/browser');
  window.util = window.util || require('util');
  window.url = window.url || require('url');
}
`;

try {
  fs.writeFileSync(polyfillsPath, polyfillsContent);
  console.log('폴리필 파일 생성 완료');
} catch (e) {
  console.error('폴리필 파일 생성 실패:', e);
}

// 빌드 실행
try {
  process.env.NODE_ENV = 'production';
  
  // 브라우저 환경에서 실행될 때만 필요한 모듈 처리
  execSync('npx cross-env GENERATE_SOURCEMAP=false npx craco build', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  console.log('빌드 성공!');
} catch (e) {
  console.error('빌드 실패:', e);
  process.exit(1);
} 