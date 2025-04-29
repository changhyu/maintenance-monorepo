"""
차량 위치 정보를 위한 Pydantic 스키마
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

class VehicleLocationStatus(str, Enum):
    """차량 위치 상태 열거형"""
    DRIVING = "DRIVING"        # 주행 중
    STOPPED = "STOPPED"        # 정지 상태
    IDLE = "IDLE"              # 공회전
    PARKED = "PARKED"          # 주차됨
    OFFLINE = "OFFLINE"        # 오프라인/신호 없음

class VehicleLocationBase(BaseModel):
    """차량 위치 정보 기본 스키마"""
    latitude: float = Field(..., description="위도", ge=-90, le=90)
    longitude: float = Field(..., description="경도", ge=-180, le=180)
    speed: float = Field(0.0, description="속도 (km/h)")
    heading: int = Field(0, description="진행 방향 (0-359도)", ge=0, le=359)
    status: VehicleLocationStatus = Field(VehicleLocationStatus.STOPPED, description="차량 상태")
    address: Optional[str] = Field(None, description="현재 주소 (역지오코딩)")
    timestamp: datetime = Field(default_factory=datetime.now, description="위치 정보 타임스탬프")

class VehicleLocationCreate(VehicleLocationBase):
    """차량 위치 정보 생성 스키마"""
    vehicle_id: str = Field(..., description="차량 ID")

class VehicleLocationUpdate(BaseModel):
    """차량 위치 정보 업데이트 스키마"""
    latitude: Optional[float] = Field(None, description="위도", ge=-90, le=90)
    longitude: Optional[float] = Field(None, description="경도", ge=-180, le=180)
    speed: Optional[float] = Field(None, description="속도 (km/h)")
    heading: Optional[int] = Field(None, description="진행 방향 (0-359도)", ge=0, le=359)
    status: Optional[VehicleLocationStatus] = Field(None, description="차량 상태")
    address: Optional[str] = Field(None, description="현재 주소")
    timestamp: Optional[datetime] = Field(None, description="위치 정보 타임스탬프")

class VehicleLocation(VehicleLocationBase):
    """차량 위치 정보 응답 스키마"""
    id: str
    vehicle_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VehicleLocationHistory(BaseModel):
    """차량 위치 이력 응답 스키마"""
    vehicle_id: str
    locations: List[VehicleLocation]
    
class GeoPoint(BaseModel):
    """지리적 좌표점 스키마"""
    lat: float = Field(..., description="위도", ge=-90, le=90)
    lng: float = Field(..., description="경도", ge=-180, le=180)

class GeoRoute(BaseModel):
    """지리적 경로 스키마"""
    vehicle_id: str
    route: List[GeoPoint]
    start_time: datetime
    end_time: datetime
    distance: Optional[float] = None  # 킬로미터
    duration: Optional[int] = None    # 초 