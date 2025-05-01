/**
 * IP 패키지 보안 패치 검증 스크립트
 * 
 * 이 스크립트는 IP 패키지의 보안 취약점이 제대로 패치되었는지 확인합니다.
 */

// 계획적으로 오류가 발생하더라도 계속 진행하기 위한 안전한 require
function safeRequire(packageName) {
  try {
    return require(packageName);
  } catch (e) {
    console.error(`패키지 로드 중 오류: ${packageName}`, e.message);
    return null;
  }
}

// IP 패키지 불러오기
const ip = safeRequire('ip');

if (!ip) {
  console.log('❌ IP 패키지를 찾을 수 없습니다.');
  process.exit(1);
}

// 테스트 케이스 정의
const testCases = [
  { ip: '10.0.0.1', type: 'RFC1918 사설', expectedPrivate: true },
  { ip: '172.16.0.1', type: 'RFC1918 사설', expectedPrivate: true },
  { ip: '192.168.1.1', type: 'RFC1918 사설', expectedPrivate: true },
  { ip: '100.64.0.1', type: 'RFC6598 CGN 사설', expectedPrivate: true },
  { ip: '192.0.2.1', type: 'RFC5737 문서용', expectedPrivate: true },
  { ip: '198.51.100.1', type: 'RFC5737 문서용', expectedPrivate: true },
  { ip: '203.0.113.1', type: 'RFC5737 문서용', expectedPrivate: true },
  { ip: '198.18.0.1', type: 'RFC2544 벤치마킹', expectedPrivate: true },
  { ip: '8.8.8.8', type: '공용 IP', expectedPrivate: false },
  { ip: '1.1.1.1', type: '공용 IP', expectedPrivate: false }
];

console.log('🔍 IP 패키지 보안 패치 검증 시작...\n');

let allPassed = true;
let privateTestsPassed = 0;
let publicTestsPassed = 0;

// 각 테스트 케이스 실행
testCases.forEach(testCase => {
  try {
    // isPrivate 테스트
    const isPrivateResult = ip.isPrivate(testCase.ip);
    const privateTestPassed = isPrivateResult === testCase.expectedPrivate;
    
    // isPublic 테스트 (isPrivate의 반대여야 함)
    const isPublicResult = ip.isPublic(testCase.ip);
    const publicTestPassed = isPublicResult !== testCase.expectedPrivate;
    
    // 결과 출력
    console.log(`IP: ${testCase.ip} (${testCase.type})`);
    console.log(`  isPrivate: ${isPrivateResult} (예상: ${testCase.expectedPrivate}) - ${privateTestPassed ? '✓' : '✗'}`);
    console.log(`  isPublic: ${isPublicResult} (예상: ${!testCase.expectedPrivate}) - ${publicTestPassed ? '✓' : '✗'}`);
    
    if (privateTestPassed) privateTestsPassed++;
    if (publicTestPassed) publicTestsPassed++;
    
    if (!privateTestPassed || !publicTestPassed) {
      allPassed = false;
    }
  } catch (e) {
    console.error(`테스트 실행 중 오류 (${testCase.ip}):`, e.message);
    allPassed = false;
  }
});

// 결과 요약
console.log(`\n📊 테스트 결과 요약:`);
console.log(`- isPrivate 테스트: ${privateTestsPassed}/${testCases.length} 통과`);
console.log(`- isPublic 테스트: ${publicTestsPassed}/${testCases.length} 통과`);
console.log(`\n🔒 보안 패치 상태: ${allPassed ? '✅ 정상 작동' : '❌ 문제 발생'}`);

if (allPassed) {
  console.log('✅ IP 패키지의 보안 취약점이 성공적으로 패치되었습니다.');
} else {
  console.log('❌ IP 패키지 패치에 문제가 있습니다. 코드를 검토하세요.');
}