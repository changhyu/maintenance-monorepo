/**
 * ip 패키지 취약점 직접 수정 스크립트
 * 
 * 이 스크립트는 취약한 ip 패키지의 코드를 직접 찾아서 수정합니다.
 * - 취약점: SSRF in isPublic/isPrivate 함수 (CVE-2023-42282, CVE-2023-42283)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ ip 패키지 취약점 직접 패치 시작...');

// Node.js 모듈 경로
const nodeModulesPath = path.join(__dirname, 'node_modules');

/**
 * 특정 디렉토리에서 ip 모듈의 lib/ip.js 파일 경로를 모두 찾는 함수
 */
function findIpLibFiles(dir) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  // 기본 ip 모듈 확인
  const mainIpLibPath = path.join(dir, 'ip/lib/ip.js');
  if (fs.existsSync(mainIpLibPath)) {
    results.push(mainIpLibPath);
  }
  
  // @react-native-community 경로에서 중첩된 ip 모듈 찾기
  const reactNativeCommPath = path.join(dir, '@react-native-community');
  if (fs.existsSync(reactNativeCommPath)) {
    try {
      const subDirs = fs.readdirSync(reactNativeCommPath);
      
      for (const subDir of subDirs) {
        const subNodeModulesPath = path.join(reactNativeCommPath, subDir, 'node_modules');
        
        if (fs.existsSync(subNodeModulesPath)) {
          const ipLibPath = path.join(subNodeModulesPath, 'ip/lib/ip.js');
          if (fs.existsSync(ipLibPath)) {
            results.push(ipLibPath);
          }
        }
      }
    } catch (err) {
      console.error(`@react-native-community 디렉토리 검색 중 오류: ${err.message}`);
    }
  }
  
  return results;
}

/**
 * ip.js 파일의 isPrivate과 isPublic 함수를 수정하는 함수
 */
function patchIpLibFile(filePath) {
  console.log(`🔧 패치 적용 중: ${filePath}`);
  
  try {
    // 파일 내용 읽기
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 백업 생성
    const backupPath = filePath + '.bak';
    fs.writeFileSync(backupPath, content);
    
    // isPrivate 함수 패치 - 누락된 프라이빗 IP 범위 추가
    content = content.replace(
      /function isPrivate\(addr\) \{[\s\S]*?return[\s\S]*?;[\s\S]*?\}/m,
      `function isPrivate(addr) {
  addr = ipaddr.parse(addr);
  var octets = addr.octets;
  return (addr.range() === 'private') || 
    // RFC6598
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    // RFC5737
    (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) ||
    (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
    (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) ||
    // RFC2544
    (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) ||
    // RFC3927
    (octets[0] === 169 && octets[1] === 254);
}`
    );
    
    // isPublic 함수 패치 - isPrivate의 반대로 정의
    content = content.replace(
      /function isPublic\(addr\) \{[\s\S]*?return[\s\S]*?;[\s\S]*?\}/m,
      `function isPublic(addr) {
  return !isPrivate(addr);
}`
    );
    
    // 패치된 내용 저장
    fs.writeFileSync(filePath, content);
    
    return true;
  } catch (error) {
    console.error(`❌ 패치 실패 (${filePath}): ${error.message}`);
    return false;
  }
}

// ip 모듈의 lib/ip.js 파일들 찾기
console.log('🔍 취약한 ip 패키지 파일 검색 중...');
const ipLibFiles = findIpLibFiles(nodeModulesPath);

if (ipLibFiles.length === 0) {
  console.log('⚠️ ip 패키지 파일을 찾을 수 없습니다.');
} else {
  console.log(`🔎 발견된 ip 패키지 파일: ${ipLibFiles.length}개`);
  
  // 발견된 모든 파일 패치
  let successCount = 0;
  for (const file of ipLibFiles) {
    const success = patchIpLibFile(file);
    if (success) {
      successCount++;
    }
  }
  
  console.log(`✅ ${successCount}/${ipLibFiles.length} 파일에 패치 적용 완료`);
}

