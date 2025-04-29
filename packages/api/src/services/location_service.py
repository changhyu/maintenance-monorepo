"""
위치 정보 서비스 모듈.
차량 위치 데이터를 처리하고 저장하는 기능을 제공합니다.
"""

import asyncio
import datetime
import json
import logging
import uuid
from typing import Dict, List, Optional, Tuple, Any

import aiohttp
import polyline
from fastapi import Depends, HTTPException
from sqlalchemy import func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.config import settings
from src.db.session import get_db
from src.models.vehicle_location import VehicleLocation, VehicleLocationStatus
from src.schemas.vehicle_location import (
    GeoPoint,
    GeoRoute,
    VehicleLocationCreate,
    VehicleLocationHistory,
    VehicleCoordinates,
)

logger = logging.getLogger(__name__)

# Google Maps API 키 (환경 변수에서 가져옴)
GOOGLE_MAPS_API_KEY = getattr(settings, "GOOGLE_MAPS_API_KEY", None)
if not GOOGLE_MAPS_API_KEY:
    logger.warning("GOOGLE_MAPS_API_KEY 환경 변수가 설정되지 않았습니다. 지도 관련 기능이 제한됩니다.")

GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json"
DIRECTIONS_API_URL = "https://maps.googleapis.com/maps/api/directions/json"
ELEVATION_API_URL = "https://maps.googleapis.com/maps/api/elevation/json"

# 사용자 정의 예외
class LocationServiceError(Exception):
    """위치 서비스 관련 기본 예외"""
    pass

class DatabaseError(LocationServiceError):
    """데이터베이스 작업 중 오류"""
    pass

class ExternalAPIError(LocationServiceError):
    """외부 API 호출 중 오류"""
    pass

