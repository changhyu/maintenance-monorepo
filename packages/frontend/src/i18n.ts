import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// 한국어 기본 번역
import koCommon from './locales/ko/common.json';
import koAuth from './locales/ko/auth.json';
import koVehicle from './locales/ko/vehicle.json';
import koMaintenance from './locales/ko/maintenance.json';
import koSettings from './locales/ko/settings.json';

// 영어 기본 번역
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enVehicle from './locales/en/vehicle.json';
import enMaintenance from './locales/en/maintenance.json';
import enSettings from './locales/en/settings.json';

// 리소스 번들
const resources = {
  ko: {
    common: koCommon,
    auth: koAuth,
    vehicle: koVehicle,
    maintenance: koMaintenance,
    settings: koSettings,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    vehicle: enVehicle,
    maintenance: enMaintenance,
    settings: enSettings,
  },
};

// 지원 언어 목록
export const supportedLanguages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

i18n
  // 백엔드 로드 (선택적, CDN이나 별도 서버에서 번역 파일을 로드하려는 경우)
  .use(Backend)
  // 브라우저 언어 감지
  .use(LanguageDetector)
  // React i18next 초기화
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'ko',
    fallbackLng: 'ko',
    
    // 네임스페이스
    ns: ['common', 'auth', 'vehicle', 'maintenance', 'settings'],
    defaultNS: 'common',
    
    // 번역 누락 시 키 출력
    keySeparator: '.',
    
    // 상호 운용성 (React에 최적화)
    interpolation: {
      escapeValue: false, // React에서는 XSS 방어가 내장되어 있음
    },
    
    // 로컬 스토리지에 선택한 언어 저장
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
    },
    
    // 개발 모드 디버깅
    debug: process.env.NODE_ENV !== 'production',
  });

// 언어 변경 유틸리티 함수
export const changeLanguage = (langCode: string) => {
  return i18n.changeLanguage(langCode)
    .then(() => {
      localStorage.setItem('language', langCode);
    });
};

// 번역 유틸리티 함수
export const t = (key: string, options?: Record<string, any>) => {
  return i18n.t(key, options);
};

export default i18n;