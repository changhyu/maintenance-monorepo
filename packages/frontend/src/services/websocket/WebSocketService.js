import { io } from 'socket.io-client';
import { validateEnv } from '../../utils/validateEnv';
/**
 * 소켓 상태 열거형
 */
export var SocketStatus;
(function (SocketStatus) {
    SocketStatus["CONNECTING"] = "connecting";
    SocketStatus["CONNECTED"] = "connected";
    SocketStatus["DISCONNECTED"] = "disconnected";
    SocketStatus["ERROR"] = "error";
})(SocketStatus || (SocketStatus = {}));
/**
 * WebSocket 서비스 클래스
 * 실시간 통신을 위한 소켓 연결을 관리합니다.
 */
class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectInterval = 5000; // 5초 간격으로 재연결 시도
        this.reconnectTimer = null;
        this.listeners = new Map();
        this.status = SocketStatus.DISCONNECTED;
        this.statusListeners = [];
    }
    /**
     * 소켓 연결 초기화
     * @param token - 인증 토큰 (선택적)
     */
    initialize(token) {
        // 이미 소켓이 존재하면 기존 연결 종료
        if (this.socket) {
            this.disconnect();
        }
        // 필수 환경 변수 검증
        try {
            validateEnv(['VITE_SOCKET_URL']);
        }
        catch (error) {
            console.error('WebSocket 초기화 실패:', error);
            this.setStatus(SocketStatus.ERROR);
            return;
        }
        // 소켓 연결 상태 설정
        this.setStatus(SocketStatus.CONNECTING);
        // 소켓 객체 생성 및 연결
        this.socket = io(import.meta.env.VITE_SOCKET_URL, {
            reconnection: false, // 자체 재연결 로직 사용
            auth: token ? { token } : undefined,
            transports: ['websocket', 'polling']
        });
        // 이벤트 리스너 등록
        this.setupEventListeners();
    }
    /**
     * 소켓 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (!this.socket)
            return;
        // 연결 성공 이벤트
        this.socket.on('connect', () => {
            console.log('WebSocket 연결 성공');
            this.setStatus(SocketStatus.CONNECTED);
            // 재연결 타이머가 존재하면 제거
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        });
        // 연결 실패 이벤트
        this.socket.on('connect_error', (error) => {
            console.error('WebSocket 연결 오류:', error);
            this.setStatus(SocketStatus.ERROR);
            this.scheduleReconnect();
        });
        // 연결 종료 이벤트
        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket 연결 종료. 이유:', reason);
            this.setStatus(SocketStatus.DISCONNECTED);
            // 서버가 연결을 종료한 경우에만 재연결 시도
            if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
                this.scheduleReconnect();
            }
        });
        // 오류 이벤트
        this.socket.on('error', (error) => {
            console.error('WebSocket 오류:', error);
            this.setStatus(SocketStatus.ERROR);
        });
    }
    /**
     * 소켓 상태 설정 및 리스너 호출
     */
    setStatus(status) {
        this.status = status;
        this.statusListeners.forEach(listener => listener(status));
    }
    /**
     * 소켓 재연결 스케줄링
     */
    scheduleReconnect() {
        // 이미 재연결 타이머가 있으면 중복 예약 방지
        if (this.reconnectTimer)
            return;
        console.log(`${this.reconnectInterval / 1000}초 후 WebSocket 재연결 시도`);
        this.reconnectTimer = setTimeout(() => {
            console.log('WebSocket 재연결 시도 중...');
            this.reconnectTimer = null;
            this.initialize();
        }, this.reconnectInterval);
    }
    /**
     * 소켓 연결 상태 구독
     * @param listener - 상태 변경 시 호출될 콜백 함수
     * @returns 구독 해제 함수
     */
    subscribeToStatus(listener) {
        this.statusListeners.push(listener);
        // 현재 상태 즉시 알림
        listener(this.status);
        // 구독 해제 함수 반환
        return () => {
            this.statusListeners = this.statusListeners.filter(l => l !== listener);
        };
    }
    /**
     * 특정 이벤트에 대한 리스너 등록
     * @param event - 이벤트 이름
     * @param callback - 이벤트 발생 시 호출될 콜백 함수
     * @returns 리스너 해제 함수
     */
    on(event, callback) {
        if (!this.socket) {
            console.error('WebSocket이 초기화되지 않았습니다.');
            return () => { };
        }
        // 이벤트 리스너 맵에 콜백 추가
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
            // 소켓에 실제 이벤트 리스너 등록
            this.socket.on(event, (data) => {
                const callbacks = this.listeners.get(event);
                if (callbacks) {
                    callbacks.forEach(cb => cb(data));
                }
            });
        }
        const callbacks = this.listeners.get(event);
        callbacks?.add(callback);
        // 리스너 해제 함수 반환
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
                // 더 이상 콜백이 없으면 소켓에서 이벤트 리스너 제거
                if (callbacks.size === 0) {
                    this.listeners.delete(event);
                    this.socket?.off(event);
                }
            }
        };
    }
    /**
     * 서버로 이벤트 발송
     * @param event - 이벤트 이름
     * @param data - 전송할 데이터
     * @returns 발송 성공 여부
     */
    emit(event, data) {
        if (!this.socket || this.status !== SocketStatus.CONNECTED) {
            console.error('WebSocket이 연결되지 않았습니다.');
            return false;
        }
        try {
            this.socket.emit(event, data);
            return true;
        }
        catch (error) {
            console.error('WebSocket 이벤트 발송 오류:', error);
            return false;
        }
    }
    /**
     * 소켓 연결 종료
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        // 재연결 타이머가 있으면 제거
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.setStatus(SocketStatus.DISCONNECTED);
        this.listeners.clear();
    }
    /**
     * 현재 연결 상태 확인
     * @returns 현재 소켓 상태
     */
    getStatus() {
        return this.status;
    }
    /**
     * 현재 연결 활성화 여부 확인
     * @returns 연결 활성화 여부
     */
    isConnected() {
        return this.status === SocketStatus.CONNECTED;
    }
}
// 싱글톤 인스턴스 생성 및 내보내기
export const webSocketService = new WebSocketService();
