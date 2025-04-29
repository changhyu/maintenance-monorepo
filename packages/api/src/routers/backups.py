import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from packagescore.security import get_current_user, oauth2_scheme
from packagesmodels.user import User
from packagesmodules.backup_service import BackupService

logger = logging.getLogger(__name__)

# 백업 서비스 인스턴스
backup_service = BackupService()

# 라우터 생성
router = APIRouter(
    prefix="/api/backups",
    tags=["backups"],
    dependencies=[Depends(oauth2_scheme)],
    responses={404: {"description": "백업을 찾을 수 없음"}},
)


@router.post("/{backup_type}", status_code=201, summary="새 백업 생성")
async def create_backup(
    backup_type: str = Path(..., description="백업 유형 (maintenance, vehicle 등)"),
    data: Dict[str, Any] = Body(..., description="백업할 데이터"),
    current_user: User = Depends(get_current_user),
):
    """
    지정된 유형의 데이터 백업을 생성합니다.
    """
    try:
        backup_id = await backup_service.create_backup(data, backup_type)

        # 생성된 백업의 메타데이터 조회
        backups = await backup_service.list_backups(backup_type=backup_type, limit=1)
        if not backups:
            raise HTTPException(
                status_code=500, detail="백업 생성 후 메타데이터를 찾을 수 없습니다."
            )

        metadata = backups[0]

        return {
            "backup_id": backup_id,
            "type": backup_type,
            "created_at": metadata["created_at"],
            "message": f"{backup_type} 데이터의 백업이 성공적으로 생성되었습니다.",
        }
    except Exception as e:
        logger.error(f"백업 생성 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백업 생성 실패: {str(e)}")


@router.get("", summary="백업 목록 조회")
async def list_backups(
    type: Optional[str] = Query(None, description="필터링할 백업 유형"),
    limit: int = Query(10, description="반환할 최대 항목 수"),
    current_user: User = Depends(get_current_user),
):
    """
    백업 목록을 조회합니다. 선택적으로 유형으로 필터링할 수 있습니다.
    """
    try:
        backups = await backup_service.list_backups(backup_type=type, limit=limit)
        return {"backups": backups, "count": len(backups)}
    except Exception as e:
        logger.error(f"백업 목록 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백업 목록 조회 실패: {str(e)}")


@router.get("/{backup_id}", summary="특정 백업 조회")
async def get_backup(
    backup_id: str = Path(..., description="조회할 백업 ID"),
    current_user: User = Depends(get_current_user),
):
    """
    특정 백업의 데이터와 메타데이터를 조회합니다.
    """
    try:
        # 백업 메타데이터 찾기
        backups = await backup_service.list_backups(limit=100)
        metadata = None
        for backup in backups:
            if backup["id"] == backup_id:
                metadata = backup
                break

        if not metadata:
            raise HTTPException(
                status_code=404, detail=f"백업을 찾을 수 없음: {backup_id}"
            )

        # 백업 데이터 복원
        data = await backup_service.restore_from_backup(backup_id)

        return {
            "id": backup_id,
            "type": metadata["type"],
            "created_at": metadata["created_at"],
            "data": data,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"백업을 찾을 수 없음: {backup_id}")
    except Exception as e:
        logger.error(f"백업 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백업 조회 실패: {str(e)}")


@router.post("/{backup_id}/restore", summary="백업에서 복원")
async def restore_backup(
    backup_id: str = Path(..., description="복원할 백업 ID"),
    current_user: User = Depends(get_current_user),
):
    """
    지정된 백업에서 데이터를 복원합니다.
    """
    try:
        data = await backup_service.restore_from_backup(backup_id)

        return {
            "restored": True,
            "backup_id": backup_id,
            "message": "백업에서 데이터가 성공적으로 복원되었습니다.",
            "data": data,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"백업을 찾을 수 없음: {backup_id}")
    except Exception as e:
        logger.error(f"백업 복원 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백업 복원 실패: {str(e)}")


@router.delete("/{backup_id}", summary="백업 삭제")
async def delete_backup(
    backup_id: str = Path(..., description="삭제할 백업 ID"),
    current_user: User = Depends(get_current_user),
):
    """
    지정된 백업을 삭제합니다.
    """
    try:
        success = await backup_service.delete_backup(backup_id)

        if not success:
            raise HTTPException(
                status_code=404, detail=f"백업을 찾을 수 없음: {backup_id}"
            )

        return {
            "deleted": True,
            "backup_id": backup_id,
            "message": "백업이 성공적으로 삭제되었습니다.",
        }
    except Exception as e:
        logger.error(f"백업 삭제 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백업 삭제 실패: {str(e)}")


@router.post("/cleanup", summary="오래된 백업 정리")
async def cleanup_backups(current_user: User = Depends(get_current_user)):
    """
    보관 기간이 지난 오래된 백업을 정리합니다.
    """
    try:
        deleted_count = await backup_service.cleanup_old_backups()

        return {
            "cleaned_up": True,
            "deleted_count": deleted_count,
            "message": f"{deleted_count}개의 오래된 백업이 정리되었습니다.",
        }
    except Exception as e:
        logger.error(f"백업 정리 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백업 정리 실패: {str(e)}")
