"""
관리자 기능 관련 모델 정의

AdminSettings, AdminAuditLog, SystemMetrics, BackupLog 등의 모델을 정의합니다.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from .base import Base, validate_uuid


class AdminSettings(Base):
    """
    관리자 설정 정보 모델
    
    시스템 설정, 기능 활성화/비활성화 등의 정보를 키-값 쌍으로 저장
    """
    __tablename__ = "admin_settings"
    
    id = Column(String(36), primary_key=True, default=validate_uuid, comment="설정 ID")
    key = Column(String(100), unique=True, nullable=False, comment="설정 키")
    value = Column(Text, nullable=False, comment="설정 값")
    description = Column(Text, nullable=True, comment="설정 설명")
    last_modified_by = Column(String(36), nullable=True, comment="마지막 수정자 ID")
    created_at = Column(DateTime, default=datetime.utcnow, comment="생성 일시")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="갱신 일시")
    
    def __repr__(self) -> str:
        return f"<AdminSettings(id={self.id}, key={self.key})>"


class AdminAuditLog(Base):
    """
    관리자 감사 로그 모델
    
    관리자 작업 추적을 위한 감사 로그
    """
    __tablename__ = "admin_audit_logs"
    
    id = Column(String(36), primary_key=True, default=validate_uuid, comment="감사 로그 ID")
    user_id = Column(String(36), nullable=True, comment="사용자 ID")
    action = Column(String(50), nullable=False, comment="수행된 작업")
    resource = Column(String(100), nullable=False, comment="작업이 수행된 리소스 유형")
    resource_id = Column(String(36), nullable=True, comment="작업이 수행된 리소스 ID")
    details = Column(JSON, nullable=True, comment="작업 세부 정보")
    ip = Column(String(100), nullable=True, comment="클라이언트 IP")
    user_agent = Column(String(500), nullable=True, comment="사용자 에이전트")
    created_at = Column(DateTime, default=datetime.utcnow, comment="생성 일시")
    
    def __repr__(self) -> str:
        return f"<AdminAuditLog(id={self.id}, action={self.action}, resource={self.resource})>"


class SystemMetrics(Base):
    """
    시스템 성능 메트릭 모델
    
    시스템 성능 지표 저장 (CPU, 메모리, 응답 시간 등)
    """
    __tablename__ = "system_metrics"
    
    id = Column(String(36), primary_key=True, default=validate_uuid, comment="메트릭 ID")
    metric = Column(String(100), nullable=False, comment="메트릭 이름")
    value = Column(Float, nullable=False, comment="메트릭 값")
    unit = Column(String(50), nullable=True, comment="측정 단위")
    timestamp = Column(DateTime, default=datetime.utcnow, comment="측정 시간")
    
    def __repr__(self) -> str:
        return f"<SystemMetrics(id={self.id}, metric={self.metric}, value={self.value})>"


class BackupLog(Base):
    """
    백업 로그 모델
    
    백업 작업 기록
    """
    __tablename__ = "backup_logs"
    
    id = Column(String(36), primary_key=True, default=validate_uuid, comment="백업 로그 ID")
    filename = Column(String(200), nullable=False, comment="백업 파일 이름")
    size = Column(Integer, nullable=False, comment="백업 파일 크기 (바이트)")
    status = Column(String(50), nullable=False, comment="백업 상태")
    started_at = Column(DateTime, nullable=False, comment="시작 시간")
    completed_at = Column(DateTime, nullable=True, comment="완료 시간")
    error_msg = Column(Text, nullable=True, comment="오류 메시지")
    
    def __repr__(self) -> str:
        return f"<BackupLog(id={self.id}, filename={self.filename}, status={self.status})>"


class UserLoginHistory(Base):
    """
    사용자 로그인 이력 모델
    
    로그인 시도 및 성공/실패 기록
    """
    __tablename__ = "user_login_history"
    
    id = Column(String(36), primary_key=True, default=validate_uuid, comment="로그인 이력 ID")
    user_id = Column(String(36), nullable=False, comment="사용자 ID")
    ip = Column(String(100), nullable=True, comment="클라이언트 IP")
    user_agent = Column(String(500), nullable=True, comment="사용자 에이전트")
    success = Column(Boolean, default=True, comment="성공 여부")
    fail_reason = Column(String(200), nullable=True, comment="실패 이유")
    timestamp = Column(DateTime, default=datetime.utcnow, comment="시도 시간")
    
    def __repr__(self) -> str:
        return f"<UserLoginHistory(id={self.id}, user_id={self.user_id}, success={self.success})>"


class AdminDashboardWidget(Base):
    """
    관리자 대시보드 위젯 모델
    
    대시보드 구성 및 위젯 설정 저장
    """
    __tablename__ = "admin_dashboard_widgets"
    
    id = Column(String(36), primary_key=True, default=validate_uuid, comment="위젯 ID")
    name = Column(String(100), nullable=False, comment="위젯 이름")
    type = Column(String(50), nullable=False, comment="위젯 유형")
    config = Column(JSON, nullable=False, comment="위젯 설정")
    position = Column(Integer, nullable=False, comment="표시 위치")
    enabled = Column(Boolean, default=True, comment="활성화 여부")
    created_at = Column(DateTime, default=datetime.utcnow, comment="생성 시간")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="갱신 시간")
    
    def __repr__(self) -> str:
        return f"<AdminDashboardWidget(id={self.id}, name={self.name}, type={self.type})>" 