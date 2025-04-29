import { useState, useCallback } from 'react';

/**
 * 불리언 상태를 토글하는 간단한 유틸리티 훅
 * @param initialState 초기 상태 (기본값: false)
 * @returns [state, toggle, setTrue, setFalse] - 상태 및 상태 변경 함수
 */
export function useToggle(initialState = false): [
  boolean,
  () => void,
  () => void,
  () => void,
  (value: boolean) => void
] {
  const [state, setState] = useState<boolean>(initialState);

  // 상태 토글 함수
  const toggle = useCallback(() => {
    setState(prevState => !prevState);
  }, []);

  // 상태를 true로 설정하는 함수
  const setTrue = useCallback(() => {
    setState(true);
  }, []);

  // 상태를 false로 설정하는 함수
  const setFalse = useCallback(() => {
    setState(false);
  }, []);
  
  // 상태를 특정 값으로 설정하는 함수
  const setValue = useCallback((value: boolean) => {
    setState(value);
  }, []);

  return [state, toggle, setTrue, setFalse, setValue];
}

/**
 * 활성화/비활성화 상태를 토글하는 훅
 * @param initialState 초기 상태 (기본값: false)
 * @returns {
 *   isActive: boolean - 현재 상태
 *   toggle: () => void - 상태 토글 함수
 *   activate: () => void - 활성화 함수
 *   deactivate: () => void - 비활성화 함수
 *   set: (value: boolean) => void - 값 설정 함수
 * }
 */
export function useActive(initialState = false) {
  const [isActive, toggle, activate, deactivate, set] = useToggle(initialState);

  return {
    isActive,
    toggle,
    activate,
    deactivate,
    set,
  };
}

/**
 * 열기/닫기 상태를 토글하는 훅
 * @param initialState 초기 상태 (기본값: false)
 * @returns {
 *   isOpen: boolean - 현재 상태
 *   toggle: () => void - 상태 토글 함수
 *   open: () => void - 열기 함수
 *   close: () => void - 닫기 함수
 *   set: (value: boolean) => void - 값 설정 함수
 * }
 */
export function useDisclosure(initialState = false) {
  const [isOpen, toggle, open, close, set] = useToggle(initialState);

  return {
    isOpen,
    toggle,
    open,
    close,
    set,
  };
} 