import { useState, useEffect, useCallback } from 'react';
import { webSocketService, SocketStatus } from './WebSocketService';

/**
 * WebSocket 훅 옵션 인터페이스
 */
interface UseWebSocketOptions {
  /** 자동 연결 여부 */
  autoConnect?: boolean;
  /** 인증 토큰 */
  token?: string;
  /** 연결 상태 변경 시 호출될 콜백 */
  onStatusChange?: (status: SocketStatus) => void;
}

/**
 * WebSocket 사용을 위한 React 훅
 * 컴포넌트에서 WebSocket 연결을 쉽게 관리할 수 있게 합니다.
 * 
 * @param options - WebSocket 연결 옵션
 * @returns WebSocket 상태 및 제어 함수
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, token, onStatusChange } = options;
  
  // 소켓 상태 관리
  const [status, setStatus] = useState<SocketStatus>(webSocketService.getStatus());
  
  // 소켓 연결 함수
  const connect = useCallback(() => {
    webSocketService.initialize(token);
  }, [token]);
  
  // 소켓 연결 해제 함수
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);
  
  // 이벤트 리스너 등록 함수
  const on = useCallback((event: string, callback: (data: any) => void) => {
    return webSocketService.on(event, callback);
  }, []);
  
  // 이벤트 발송 함수
  const emit = useCallback((event: string, data?: any) => {
    return webSocketService.emit(event, data);
  }, []);
  
  // 컴포넌트 마운트 시 상태 구독 및 자동 연결 처리
  useEffect(() => {
    // 소켓 상태 변경 구독
    const unsubscribe = webSocketService.subscribeToStatus((newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    });
    
    // 자동 연결 설정이 있으면 소켓 연결
    if (autoConnect) {
      connect();
    }
    
    // 컴포넌트 언마운트 시 구독 해제 (연결은 유지)
    return () => {
      unsubscribe();
    };
  }, [autoConnect, connect, onStatusChange]);
  
  return {
    status,
    isConnected: status === SocketStatus.CONNECTED,
    connect,
    disconnect,
    on,
    emit
  };
}
