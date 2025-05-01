"""
최소 구현 FastAPI 애플리케이션 - packagescore.utils 모듈 통합
"""
import sqlite3
from typing import List, Dict, Any, Optional
import json
from datetime import date, datetime
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# packagescore 모듈 가져오기
from packagescore.utils import (
    CustomJSONEncoder, 
    validate_license_plate, 
    mask_vin, 
    format_currency, 
    get_maintenance_suggestion,
    check_etag,
    paginate_list
)

app = FastAPI(title="차량 정비 관리 API - 최소 구현 (utils 통합)")

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
        "version": "1.0.0"
    }

@app.get("/api/vehicles")
async def get_vehicles(
    request: Request, 
    response: Response,
    skip: int = 0, 
    limit: int = 20
):
    """차량 목록 조회 - 페이지네이션 및 ETag 적용"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vehicles WHERE is_active = 1")
        all_vehicles = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        vehicles_json = json.dumps(all_vehicles, cls=CustomJSONEncoder)
        vehicles_list = json.loads(vehicles_json)
        
        # ETag 캐시 확인
        result = paginate_list(vehicles_list, skip, limit)
        if check_etag(request, response, result):
            # 304 Not Modified 응답이 이미 설정됨
            return None
        
        return result
    except Exception as e:
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
    """특정 차량 상세 정보 조회 - 마스킹 및 ETag 적용"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 차량 정보 조회
        cursor.execute("SELECT * FROM vehicles WHERE id = ? AND is_active = 1", (vehicle_id,))
        vehicle = cursor.fetchone()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail=f"ID {vehicle_id}인 차량을 찾을 수 없습니다")
        
        # 마스킹 처리
        if mask_sensitive and 'vin' in vehicle and vehicle['vin']:
            vehicle['vin'] = mask_vin(vehicle['vin'])
        
        # 차량 번호판 검증
        if 'license_plate' in vehicle and vehicle['license_plate']:
            vehicle['license_plate_valid'] = validate_license_plate(vehicle['license_plate'])
        
        # 차량에 대한 정비 기록 조회
        cursor.execute(
            "SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY service_date DESC", 
            (vehicle_id,)
        )
        maintenance_records = cursor.fetchall()
        
        # 정비 비용 포맷팅
        for record in maintenance_records:
            if 'total_cost' in record:
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
        if maintenance_records and 'service_date' in maintenance_records[0]:
            try:
                last_maintenance_date = datetime.strptime(
                    maintenance_records[0]['service_date'], 
                    "%Y-%m-%d"
                ).date()
            except ValueError:
                pass
        
        maintenance_suggestion = get_maintenance_suggestion(
            vehicle.get('mileage', 0), 
            last_maintenance_date
        )
        
        # 결과를 JSON 직렬화 가능하게 변환
        result = {
            "vehicle": vehicle,
            "maintenance_records": maintenance_records,
            "inspection_records": inspection_records,
            "scheduled_maintenances": scheduled_maintenances,
            "maintenance_suggestion": maintenance_suggestion
        }
        result_json = json.dumps(result, cls=CustomJSONEncoder)
        final_result = json.loads(result_json)
        
        # ETag 캐시 확인
        if check_etag(request, response, final_result):
            # 304 Not Modified 응답이 이미 설정됨
            return None
        
        return final_result
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

# 나머지 API 엔드포인트는 유지

# 서버 실행
if __name__ == "__main__":
    uvicorn.run("minimal_api_enhanced:app", host="0.0.0.0", port=8000, reload=True)