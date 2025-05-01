import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname 설정 (ES 모듈에서는 __dirname이 기본적으로 제공되지 않음)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// VAPID 키 생성
const vapidKeys = webpush.generateVAPIDKeys();

console.log('======================================================');
console.log('생성된 VAPID 키:');
console.log('======================================================');
console.log('공개 키:', vapidKeys.publicKey);
console.log('비공개 키:', vapidKeys.privateKey);
console.log('======================================================');

// .env.local 파일에 키 저장 (개발 환경용)
const envLocalPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

// 기존 파일이 있으면 내용을 읽어옴
if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf-8');
}

// VAPID 키 환경 변수가 이미 있는지 확인
const hasPublicKey = envContent.includes('VITE_VAPID_PUBLIC_KEY=');
const hasPrivateKey = envContent.includes('VITE_VAPID_PRIVATE_KEY=');

// 기존 환경 변수를 새 키로 교체하거나 없으면 추가
if (hasPublicKey) {
  envContent = envContent.replace(
    /VITE_VAPID_PUBLIC_KEY=.*/,
    `VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`
  );
} else {
  envContent += `\nVITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`;
}

if (hasPrivateKey) {
  envContent = envContent.replace(
    /VITE_VAPID_PRIVATE_KEY=.*/,
    `VITE_VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`
  );
} else {
  envContent += `\nVITE_VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;
}

// 파일에 저장
fs.writeFileSync(envLocalPath, envContent);

console.log(`.env.local 파일에 VAPID 키가 저장되었습니다: ${envLocalPath}`);
console.log('');
console.log('주의: 실제 프로덕션 환경에서는 이 키를 안전하게 관리하고');
console.log('배포 시스템에서 환경 변수로 설정하세요.');
console.log('');
console.log('환경 변수를 설정할 때:');
console.log('- VITE_VAPID_PUBLIC_KEY: 프론트엔드 환경 변수로 설정');
console.log('- 비공개 키는 백엔드 서버에서만 사용하고 안전하게 보관하세요.');