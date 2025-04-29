import { create } from 'zustand';

interface AnnouncerState {
  message: string;
  assertive: boolean;
  clearTime: number;
  announce: (text: string, isAssertive?: boolean, clearTime?: number) => void;
  clearAnnouncement: () => void;
}

/**
 * 화면 낭독기를 위한 라이브 리전 상태 관리 스토어
 * 동적으로 변경되는 콘텐츠를 화면 낭독기에게 알리기 위한 상태 관리
 */
export const useAnnouncerStore = create<AnnouncerState>((set, get) => ({
  message: '',
  assertive: false,
  clearTime: 3000,
  
  /**
   * 화면 낭독기에게 메시지를 알립니다
   * @param text 알릴 메시지
   * @param isAssertive 즉각적으로 알릴지 여부 (true: 즉시 읽음, false: 대기 후 읽음)
   * @param clearTime 메시지가 유지될 시간 (밀리초)
   */
  announce: (text: string, isAssertive = false, clearTime = 3000) => {
    // 이전 타이머가 있다면 제거
    const timerId = (get() as any)._timerId;
    if (timerId) {
      clearTimeout(timerId);
    }

    // 새 타이머 설정
    const newTimerId = setTimeout(() => {
      set({ message: '' });
    }, clearTime);

    // 상태 업데이트
    set({ 
      message: text, 
      assertive: isAssertive, 
      clearTime,
      _timerId: newTimerId 
    });
  },

  /**
   * 현재 표시된 메시지를 제거합니다
   */
  clearAnnouncement: () => {
    const timerId = (get() as any)._timerId;
    if (timerId) {
      clearTimeout(timerId);
    }
    set({ message: '', _timerId: undefined });
  }
}));