"""
차량 위치 추적 API 라우터 모듈

차량 위치 추적, 이력 조회, 경로 분석 등의 API 엔드포인트를 제공합니다.
"""

import datetime
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from src.core.auth import validate_token, get_current_user
from src.core.exceptions import DatabaseError, ExternalAPIError
from src.schemas.vehicle_location import (
    GeoPoint,
    GeoRoute,
    VehicleLocation,
    VehicleLocationCreate,
    VehicleLocationHistory,
)
from src.services.location_service import LocationService, get_location_service

router = APIRouter()
security = HTTPBearer(auto_error=False)

# 응답 모델
class ApiResponse(BaseModel):
    """API 응답 기본 모델"""
    success: bool = True
    message: str
    data: Optional[Any] = None


class TripReportResponse(BaseModel):
    """이동 보고서 응답 모델"""
    vehicle_id: str
    start_date: datetime.datetime
    end_date: datetime.datetime
    total_distance: float
    driving_time: float
    average_speed: float
    max_speed: float
    stops: List[Dict[str, Any]]
    route: List[GeoPoint]


@router.post(
    "/vehicles/{vehicle_id}/location",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="차량 위치 기록",
    description="차량의 현재 위치를 기록합니다. GPS 트래커 또는 차량 텔레매틱스 시스템에서 호출됩니다.",
)
async def track_vehicle_location(
    vehicle_id: str,
    location_data: VehicleLocationCreate,
    location_service: LocationService = Depends(get_location_service),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    차량 위치 추적 및 저장 API

    Args:
        vehicle_id: 차량 ID
        location_data: 위치 데이터
        location_service: 위치 서비스 인스턴스
        credentials: 인증 정보

    Returns:
        저장된 위치 정보

    Raises:
        HTTPException: 차량 ID가 요청 데이터와 일치하지 않는 경우
    """
    # 인증 검증
    if credentials:
        try:
            token_data = validate_token(credentials.credentials)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"인증 실패: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # API 키 기반 인증 (내부 시스템, 차량 트래커 등의 경우)
        # 프로덕션 환경에서는 더 강력한 인증이 필요함
        pass

    # 차량 ID 검증
    if location_data.vehicle_id != vehicle_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="차량 ID가 일치하지 않습니다.",
        )

    try:
        location = await location_service.track_vehicle_location(location_data)
        return {
            "success": True,
            "message": "차량 위치가 성공적으로 기록되었습니다.",
            "data": location
        }
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"위치 기록 중 데이터베이스 오류가 발생했습니다: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"위치 기록 중 오류가 발생했습니다: {str(e)}",
        )


@router.get(
    "/vehicles/{vehicle_id}/location",
    response_model=ApiResponse,
    summary="차량 현재 위치 조회",
    description="차량의 가장 최근 위치 정보를 조회합니다.",
)
async def get_vehicle_location(
    vehicle_id: str,
    location_service: LocationService = Depends(get_location_service),
    current_user = Depends(get_current_user),
):
    """
    차량의 현재 위치 조회 API

    Args:
        vehicle_id: 차량 ID
        location_service: 위치 서비스 인스턴스
        current_user: 현재 인증된 사용자

    Returns:
        최신 위치 정보

    Raises:
        HTTPException: 위치 정보를 찾을 수 없는 경우
    """
    try:
        location = await location_service.get_vehicle_location(vehicle_id)
        if not location:
            return {
                "success": False,
                "message": f"차량 위치 정보를 찾을 수 없습니다: {vehicle_id}",
                "data": None
            }
        return {
            "success": True,
            "message": "차량 위치 정보를 조회했습니다.",
            "data": location
        }
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 오류: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"위치 조회 중 오류가 발생했습니다: {str(e)}",
        )


@router.get(
    "/vehicles/{vehicle_id}/location/history",
    response_model=ApiResponse,
    summary="차량 위치 이력 조회",
    description="특정 기간 동안의 차량 위치 이력을 조회합니다.",
)
async def get_vehicle_history(
    vehicle_id: str,
    start_date: datetime.datetime = Query(..., description="시작 날짜/시간 (ISO 형식)"),
    end_date: datetime.datetime = Query(..., description="종료 날짜/시간 (ISO 형식)"),
    location_service: LocationService = Depends(get_location_service),
    current_user = Depends(get_current_user),
):
    """
    차량의 위치 이력 조회 API

    Args:
        vehicle_id: 차량 ID
        start_date: 시작 날짜/시간
        end_date: 종료 날짜/시간
        location_service: 위치 서비스 인스턴스
        current_user: 현재 인증된 사용자

    Returns:
        위치 이력 정보

    Raises:
        HTTPException: 위치 이력을 조회할 수 없는 경우
    """
    try:
        # 날짜 유효성 검증
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="종료 날짜는 시작 날짜보다 이후여야 합니다",
            )
        
        # 조회 기간 제한 (예: 최대 30일)
        max_days = 30
        if (end_date - start_date).days > max_days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"조회 기간은 최대 {max_days}일로 제한됩니다",
            )
            
        locations = await location_service.get_vehicle_history(
            vehicle_id, start_date, end_date
        )
        history = {
            "vehicle_id": vehicle_id,
            "locations": locations,
        }
        return {
            "success": True,
            "message": f"차량 위치 이력을 조회했습니다. {len(locations)}개의 기록이 있습니다.",
            "data": history
        }
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 오류: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"위치 이력 조회 중 오류가 발생했습니다: {str(e)}",
        )


@router.get(
    "/vehicles/locations/active",
    response_model=ApiResponse,
    summary="모든 활성 차량 위치 조회",
    description="현재 활성 상태인 모든 차량의 위치를 조회합니다. 차량 관제 대시보드에서 사용됩니다.",
)
async def get_all_active_vehicles_location(
    location_service: LocationService = Depends(get_location_service),
    current_user = Depends(get_current_user),
):
    """
    모든 활성 차량의 위치 조회 API

    Args:
        location_service: 위치 서비스 인스턴스
        current_user: 현재 인증된 사용자

    Returns:
        차량 ID를 키로 하는 위치 정보 딕셔너리

    Raises:
        HTTPException: 위치 정보를 조회할 수 없는 경우
    """
    try:
        locations = await location_service.get_all_active_vehicles_location()
        return {
            "success": True,
            "message": f"활성 차량 위치 정보를 조회했습니다. {len(locations)}대의 차량이 있습니다.",
            "data": locations
        }
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 오류: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"차량 위치 조회 중 오류가 발생했습니다: {str(e)}",
        )


@router.get(
    "/vehicles/{vehicle_id}/location/report",
    response_model=ApiResponse,
    summary="차량 이동 보고서 생성",
    description="특정 기간 동안의 차량 이동에 대한 보고서를 생성합니다. 총 주행거리, 운전 시간, 평균 속도 등의 정보를 포함합니다.",
)
async def generate_trip_report(
    vehicle_id: str,
    start_date: datetime.datetime = Query(..., description="시작 날짜/시간 (ISO 형식)"),
    end_date: datetime.datetime = Query(..., description="종료 날짜/시간 (ISO 형식)"),
    location_service: LocationService = Depends(get_location_service),
    current_user = Depends(get_current_user),
):
    """
    차량 이동 보고서 생성 API

    Args:
        vehicle_id: 차량 ID
        start_date: 시작 날짜/시간
        end_date: 종료 날짜/시간
        location_service: 위치 서비스 인스턴스
        current_user: 현재 인증된 사용자

    Returns:
        이동 보고서 데이터

    Raises:
        HTTPException: 보고서 생성 중 오류가 발생한 경우
    """
    try:
        # 날짜 유효성 검증
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="종료 날짜는 시작 날짜보다 이후여야 합니다",
            )
        
        report = await location_service.generate_trip_report(
            vehicle_id, start_date, end_date
        )
        return {
            "success": True,
            "message": "이동 보고서가 생성되었습니다.",
            "data": report
        }
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 오류: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이동 보고서 생성 중 오류가 발생했습니다: {str(e)}",
        )


class RouteRequest(BaseModel):
    """경로 계산 요청 모델"""
    start_point: GeoPoint
    end_point: GeoPoint


@router.post(
    "/route",
    response_model=ApiResponse,
    summary="경로 계산",
    description="두 지점 간의 최적 경로를 계산합니다. Google Directions API를 사용합니다.",
)
async def calculate_route(
    route_request: RouteRequest,
    location_service: LocationService = Depends(get_location_service),
    current_user = Depends(get_current_user),
):
    """
    경로 계산 API

    Args:
        route_request: 경로 계산 요청 데이터
        location_service: 위치 서비스 인스턴스
        current_user: 현재 인증된 사용자

    Returns:
        경로 포인트 목록

    Raises:
        HTTPException: 경로 계산 중 오류가 발생한 경우
    """
    try:
        start = (route_request.start_point.lat, route_request.start_point.lng)
        end = (route_request.end_point.lat, route_request.end_point.lng)
        
        route = await location_service.calculate_route(start, end)
        if not route:
            return {
                "success": False,
                "message": "경로를 계산할 수 없습니다.",
                "data": None
            }
        
        return {
            "success": True,
            "message": f"경로가 성공적으로 계산되었습니다. {len(route)}개의 경로점이 있습니다.",
            "data": route
        }
    except ExternalAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"외부 API 오류: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"경로 계산 중 오류가 발생했습니다: {str(e)}",
        ) 