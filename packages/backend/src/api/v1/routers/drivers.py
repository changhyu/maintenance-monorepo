from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database.session import get_db
from ..models.driver import Driver, DriverCreate, DriverUpdate, DriverStats, DriverFilters, Document, PaginatedDriverList
from ..services.driver_service import DriverService

router = APIRouter(prefix="/drivers", tags=["drivers"])

@router.get("/", response_model=PaginatedDriverList)
def get_drivers(
    status: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    page: Optional[int] = 1,
    limit: Optional[int] = 10,
    db: Session = Depends(get_db)
):
    """
    드라이버 목록을 조회합니다.
    """
    filters = DriverFilters(
        status=status,
        vehicle_id=vehicle_id,
        search_query=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit
    )
    
    driver_service = DriverService(db)
    return driver_service.get_drivers(filters)

@router.get("/{driver_id}", response_model=Driver)
def get_driver(driver_id: str, db: Session = Depends(get_db)):
    """
    특정 드라이버의 정보를 조회합니다.
    """
    driver_service = DriverService(db)
    driver = driver_service.get_driver_by_id(driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.post("/", response_model=Driver)
def create_driver(driver: DriverCreate, db: Session = Depends(get_db)):
    """
    새로운 드라이버를 생성합니다.
    """
    driver_service = DriverService(db)
    return driver_service.create_driver(driver)

@router.put("/{driver_id}", response_model=Driver)
def update_driver(driver_id: str, driver: DriverUpdate, db: Session = Depends(get_db)):
    """
    드라이버 정보를 수정합니다.
    """
    driver_service = DriverService(db)
    updated_driver = driver_service.update_driver(driver_id, driver)
    if not updated_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return updated_driver

@router.delete("/{driver_id}", response_model=bool)
def delete_driver(driver_id: str, db: Session = Depends(get_db)):
    """
    드라이버를 삭제합니다.
    """
    driver_service = DriverService(db)
    success = driver_service.delete_driver(driver_id)
    if not success:
        raise HTTPException(status_code=404, detail="Driver not found")
    return success

@router.get("/{driver_id}/stats", response_model=DriverStats)
def get_driver_stats(driver_id: str, db: Session = Depends(get_db)):
    """
    드라이버의 통계 정보를 조회합니다.
    """
    driver_service = DriverService(db)
    stats = driver_service.get_driver_stats(driver_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Driver not found")
    return stats

@router.post("/{driver_id}/documents", response_model=Document)
async def upload_document(
    driver_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    드라이버 관련 문서를 업로드합니다.
    """
    driver_service = DriverService(db)
    try:
        return await driver_service.upload_document(driver_id, file, document_type)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{driver_id}/documents", response_model=List[Document])
def get_driver_documents(driver_id: str, db: Session = Depends(get_db)):
    """
    드라이버의 모든 문서 목록을 조회합니다.
    """
    driver_service = DriverService(db)
    return driver_service.get_driver_documents(driver_id)

@router.delete("/{driver_id}/documents/{document_id}", response_model=bool)
def delete_document(driver_id: str, document_id: str, db: Session = Depends(get_db)):
    """
    드라이버의 특정 문서를 삭제합니다.
    """
    driver_service = DriverService(db)
    success = driver_service.delete_document(driver_id, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return success 