/**
 * 취약점 자동 패치 관리자
 * 
 * 이 모듈은 알려진 보안 취약점을 자동으로 감지하고 패치합니다.
 * Node.js의 모듈 캐시를 직접 조작하여 런타임에 취약한 모듈을 안전한 버전으로 교체합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as nodeModule from 'module';
import safeIp from '../network/safeIp';

// 타입 선언 - Node.js 내부 모듈을 위한 타입
// @ts-ignore - Node.js 내부 타입 참조
type ResolveFilenameFunction = (request: string, parent: NodeModule, isMain?: boolean, options?: any) => string;

// 확장된 Module 생성자 인터페이스
interface ModuleConstructor {
  _resolveFilename: ResolveFilenameFunction;
}

// 모듈 생성자 타입 캐스팅
// @ts-ignore - Node.js 내부 타입 접근
const Module = nodeModule as unknown as ModuleConstructor;

// 알려진 취약한 패키지와 관련 CVE 목록
const vulnerablePackages: Record<string, { cve: string[], patcher: (originalModule: any) => any }> = {
  'ip': {
    cve: ['CVE-2023-42282', 'CVE-2023-42283'],
    patcher: (originalModule) => {
      console.log('✅ ip 패키지에 보안 패치 적용 중...');
      
      // 원본 모듈의 모든 기능 복사
      const patchedModule = { ...originalModule };
      
      // 취약한 기능 안전한 버전으로 교체
      patchedModule.isPrivate = safeIp.isPrivate;
      patchedModule.isPublic = safeIp.isPublic;
      
      return patchedModule;
    }
  },
  // 추가 취약한 패키지들...
};

/**
 * Node.js 모듈 캐시에서 특정 모듈을 찾아 반환
 */
function findModuleInCache(name: string): NodeModule | undefined {
  const cache = require.cache;
  
  // 직접 이름으로 찾기
  if (cache[name]) {
    return cache[name];
  }
  
  // node_modules 디렉토리를 통해 찾기
  for (const key in cache) {
    if (key.includes(`/node_modules/${name}/`) && key.endsWith('index.js')) {
      return cache[key];
    }
    
    if (key.includes(`/node_modules/${name}`) && key.endsWith(`${name}.js`)) {
      return cache[key];
    }
  }
  
  return undefined;
}

/**
 * 모노레포 내의 모든 node_modules 디렉토리 찾기
 */
function findNodeModulesDirs(): string[] {
  const result: string[] = [];
  const baseDir = process.cwd();
  
  // 현재 작업 디렉토리에서 시작하여 모든 패키지 탐색
  function scanDir(dir: string) {
    try {
      if (fs.existsSync(path.join(dir, 'node_modules'))) {
        result.push(path.join(dir, 'node_modules'));
      }
      
      // packages 디렉토리가 있는지 확인
      const packagesDir = path.join(dir, 'packages');
      if (fs.existsSync(packagesDir)) {
        const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            scanDir(path.join(packagesDir, entry.name));
          }
        }
      }
    } catch (err) {
      console.error(`디렉토리 스캔 중 오류: ${err}`);
    }
  }
  
  scanDir(baseDir);
  return result;
}

/**
 * 특정 패키지가 설치되어 있는지 확인
 */
