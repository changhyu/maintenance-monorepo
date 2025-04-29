"""
감사 로깅 모듈
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from packages.api.src.coreconfig import settings

logger = logging.getLogger(__name__)


class AuditLogger:
    """감사 로깅 클래스"""

    def __init__(self):
        self.logger = logger

    def log_action(
        self,
        action: str,
        user_id: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
    ) -> None:
        """
        작업 로깅

        Args:
            action: 수행된 작업
            user_id: 작업을 수행한 사용자 ID
            resource_type: 리소스 유형
            resource_id: 리소스 ID
            details: 추가 세부 정보
            status: 작업 상태
        """
        audit_entry = {
            "audit_id": str(uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "status": status,
            "environment": settings.ENVIRONMENT,
        }

        self.logger.info(
            f"Audit: {action}", extra={"audit_entry": json.dumps(audit_entry)}
        )

    def log_error(
        self,
        action: str,
        user_id: str,
        resource_type: str,
        resource_id: str,
        error: Exception,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        오류 로깅

        Args:
            action: 수행하려던 작업
            user_id: 작업을 수행한 사용자 ID
            resource_type: 리소스 유형
            resource_id: 리소스 ID
            error: 발생한 오류
            details: 추가 세부 정보
        """
        error_details = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            **(details or {}),
        }

        self.log_action(
            action=action,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=error_details,
            status="error",
        )


# 전역 감사 로거 인스턴스
audit_logger = AuditLogger()
