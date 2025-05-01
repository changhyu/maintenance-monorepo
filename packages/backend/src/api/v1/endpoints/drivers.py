from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.driver import Driver, DriverCreate, DriverUpdate, DriverStats, DriverFilters
from ..database import get_db
from ..services.driver_service import DriverService
from ..auth import get_current_user

router = APIRouter(prefix="/drivers", tags=["drivers"])

@router.get("/", response_model=List[Driver])
async def get_drivers(
    filters: DriverFilters = Depends(),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    모든 드라이버 목록을 조회합니다.
    필터링 옵션을 사용하여 결과를 필터링할 수 있습니다.
    """
    service = DriverService(db)
    return service.get_drivers(filters)

@router.post("/", response_model=Driver)
async def create_driver(
    driver: DriverCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    새로운 드라이버를 생성합니다.
    """
    service = DriverService(db)
    return service.create_driver(driver)

@router.get("/{driver_id}", response_model=Driver)
async def get_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    특정 드라이버의 상세 정보를 조회합니다.
    """
    service = DriverService(db)
    driver = service.get_driver_by_id(driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="드라이버를 찾을 수 없습니다.")
    return driver

@router.put("/{driver_id}", response_model=Driver)
async def update_driver(
    driver_id: str,
    driver: DriverUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    특정 드라이버의 정보를 수정합니다.
    """
    service = DriverService(db)
    updated_driver = service.update_driver(driver_id, driver)
    if not updated_driver:
        raise HTTPException(status_code=404, detail="드라이버를 찾을 수 없습니다.")
    return updated_driver

@router.delete("/{driver_id}")
async def delete_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    특정 드라이버를 삭제합니다.
    """
    service = DriverService(db)
    success = service.delete_driver(driver_id)
    if not success:
        raise HTTPException(status_code=404, detail="드라이버를 찾을 수 없습니다.")
    return {"message": "드라이버가 성공적으로 삭제되었습니다."}

@router.get("/{driver_id}/stats", response_model=DriverStats)
async def get_driver_stats(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    특정 드라이버의 통계 정보를 조회합니다.
    """
    service = DriverService(db)
    stats = service.get_driver_stats(driver_id)
    if not stats:
        raise HTTPException(status_code=404, detail="드라이버를 찾을 수 없습니다.")
    return stats

@router.post("/{driver_id}/documents")
async def upload_driver_document(
    driver_id: str,
    file: UploadFile = File(...),
    document_type: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    드라이버 관련 문서를 업로드합니다.
    """
    service = DriverService(db)
    try:
        document_url = await service.upload_document(driver_id, file, document_type)
        return {"url": document_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{driver_id}/documents")
async def get_driver_documents(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    드라이버의 모든 문서 목록을 조회합니다.
    """
    service = DriverService(db)
    documents = service.get_driver_documents(driver_id)
    return documents

@router.delete("/{driver_id}/documents/{document_id}")
async def delete_driver_document(
    driver_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    드라이버의 특정 문서를 삭제합니다.
    """
    service = DriverService(db)
    success = service.delete_document(driver_id, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return {"message": "문서가 성공적으로 삭제되었습니다."} 