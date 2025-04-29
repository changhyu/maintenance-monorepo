/**
 * 정비소 관련 공통 타입 정의
 */
/**
 * 정비소 상태 열거형
 */
export var ShopStatus;
(function (ShopStatus) {
    ShopStatus["ACTIVE"] = "active";
    ShopStatus["INACTIVE"] = "inactive";
    ShopStatus["PENDING"] = "pending";
    ShopStatus["SUSPENDED"] = "suspended";
})(ShopStatus || (ShopStatus = {}));
/**
 * 정비소 타입 열거형
 */
export var ShopType;
(function (ShopType) {
    ShopType["GENERAL"] = "general";
    ShopType["SPECIALIZED"] = "specialized";
    ShopType["DEALER"] = "dealer";
    ShopType["FRANCHISE"] = "franchise";
    ShopType["MOBILE"] = "mobile";
    ShopType["TIRE"] = "tire";
    ShopType["BODY"] = "body";
    ShopType["OIL"] = "oil"; // 오일 교환 전문점
})(ShopType || (ShopType = {}));
/**
 * 정비소 서비스 유형 열거형
 */
export var ServiceType;
(function (ServiceType) {
    ServiceType["OIL_CHANGE"] = "oil_change";
    ServiceType["TIRE_SERVICE"] = "tire_service";
    ServiceType["BRAKE_SERVICE"] = "brake_service";
    ServiceType["ENGINE_REPAIR"] = "engine_repair";
    ServiceType["TRANSMISSION"] = "transmission";
    ServiceType["ELECTRICAL"] = "electrical";
    ServiceType["AC_SERVICE"] = "ac_service";
    ServiceType["BODY_REPAIR"] = "body_repair";
    ServiceType["PAINTING"] = "painting";
    ServiceType["INSPECTION"] = "inspection";
    ServiceType["DIAGNOSTICS"] = "diagnostics";
    ServiceType["SUSPENSION"] = "suspension";
    ServiceType["EXHAUST"] = "exhaust";
    ServiceType["GLASS"] = "glass";
    ServiceType["WHEEL_ALIGNMENT"] = "wheel_alignment"; // 휠 얼라인먼트
})(ServiceType || (ServiceType = {}));
