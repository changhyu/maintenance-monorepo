/**
 * API 서비스 관련 타입 정의
 */
/**
 * 오프라인 작업 타입
 */
export var OfflineOperationType;
(function (OfflineOperationType) {
    OfflineOperationType["CREATE"] = "create";
    OfflineOperationType["UPDATE"] = "update";
    OfflineOperationType["DELETE"] = "delete";
    OfflineOperationType["UPLOAD"] = "upload";
})(OfflineOperationType || (OfflineOperationType = {}));
