/**
 * 사용자 관련 타입 정의
 */
// 사용자 역할
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MANAGER"] = "manager";
    UserRole["TECHNICIAN"] = "technician";
    UserRole["DRIVER"] = "driver";
    UserRole["USER"] = "user";
})(UserRole || (UserRole = {}));
// 사용자 상태
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["PENDING"] = "pending";
    UserStatus["BLOCKED"] = "blocked";
})(UserStatus || (UserStatus = {}));
