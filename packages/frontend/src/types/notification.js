/**
 * 알림 상태 enum
 */
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["SUCCESS"] = "success";
    NotificationStatus["ERROR"] = "error";
    NotificationStatus["WARNING"] = "warning";
    NotificationStatus["INFO"] = "info";
    NotificationStatus["UNREAD"] = "unread";
    NotificationStatus["READ"] = "read";
})(NotificationStatus || (NotificationStatus = {}));
/**
 * 알림 타입 enum
 */
export var NotificationType;
(function (NotificationType) {
    NotificationType["MAINTENANCE"] = "maintenance";
    NotificationType["VEHICLE"] = "vehicle";
    NotificationType["SYSTEM"] = "system";
    NotificationType["APPOINTMENT"] = "appointment";
    NotificationType["SERVICE"] = "service";
    NotificationType["RECALL"] = "recall";
    NotificationType["PAYMENT"] = "payment";
    NotificationType["MESSAGE"] = "message";
    NotificationType["ACCOUNT"] = "account";
})(NotificationType || (NotificationType = {}));
/**
 * 알림 우선순위 enum
 */
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (NotificationPriority = {}));
/**
 * 알림 카테고리 enum
 */
export var NotificationCategory;
(function (NotificationCategory) {
    NotificationCategory["TASK"] = "task";
    NotificationCategory["ALERT"] = "alert";
    NotificationCategory["UPDATE"] = "update";
    NotificationCategory["REMINDER"] = "reminder";
})(NotificationCategory || (NotificationCategory = {}));
/**
 * 알림 엔티티 타입
 */
export var NotificationEntityType;
(function (NotificationEntityType) {
    NotificationEntityType["VEHICLE"] = "vehicle";
    NotificationEntityType["MAINTENANCE"] = "maintenance";
    NotificationEntityType["INVOICE"] = "invoice";
    NotificationEntityType["APPOINTMENT"] = "appointment";
    NotificationEntityType["USER"] = "user";
    NotificationEntityType["SHOP"] = "shop";
})(NotificationEntityType || (NotificationEntityType = {}));
/**
 * 알림 채널 enum
 */
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["APP"] = "app";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["PUSH"] = "push";
})(NotificationChannel || (NotificationChannel = {}));
/**
 * 알림 배치 상태 enum
 */
export var NotificationBatchStatus;
(function (NotificationBatchStatus) {
    NotificationBatchStatus["DRAFT"] = "draft";
    NotificationBatchStatus["SCHEDULED"] = "scheduled";
    NotificationBatchStatus["PROCESSING"] = "processing";
    NotificationBatchStatus["COMPLETED"] = "completed";
    NotificationBatchStatus["FAILED"] = "failed";
    NotificationBatchStatus["CANCELLED"] = "cancelled";
})(NotificationBatchStatus || (NotificationBatchStatus = {}));
