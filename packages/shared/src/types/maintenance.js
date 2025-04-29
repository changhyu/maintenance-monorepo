/**
 * 정비 관련 공통 타입 정의
 */
/**
 * 정비 상태 열거형
 */
export var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["SCHEDULED"] = "scheduled";
    MaintenanceStatus["IN_PROGRESS"] = "in_progress";
    MaintenanceStatus["COMPLETED"] = "completed";
    MaintenanceStatus["CANCELLED"] = "cancelled";
    MaintenanceStatus["DELAYED"] = "delayed"; // 지연됨
})(MaintenanceStatus || (MaintenanceStatus = {}));
/**
 * 정비 유형 열거형
 */
export var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["REGULAR_SERVICE"] = "regular_service";
    MaintenanceType["REPAIR"] = "repair";
    MaintenanceType["INSPECTION"] = "inspection";
    MaintenanceType["OIL_CHANGE"] = "oil_change";
    MaintenanceType["TIRE_SERVICE"] = "tire_service";
    MaintenanceType["BATTERY_SERVICE"] = "battery_service";
    MaintenanceType["BRAKE_SERVICE"] = "brake_service";
    MaintenanceType["FILTER_CHANGE"] = "filter_change";
    MaintenanceType["DIAGNOSTICS"] = "diagnostics";
    MaintenanceType["RECALL_SERVICE"] = "recall_service";
    MaintenanceType["BODY_REPAIR"] = "body_repair";
    MaintenanceType["ENGINE_SERVICE"] = "engine_service";
    MaintenanceType["ELECTRICAL"] = "electrical";
    MaintenanceType["OTHER"] = "other"; // 기타
})(MaintenanceType || (MaintenanceType = {}));
/**
 * 정비 우선순위 열거형
 */
export var MaintenancePriority;
(function (MaintenancePriority) {
    MaintenancePriority["LOW"] = "low";
    MaintenancePriority["MEDIUM"] = "medium";
    MaintenancePriority["HIGH"] = "high";
    MaintenancePriority["CRITICAL"] = "critical";
})(MaintenancePriority || (MaintenancePriority = {}));