class LocationService:
    """
    위치 정보를 처리하는 서비스 클래스.
    위치 데이터의 생성, 조회, 업데이트, 삭제 기능을 제공합니다.
    """
    
    def __init__(self, db: Session = Depends(get_db)):
        """서비스 인스턴스 초기화
        
        Args:
            db: 데이터베이스 세션
        """
        self.db = db
        self._http_session = None
        self._is_async_session = isinstance(db, AsyncSession)

    @property
    def http_session(self) -> aiohttp.ClientSession:
        """HTTP 세션 가져오기"""
        if self._http_session is None or self._http_session.closed:
            self._http_session = aiohttp.ClientSession()
        return self._http_session

    async def close(self):
        """리소스 정리"""
        if self._http_session and not self._http_session.closed:
            await self._http_session.close()

    async def track_vehicle_location(
        self, location_data: VehicleLocationCreate
    ) -> VehicleLocation:
        """
        차량 위치 추적 및 저장

        Args:
            location_data: 위치 데이터

        Returns:
            저장된 위치 정보
        """
        try:
            # 위치 기반 주소 조회 (역지오코딩)
            if not location_data.address and GOOGLE_MAPS_API_KEY:
                try:
                    address = await self.reverse_geocode(
                        location_data.latitude, location_data.longitude
                    )
                    location_data.address = address
                except Exception as e:
                    logger.warning(f"역지오코딩 실패: {str(e)}")

            # 차량 상태 결정 (속도 기반)
            if location_data.speed > 5.0:
                status = VehicleLocationStatus.DRIVING
            elif location_data.speed > 0:
                status = VehicleLocationStatus.IDLE
            else:
                status = VehicleLocationStatus.STOPPED

            # 데이터베이스에 위치 정보 저장
            location = VehicleLocation(
                id=str(uuid.uuid4()),
                vehicle_id=location_data.vehicle_id,
                latitude=location_data.latitude,
                longitude=location_data.longitude,
                speed=location_data.speed,
                heading=location_data.heading,
                status=status.value,
                address=location_data.address,
                timestamp=location_data.timestamp,
            )

            # 세션 타입에 따른 처리
            if self._is_async_session:
                # 비동기 세션
                async with self.db.begin():
                    self.db.add(location)
                await self.db.refresh(location)
            else:
                # 동기 세션
                with self.db.begin():
                    self.db.add(location)
                self.db.refresh(location)

            # 로깅
            logger.info(
                f"차량 위치 저장 완료: vehicle_id={location_data.vehicle_id}, "
                f"timestamp={location_data.timestamp}, status={status.value}"
            )
            
            return location
        except Exception as e:
            logger.error(f"위치 정보 저장 실패: {str(e)}")
            raise DatabaseError(f"위치 정보를 저장할 수 없습니다: {str(e)}") from e

    async def get_vehicle_location(self, vehicle_id: str) -> Optional[VehicleLocation]:
        """
        차량의 현재 위치 조회

        Args:
            vehicle_id: 차량 ID

        Returns:
            최신 위치 정보
        """
        try:
            result = await self.db.execute(
                select(VehicleLocation)
                .filter(VehicleLocation.vehicle_id == vehicle_id)
                .order_by(VehicleLocation.timestamp.desc())
                .limit(1)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"차량 위치 조회 실패: {str(e)}")
            raise DatabaseError(f"차량 위치를 조회할 수 없습니다: {str(e)}") from e

    async def get_vehicle_history(
        self, vehicle_id: str, start_date: datetime.datetime, end_date: datetime.datetime
    ) -> List[VehicleLocation]:
        """
        차량의 위치 이력 조회

        Args:
            vehicle_id: 차량 ID
            start_date: 시작 날짜/시간
            end_date: 종료 날짜/시간

        Returns:
            위치 이력 목록
        """
        try:
            result = await self.db.execute(
                select(VehicleLocation)
                .filter(
                    VehicleLocation.vehicle_id == vehicle_id,
                    VehicleLocation.timestamp >= start_date,
                    VehicleLocation.timestamp <= end_date,
                )
                .order_by(VehicleLocation.timestamp)
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"차량 위치 이력 조회 실패: {str(e)}")
            raise DatabaseError(f"차량 위치 이력을 조회할 수 없습니다: {str(e)}") from e

    async def get_all_active_vehicles_location(self) -> Dict[str, VehicleLocation]:
        """
        모든 활성 차량의 현재 위치 조회

        Returns:
            차량 ID를 키로 하는 위치 정보 딕셔너리
        """
        try:
            # 서브쿼리: 각 차량의 가장 최근 위치 타임스탬프 조회
            subquery = (
                select(
                    VehicleLocation.vehicle_id,
                    func.max(VehicleLocation.timestamp).label("max_timestamp"),
                )
                .group_by(VehicleLocation.vehicle_id)
                .subquery()
            )

            # 메인 쿼리: 가장 최근 위치 정보 조회
            query = (
                select(VehicleLocation)
                .join(
                    subquery,
                    (VehicleLocation.vehicle_id == subquery.c.vehicle_id)
                    & (VehicleLocation.timestamp == subquery.c.max_timestamp),
                )
                .order_by(VehicleLocation.vehicle_id)
            )

            result = await self.db.execute(query)
            locations = result.scalars().all()

            # 결과를 딕셔너리로 변환
            return {location.vehicle_id: location for location in locations}
        except Exception as e:
            logger.error(f"활성 차량 위치 조회 실패: {str(e)}")
            raise DatabaseError(f"활성 차량 위치를 조회할 수 없습니다: {str(e)}") from e

    async def calculate_route(
        self, start_point: Tuple[float, float], end_point: Tuple[float, float]
    ) -> Optional[List[GeoPoint]]:
        """
        두 지점 간의 경로 계산 (Google Directions API 사용)

        Args:
            start_point: 시작 지점 (위도, 경도)
            end_point: 종료 지점 (위도, 경도)

        Returns:
            경로 포인트 목록
        """
        if not GOOGLE_MAPS_API_KEY:
            logger.error("Google Maps API 키가 설정되지 않았습니다.")
            raise ExternalAPIError("Google Maps API 키가 설정되지 않았습니다.")
            
        try:
            params = {
                "origin": f"{start_point[0]},{start_point[1]}",
                "destination": f"{end_point[0]},{end_point[1]}",
                "key": GOOGLE_MAPS_API_KEY,
            }

            async with self.http_session.get(DIRECTIONS_API_URL, params=params) as response:
                if response.status != 200:
                    logger.error(f"Google Directions API 오류: {response.status}")
                    raise ExternalAPIError(f"Google Directions API 오류 응답: {response.status}")

                data = await response.json()
                if data["status"] != "OK":
                    logger.error(f"경로 조회 실패: {data['status']}")
                    raise ExternalAPIError(f"경로 조회 실패: {data['status']}")

                # 응답에서 경로 추출
                routes = data["routes"]
                if not routes:
                    return None

                # 첫 번째 경로의 인코딩된 폴리라인 가져오기
                encoded_polyline = routes[0]["overview_polyline"]["points"]
                
                # 폴리라인 디코딩하여 좌표 목록 생성
                try:
                    coords = polyline.decode(encoded_polyline)
                    return [GeoPoint(lat=lat, lng=lng) for lat, lng in coords]
                except ImportError:
                    logger.error("polyline 패키지가 설치되지 않았습니다.")
                    raise ExternalAPIError("polyline 패키지가 설치되지 않았습니다.")
                except Exception as e:
                    logger.error(f"폴리라인 디코딩 실패: {str(e)}")
                    raise ExternalAPIError(f"폴리라인 디코딩 실패: {str(e)}")

        except aiohttp.ClientError as e:
            logger.error(f"Google Directions API 호출 중 오류 발생: {str(e)}")
            raise ExternalAPIError(f"API 호출 오류: {str(e)}") from e
        except Exception as e:
            logger.error(f"경로 계산 중 오류 발생: {str(e)}")
            raise ExternalAPIError(f"경로 계산 오류: {str(e)}") from e

    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[str]:
        """
        좌표를 주소로 변환 (역지오코딩)

        Args:
            latitude: 위도
            longitude: 경도

        Returns:
            주소 문자열
        """
        if not GOOGLE_MAPS_API_KEY:
            logger.warning("Google Maps API 키가 설정되지 않아 역지오코딩을 수행할 수 없습니다.")
            return None
            
        try:
            params = {
                "latlng": f"{latitude},{longitude}",
                "key": GOOGLE_MAPS_API_KEY,
                "language": "ko",  # 한국어 결과
            }

            async with self.http_session.get(GEOCODING_API_URL, params=params) as response:
                if response.status != 200:
                    logger.error(f"Google Geocoding API 오류: {response.status}")
                    return None

                data = await response.json()
                if data["status"] != "OK":
                    logger.error(f"역지오코딩 실패: {data['status']}")
                    return None

                # 첫 번째 결과의 formatted_address 사용
                if data["results"]:
                    return data["results"][0]["formatted_address"]
                return None

        except Exception as e:
            logger.error(f"역지오코딩 중 오류 발생: {str(e)}")
            return None

    async def generate_trip_report(
        self, vehicle_id: str, start_date: datetime.datetime, end_date: datetime.datetime
    ) -> Dict[str, Any]:
        """
        특정 기간 동안의 차량 이동 보고서 생성

        Args:
            vehicle_id: 차량 ID
            start_date: 시작 날짜/시간
            end_date: 종료 날짜/시간

        Returns:
            이동 보고서 데이터
        """
        try:
            # 이력 데이터 조회
            locations = await self.get_vehicle_history(vehicle_id, start_date, end_date)
            
            if not locations:
                return {
                    "vehicle_id": vehicle_id,
                    "start_date": start_date,
                    "end_date": end_date,
                    "total_distance": 0,
                    "driving_time": 0,
                    "average_speed": 0,
                    "max_speed": 0,
                    "stops": [],
                    "route": [],
                }
            
            # 경로 포인트 추출
            route_points = [GeoPoint(lat=loc.latitude, lng=loc.longitude) for loc in locations]
            
            # 총 거리 계산 (단순 합산)
            total_distance = 0
            driving_time = 0
            speeds = []
            stops = []
            
            for i in range(1, len(locations)):
                prev = locations[i-1]
                curr = locations[i]
                
                # 속도 기록
                if curr.speed > 0:
                    speeds.append(curr.speed)
                
                # 정지 지점 기록
                if (prev.speed > 5.0 and curr.speed <= 0.5) or (i == 1 and curr.speed <= 0.5):
                    stops.append({
                        "location": {"lat": curr.latitude, "lng": curr.longitude},
                        "address": curr.address or "알 수 없음",
                        "timestamp": curr.timestamp.isoformat(),
                    })
                
                # 운전 중인 시간 합산
                if curr.status == VehicleLocationStatus.DRIVING.value:
                    time_diff = (curr.timestamp - prev.timestamp).total_seconds()
                    driving_time += time_diff
                
                # 위치 간 거리 계산 및 합산
                if curr.status == VehicleLocationStatus.DRIVING.value:
                    dt = (curr.timestamp - prev.timestamp).total_seconds() / 3600  # 시간(hour) 단위로 변환
                    if dt > 0 and curr.speed > 0:
                        distance = curr.speed * dt  # 속도(km/h) * 시간(h) = 거리(km)
                        total_distance += distance
            
            # 통계 계산
            avg_speed = sum(speeds) / len(speeds) if speeds else 0
            max_speed = max(speeds) if speeds else 0
            
            report = {
                "vehicle_id": vehicle_id,
                "start_date": start_date,
                "end_date": end_date,
                "total_distance": round(total_distance, 2),  # km
                "driving_time": round(driving_time / 60, 2),  # 분 단위
                "average_speed": round(avg_speed, 2),  # km/h
                "max_speed": round(max_speed, 2),  # km/h
                "stops": stops,
                "route": route_points,
            }
            
            logger.info(f"차량 {vehicle_id} 이동 보고서 생성 완료: "
                        f"{len(locations)} 데이터 포인트, "
                        f"{total_distance:.1f}km 주행, "
                        f"{len(stops)} 정지 지점")
            
            return report
        except Exception as e:
            logger.error(f"이동 보고서 생성 실패: {str(e)}")
            raise LocationServiceError(f"이동 보고서를 생성할 수 없습니다: {str(e)}") from e

    # 기본 위치 관련 메서드
    def create_location(self, location_data: LocationCreate) -> LocationRead:
        """새 위치 데이터 생성
        
        Args:
            location_data: 생성할 위치 데이터
            
        Returns:
            생성된 위치 정보
            
        Raises:
            DatabaseError: 데이터베이스 오류 발생 시
        """
        try:
            location = Location(**location_data.dict())
            self.db.add(location)
            self.db.commit()
            self.db.refresh(location)
            return LocationRead.from_orm(location)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"위치 생성 중 데이터베이스 오류: {str(e)}")
            raise DatabaseError(f"위치 데이터 생성 중 오류 발생: {str(e)}")
    
    def get_location(self, location_id: int) -> Optional[LocationRead]:
        """ID로 위치 데이터 조회
        
        Args:
            location_id: 조회할 위치 ID
            
        Returns:
            조회된 위치 정보 또는 None
        """
        location = self.db.query(Location).filter(Location.id == location_id).first()
        if location:
            return LocationRead.from_orm(location)
        return None
    
    def update_location(self, location_id: int, location_data: LocationUpdate) -> Optional[LocationRead]:
        """위치 데이터 업데이트
        
        Args:
            location_id: 업데이트할 위치 ID
            location_data: 업데이트할 위치 데이터
            
        Returns:
            업데이트된 위치 정보 또는 None
            
        Raises:
            DatabaseError: 데이터베이스 오류 발생 시
        """
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                return None
                
            for key, value in location_data.dict(exclude_unset=True).items():
                setattr(location, key, value)
                
            self.db.commit()
            self.db.refresh(location)
            return LocationRead.from_orm(location)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"위치 업데이트 중 데이터베이스 오류: {str(e)}")
            raise DatabaseError(f"위치 데이터 업데이트 중 오류 발생: {str(e)}")
    
    def delete_location(self, location_id: int) -> bool:
        """위치 데이터 삭제
        
        Args:
            location_id: 삭제할 위치 ID
            
        Returns:
            삭제 성공 여부
            
        Raises:
            DatabaseError: 데이터베이스 오류 발생 시
        """
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                return False
                
            self.db.delete(location)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"위치 삭제 중 데이터베이스 오류: {str(e)}")
            raise DatabaseError(f"위치 데이터 삭제 중 오류 발생: {str(e)}")
    
    # 차량 위치 관련 메서드
    def create_vehicle_location(self, vehicle_location_data: VehicleLocationCreate) -> VehicleLocationRead:
        """새 차량 위치 데이터 생성
        
        Args:
            vehicle_location_data: 생성할 차량 위치 데이터
            
        Returns:
            생성된 차량 위치 정보
            
        Raises:
            DatabaseError: 데이터베이스 오류 발생 시
        """
        try:
            vehicle_location = VehicleLocation(**vehicle_location_data.dict())
            self.db.add(vehicle_location)
            self.db.commit()
            self.db.refresh(vehicle_location)
            return VehicleLocationRead.from_orm(vehicle_location)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"차량 위치 생성 중 데이터베이스 오류: {str(e)}")
            raise DatabaseError(f"차량 위치 데이터 생성 중 오류 발생: {str(e)}")
    
    def get_latest_vehicle_location(self, vehicle_id: int) -> Optional[VehicleLocationRead]:
        """차량의 최신 위치 정보 조회
        
        Args:
            vehicle_id: 차량 ID
            
        Returns:
            최신 위치 정보 또는 None
        """
        vehicle_location = (
            self.db.query(VehicleLocation)
            .filter(VehicleLocation.vehicle_id == vehicle_id)
            .order_by(desc(VehicleLocation.timestamp))
            .first()
        )
        if vehicle_location:
            return VehicleLocationRead.from_orm(vehicle_location)
        return None
    
    def get_all_latest_vehicle_locations(self) -> List[VehicleLocationRead]:
        """모든 차량의 최신 위치 정보 조회
        
        Returns:
            차량별 최신 위치 정보 목록
        """
        # 서브쿼리로 각 차량의 최신 타임스탬프 구하기
        latest_timestamps = (
            self.db.query(
                VehicleLocation.vehicle_id,
                func.max(VehicleLocation.timestamp).label("max_timestamp")
            )
            .group_by(VehicleLocation.vehicle_id)
            .subquery()
        )
        
        # 최신 타임스탬프와 일치하는 위치 정보 조회
        latest_locations = (
            self.db.query(VehicleLocation)
            .join(
                latest_timestamps,
                (VehicleLocation.vehicle_id == latest_timestamps.c.vehicle_id) &
                (VehicleLocation.timestamp == latest_timestamps.c.max_timestamp)
            )
            .all()
        )
        
        return [VehicleLocationRead.from_orm(location) for location in latest_locations]
    
    def get_vehicle_location_history(
        self, 
        vehicle_id: int, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[VehicleLocationRead]:
        """차량의 위치 이력 조회
        
        Args:
            vehicle_id: 차량 ID
            start_time: 시작 시간 (기본값: 24시간 전)
            end_time: 종료 시간 (기본값: 현재)
            limit: 결과 제한 개수
            
        Returns:
            위치 이력 목록
        """
        if not start_time:
            start_time = datetime.utcnow() - datetime.timedelta(days=1)
        if not end_time:
            end_time = datetime.utcnow()
            
        locations = (
            self.db.query(VehicleLocation)
            .filter(
                VehicleLocation.vehicle_id == vehicle_id,
                VehicleLocation.timestamp >= start_time,
                VehicleLocation.timestamp <= end_time
            )
            .order_by(desc(VehicleLocation.timestamp))
            .limit(limit)
            .all()
        )
        
        return [VehicleLocationRead.from_orm(location) for location in locations]
    
    def delete_old_vehicle_locations(self, days: int = 30) -> int:
        """오래된 차량 위치 데이터 삭제
        
        Args:
            days: 보관 기간 (일)
            
        Returns:
            삭제된 레코드 수
            
        Raises:
            DatabaseError: 데이터베이스 오류 발생 시
        """
        try:
            cutoff_date = datetime.utcnow() - datetime.timedelta(days=days)
            deleted_count = (
                self.db.query(VehicleLocation)
                .filter(VehicleLocation.timestamp < cutoff_date)
                .delete()
            )
            self.db.commit()
            return deleted_count
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"오래된 차량 위치 삭제 중 데이터베이스 오류: {str(e)}")
            raise DatabaseError(f"오래된 차량 위치 데이터 삭제 중 오류 발생: {str(e)}")
    
    def get_current_vehicle_status(self, vehicle_id: int) -> Dict:
        """차량의 현재 상태 정보 조회 (위치, 상태)
        
        Args:
            vehicle_id: 차량 ID
            
        Returns:
            차량 상태 정보 딕셔너리
        """
        location = self.get_latest_vehicle_location(vehicle_id)
        if not location:
            return {
                "vehicle_id": vehicle_id,
                "status": "unknown",
                "location": None,
                "last_updated": None
            }
            
        status = "active" if (datetime.utcnow() - location.timestamp).total_seconds() < 300 else "inactive"
        
        return {
            "vehicle_id": vehicle_id,
            "status": status,
            "location": {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "altitude": location.altitude,
                "heading": location.heading,
                "speed": location.speed
            },
            "last_updated": location.timestamp
        }
    
    def calculate_distance(
        self, 
        coords1: VehicleCoordinates, 
        coords2: VehicleCoordinates
    ) -> float:
        """두 좌표 간 거리 계산 (하버사인 공식)
        
        Args:
            coords1: 첫 번째 좌표
            coords2: 두 번째 좌표
            
        Returns:
            거리 (미터)
        """
        from math import asin, cos, radians, sin, sqrt
        
        # 좌표를 라디안으로 변환
        lat1 = radians(coords1.latitude)
        lon1 = radians(coords1.longitude)
        lat2 = radians(coords2.latitude)
        lon2 = radians(coords2.longitude)
        
        # 하버사인 공식
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371000  # 지구 반경 (미터)
        
        return c * r

# 서비스 인스턴스 생성 함수
def get_location_service(db: Session = Depends(get_db)) -> LocationService:
    """
    위치 서비스 인스턴스 생성 및 반환

    Args:
        db: 데이터베이스 세션

    Returns:
        LocationService 인스턴스
    """
    return LocationService(db) 