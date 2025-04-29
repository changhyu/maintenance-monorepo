import { useEffect, useRef, RefObject } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

/**
 * 특정 요소 외부를 클릭했을 때 콜백을 실행하는 훅
 * @param handler 외부 클릭 시 실행할 콜백 함수
 * @param active 이벤트 활성화 여부 (기본값: true)
 * @returns 감시할 요소에 연결할 ref
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  handler: Handler,
  active = true
): RefObject<T> {
  const ref = useRef<T>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const handleEvent = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      
      // 클릭된 요소가 ref 내부에 없는 경우에만 핸들러 호출
      if (!el || el.contains(event.target as Node) === false) {
        handler(event);
      }
    };
    
    // 이벤트 리스너 등록 (캡처링 페이즈에서)
    document.addEventListener('mousedown', handleEvent, true);
    document.addEventListener('touchstart', handleEvent, true);
    
    return () => {
      // 이벤트 리스너 제거
      document.removeEventListener('mousedown', handleEvent, true);
      document.removeEventListener('touchstart', handleEvent, true);
    };
  }, [handler, active]);
  
  return ref;
}

/**
 * 여러 요소 외부를 클릭했을 때 콜백을 실행하는 훅
 * @param handler 외부 클릭 시 실행할 콜백 함수
 * @param refs 감시할 요소들의 ref 배열
 * @param active 이벤트 활성화 여부 (기본값: true)
 */
export function useOutsideClickMultiple(
  handler: Handler,
  refs: RefObject<HTMLElement>[],
  active = true
): void {
  useEffect(() => {
    if (!active) return;
    
    const handleEvent = (event: MouseEvent | TouchEvent) => {
      // 모든 ref 확인
      const isOutside = refs.every(ref => {
        const el = ref.current;
        return !el || el.contains(event.target as Node) === false;
      });
      
      // 모든 ref 외부를 클릭한 경우에만 핸들러 호출
      if (isOutside) {
        handler(event);
      }
    };
    
    // 이벤트 리스너 등록 (캡처링 페이즈에서)
    document.addEventListener('mousedown', handleEvent, true);
    document.addEventListener('touchstart', handleEvent, true);
    
    return () => {
      // 이벤트 리스너 제거
      document.removeEventListener('mousedown', handleEvent, true);
      document.removeEventListener('touchstart', handleEvent, true);
    };
  }, [handler, refs, active]);
} 