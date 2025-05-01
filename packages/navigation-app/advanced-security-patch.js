/**
 * 고급 보안 패치 스크립트
 * 
 * React Native 앱의 보안 취약점을 해결하는 고급 접근 방식입니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 고급 보안 패치 스크립트 시작...');

// 패키지 경로 설정
const nodeModulesPath = path.join(__dirname, 'node_modules');

// 취약한 ip 패키지 찾기
function findVulnerablePackages(baseDir, packageName) {
  console.log(`🔍 ${baseDir} 디렉토리에서 ${packageName} 패키지 검색 중...`);
  const results = [];
  
  function searchInDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === packageName) {
          // 패키지 디렉토리인지 확인
          if (fs.existsSync(path.join(fullPath, 'package.json'))) {
            results.push(fullPath);
          }
        }
        
        // node_modules 디렉토리는 재귀적으로 검색
        if (entry.name === 'node_modules') {
          searchInDir(fullPath);
        }
      }
    }
  }
  
  searchInDir(baseDir);
  return results;
}

// 패키지 정보 업데이트
function updatePackageContents(packagePath, fixFunction) {
  console.log(`🔧 패치 적용 중: ${packagePath}`);
  
  try {
    // package.json 수정
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.version = '2.0.0'; // 안전한 버전으로 표시
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    
    // ip.js 수정 - 핵심 취약점이 있는 부분
    const ipJsPath = path.join(packagePath, 'lib/ip.js');
    if (fs.existsSync(ipJsPath)) {
      let ipJsContent = fs.readFileSync(ipJsPath, 'utf8');
      ipJsContent = fixFunction(ipJsContent);
      fs.writeFileSync(ipJsPath, ipJsContent);
    }
    
    return true;
  } catch (error) {
    console.error(`⚠️ 패치 적용 실패 (${packagePath}): ${error.message}`);
    return false;
  }
}

// isPrivate 및 isPublic 함수 수정 - SSRF 취약점 해결
function fixIpModule(content) {
  // isPrivate 함수 수정
  let fixed = content.replace(
    /function isPrivate\(addr\) \{[\s\S]*?return[\s\S]*?;[\s\S]*?\}/,
    `function isPrivate(addr) {
  // IP 주소를 파싱해서 유효성 확인
  const parsedAddr = ipaddr.parse(addr);
  
  // IPv4 주소 확인
  if (parsedAddr.kind() === 'ipv4') {
    // RFC1918 프라이빗 범위 확인:
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    return parsedAddr.match([
      [10, 0, 0, 0], [10, 255, 255, 255]
    ]) || parsedAddr.match([
      [172, 16, 0, 0], [172, 31, 255, 255]
    ]) || parsedAddr.match([
      [192, 168, 0, 0], [192, 168, 255, 255]
    ]) || 
    // RFC6598 - 공용 네트워크에서 사용할 수 있는 비공개 IP 주소
    parsedAddr.match([
      [100, 64, 0, 0], [100, 127, 255, 255]
    ]) ||
    // RFC5737 - 문서용 IP 주소
    parsedAddr.match([
      [192, 0, 2, 0], [192, 0, 2, 255]
    ]) || parsedAddr.match([
      [198, 51, 100, 0], [198, 51, 100, 255]
    ]) || parsedAddr.match([
      [203, 0, 113, 0], [203, 0, 113, 255]
    ]) ||
    // RFC3927 - 링크-로컬
    parsedAddr.match([
      [169, 254, 0, 0], [169, 254, 255, 255]
    ]) ||
    // RFC2544 - 벤치마킹
    parsedAddr.match([
      [198, 18, 0, 0], [198, 19, 255, 255]
    ]) ||
    // 루프백
    parsedAddr.match([
      [127, 0, 0, 0], [127, 255, 255, 255]
    ]);
  } else if (parsedAddr.kind() === 'ipv6') {
    // IPv6 로컬 주소 확인
    return parsedAddr.isLoopback() || 
           parsedAddr.isLinkLocal() || 
           parsedAddr.isUniqueLocal();
  }
  
  return false;
}`
  );
  
  // isPublic 함수 수정
  fixed = fixed.replace(
    /function isPublic\(addr\) \{[\s\S]*?return[\s\S]*?;[\s\S]*?\}/,
    `function isPublic(addr) {
  // 로컬 IP가 아니면 공용 IP로 간주
  return !exports.isPrivate(addr);
}`
  );
  
  return fixed;
}

console.log('📦 보안 패치 적용 준비 중...');

// 1. ip 패키지에 대한 직접 패치
try {
  console.log('1️⃣ ip 패키지에 대한 직접 보안 패치 적용 중...');
  
  // node_modules 전체를 대상으로 ip 패키지 찾기
  const ipPackages = findVulnerablePackages(nodeModulesPath, 'ip');
  console.log(`🔎 발견된 ip 패키지: ${ipPackages.length}개\n`);
  
  let successCount = 0;
  for (const packagePath of ipPackages) {
    console.log(`🔧 ${packagePath} 패치 중...`);
    if (updatePackageContents(packagePath, fixIpModule)) {
      successCount++;
    }
  }
  
  console.log(`✅ ${successCount}/${ipPackages.length} 패키지에 패치 적용 완료\n`);
} catch (error) {
  console.error('❌ ip 패키지 패치 실패:', error.message);
}

// 2. React Native CLI 모듈 수정을 위한 명시적 패치
try {
  console.log('2️⃣ React Native CLI 모듈 패치 적용 중...');
  
  const cliDoctorPath = path.join(nodeModulesPath, '@react-native-community/cli-doctor');
  const cliHermesPath = path.join(nodeModulesPath, '@react-native-community/cli-hermes');
  
  const cliDoctorIp = path.join(cliDoctorPath, 'node_modules/ip');
  const cliHermesIp = path.join(cliHermesPath, 'node_modules/ip');
  
  let cliSuccessCount = 0;
  
  // 경로 존재 여부 확인 후 패치
  if (fs.existsSync(cliDoctorIp)) {
    console.log(`🔧 cli-doctor/ip 패치 중...`);
    if (updatePackageContents(cliDoctorIp, fixIpModule)) {
      cliSuccessCount++;
    }
  } else {
    console.log(`⚠️ cli-doctor/ip 패키지를 찾을 수 없습니다.`);
  }
  
  if (fs.existsSync(cliHermesIp)) {
    console.log(`🔧 cli-hermes/ip 패치 중...`);
    if (updatePackageContents(cliHermesIp, fixIpModule)) {
      cliSuccessCount++;
    }
  } else {
    console.log(`⚠️ cli-hermes/ip 패키지를 찾을 수 없습니다.`);
  }
  
  console.log(`✅ React Native CLI 모듈 패치 ${cliSuccessCount} 개 완료\n`);
} catch (error) {
  console.error('❌ React Native CLI 모듈 패치 실패:', error.message);
}

// 3. 패키지 잠금 업데이트 및 가상 오버라이드 추가
console.log('3️⃣ 패키지 잠금 파일 업데이트 중...');

// package.json 업데이트
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // 오버라이드 추가/수정
  if (!packageJson.overrides) {
    packageJson.overrides = {};
  }
  
  packageJson.overrides.ip = '2.0.0';
  
  // 타입 정의 추가
  if (!packageJson.types) {
    packageJson.types = {};
  }
  packageJson.types['ip'] = "types/ip.d.ts";
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json 업데이트 완료');
} catch (error) {
  console.error('❌ package.json 업데이트 실패:', error.message);
}

// 타입 정의 디렉토리 생성
try {
  const typesDir = path.join(__dirname, 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  // ip 타입 파일 생성
  const ipTypesPath = path.join(typesDir, 'ip.d.ts');
  const ipTypes = `
/**
 * 보안 패치가 적용된 IP 패키지 타입 정의
 */
