/**
 * 차량 관련 공통 타입 정의
 */
/**
 * 차량 상태 열거형
 */
export var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["RESERVED"] = "RESERVED";
    VehicleStatus["INACTIVE"] = "INACTIVE";
    VehicleStatus["RECALLED"] = "RECALLED";
})(VehicleStatus || (VehicleStatus = {}));
/**
 * 차량 유형 열거형
 */
export var VehicleType;
(function (VehicleType) {
    VehicleType["SEDAN"] = "SEDAN";
    VehicleType["SUV"] = "SUV";
    VehicleType["TRUCK"] = "TRUCK";
    VehicleType["VAN"] = "VAN";
    VehicleType["ELECTRIC"] = "ELECTRIC";
    VehicleType["HYBRID"] = "HYBRID";
})(VehicleType || (VehicleType = {}));
