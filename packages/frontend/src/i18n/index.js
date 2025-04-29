import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// 언어 리소스 로드
import koTranslations from './locales/ko.json';
import enTranslations from './locales/en.json';
// i18n 초기화
i18n
    // 브라우저 언어 감지
    .use(LanguageDetector)
    // React 통합
    .use(initReactI18next)
    .init({
    // 언어 리소스
    resources: {
        ko: {
            translation: koTranslations
        },
        en: {
            translation: enTranslations
        }
    },
    // 기본 언어 (로컬 스토리지에서 먼저 확인)
    lng: localStorage.getItem('language') || 'ko',
    // 언어 탐지 실패 시 폴백 언어
    fallbackLng: 'ko',
    // 디버깅 모드
    debug: process.env.NODE_ENV === 'development',
    // 인터폴레이션 설정
    interpolation: {
        escapeValue: false // React에서는 이미 XSS 방지 처리를 수행하므로 불필요
    },
    // 문자열 포맷 처리
    keySeparator: '.',
    // 누락된 번역 처리
    saveMissing: process.env.NODE_ENV === 'development',
    // 언어 변경 시 페이지 새로고침 방지
    react: {
        useSuspense: true,
        bindI18n: 'languageChanged',
        bindI18nStore: ''
    }
});
// 언어 변경 이벤트 감지
i18n.on('languageChanged', (lng) => {
    // 로컬 스토리지에 언어 설정 저장
    localStorage.setItem('language', lng);
    // HTML 언어 속성 업데이트
    document.documentElement.setAttribute('lang', lng);
    // 언어 방향 설정 (RTL 지원)
    document.documentElement.dir = ['ar', 'he'].includes(lng) ? 'rtl' : 'ltr';
});
export default i18n;
