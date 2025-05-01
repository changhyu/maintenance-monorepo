"""
정비 API 라우터.
차량 정비 관련 API 엔드포인트를 제공합니다.
packagescore.utils 모듈 통합 완료
"""

import os
import time
import json
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional

from fastapi import (APIRouter, Depends, HTTPException, Path, Query, Request,
                     Response, status)
from modules.maintenance.service import maintenance_service
from packagescontrollers.maintenance_controller import MaintenanceController
from packagescore.cache import cache, cached
from packagescore.cache_decorators import CacheLevel, cache_response
from packagescore.dependencies import get_current_active_user, get_db
from packagescore.parallel_processor import (AsyncQueryBatcher, DataBatcher,
                                             ParallelProcessor)
from packagescore.utils import (
    check_etag, get_etag, paginate_list, CustomJSONEncoder, 
    to_dict, to_json, format_currency, get_maintenance_suggestion
)
from packagesmodels.schemas import (MaintenanceCreate, MaintenanceResponse,
                                    MaintenanceStatus, MaintenanceUpdate)
from packagesrouters.base_router import BaseRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session

CAR_ID = "차량 ID"


# 응답 모델 정의
class MaintenanceStatusResponse(BaseModel):
    status: str
    version: str
    git_status: Dict[str, str]


class MaintenanceRecord(BaseModel):
    id: int
    vehicle_id: int
    description: str
    status: str
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None


class MaintenanceDashboard(BaseModel):
    recent_maintenance: List[MaintenanceRecord]
    scheduled_maintenance: List[MaintenanceRecord]
    statistics: Dict[str, int]


