/**
 * 사용자 관련 공통 타입 정의
 */
/**
 * 사용자 역할 열거형
 */
export var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ENTERPRISE_ADMIN"] = "ENTERPRISE_ADMIN";
    UserRole["SHOP_OWNER"] = "SHOP_OWNER";
    UserRole["SHOP_MANAGER"] = "SHOP_MANAGER";
    UserRole["TECHNICIAN"] = "TECHNICIAN";
    UserRole["DRIVER"] = "DRIVER";
    UserRole["CUSTOMER"] = "CUSTOMER";
})(UserRole || (UserRole = {}));
