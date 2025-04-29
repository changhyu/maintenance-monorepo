/**
 * 정비 관련 타입 정의
 */
/**
 * 정비 타입 열거형
 */
export var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["REGULAR"] = "REGULAR";
    MaintenanceType["REPAIR"] = "REPAIR";
    MaintenanceType["INSPECTION"] = "INSPECTION";
    MaintenanceType["RECALL"] = "RECALL";
    MaintenanceType["UPGRADE"] = "UPGRADE";
    MaintenanceType["OTHER"] = "OTHER";
})(MaintenanceType || (MaintenanceType = {}));
/**
 * 정비 상태 열거형
 */
export var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["SCHEDULED"] = "SCHEDULED";
    MaintenanceStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MaintenanceStatus["COMPLETED"] = "COMPLETED";
    MaintenanceStatus["CANCELLED"] = "CANCELLED";
    MaintenanceStatus["DELAYED"] = "DELAYED";
})(MaintenanceStatus || (MaintenanceStatus = {}));
/**
 * 정비 우선순위 열거형
 */
export var MaintenancePriority;
(function (MaintenancePriority) {
    MaintenancePriority["LOW"] = "LOW";
    MaintenancePriority["MEDIUM"] = "MEDIUM";
    MaintenancePriority["HIGH"] = "HIGH";
    MaintenancePriority["URGENT"] = "URGENT";
})(MaintenancePriority || (MaintenancePriority = {}));
