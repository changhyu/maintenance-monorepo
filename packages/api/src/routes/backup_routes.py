"""
백업 API 라우터 모듈

백업 생성, 조회, 복원, 삭제 등의 엔드포인트를 제공합니다.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from src.schemas.backup.backup_schemas import (BackupCleanupResponse,
                                               BackupCreate,
                                               BackupDeleteResponse,
                                               BackupDetail, BackupList,
                                               BackupMeta, BackupResponse,
                                               BackupRestoreResponse)
from src.services.backup_service.backup_service import BackupService

router = APIRouter(
    prefix="/backups",
    tags=["백업"],
    responses={404: {"description": "Not found"}},
)


def get_backup_service():
    """백업 서비스 인스턴스를 제공하는 의존성 주입 함수"""
    return BackupService()


@router.post("/", response_model=BackupResponse)
async def create_backup(
    backup_data: BackupCreate,
    backup_service: BackupService = Depends(get_backup_service),
):
    """
    새 백업 생성

    - **type**: 백업 유형 (예: 'system', 'user', 'config')
    - **data**: 백업할 데이터 (JSON 객체)
    """
    try:
        return backup_service.create_backup(backup_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=BackupList)
async def list_backups(
    backup_type: Optional[str] = Query(None, description="필터링할 백업 유형"),
    limit: int = Query(100, description="반환할 최대 백업 수", ge=1, le=1000),
    backup_service: BackupService = Depends(get_backup_service),
):
    """
    백업 목록 조회

    - 선택적으로 백업 유형으로 필터링 가능
    - 결과는 생성 시간 기준 최신순으로 정렬됨
    """
    try:
        return backup_service.list_backups(backup_type=backup_type, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{backup_id}", response_model=BackupDetail)
async def get_backup(
    backup_id: str, backup_service: BackupService = Depends(get_backup_service)
):
    """
    특정 백업의 상세 정보 조회

    - **backup_id**: 조회할 백업의 ID
    """
    try:
        return backup_service.get_backup(backup_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{backup_id}/restore", response_model=BackupRestoreResponse)
async def restore_backup(
    backup_id: str, backup_service: BackupService = Depends(get_backup_service)
):
    """
    백업에서 데이터 복원

    - **backup_id**: 복원할 백업의 ID
    """
    try:
        return backup_service.restore_backup(backup_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{backup_id}", response_model=BackupDeleteResponse)
async def delete_backup(
    backup_id: str, backup_service: BackupService = Depends(get_backup_service)
):
    """
    백업 삭제

    - **backup_id**: 삭제할 백업의 ID
    """
    try:
        return backup_service.delete_backup(backup_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup", response_model=BackupCleanupResponse)
async def cleanup_backups(
    backup_type: Optional[str] = Query(None, description="정리할 백업 유형"),
    keep_count: int = Query(10, description="유지할 최신 백업 수", ge=1),
    backup_service: BackupService = Depends(get_backup_service),
):
    """
    오래된 백업 정리

    - 선택적으로 백업 유형 지정 가능
    - **keep_count**에 지정된 최신 백업만 유지하고 나머지는 삭제
    """
    try:
        return backup_service.cleanup_old_backups(
            backup_type=backup_type, keep_count=keep_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
