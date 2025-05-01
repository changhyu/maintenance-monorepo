"""
최소 구현 FastAPI 애플리케이션 - packagescore.utils 모듈 통합 (수정 버전)
"""
import sqlite3
from typing import List, Dict, Any, Optional
import json
from datetime import date, datetime
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# packagescore 모듈 가져오기
try:
    from packagescore.utils import (
        CustomJSONEncoder, 
        validate_license_plate, 
        mask_vin, 
        format_currency, 
        get_maintenance_suggestion,
        check_etag,
        paginate_list
    )
    logger.info("packagescore.utils 모듈을 성공적으로 가져왔습니다.")
except ImportError as e:
    logger.error(f"packagescore.utils 모듈을 가져오는 중 오류 발생: {e}")
    raise

app = FastAPI(title="차량 정비 관리 API - 최소 구현 (utils 통합 수정)")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def dict_factory(cursor, row):
    """SQLite 결과를 딕셔너리로 변환"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db_connection():
    """데이터베이스 연결 생성"""
    conn = sqlite3.connect("test.db")
    conn.row_factory = dict_factory
    return conn

@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "status": "active",
        "message": "차량 정비 관리 API가 정상적으로 실행 중입니다.",
        "version": "1.0.0",
        "using_packagescore": True
    }

@app.get("/api/vehicles")
async def get_vehicles(
    request: Request, 
    response: Response,
    skip: int = 0, 
    limit: int = 10
):
    """차량 목록 조회 - 페이지네이션 및 ETag 적용 (수정)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vehicles WHERE is_active = 1")
        all_vehicles = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        vehicles_json = json.dumps(all_vehicles, cls=CustomJSONEncoder)
        vehicles_list = json.loads(vehicles_json)
        
        # 페이지네이션 적용 (수정 - 직접 구현)
        total = len(vehicles_list)
        start = skip
        end = min(skip + limit, total)
        paginated_vehicles = vehicles_list[start:end]
        
        result = {
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
            "current_page": skip // limit + 1,
            "vehicles": paginated_vehicles
        }
        
        # ETag 캐시 확인
        if check_etag(request, response, result):
            # 304 Not Modified 응답이 이미 설정됨
            return None
        
        return result
    except Exception as e:
        logger.error(f"차량 목록 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(
    vehicle_id: int, 
    request: Request, 
    response: Response,
    mask_sensitive: bool = True
):
    """특정 차량 상세 정보 조회 - 마스킹 및 ETag 적용 (수정)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 차량 정보 조회
        cursor.execute("SELECT * FROM vehicles WHERE id = ? AND is_active = 1", (vehicle_id,))
        vehicle = cursor.fetchone()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail=f"ID {vehicle_id}인 차량을 찾을 수 없습니다")
        
        # 깊은 복사를 통해 원본 데이터를 수정하지 않도록 함
        vehicle_data = json.loads(json.dumps(vehicle))
        
        # 마스킹 처리
        if mask_sensitive and 'vin' in vehicle_data and vehicle_data['vin']:
            original_vin = vehicle_data['vin']
            masked_vin = mask_vin(original_vin)
            vehicle_data['vin'] = masked_vin
            vehicle_data['vin_original'] = original_vin  # 디버깅용
        
        # 차량 번호판 검증
        if 'license_plate' in vehicle_data and vehicle_data['license_plate']:
            is_valid = validate_license_plate(vehicle_data['license_plate'])
            vehicle_data['license_plate_valid'] = is_valid
        
        # 차량에 대한 정비 기록 조회
        cursor.execute(
            "SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY service_date DESC", 
            (vehicle_id,)
        )
        maintenance_records = cursor.fetchall()
        
        # 깊은 복사를 통해 원본 데이터를 수정하지 않도록 함
        maintenance_records_data = json.loads(json.dumps(maintenance_records))
        
        # 정비 비용 포맷팅
        for record in maintenance_records_data:
            if 'total_cost' in record and record['total_cost'] is not None:
                record['formatted_cost'] = format_currency(record['total_cost'])
        
        # 차량에 대한 검사 기록 조회
        cursor.execute(
            "SELECT * FROM inspection_records WHERE vehicle_id = ? ORDER BY inspection_date DESC", 
            (vehicle_id,)
        )
        inspection_records = cursor.fetchall()
        
        # 예정된 정비 조회
        cursor.execute(
            "SELECT * FROM scheduled_maintenances WHERE vehicle_id = ? AND is_completed = 0 ORDER BY scheduled_date", 
            (vehicle_id,)
        )
        scheduled_maintenances = cursor.fetchall()
        
        # 정비 제안 생성
        last_maintenance_date = None
        if maintenance_records_data and 'service_date' in maintenance_records_data[0]:
            try:
                last_maintenance_date = datetime.strptime(
                    maintenance_records_data[0]['service_date'], 
                    "%Y-%m-%d"
                ).date()
                logger.info(f"마지막 정비 날짜: {last_maintenance_date}")
            except ValueError as e:
                logger.error(f"날짜 변환 오류: {e}")
                pass
        
        # 주행거리와 마지막 정비일 기준 정비 제안 생성
        mileage = vehicle_data.get('mileage', 0)
        maintenance_suggestion = get_maintenance_suggestion(
            mileage, 
            last_maintenance_date
        )
        
        # 결과 구성
        result = {
            "vehicle": vehicle_data,
            "maintenance_records": maintenance_records_data,
            "inspection_records": inspection_records,
            "scheduled_maintenances": scheduled_maintenances,
            "maintenance_suggestion": maintenance_suggestion,
            "debug_info": {
                "last_maintenance_date": str(last_maintenance_date) if last_maintenance_date else None,
                "mileage": mileage
            }
        }
        
        # ETag 캐시 확인
        if check_etag(request, response, result):
            # 304 Not Modified 응답이 이미 설정됨
            return None
        
        return result
    except sqlite3.Error as e:
        logger.error(f"데이터베이스 오류: {e}")
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    except Exception as e:
        logger.error(f"일반 오류: {e}")
        raise HTTPException(status_code=500, detail=f"API 처리 중 오류 발생: {str(e)}")
    finally:
        conn.close()

# 테스트용 엔드포인트
@app.get("/api/test/utils")
async def test_utils():
    """packagescore.utils 모듈 기능 테스트"""
    try:
        test_results = {
            "mask_vin": {
                "input": "1HGCM82633A123456",
                "output": mask_vin("1HGCM82633A123456")
            },
            "validate_license_plate": {
                "valid_input": "12가 3456",
                "valid_output": validate_license_plate("12가 3456"),
                "invalid_input": "ABC123",
                "invalid_output": validate_license_plate("ABC123")
            },
            "format_currency": {
                "input": 150000,
                "output": format_currency(150000)
            },
            "get_maintenance_suggestion": {
                "input": {"mileage": 15000, "last_maintenance_date": date(2023, 1, 1)},
                "output": get_maintenance_suggestion(15000, date(2023, 1, 1))
            }
        }
        return {
            "status": "success",
            "message": "utils 모듈 테스트 성공",
            "results": test_results
        }
    except Exception as e:
        logger.error(f"utils 테스트 오류: {e}")
        return {
            "status": "error",
            "message": f"utils 모듈 테스트 실패: {str(e)}"
        }

# 서버 실행
if __name__ == "__main__":
    uvicorn.run("minimal_api_fixed:app", host="0.0.0.0", port=8000, reload=True)