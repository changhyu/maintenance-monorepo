/**
 * 중첩 종속성 패치 스크립트
 * 
 * 특히 React Native CLI 도구의 내부 종속성에서 사용하는 ip 패키지의 취약점을 해결합니다.
 * 이 스크립트는 node_modules 내의 취약한 ip 패키지를 안전한 버전으로 대체합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ 중첩 종속성 보안 패치 시작...');

// 패키지 경로 설정
const nodeModulesPath = path.join(__dirname, 'node_modules');

// 모든 ip 패키지 디렉토리 찾기
function findIpPackageDirs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      
      // ip 패키지 디렉토리인지 확인
      if (entry.name === 'ip' && fs.existsSync(path.join(fullPath, 'package.json'))) {
        results.push(fullPath);
      } 
      
      // node_modules 내에서만 재귀적으로 검색 (성능 개선)
      if (entry.name === 'node_modules') {
        findIpPackageDirs(fullPath, results);
      }
    }
  }
  
  return results;
}

// 안전한 ip 패키지 설치
console.log('📦 안전한 ip 패키지 설치 중...');
try {
  execSync('npm install ip@2.0.0 --save-exact', { stdio: 'inherit' });
  console.log('✅ 안전한 ip 2.0.0 버전 설치 완료');
} catch (error) {
  console.error('❌ ip 패키지 설치 실패:', error.message);
  process.exit(1);
}

// 안전한 ip 패키지 코드
const safeIpPath = path.join(nodeModulesPath, 'ip');
if (!fs.existsSync(safeIpPath)) {
  console.error('❌ 안전한 ip 패키지를 찾을 수 없습니다.');
  process.exit(1);
}

// 중첩된 모든 ip 패키지 찾기
console.log('🔍 취약한 ip 패키지 위치 탐색 중...');
const ipPackageDirs = findIpPackageDirs(path.join(nodeModulesPath, '@react-native-community'));

console.log(`🔎 발견된 ip 패키지: ${ipPackageDirs.length}개`);

// 발견된 각 ip 패키지를 안전한 버전으로 대체
let patchCount = 0;
ipPackageDirs.forEach(ipDir => {
  console.log(`🔄 패치 적용 중: ${ipDir}`);
  
  try {
    // 기존 디렉토리 백업
    const backupDir = `${ipDir}_backup`;
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.renameSync(ipDir, backupDir);
    
    // 안전한 버전으로 대체
    fs.mkdirSync(ipDir, { recursive: true });
    
    // 안전한 ip 패키지의 모든 파일 복사
    const copyFiles = (source, target) => {
      const entries = fs.readdirSync(source, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(target, entry.name);
        
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyFiles(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyFiles(safeIpPath, ipDir);
    
    // package.json 업데이트
    const packageJsonPath = path.join(ipDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = '2.0.0'; // 안전한 버전으로 업데이트
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    patchCount++;
    console.log(`✅ 패치 완료: ${ipDir}`);
  } catch (error) {
    console.error(`❌ 패치 실패 (${ipDir}):`, error.message);
  }
});

console.log(`\n🔒 중첩 종속성 보안 패치 완료. ${patchCount}개의 패키지에 패치를 적용했습니다.`);
console.log('\n📋 취약점 재확인을 위해 다음 명령어를 실행하세요:');
console.log('   npm audit\n');