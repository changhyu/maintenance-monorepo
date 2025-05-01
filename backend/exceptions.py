from fastapi import HTTPException, status

class MaintenanceException(HTTPException):
    """정비 관련 기본 예외 클래스"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: dict = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class MaintenanceNotFound(MaintenanceException):
    """정비 기록을 찾을 수 없을 때 발생하는 예외"""
    def __init__(self, maintenance_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID가 {maintenance_id}인 정비 기록을 찾을 수 없습니다"
        )

class MaintenanceAlreadyExists(MaintenanceException):
    """정비 기록이 이미 존재할 때 발생하는 예외"""
    def __init__(self, maintenance_id: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"ID가 {maintenance_id}인 정비 기록이 이미 존재합니다"
        )

class MaintenanceValidationError(MaintenanceException):
    """정비 데이터 검증 실패 시 발생하는 예외"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

class MaintenancePermissionError(MaintenanceException):
    """정비 기록에 대한 권한이 없을 때 발생하는 예외"""
    def __init__(self, detail: str = "이 작업을 수행할 권한이 없습니다"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )

class MaintenanceStatusError(MaintenanceException):
    """정비 상태 변경이 불가능할 때 발생하는 예외"""
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"현재 상태({current_status})에서 {target_status}로 변경할 수 없습니다"
        )

class MaintenanceDateError(MaintenanceException):
    """정비 일정 관련 오류 발생 시 예외"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        ) 