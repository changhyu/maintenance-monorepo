"""
차량 관리 라우터 (packagescore.utils 통합)
"""
import logging
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from database import get_db

# packagescore.utils 모듈 임포트
from packagescore.utils import (
    validate_license_plate, mask_vin, format_currency,
    get_maintenance_suggestion, paginate_list
)

# 로거 설정
logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_vehicles(
    request: Request, 
    skip: int = Query(0, ge=0), 
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    차량 목록을 조회합니다. 페이지네이션을 지원합니다.
    """
    try:
        logger.info(f"차량 목록 API 호출됨 (skip={skip}, limit={limit})")
        
        # 테이블 목록 조회
        tables_query = db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in tables_query]
        logger.info(f"데이터베이스 테이블 목록: {tables}")
        
        if 'vehicles' not in tables:
            logger.error("vehicles 테이블이 존재하지 않습니다")
            return {
                "error": "vehicles 테이블이 존재하지 않습니다",
                "tables": tables,
                "vehicles": []
            }
        
        # 데이터베이스에 직접 쿼리
        result = db.execute("SELECT * FROM vehicles")
        all_vehicles = [dict(row) for row in result]
        
        # 페이지네이션 적용
        total = len(all_vehicles)
        paged_vehicles = all_vehicles[skip:skip+limit]
        
        # 현재 페이지 계산
        current_page = (skip // limit) + 1 if limit > 0 else 1
        total_pages = (total + limit - 1) // limit if limit > 0 else 1
        
        logger.info(f"조회된 차량 수: {total}, 현재 페이지: {current_page}/{total_pages}")
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": total_pages,
            "current_page": current_page,
            "vehicles": paged_vehicles
        }
    except Exception as e:
        logger.error(f"차량 목록 조회 중 오류 발생: {str(e)}")
        return {
            "error": str(e),
            "vehicles": []
        }

@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """
    특정 차량의 상세 정보와 관련 정비 기록, 검사 기록 등을 조회합니다.
    유틸리티 함수를 활용하여 차대번호 마스킹, 번호판 유효성 검증, 정비 제안 생성 등을 수행합니다.
    """
    try:
        logger.info(f"차량 상세 API 호출됨: 차량 ID {vehicle_id}")
        
        # 차량 정보 조회
        result = db.execute("SELECT * FROM vehicles WHERE id = :id", {"id": vehicle_id})
        vehicle = dict(result.first()) if result.rowcount > 0 else None
        
        if not vehicle:
            logger.warning(f"차량 ID {vehicle_id}를 찾을 수 없음")
            return {"error": "차량을 찾을 수 없습니다", "vehicle": None}
        
        # 원본 VIN 저장
        vehicle["vin_original"] = vehicle["vin"]
        
        # 차대번호 마스킹 적용
        vehicle["vin"] = mask_vin(vehicle["vin"])
        
        # 번호판 유효성 검증
        vehicle["license_plate_valid"] = validate_license_plate(vehicle["license_plate"])
        
        # 정비 기록 조회
        maintenance_result = db.execute(
            "SELECT * FROM maintenance_records WHERE vehicle_id = :vehicle_id ORDER BY service_date DESC", 
            {"vehicle_id": vehicle_id}
        )
        maintenance_records = [dict(row) for row in maintenance_result]
        
        # 정비 기록에 원화 포맷팅 적용
        for record in maintenance_records:
            record["formatted_cost"] = format_currency(record["total_cost"])
        
        # 검사 기록 조회
        inspection_result = db.execute(
            "SELECT * FROM inspection_records WHERE vehicle_id = :vehicle_id", 
            {"vehicle_id": vehicle_id}
        )
        inspection_records = [dict(row) for row in inspection_result]
        
        # 예정된 정비 일정 조회
        scheduled_result = db.execute(
            "SELECT * FROM scheduled_maintenance WHERE vehicle_id = :vehicle_id AND is_completed = 0", 
            {"vehicle_id": vehicle_id}
        )
        scheduled_maintenance = [dict(row) for row in scheduled_result]
        
        # 마지막 정비 날짜 확인
        last_maintenance_date = None
        if maintenance_records:
            last_maintenance_date_str = maintenance_records[0]["service_date"]
            try:
                last_maintenance_date = datetime.strptime(last_maintenance_date_str, "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"잘못된 날짜 형식: {last_maintenance_date_str}")
        
        # 정비 제안 생성
        maintenance_suggestion = get_maintenance_suggestion(
            vehicle["mileage"],
            last_maintenance_date
        )
        
        # 디버깅 정보 추가
        debug_info = {
            "last_maintenance_date": last_maintenance_date.strftime("%Y-%m-%d") if last_maintenance_date else None,
            "mileage": vehicle["mileage"]
        }
        
        logger.info(f"차량 ID {vehicle_id} 조회 성공")
        return {
            "vehicle": vehicle,
            "maintenance_records": maintenance_records,
            "inspection_records": inspection_records,
            "scheduled_maintenances": scheduled_maintenance,
            "maintenance_suggestion": maintenance_suggestion,
            "debug_info": debug_info
        }
    except Exception as e:
        logger.error(f"차량 상세 조회 중 오류 발생: {str(e)}")
        return {
            "error": str(e),
            "vehicle": None
        }

@router.get("/test/utils")
async def test_utils():
    """
    packagescore.utils 모듈의 유틸리티 함수 테스트 API
    """
    try:
        # 테스트 데이터
        test_vin = "1HGCM82633A123456"
        test_license_plate_valid = "12가 3456"
        test_license_plate_invalid = "ABC123"
        test_amount = 150000
        test_mileage = 15000
        test_last_maintenance_date = date(2023, 1, 1)
        
        # 각 유틸리티 함수 테스트 결과
        return {
            "status": "success",
            "message": "utils 모듈 테스트 성공",
            "results": {
                "mask_vin": {
                    "input": test_vin,
                    "output": mask_vin(test_vin)
                },
                "validate_license_plate": {
                    "valid_input": test_license_plate_valid,
                    "valid_output": validate_license_plate(test_license_plate_valid),
                    "invalid_input": test_license_plate_invalid,
                    "invalid_output": validate_license_plate(test_license_plate_invalid)
                },
                "format_currency": {
                    "input": test_amount,
                    "output": format_currency(test_amount)
                },
                "get_maintenance_suggestion": {
                    "input": {
                        "mileage": test_mileage,
                        "last_maintenance_date": test_last_maintenance_date.isoformat()
                    },
                    "output": get_maintenance_suggestion(test_mileage, test_last_maintenance_date)
                }
            }
        }
    except Exception as e:
        logger.error(f"유틸리티 테스트 중 오류 발생: {str(e)}")
        return {
            "status": "error",
            "message": f"유틸리티 테스트 실패: {str(e)}"
        }
