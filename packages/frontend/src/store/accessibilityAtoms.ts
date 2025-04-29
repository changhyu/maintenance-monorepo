import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

/**
 * 접근성 설정 인터페이스
 */
export interface AccessibilitySettings {
  // 고대비 모드
  highContrast: boolean;
  // 텍스트 크기 비율
  textSizeRatio: number;
  // 애니메이션 감소 설정
  reduceMotion: boolean;
  // 화면 낭독기 친화적 모드
  screenReaderMode: boolean;
  // 키보드 내비게이션 개선
  enhancedKeyboardNav: boolean;
}

/**
 * 기본 접근성 설정 값
 */
const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  textSizeRatio: 1,
  reduceMotion: false,
  screenReaderMode: false,
  enhancedKeyboardNav: false,
};

/**
 * 브라우저 저장소(localStorage)에 지속되는 접근성 설정 아톰
 * 사용자가 설정한 값이 브라우저 새로고침 후에도 유지됨
 */
export const accessibilitySettingsAtom = atomWithStorage<AccessibilitySettings>(
  'accessibility-settings',
  defaultSettings
);

/**
 * 시스템 접근성 감지 아톰
 * 시스템 설정의 접근성 선호도를 감지
 */
export const systemPreferencesAtom = atom<{
  prefersReducedMotion: boolean;
  prefersDarkColorScheme: boolean;
}>(get => {
  if (typeof window === 'undefined') {
    return { prefersReducedMotion: false, prefersDarkColorScheme: false };
  }

  // 시스템의 모션 감소 선호 여부 감지
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // 시스템의 다크 모드 선호 여부 감지
  const prefersDarkColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return { prefersReducedMotion, prefersDarkColorScheme };
});

/**
 * 접근성 설정 적용 여부 아톰
 * 사용자 설정과 시스템 선호도를 결합하여 최종적으로 적용될 설정 반환
 */
export const effectiveAccessibilitySettingsAtom = atom<AccessibilitySettings>(get => {
  const userSettings = get(accessibilitySettingsAtom);
  const systemPrefs = get(systemPreferencesAtom);

  return {
    ...userSettings,
    // 사용자가 설정했거나 시스템이 선호할 경우 모션 감소
    reduceMotion: userSettings.reduceMotion || systemPrefs.prefersReducedMotion,
  };
});

/**
 * 접근성 설정 업데이트 아톰
 * 특정 설정만 변경하기 위한 유틸리티 아톰
 */
export const updateAccessibilitySettingAtom = atom(
  null, // 읽기 함수 없음
  (get, set, update: Partial<AccessibilitySettings>) => {
    const currentSettings = get(accessibilitySettingsAtom);
    set(accessibilitySettingsAtom, {
      ...currentSettings,
      ...update,
    });
  }
);