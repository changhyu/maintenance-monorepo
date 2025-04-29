import { useAtom } from 'jotai';
import { CSSProperties, useMemo } from 'react';
import { effectiveAccessibilitySettingsAtom } from '../store/accessibilityAtoms';

/**
 * 접근성 스타일 반환 타입
 */
interface AccessibilityStyles {
  rootStyles: CSSProperties;
  textStyles: CSSProperties;
  focusStyles: CSSProperties;
  shouldReduceMotion: boolean;
  isScreenReaderActive: boolean;
}

/**
 * 접근성 설정에 기반한 스타일을 생성하는 커스텀 훅
 * 
 * 컴포넌트에서 이 훅을 사용하여 접근성 설정에 따라 스타일을 동적으로 적용할 수 있습니다.
 * 
 * @example
 * ```tsx
 * const MyComponent: React.FC = () => {
 *   const { rootStyles, textStyles, focusStyles, shouldReduceMotion } = useAccessibilityStyles();
 *   
 *   return (
 *     <div style={rootStyles}>
 *       <p style={textStyles}>접근성이 향상된 텍스트</p>
 *       <button style={focusStyles}>포커스 스타일이 적용된 버튼</button>
 *     </div>
 *   );
 * };
 * ```
 */
export const useAccessibilityStyles = (): AccessibilityStyles => {
  const [settings] = useAtom(effectiveAccessibilitySettingsAtom);
  
  // 설정에 따라 동적으로 스타일 계산
  return useMemo(() => {
    // 루트 스타일 (앱 전체에 적용할 수 있는 스타일)
    const rootStyles: CSSProperties = {
      // 고대비 모드 설정
      ...(settings.highContrast && {
        backgroundColor: '#000',
        color: '#fff',
      }),
    };

    // 텍스트 관련 스타일
    const textStyles: CSSProperties = {
      // 텍스트 크기 설정
      fontSize: `${settings.textSizeRatio * 100}%`,
      // 고대비 모드에서의 텍스트 개선
      ...(settings.highContrast && {
        color: '#fff',
        textShadow: 'none',
      }),
    };

    // 포커스 관련 스타일 (키보드 네비게이션 개선)
    const focusStyles: CSSProperties = {
      // 향상된 키보드 네비게이션 설정
      ...(settings.enhancedKeyboardNav && {
        outlineWidth: '3px',
        outlineStyle: 'solid',
        outlineColor: settings.highContrast ? '#fff' : '#4a90e2',
        outlineOffset: '2px',
      }),
    };

    return {
      rootStyles,
      textStyles,
      focusStyles,
      shouldReduceMotion: settings.reduceMotion,
      isScreenReaderActive: settings.screenReaderMode,
    };
  }, [settings]);
};

/**
 * 애니메이션 및 전환 효과에 대한 접근성 설정을 적용하는 함수
 * 모션 감소가 설정된 경우 애니메이션을 제거하거나 단순화
 */
export const getReducedMotionStyles = (shouldReduceMotion: boolean): CSSProperties => {
  if (!shouldReduceMotion) {
    return {};
  }
  
  return {
    transition: 'none !important',
    animation: 'none !important',
    transform: 'none !important',
  };
};