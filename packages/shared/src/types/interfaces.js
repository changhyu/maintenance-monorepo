/**
 * 차량 정비 관리 시스템 공용 인터페이스
 */
/**
 * 정비 유형 열거형
 */
export var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["REGULAR_SERVICE"] = "REGULAR_SERVICE";
    MaintenanceType["REPAIR"] = "REPAIR";
    MaintenanceType["OIL_CHANGE"] = "OIL_CHANGE";
    MaintenanceType["TIRE_CHANGE"] = "TIRE_CHANGE";
    MaintenanceType["PARTS_REPLACEMENT"] = "PARTS_REPLACEMENT";
    MaintenanceType["INSPECTION"] = "INSPECTION";
    MaintenanceType["ACCIDENT_REPAIR"] = "ACCIDENT_REPAIR";
    MaintenanceType["OTHER"] = "OTHER"; // 기타
})(MaintenanceType || (MaintenanceType = {}));
/**
 * 사용자 역할 열거형
 */
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SHOP_MANAGER"] = "SHOP_MANAGER";
    UserRole["TECHNICIAN"] = "TECHNICIAN";
    UserRole["VEHICLE_OWNER"] = "VEHICLE_OWNER";
    UserRole["GUEST"] = "GUEST";
})(UserRole || (UserRole = {}));