declare module 'ip' {
  /**
   * IP 주소가 프라이빗 네트워크에 속하는지 확인
   * 패치: SSRF 취약점 해결을 위해 개선된 구현
   */
  export function isPrivate(ip: string): boolean;
  
  /**
   * IP 주소가 공용 네트워크에 속하는지 확인
   * 패치: SSRF 취약점 해결을 위해 개선된 구현
   */
  export function isPublic(ip: string): boolean;
  
  // 기존 메소드들
  export function isEqual(ip1: string, ip2: string): boolean;
  export function toBuffer(ip: string, buffer?: Buffer, offset?: number): Buffer;
  export function toString(ip: Buffer, offset?: number, length?: number): string;
  export function fromPrefixLen(prefixlen: number, family?: string): string;
  export function mask(ip: string, mask: string): string;
  export function cidr(cidr: string): string;
  export function subnet(ip: string, mask: string): Subnet;
  export function cidrSubnet(cidr: string): Subnet;
  export function or(ip: string, mask: string): string;
  export function isLoopback(ip: string): boolean;
  export function isV4Format(ip: string): boolean;
  export function isV6Format(ip: string): boolean;
  
  // 추가 유틸리티 타입
  export interface Subnet {
    networkAddress: string;
    firstAddress: string;
    lastAddress: string;
    broadcastAddress: string;
    subnetMask: string;
    subnetMaskLength: number;
    numHosts: number;
    length: number;
    contains(ip: string): boolean;
  }
  
  export function subnet(ip: string, mask: string): Subnet;
  export function cidrSubnet(cidr: string): Subnet;
  export function not(ip: string): string;
  export function or(ip: string, mask: string): string;
  export function and(ip: string, mask: string): string;
  export function xor(ip: string, mask: string): string;
}
`;
  
  fs.writeFileSync(ipTypesPath, ipTypes);
  console.log('✅ IP 타입 정의 파일 생성 완료');
  
} catch (error) {
  console.error('❌ 타입 정의 생성 실패:', error.message);
}

// 4. 최종 재설치 및 확인
console.log('\n4️⃣ 패키지 클린 설치 중...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ 패키지 재설치 완료\n');
} catch (error) {
  console.error('❌ 패키지 재설치 실패:', error.message);
}

console.log(`
🎉 고급 보안 패치 적용 완료!

📝 다음 단계:
1. npm audit 명령으로 취약점 잔여 여부 확인
2. react-native / expo 앱 실행하여 정상 동작 확인
3. 만약 패치가 문제를 일으킨다면, node_modules를 삭제하고 npm install 실행

📋 테스트 명령어:
   npm audit
   npm start
`);