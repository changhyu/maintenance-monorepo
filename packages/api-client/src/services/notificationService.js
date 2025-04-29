export var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "INFO";
    NotificationType["WARNING"] = "WARNING";
    NotificationType["ERROR"] = "ERROR";
    NotificationType["SUCCESS"] = "SUCCESS";
})(NotificationType || (NotificationType = {}));
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["MEDIUM"] = "MEDIUM";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["URGENT"] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export var NotificationCategory;
(function (NotificationCategory) {
    NotificationCategory["SYSTEM"] = "SYSTEM";
    NotificationCategory["MAINTENANCE"] = "MAINTENANCE";
    NotificationCategory["VEHICLE"] = "VEHICLE";
    NotificationCategory["USER"] = "USER";
    NotificationCategory["SHOP"] = "SHOP";
    NotificationCategory["PAYMENT"] = "PAYMENT";
    NotificationCategory["REPORT"] = "REPORT";
})(NotificationCategory || (NotificationCategory = {}));
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["UNREAD"] = "UNREAD";
    NotificationStatus["READ"] = "READ";
    NotificationStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    NotificationStatus["ARCHIVED"] = "ARCHIVED";
})(NotificationStatus || (NotificationStatus = {}));
export class NotificationService {
    constructor(apiClient) {
        this.basePath = '/notifications';
        this.socketConnection = null;
        this.socketListeners = new Map();
        this.client = apiClient;
    }
    // 알림 목록 조회
    async getNotifications(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 특정 알림 조회
    async getNotificationById(notificationId) {
        return this.client.get(`${this.basePath}/${notificationId}`);
    }
    // 새 알림 생성
    async createNotification(notificationData) {
        return this.client.post(this.basePath, notificationData);
    }
    // 알림 업데이트
    async updateNotification(notificationId, updateData) {
        return this.client.put(`${this.basePath}/${notificationId}`, updateData);
    }
    // 알림 삭제
    async deleteNotification(notificationId) {
        await this.client.delete(`${this.basePath}/${notificationId}`);
        return true;
    }
    // 알림을 읽음으로 표시
    async markAsRead(notificationId) {
        return this.client.put(`${this.basePath}/${notificationId}/read`, {});
    }
    // 모든 알림을 읽음으로 표시
    async markAllAsRead(userId) {
        await this.client.put(`/users/${userId}/notifications/read-all`, {});
        return true;
    }
    // 알림 보관 처리
    async archiveNotification(notificationId) {
        return this.client.put(`${this.basePath}/${notificationId}/archive`, {});
    }
    // 알림 통계 조회
    async getNotificationStats(userId) {
        return this.client.get(`/users/${userId}/notification-stats`);
    }
    // 읽지 않은 알림 개수 조회
    async getNotificationCount(userId) {
        const path = userId ? `/users/${userId}/notification-count` : '/notifications/count';
        return this.client.get(path);
    }
    // 실시간 알림 구독 (Socket.IO)
    // 참고: 실제 구현은 외부 라이브러리(Socket.IO)에 의존하므로 여기서는 인터페이스만 정의
    subscribeToNotifications(userId, callback) {
        // 실제 Socket.IO 구현은 이 클래스를 사용하는 코드에서 처리해야 함
        console.log(`Socket.IO: Subscribing to notifications for user ${userId}`);
        this.socketListeners.set('notification:new', callback);
    }
    // 실시간 알림 구독 해제
    unsubscribeFromNotifications() {
        console.log('Socket.IO: Unsubscribing from notifications');
        this.socketListeners.clear();
        if (this.socketConnection) {
            // 소켓 연결 해제 코드
        }
    }
}
