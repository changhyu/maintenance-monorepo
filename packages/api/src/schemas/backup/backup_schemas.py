"""
백업 관련 데이터 모델 스키마

백업 서비스 API 요청 및 응답에 사용되는 데이터 모델을 정의합니다.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BackupCreate(BaseModel):
    """백업 생성 요청 스키마"""

    type: str = Field(..., description="백업 유형 (예: 'maintenance', 'vehicle')")
    data: Dict[str, Any] = Field(..., description="백업할 데이터")


class BackupResponse(BaseModel):
    """백업 생성 응답 스키마"""

    backup_id: str = Field(..., description="생성된 백업의 고유 ID")
    type: str = Field(..., description="백업 유형")
    created_at: str = Field(..., description="백업 생성 시간")
    message: str = Field(..., description="백업 결과 메시지")


class BackupMeta(BaseModel):
    """백업 메타데이터 스키마"""

    id: str = Field(..., description="백업 ID")
    type: str = Field(..., description="백업 유형")
    created_at: str = Field(..., description="백업 생성 시간")
    filename: str = Field(..., description="백업 파일 경로")


class BackupList(BaseModel):
    """백업 목록 조회 응답 스키마"""

    backups: List[Dict[str, Any]] = Field(..., description="백업 메타데이터 목록")
    count: int = Field(..., description="조회된 백업 수")


class BackupDetail(BaseModel):
    """백업 상세 조회 응답 스키마"""

    id: str = Field(..., description="백업 ID")
    type: str = Field(..., description="백업 유형")
    created_at: str = Field(..., description="백업 생성 시간")
    data: Dict[str, Any] = Field(..., description="백업 데이터")


class BackupRestoreResponse(BaseModel):
    """백업 복원 응답 스키마"""

    restored: bool = Field(..., description="복원 성공 여부")
    backup_id: str = Field(..., description="복원된 백업 ID")
    message: str = Field(..., description="복원 결과 메시지")
    data: Dict[str, Any] = Field(..., description="복원된 데이터")


class BackupDeleteResponse(BaseModel):
    """백업 삭제 응답 스키마"""

    deleted: bool = Field(..., description="삭제 성공 여부")
    backup_id: str = Field(..., description="삭제된 백업 ID")
    message: str = Field(..., description="삭제 결과 메시지")


class BackupCleanupResponse(BaseModel):
    """백업 정리 응답 스키마"""

    cleaned_up: bool = Field(..., description="정리 성공 여부")
    deleted_count: int = Field(..., description="삭제된 백업 수")
    message: str = Field(..., description="정리 결과 메시지")
