"""
라우터에서 사용하는 유틸리티 함수
"""

import json
from datetime import datetime
from typing import Any, Dict, Optional, Union

from fastapi import Request
from sqlalchemy.orm import Session


async def log_admin_action(
    db: Session,
    user_id: str,
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
):
    """
    관리자 작업을 감사 로그에 기록합니다.

    Args:
        db: 데이터베이스 세션
        user_id: 작업을 수행한 사용자 ID
        action: 수행된 작업 (CREATE, UPDATE, DELETE 등)
        resource: 작업이 수행된 리소스 유형 (admin_settings, dashboard_widget 등)
        resource_id: 작업이 수행된 리소스의 ID
        details: 작업에 대한 추가 세부 정보
        request: FastAPI Request 객체 (IP 및 User-Agent 정보 추출용)
    """
    from prisma.models import AdminAuditLog

    # IP 및 User-Agent 정보 추출
    ip = None
    user_agent = None
    if request:
        ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    # 감사 로그 생성
    audit_log = AdminAuditLog(
        userId=user_id,
        action=action,
        resource=resource,
        resourceId=resource_id,
        details=details,
        ip=ip,
        userAgent=user_agent,
    )

    db.add(audit_log)
    db.commit()

    return audit_log 