class MaintenanceRouter(
    BaseRouter[MaintenanceStatusResponse, MaintenanceRecord, MaintenanceRecord]
):
    def __init__(self, controller: MaintenanceController):
        super().__init__(
            prefix="/maintenance",
            tags=["maintenance"],
            response_model=MaintenanceStatusResponse,
            create_model=MaintenanceRecord,
            update_model=MaintenanceRecord,
            service=controller,
            cache_key_prefix="maintenance",
        )

    @property
    def router(self):
        """라우터 인스턴스를 반환합니다."""
        return self._router

    def setup_routes(self):
        """API 라우트를 설정합니다."""
        super().setup_routes()
        
        # 대시보드 API 추가
        self._router.add_api_route(
            "/dashboard",
            self.get_dashboard,
            methods=["GET"],
            response_model=MaintenanceDashboard,
            summary="정비 대시보드 정보 조회",
        )
        
        # 정비 제안 API 추가
        self._router.add_api_route(
            "/vehicle/{vehicle_id}/suggestion",
            self.get_maintenance_suggestion,
            methods=["GET"],
            response_model=Dict[str, Any],
            summary="차량 정비 제안 조회",
        )
        
        # 통계 API 추가
        self._router.add_api_route(
            "/statistics",
            self.get_statistics,
            methods=["GET"],
            response_model=Dict[str, Any],
            summary="정비 통계 조회",
        )

    async def get_dashboard(
        self, request: Request, response: Response, db: Session = Depends(get_db)
    ):
        """
        정비 대시보드 정보를 조회합니다.
        최근 정비 기록, 예정된 정비 일정, 통계 정보를 포함합니다.
        """
        try:
            # 최근 정비 기록 조회
            recent_query = db.execute(
                """SELECT m.id, m.vehicle_id, m.description, m.status, 
                          m.scheduled_date, m.completed_date
                   FROM maintenance_records m
                   ORDER BY m.completed_date DESC LIMIT 5"""
            )
            recent_maintenance = [dict(row) for row in recent_query]
            
            # 예정된 정비 일정 조회
            scheduled_query = db.execute(
                """SELECT m.id, m.vehicle_id, m.description, m.status, 
                          m.scheduled_date, m.completed_date
                   FROM maintenance_records m
                   WHERE m.status = 'scheduled'
                   ORDER BY m.scheduled_date ASC LIMIT 5"""
            )
            scheduled_maintenance = [dict(row) for row in scheduled_query]
            
            # 통계 조회
            total_records = db.execute(
                "SELECT COUNT(*) FROM maintenance_records"
            ).scalar()
            
            completed = db.execute(
                "SELECT COUNT(*) FROM maintenance_records WHERE status = 'completed'"
            ).scalar()
            
            pending = db.execute(
                "SELECT COUNT(*) FROM maintenance_records WHERE status = 'scheduled'"
            ).scalar()
            
            # 정비 기록에 원화 포맷팅 적용
            cost_query = db.execute(
                "SELECT SUM(total_cost) FROM maintenance_records"
            ).scalar()
            total_cost = cost_query or 0
            
            # 응답 생성
            result = {
                "recent_maintenance": recent_maintenance,
                "scheduled_maintenance": scheduled_maintenance,
                "statistics": {
                    "total_records": total_records,
                    "completed": completed,
                    "pending": pending,
                    "total_cost": total_cost,
                    "formatted_total_cost": format_currency(total_cost)
                }
            }
            
            # ETag 캐시 확인
            if check_etag(request, response, result):
                return None  # 304 Not Modified
                
            # 결과 반환
            return result
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"대시보드 정보 조회 중 오류 발생: {str(e)}"
            )

    async def get_maintenance_suggestion(
        self, 
        vehicle_id: int, 
        request: Request,
        db: Session = Depends(get_db)
    ):
        """
        차량의 정비 제안을 조회합니다.
        주행거리와 마지막 정비일을 기반으로 정비 제안을 생성합니다.
        """
        try:
            # 차량 정보 조회
            vehicle_query = db.execute(
                "SELECT * FROM vehicles WHERE id = :id", 
                {"id": vehicle_id}
            )
            vehicle = dict(vehicle_query.first()) if vehicle_query.rowcount > 0 else None
            
            if not vehicle:
                raise HTTPException(
                    status_code=404,
                    detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
                )
            
            # 마지막 정비 날짜 확인
            last_maintenance_query = db.execute(
                """SELECT service_date FROM maintenance_records 
                   WHERE vehicle_id = :vehicle_id 
                   ORDER BY service_date DESC LIMIT 1""",
                {"vehicle_id": vehicle_id}
            )
            last_record = last_maintenance_query.first()
            
            last_maintenance_date = None
            if last_record:
                try:
                    last_maintenance_date = datetime.strptime(
                        last_record[0], "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            
            # 정비 제안 생성
            suggestion = get_maintenance_suggestion(
                vehicle["mileage"],
                last_maintenance_date
            )
            
            # 디버깅 정보 추가
            suggestion["vehicle_info"] = {
                "id": vehicle["id"],
                "make": vehicle["make"],
                "model": vehicle["model"],
                "year": vehicle["year"],
                "mileage": vehicle["mileage"]
            }
            
            # JSON 직렬화 테스트 (CustomJSONEncoder 활용)
            suggestion_json = to_json(suggestion)
            
            return json.loads(suggestion_json)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"정비 제안 생성 중 오류 발생: {str(e)}"
            )

    async def get_statistics(
        self, 
        period: str = Query("month", description="통계 기간 (day, week, month, year)"),
        db: Session = Depends(get_db)
    ):
        """
        정비 통계 정보를 조회합니다.
        지정된 기간(일/주/월/년)에 따른 정비 기록 통계를 생성합니다.
        """
        try:
            # 기간에 따른 날짜 범위 계산
            now = datetime.now().date()
            
            if period == "day":
                start_date = now
            elif period == "week":
                start_date = now - timedelta(days=7)
            elif period == "month":
                start_date = now.replace(day=1)  # 이번 달 1일
            elif period == "year":
                start_date = now.replace(month=1, day=1)  # 올해 1월 1일
            else:
                raise HTTPException(
                    status_code=400,
                    detail="유효하지 않은 기간입니다. day, week, month, year 중 하나를 선택하세요."
                )
            
            # 날짜 형식 변환
            start_date_str = start_date.strftime("%Y-%m-%d")
            now_str = now.strftime("%Y-%m-%d")
            
            # 통계 쿼리 실행
            total_query = db.execute(
                """SELECT COUNT(*) FROM maintenance_records 
                   WHERE service_date BETWEEN :start_date AND :end_date""",
                {"start_date": start_date_str, "end_date": now_str}
            )
            total_records = total_query.scalar() or 0
            
            # 상태별 통계
            status_query = db.execute(
                """SELECT status, COUNT(*) FROM maintenance_records 
                   WHERE service_date BETWEEN :start_date AND :end_date
                   GROUP BY status""",
                {"start_date": start_date_str, "end_date": now_str}
            )
            status_stats = {row[0]: row[1] for row in status_query}
            
            # 차량별 통계
            vehicle_query = db.execute(
                """SELECT v.id, v.make, v.model, COUNT(m.id) 
                   FROM vehicles v
                   JOIN maintenance_records m ON v.id = m.vehicle_id
                   WHERE m.service_date BETWEEN :start_date AND :end_date
                   GROUP BY v.id
                   ORDER BY COUNT(m.id) DESC
                   LIMIT 5""",
                {"start_date": start_date_str, "end_date": now_str}
            )
            vehicle_stats = [
                {"id": row[0], "make": row[1], "model": row[2], "count": row[3]}
                for row in vehicle_query
            ]
            
            # 비용 통계
            cost_query = db.execute(
                """SELECT SUM(total_cost) FROM maintenance_records 
                   WHERE service_date BETWEEN :start_date AND :end_date""",
                {"start_date": start_date_str, "end_date": now_str}
            )
            total_cost = cost_query.scalar() or 0
            
            # 응답 생성
            result = {
                "period": period,
                "date_range": {
                    "start": start_date_str,
                    "end": now_str
                },
                "total_records": total_records,
                "status_statistics": status_stats,
                "top_vehicles": vehicle_stats,
                "cost": {
                    "total": total_cost,
                    "formatted": format_currency(total_cost)
                }
            }
            
            # 응답 반환
            return to_dict(result)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"통계 정보 조회 중 오류 발생: {str(e)}"
            )


def create_maintenance_router(controller: MaintenanceController = None) -> APIRouter:
    # controller가 제공되지 않은 경우 새로 생성
    if controller is None:
        from packagescore.dependencies import get_current_user, get_db

        db = next(get_db())
        current_user = {"is_admin": True}  # 테스트용 기본 사용자
        from packagesrepositories.maintenance_repository import \
            MaintenanceRepository
        from packagesrepositories.vehicle_repository import VehicleRepository

        # db를 직접 전달하고 필요한 리포지토리도 초기화
        maintenance_repo = MaintenanceRepository(db)
        vehicle_repo = VehicleRepository()
        controller = MaintenanceController(db=db, current_user=current_user)

    router = MaintenanceRouter(controller)
    return router.get_router()


# 기본 라우터 인스턴스 생성
base_router = create_maintenance_router()

# 외부에서 임포트할 수 있도록 router 변수 노출
router = base_router
