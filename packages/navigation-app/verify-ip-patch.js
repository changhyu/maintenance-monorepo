/**
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
  
  console.log(`IP: ${testCase.ip}`);
  console.log(`  isPrivate: ${actualPrivate} (예상: ${testCase.expectedPrivate}) - ${privateTestPassed ? '✅ 통과' : '❌ 실패'}`);
  console.log(`  isPublic: ${actualPublic} (예상: ${!testCase.expectedPrivate}) - ${publicTestPassed ? '✅ 통과' : '❌ 실패'}`);
  
  if (!privateTestPassed || !publicTestPassed) {
    allTestsPassed = false;
    patchStatus = '패치가 적용되지 않았거나 정상 작동하지 않습니다.';
  }
});

console.log(`\n🔍 검증 결과: ${allTestsPassed ? '✅ 모든 테스트 통과' : '❌ 일부 테스트 실패'}`);
console.log(`📝 패치 상태: ${patchStatus}`);
