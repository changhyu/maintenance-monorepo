"""
최소 구현 FastAPI 애플리케이션
"""
import sqlite3
from typing import List, Dict, Any, Optional
import json
from datetime import date, datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="차량 정비 관리 API - 최소 구현")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 날짜 및 시간 포맷을 JSON으로 변환하기 위한 사용자 정의 인코더
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

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
async def get_vehicles():
    """차량 목록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vehicles WHERE is_active = 1")
        vehicles = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        vehicle_list = json.loads(json.dumps(vehicles, cls=CustomJSONEncoder))
        
        return {
            "total": len(vehicle_list),
            "vehicles": vehicle_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: int):
    """특정 차량 상세 정보 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 차량 정보 조회
        cursor.execute("SELECT * FROM vehicles WHERE id = ? AND is_active = 1", (vehicle_id,))
        vehicle = cursor.fetchone()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail=f"ID {vehicle_id}인 차량을 찾을 수 없습니다")
        
        # 차량에 대한 정비 기록 조회
        cursor.execute(
            "SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY service_date DESC", 
            (vehicle_id,)
        )
        maintenance_records = cursor.fetchall()
        
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
        
        # 결과를 JSON 직렬화 가능하게 변환
        result = {
            "vehicle": vehicle,
            "maintenance_records": maintenance_records,
            "inspection_records": inspection_records,
            "scheduled_maintenances": scheduled_maintenances
        }
        result = json.loads(json.dumps(result, cls=CustomJSONEncoder))
        
        return result
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/shops")
async def get_shops():
    """정비소 목록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM shops WHERE is_active = 1")
        shops = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        shop_list = json.loads(json.dumps(shops, cls=CustomJSONEncoder))
        
        return {
            "total": len(shop_list),
            "shops": shop_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/maintenance-records")
async def get_maintenance_records(vehicle_id: Optional[int] = None):
    """정비 기록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        if vehicle_id:
            cursor.execute(
                "SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY service_date DESC", 
                (vehicle_id,)
            )
        else:
            cursor.execute("SELECT * FROM maintenance_records ORDER BY service_date DESC")
            
        records = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        record_list = json.loads(json.dumps(records, cls=CustomJSONEncoder))
        
        return {
            "total": len(record_list),
            "records": record_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/inspection-records")
async def get_inspection_records(vehicle_id: Optional[int] = None):
    """검사 기록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        if vehicle_id:
            cursor.execute(
                "SELECT * FROM inspection_records WHERE vehicle_id = ? ORDER BY inspection_date DESC", 
                (vehicle_id,)
            )
        else:
            cursor.execute("SELECT * FROM inspection_records ORDER BY inspection_date DESC")
            
        records = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        record_list = json.loads(json.dumps(records, cls=CustomJSONEncoder))
        
        return {
            "total": len(record_list),
            "records": record_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/scheduled-maintenances")
async def get_scheduled_maintenances(vehicle_id: Optional[int] = None, include_completed: bool = False):
    """예정된 정비 일정 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        query = "SELECT * FROM scheduled_maintenances"
        params = []
        
        conditions = []
        if vehicle_id:
            conditions.append("vehicle_id = ?")
            params.append(vehicle_id)
            
        if not include_completed:
            conditions.append("is_completed = 0")
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " ORDER BY scheduled_date"
        
        cursor.execute(query, params)
        schedules = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        schedule_list = json.loads(json.dumps(schedules, cls=CustomJSONEncoder))
        
        return {
            "total": len(schedule_list),
            "schedules": schedule_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

@app.get("/api/notifications")
async def get_notifications(user_id: Optional[int] = None):
    """알림 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", 
                (user_id,)
            )
        else:
            cursor.execute("SELECT * FROM notifications ORDER BY created_at DESC")
            
        notifications = cursor.fetchall()
        
        # 날짜 형식을 JSON 직렬화 가능하게 변환
        notification_list = json.loads(json.dumps(notifications, cls=CustomJSONEncoder))
        
        return {
            "total": len(notification_list),
            "notifications": notification_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")
    finally:
        conn.close()

# 서버 실행
if __name__ == "__main__":
    uvicorn.run("minimal_api:app", host="0.0.0.0", port=8000, reload=True)