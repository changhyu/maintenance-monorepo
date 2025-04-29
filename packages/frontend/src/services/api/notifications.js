/**
 * API 알림 관련 유틸리티 함수
 */
// 사용자에게 토스트 알림을 보여주기 위한 DOM 요소 ID
const TOAST_CONTAINER_ID = 'api-toast-container';
/**
 * Toast 알림 컨테이너 생성 또는 가져오기
 * @returns Toast 컨테이너 DOM 요소
 */
function getOrCreateToastContainer() {
    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = TOAST_CONTAINER_ID;
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    return container;
}
/**
 * Toast 알림 생성
 * @param message 알림 메시지
 * @param type 알림 타입 (info, success, warning, error)
 * @param timeout 자동 닫힘 시간 (밀리초)
 */
export function showToast(message, type = 'info', timeout = 5000) {
    const container = getOrCreateToastContainer();
    // 토스트 요소 생성
    const toast = document.createElement('div');
    toast.className = `api-toast api-toast-${type}`;
    toast.style.padding = '10px 15px';
    toast.style.marginBottom = '10px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    toast.style.display = 'flex';
    toast.style.justifyContent = 'space-between';
    toast.style.alignItems = 'center';
    toast.style.minWidth = '250px';
    toast.style.maxWidth = '400px';
    toast.style.animation = 'fadeIn 0.3s ease-in-out';
    // 배경색 설정
    switch (type) {
        case 'success':
            toast.style.backgroundColor = '#4caf50';
            toast.style.color = 'white';
            break;
        case 'warning':
            toast.style.backgroundColor = '#ff9800';
            toast.style.color = 'white';
            break;
        case 'error':
            toast.style.backgroundColor = '#f44336';
            toast.style.color = 'white';
            break;
        default:
            toast.style.backgroundColor = '#2196f3';
            toast.style.color = 'white';
    }
    // 메시지 내용
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => container.removeChild(toast);
    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);
    // 자동 닫기
    if (timeout > 0) {
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, timeout);
    }
}
/**
 * 오프라인 모드 알림
 */
export function notifyOfflineMode() {
    showToast('오프라인 모드로 전환되었습니다. 네트워크 연결을 확인해주세요.', 'warning', 10000);
    // 개발 환경에서 로그 출력
    if (process.env.NODE_ENV === 'development') {
        console.warn('[API] 오프라인 모드가 활성화되었습니다. 로컬 데이터만 사용 가능합니다.');
    }
}
/**
 * 서버 오류 알림
 * @param status HTTP 상태 코드
 * @param data 오류 데이터
 */
export function notifyServerError(status, data) {
    let message = '서버 오류가 발생했습니다.';
    if (data && typeof data === 'object' && data.message) {
        message = `서버 오류: ${data.message}`;
    }
    showToast(message, 'error', 10000);
    // 개발 환경에서 상세 로그 출력
    if (process.env.NODE_ENV === 'development') {
        console.error('[API] 서버 오류:', { status, data });
    }
}
/**
 * 인증 오류 알림
 */
export function notifyAuthError() {
    showToast('인증 세션이 만료되었습니다. 다시 로그인해주세요.', 'error', 8000);
}
/**
 * 동기화 성공 알림
 * @param count 동기화된 항목 수
 */
export function notifySyncSuccess(count) {
    showToast(`${count}개의 항목이 성공적으로 동기화되었습니다.`, 'success', 5000);
}
