from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Path
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.schemas.rental_company import (
    RentalCompanyCreate, RentalCompanyUpdate, RentalCompanyResponse, 
    RentalCompanyDetailResponse, RentalCompanyListResponse,
    RentalCompanyLocationCreate, RentalCompanyLocationUpdate, 
    RentalCompanyLocationResponse, RentalCompanyStatistics
)
from backend.repositories import rental_company_repo
from backend.core.auth import get_current_user_id

router = APIRouter()


@router.post("/companies", response_model=RentalCompanyResponse, status_code=status.HTTP_201_CREATED)
def create_rental_company(
    company: RentalCompanyCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    렌터카 업체를 생성합니다.
    """
    # 이미 존재하는 사업자 번호인지 확인
    existing = rental_company_repo.get_rental_company_by_business_number(db, company.business_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"사업자 번호 '{company.business_number}'는 이미 등록되어 있습니다."
        )
    
    return rental_company_repo.create_rental_company(db, company.dict(), current_user_id)


@router.get("/companies", response_model=RentalCompanyListResponse)
def list_rental_companies(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 목록을 조회합니다.
    """
    companies, total = rental_company_repo.list_rental_companies(
        db, skip=skip, limit=limit, search=search, is_active=is_active
    )
    
    return {
        "success": True,
        "message": "렌터카 업체 목록이 성공적으로 조회되었습니다.",
        "count": total,
        "data": companies
    }


@router.get("/companies/{company_id}", response_model=RentalCompanyDetailResponse)
def get_rental_company(
    company_id: int = Path(..., title="렌터카 업체 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 상세 정보를 조회합니다.
    """
    company = rental_company_repo.get_rental_company(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    return company


@router.put("/companies/{company_id}", response_model=RentalCompanyResponse)
def update_rental_company(
    company_update: RentalCompanyUpdate,
    company_id: int = Path(..., title="렌터카 업체 ID"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    렌터카 업체 정보를 업데이트합니다.
    """
    # 업체가 존재하는지 확인
    company = rental_company_repo.get_rental_company(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    # 사업자 번호가 변경되었고, 이미 존재하는 사업자 번호인지 확인
    if company_update.business_number and company_update.business_number != company.business_number:
        existing = rental_company_repo.get_rental_company_by_business_number(db, company_update.business_number)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"사업자 번호 '{company_update.business_number}'는 이미 등록되어 있습니다."
            )
    
    return rental_company_repo.update_rental_company(
        db, company_id, company_update.dict(exclude_unset=True), current_user_id
    )


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rental_company(
    company_id: int = Path(..., title="렌터카 업체 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체를 삭제합니다.
    """
    result = rental_company_repo.delete_rental_company(db, company_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    return None


@router.get("/companies/{company_id}/statistics", response_model=RentalCompanyStatistics)
def get_rental_company_statistics(
    company_id: int = Path(..., title="렌터카 업체 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 통계를 조회합니다.
    """
    # 업체가 존재하는지 확인
    company = rental_company_repo.get_rental_company(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    stats = rental_company_repo.get_rental_company_statistics(db, company_id)
    return stats


# 렌터카 업체 지점 관련 라우트
@router.post("/companies/{company_id}/locations", response_model=RentalCompanyLocationResponse, status_code=status.HTTP_201_CREATED)
def create_rental_company_location(
    location: RentalCompanyLocationCreate,
    company_id: int = Path(..., title="렌터카 업체 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 지점을 생성합니다.
    """
    # 업체가 존재하는지 확인
    company = rental_company_repo.get_rental_company(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    # 지점 데이터에 업체 ID 추가
    location_data = location.dict()
    location_data["company_id"] = company_id
    
    return rental_company_repo.create_rental_company_location(db, location_data)


@router.get("/companies/{company_id}/locations", response_model=List[RentalCompanyLocationResponse])
def list_rental_company_locations(
    company_id: int = Path(..., title="렌터카 업체 ID"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    is_airport: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 지점 목록을 조회합니다.
    """
    # 업체가 존재하는지 확인
    company = rental_company_repo.get_rental_company(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    locations, _ = rental_company_repo.list_rental_company_locations(
        db, company_id, skip=skip, limit=limit, is_active=is_active, is_airport=is_airport
    )
    
    return locations


@router.get("/locations/{location_id}", response_model=RentalCompanyLocationResponse)
def get_rental_company_location(
    location_id: int = Path(..., title="지점 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 지점 정보를 조회합니다.
    """
    location = rental_company_repo.get_rental_company_location(db, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {location_id}인 지점을 찾을 수 없습니다."
        )
    
    return location


@router.put("/locations/{location_id}", response_model=RentalCompanyLocationResponse)
def update_rental_company_location(
    location_update: RentalCompanyLocationUpdate,
    location_id: int = Path(..., title="지점 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 지점 정보를 업데이트합니다.
    """
    # 지점이 존재하는지 확인
    location = rental_company_repo.get_rental_company_location(db, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {location_id}인 지점을 찾을 수 없습니다."
        )
    
    return rental_company_repo.update_rental_company_location(
        db, location_id, location_update.dict(exclude_unset=True)
    )


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rental_company_location(
    location_id: int = Path(..., title="지점 ID"),
    db: Session = Depends(get_db)
):
    """
    렌터카 업체 지점을 삭제합니다.
    """
    result = rental_company_repo.delete_rental_company_location(db, location_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {location_id}인 지점을 찾을 수 없습니다."
        )
    
    return None


# 차량과 렌터카 업체 연결 관련 라우트
@router.post("/companies/{company_id}/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def assign_vehicle_to_company(
    company_id: int = Path(..., title="렌터카 업체 ID"),
    vehicle_id: int = Path(..., title="차량 ID"),
    company_vehicle_id: Optional[str] = Query(None, title="업체 내 차량 식별 번호"),
    db: Session = Depends(get_db)
):
    """
    차량을 렌터카 업체에 할당합니다.
    """
    result = rental_company_repo.assign_vehicle_to_company(db, vehicle_id, company_id, company_vehicle_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="차량 또는 렌터카 업체를 찾을 수 없습니다."
        )
    
    return None


@router.delete("/companies/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle_from_company(
    vehicle_id: int = Path(..., title="차량 ID"),
    db: Session = Depends(get_db)
):
    """
    차량을 렌터카 업체에서 해제합니다.
    """
    result = rental_company_repo.remove_vehicle_from_company(db, vehicle_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {vehicle_id}인 차량을 찾을 수 없습니다."
        )
    
    return None


@router.get("/companies/{company_id}/vehicles", response_model=List[dict])
def list_company_vehicles(
    company_id: int = Path(..., title="렌터카 업체 ID"),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    is_available_for_rent: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    렌터카 업체의 차량 목록을 조회합니다.
    """
    # 업체가 존재하는지 확인
    company = rental_company_repo.get_rental_company(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {company_id}인 렌터카 업체를 찾을 수 없습니다."
        )
    
    vehicles, total = rental_company_repo.list_company_vehicles(
        db, company_id, skip=skip, limit=limit, 
        status=status, vehicle_type=vehicle_type, 
        is_available_for_rent=is_available_for_rent
    )
    
    # 응답 구성
    result = []
    for vehicle in vehicles:
        result.append({
            "id": vehicle.id,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "type": vehicle.type,
            "color": vehicle.color,
            "license_plate": vehicle.license_plate,
            "status": vehicle.status,
            "is_available_for_rent": vehicle.is_available_for_rent,
            "daily_rental_rate": vehicle.daily_rental_rate,
            "mileage": vehicle.mileage,
            "fuel_type": vehicle.fuel_type,
            "passenger_capacity": vehicle.passenger_capacity,
            "company_vehicle_id": vehicle.company_vehicle_id,
            "times_rented": vehicle.times_rented,
            "last_rented_date": vehicle.last_rented_date,
            "rental_revenue": vehicle.rental_revenue
        })
    
    return result