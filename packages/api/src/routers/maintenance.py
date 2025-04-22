"""
정비 API 라우터.

차량 정비 관련 API 엔드포인트를 제공합니다.
"""

import os
import time
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
from packagescore.utils import check_etag, get_etag, paginate_list
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