function isPackageInstalled(packageName: string): boolean {
  try {
    require.resolve(packageName);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 특정 패키지를 패치
 */
function patchPackage(packageName: string): boolean {
  if (!vulnerablePackages[packageName]) {
    return false;
  }
  
  const { patcher } = vulnerablePackages[packageName];
  
  try {
    // 모듈 불러오기 시도
    let originalModule;
    try {
      originalModule = require(packageName);
    } catch (e) {
      console.log(`⚠️ ${packageName} 패키지를 직접 불러올 수 없습니다. 모듈 캐시 검색 중...`);
      const cachedModule = findModuleInCache(packageName);
      
      if (cachedModule) {
        originalModule = cachedModule.exports;
      } else {
        console.log(`⚠️ ${packageName} 패키지를 찾을 수 없습니다.`);
        return false;
      }
    }
    
    // 안전한 패치 적용
    const patchedModule = patcher(originalModule);
    
    // 모듈 캐시에 패치된 버전 저장
    // Node.js 모듈 캐시를 직접 수정하여 향후 모든 require에 패치된 버전이 사용되도록 함
    const cachedModule = findModuleInCache(packageName);
    
    if (cachedModule) {
      cachedModule.exports = patchedModule;
      console.log(`✅ ${packageName} 패키지에 보안 패치가 적용되었습니다.`);
    } else {
      // 패키지 캐시에 없는 경우, 직접 require.cache에 추가
      let mainPath;
      try {
        mainPath = require.resolve(packageName);
      } catch (e) {
        console.log(`⚠️ ${packageName} 패키지의 경로를 찾을 수 없습니다.`);
        return false;
      }
      
      // 필요한 최소 속성만 포함하는 완전한 NodeModule 객체 생성
      const mockModule = {
        id: mainPath,
        filename: mainPath,
        loaded: true,
        exports: patchedModule,
        children: [],
        paths: [],
        path: path.dirname(mainPath),
        require: require,
        parent: null,
        isPreloading: false
      } as NodeModule;
      
      require.cache[mainPath] = mockModule;
      
      console.log(`✅ ${packageName}에 대한 새로운 보안 패치가 적용되었습니다.`);
    }
    
    // 몽키 패치: 모든 새로운 import에 패치된 버전이 사용되도록 함
    const originalResolver = Module._resolveFilename;
    Module._resolveFilename = function(request: string, parent: NodeModule, isMain?: boolean, options?: any): string {
      if (request === packageName) {
        // 이미 패치된 모듈이 있는 경우 해당 경로 반환
        const cachedModule = findModuleInCache(packageName);
        if (cachedModule) {
          return cachedModule.id;
        }
      }
      return originalResolver.call(this, request, parent, isMain, options);
    };
    
    return true;
  } catch (error) {
    console.error(`❌ ${packageName} 패치 중 오류 발생:`, error);
    return false;
  }
}

/**
 * 모든 알려진 취약한 패키지에 패치 적용
 */
export function applyAllPatches(): boolean {
  console.log('🛡️ 알려진 취약점 패치 적용 중...');
  
  let allSuccessful = true;
  const nodeModulesDirs = findNodeModulesDirs();
  
  console.log(`🔍 모노레포에서 ${nodeModulesDirs.length}개의 node_modules 디렉토리를 발견했습니다.`);
  
  // 모든 취약한 패키지에 대해 패치 시도
  for (const packageName in vulnerablePackages) {
    if (isPackageInstalled(packageName)) {
      const success = patchPackage(packageName);
      
      if (success) {
        console.log(`✅ ${packageName} 패키지 패치 성공 (${vulnerablePackages[packageName].cve.join(', ')})`);
      } else {
        console.error(`❌ ${packageName} 패키지 패치 실패`);
        allSuccessful = false;
      }
    }
  }
  
  if (allSuccessful) {
    console.log('✅ 모든 알려진 취약점이 성공적으로 패치되었습니다.');
  } else {
    console.warn('⚠️ 일부 패치가 적용되지 않았습니다.');
  }
  
  return allSuccessful;
}

/**
 * 특정 패키지에 대한 패치를 적용
 */
export function applyPatchForPackage(packageName: string): boolean {
  if (!vulnerablePackages[packageName]) {
    console.error(`❌ ${packageName}에 대한 패치가 정의되어 있지 않습니다.`);
    return false;
  }
  
  return patchPackage(packageName);
}

/**
 * 특정 패키지가 패치 적용 대상인지 확인
 */
export function isVulnerablePackage(packageName: string): boolean {
  return !!vulnerablePackages[packageName];
}

export default {
  applyAllPatches,
  applyPatchForPackage,
  isVulnerablePackage
};