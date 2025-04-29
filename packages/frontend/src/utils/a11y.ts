/**
 * 접근성(A11y) 관련 유틸리티 함수
 */

/**
 * 스크린 리더에서만 읽히는 텍스트를 위한 스타일 객체
 * 화면에는 보이지 않지만 스크린 리더에는 읽힘
 */
export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
} as const;

/**
 * ARIA 속성을 위한 타입 정의
 */
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-details'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-atomic'?: boolean | 'true' | 'false';
  'aria-busy'?: boolean | 'true' | 'false';
  'aria-current'?: boolean | 'true' | 'false' | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-pressed'?: boolean | 'true' | 'false' | 'mixed';
  'aria-selected'?: boolean | 'true' | 'false';
  role?: string;
}

/**
 * 링크나 버튼 등의 상호작용 요소에 표준 키보드 이벤트 핸들러 추가
 * 엔터 및 스페이스바 키에 반응하도록 함
 * @param handler 클릭 핸들러 함수
 * @returns 키보드 이벤트 핸들러
 */
export const handleA11yClick = (handler: (event: React.KeyboardEvent | React.MouseEvent) => void) => 
  (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      handler(event);
    }
  };

/**
 * 포커스 순서를 특정 요소 그룹 내에서 트랩하는 함수
 * 모달과 같은 포커스 가능한 요소에서 포커스가 빠져나가지 않도록 함
 * @param containerRef 포커스를 가둘 컨테이너 ref
 * @param event 키보드 이벤트
 */
export const trapFocus = (
  containerRef: React.RefObject<HTMLElement>, 
  event: React.KeyboardEvent
) => {
  if (!containerRef.current || event.key !== 'Tab') return;

  const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) { // Shift + Tab
    if (document.activeElement === firstElement) {
      lastElement.focus();
      event.preventDefault();
    }
  } else { // Tab
    if (document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  }
};

/**
 * 포커스 그룹 내에서 화살표 키로 포커스 이동을 관리하는 함수
 * @param items 포커스 가능한 요소들의 배열
 * @param currentIndex 현재 포커스된 요소의 인덱스
 * @param event 키보드 이벤트
 * @returns 새 인덱스
 */
export const handleArrowKeyNavigation = (
  items: HTMLElement[], 
  currentIndex: number, 
  event: React.KeyboardEvent
): number => {
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = items.length - 1;
      break;
    default:
      return currentIndex;
  }

  items[newIndex]?.focus();
  return newIndex;
};

/**
 * 무한 스크롤이나 가상화된 목록에서 스크린리더에 업데이트를 알리는 함수
 * @param message 스크린 리더에 읽힐 메시지
 */
export const announceForScreenReader = (message: string): void => {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'assertive');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-atomic', 'true');
  Object.assign(announcer.style, srOnly);
  
  document.body.appendChild(announcer);
  
  // 스크린 리더가 변화를 감지할 수 있도록 조금 지연시킴
  setTimeout(() => {
    announcer.textContent = message;
    
    // 메시지가 읽힌 후 요소 제거
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 3000);
  }, 100);
};

/**
 * 상호작용 가능한 요소의 접근성 속성을 생성하는 함수
 * @param label 요소의 접근성 레이블
 * @param expanded 확장 상태
 * @param controls 컨트롤하는 요소의 ID
 * @returns 접근성 속성 객체
 */
export const getInteractiveA11yProps = (
  label: string,
  expanded?: boolean,
  controls?: string
): AriaAttributes => ({
  'aria-label': label,
  ...(expanded !== undefined && { 'aria-expanded': expanded }),
  ...(controls && { 'aria-controls': controls }),
});