// ip 패키지가 명시적으로 설치되어있지 않다면 패키지 설치
const ipPackagePath = path.join(nodeModulesPath, 'ip');
if (!fs.existsSync(ipPackagePath)) {
  console.log('📦 ip 패키지를 명시적으로 설치 중...');
  try {
    execSync('npm install ip@2.0.0 --save', { stdio: 'inherit' });
    console.log('✅ ip 2.0.0 패키지 설치 완료');
  } catch (error) {
    console.error('❌ ip 패키지 설치 실패');
  }
}

// package.json에 오버라이드 추가
try {
  console.log('📝 package.json에 오버라이드 추가 중...');
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = require(packageJsonPath);
  
  if (!packageJson.overrides) {
    packageJson.overrides = {};
  }
  
  packageJson.overrides.ip = '2.0.0';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json 업데이트 완료');
} catch (error) {
  console.error('❌ package.json 업데이트 실패:', error.message);
}

// 취약점 패치 확인 스크립트 생성
const verifyPatchPath = path.join(__dirname, 'verify-ip-patch.js');
const verifyPatchContent = `/**
 * ip 패키지 취약점 패치 검증 스크립트
 */
const ip = require('ip');

// 테스트 IP 주소들
const testCases = [
  { ip: '10.0.0.1', expectedPrivate: true },  // RFC1918 - 사설 IP
  { ip: '192.168.1.1', expectedPrivate: true },  // RFC1918 - 사설 IP
  { ip: '172.16.0.1', expectedPrivate: true },  // RFC1918 - 사설 IP
  { ip: '100.64.0.1', expectedPrivate: true },  // RFC6598 - CGN (취약점)
  { ip: '192.0.2.1', expectedPrivate: true },  // RFC5737 - 문서용 (취약점)
  { ip: '198.51.100.1', expectedPrivate: true },  // RFC5737 - 문서용 (취약점)
  { ip: '203.0.113.1', expectedPrivate: true },  // RFC5737 - 문서용 (취약점)
  { ip: '198.18.0.1', expectedPrivate: true },  // RFC2544 - 벤치마크용 (취약점)
  { ip: '8.8.8.8', expectedPrivate: false }  // 공용 IP
];

let allTestsPassed = true;
let patchStatus = '패치가 적용되었고 정상 작동합니다.';

console.log('🔍 ip 패키지 취약점 패치 검증 시작...');

// 테스트 케이스 실행
testCases.forEach(testCase => {
  const actualPrivate = ip.isPrivate(testCase.ip);
  const actualPublic = ip.isPublic(testCase.ip);
  
  const privateTestPassed = actualPrivate === testCase.expectedPrivate;
  const publicTestPassed = actualPublic !== testCase.expectedPrivate; // isPublic은 isPrivate의 반대여야 함
  
  console.log(\`IP: \${testCase.ip}\`);
  console.log(\`  isPrivate: \${actualPrivate} (예상: \${testCase.expectedPrivate}) - \${privateTestPassed ? '✅ 통과' : '❌ 실패'}\`);
  console.log(\`  isPublic: \${actualPublic} (예상: \${!testCase.expectedPrivate}) - \${publicTestPassed ? '✅ 통과' : '❌ 실패'}\`);
  
  if (!privateTestPassed || !publicTestPassed) {
    allTestsPassed = false;
    patchStatus = '패치가 적용되지 않았거나 정상 작동하지 않습니다.';
  }
});

console.log(\`\\n🔍 검증 결과: \${allTestsPassed ? '✅ 모든 테스트 통과' : '❌ 일부 테스트 실패'}\`);
console.log(\`📝 패치 상태: \${patchStatus}\`);
`;

fs.writeFileSync(verifyPatchPath, verifyPatchContent);
console.log('✅ 패치 검증 스크립트 생성 완료');

console.log(`
🎉 ip 패키지 패치 프로세스 완료!

📝 패치 상태를 확인하려면:
   node verify-ip-patch.js

📋 다음 단계:
1. 패치 검증 스크립트를 실행하여 취약점 수정을 확인합니다
2. npm audit 명령으로 취약점 감사를 다시 실행합니다
3. 앱이 정상적으로 작동하는지 확인합니다

⚠️ 참고: 취약점이 여전히 감지된다면 노드 모듈을 완전히 재설치하세요:
   rm -rf node_modules
   npm install
`);