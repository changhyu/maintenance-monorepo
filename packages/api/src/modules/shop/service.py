"""
Shop service module.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Union, TypedDict, cast, TypeVar, Type, Literal, Sequence
from sqlalchemy.orm import Session, Query
from sqlalchemy.sql.expression import func as sql_func
from geopy import distance
from collections import defaultdict

# REMOVED: import math
import logging

# 로거 설정
logger = logging.getLogger(__name__)

# 의존성 모듈 임포트
try:
    from sqlalchemy import func
except ImportError:
    logger.error("sqlalchemy 패키지가 설치되지 않았습니다. 데이터베이스 기능이 작동하지 않습니다.")
    from ...core.dummy_modules import DummySession, DummyFunc as func
    Session = DummySession

try:
    from geopy.distance import geodesic
except ImportError:
    logger.error("geopy 패키지가 설치되지 않았습니다. 거리 계산 기능이 작동하지 않습니다.")
    from ...core.dummy_modules import geodesic

try:
    from database import get_session
except ImportError:
    logger.error("database 모듈을 찾을 수 없습니다. 데이터베이스 액세스가 작동하지 않습니다.")
    from ...core.dummy_modules import get_session
from ...models.schemas import ShopCreate, ShopUpdate, ShopReviewCreate, ShopStatus
from ...database.models import Shop, ShopService, ShopReview, ShopImage

T = TypeVar('T')
ShopData = Dict[str, Any]
ReviewData = Dict[str, Any]
ServiceData = Dict[str, Any]
LocationData = Dict[str, float]

def _calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 지점 간의 거리를 계산합니다."""
    return geodesic((lat1, lon1), (lat2, lon2)).km

def _get_shop_with_distance(shop: Shop, latitude: float, longitude: float) -> Dict[str, Any]:
    """정비소 정보에 거리 정보를 추가합니다."""
    shop_dict = shop.to_dict()
    shop_dict['distance'] = _calculate_distance(
        latitude, longitude,
        shop.latitude, shop.longitude
    )
    return shop_dict

def find_nearby_shops(
    db: Session, # type: ignore
    latitude: float,
    longitude: float,
    distance_km: float = 10.0,
    limit: int = 10
) -> List[ShopData]:
    """근처 정비소를 검색합니다."""
    shops = db.query(Shop).filter(Shop.status == ShopStatus.ACTIVE.value).all()
    nearby_shops = []
    
    for shop in shops:
        distance = _calculate_distance(latitude, longitude, shop.latitude, shop.longitude)
        if distance <= distance_km:
            shop_dict = shop.to_dict()
            shop_dict['distance'] = distance
            nearby_shops.append(shop_dict)
    
    nearby_shops.sort(key=lambda x: x['distance'])
    return nearby_shops[:limit]

class ShopResult(TypedDict):
    """정비소 결과 타입"""
    shops: List[Dict[str, Any]]
    total: int
    error: Optional[str]


class ShopService:
    """정비소 서비스 클래스."""

    def get_shops(self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None) -> ShopResult:
        """
        정비소 목록을 조회합니다.

        Args:
            skip: 건너뛸 레코드 수
            limit: 가져올 최대 레코드 수
            filters: 필터링 조건

        Returns:
            정비소 목록과 총 개수를 포함하는 딕셔너리
        """
        try:
            db = get_session()
            query = db.query(Shop)

            if filters:
                query = self._apply_filters(query, filters)

            location = filters.get("location") if filters else None
            if location and all(k in location for k in ["latitude", "longitude", "distance"]):
                return self._process_geo_query(db, query, location)
            
            return self._process_regular_query(db, query, skip, limit)

        except Exception as e:
            logger.error(f"정비소 목록 조회 중 오류 발생: {str(e)}")
            return {"shops": [], "total": 0, "error": str(e)}

    def _apply_filters(self, query: Any, filters: Dict[str, Any]) -> Any:
        """
        쿼리에 필터를 적용합니다.
        
        Args:
            query: SQLAlchemy 쿼리 객체
            filters: 적용할 필터 딕셔너리
            
        Returns:
            필터가 적용된 쿼리 객체
        """
        if "search" in filters and filters["search"]:
            search = f"%{filters['search']}%"
            query = query.filter(
                self.shop_model.name.ilike(search) |
                self.shop_model.description.ilike(search)
            )

        if "service_type" in filters and filters["service_type"]:
            query = query.join(self.shop_service_model).filter(
                self.shop_service_model.service_type == filters["service_type"]
            )

        return query

    def _process_regular_query(self, db: Session, query: Query, skip: int, limit: int) -> ShopResult: # type: ignore
        """일반 쿼리 처리 및 결과 반환"""
        total = query.count()
        shops = [
            self._enrich_shop_data(db, shop)
            for shop in query.offset(skip).limit(limit).all()
        ]
        return {"shops": shops, "total": total, "error": None}

    def _process_geo_query(self, db: Session, query: Query, location: LocationData) -> ShopResult: # type: ignore
        """지리적 필터링이 있는 쿼리 처리 및 결과 반환"""
        shops = query.all()
        client_location = (location["latitude"], location["longitude"])
        max_distance = location["distance"]
        filtered_shops = []

        for shop in shops:
            shop_location = (shop.location.latitude, shop.location.longitude)
            distance = geodesic(client_location, shop_location).kilometers
            
            if distance <= max_distance:
                shop_data = self._enrich_shop_data(db, shop)
                shop_data["distance"] = round(distance, 2)
                filtered_shops.append(shop_data)

        filtered_shops.sort(key=lambda x: x["distance"])
        return {"shops": filtered_shops, "total": len(filtered_shops), "error": None}

    def _enrich_shop_data(self, db: Session, shop: Any) -> Dict[str, Any]: # type: ignore
        """
        정비소 데이터에 추가 정보를 포함시킵니다.
        
        Args:
            db: 데이터베이스 세션
            shop: 정비소 모델 인스턴스
            
        Returns:
            추가 정보가 포함된 정비소 데이터 딕셔너리
        """
        shop_dict = shop.__dict__.copy()

        # 리뷰 정보 조회
        review_stats = db.query(
            sql_func.avg(self.shop_review_model.rating).label("avg_rating"),
            sql_func.count(self.shop_review_model.id).label("review_count")
        ).filter(self.shop_review_model.shop_id == shop.id).one()

        shop_dict["rating"] = float(review_stats.avg_rating) if review_stats.avg_rating else None
        shop_dict["review_count"] = review_stats.review_count

        # 서비스 목록 조회
        services = db.query(self.shop_service_model).filter_by(shop_id=shop.id).all()
        shop_dict["services"] = [service.service_type for service in services]

        return shop_dict

    def get_shop_by_id(self, shop_id: str) -> Dict[str, Any]:
        """
        특정 정비소의 상세 정보를 조회합니다.
        """
        db = get_session()
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()

        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        result = shop.__dict__

        # 리뷰 정보 조회
        review_stats = db.query(
            sql_func.avg(self.shop_review_model.rating).label("avg_rating"),
            sql_func.count(self.shop_review_model.id).label("review_count")
        ).filter(self.shop_review_model.shop_id == shop.id).one()

        result["rating"] = float(review_stats.avg_rating) if review_stats.avg_rating else None
        result["review_count"] = review_stats.review_count

        # 서비스 목록 조회
        services = db.query(self.shop_service_model).filter_by(shop_id=shop.id).all()
        result["services"] = [service.service_type for service in services]

        # 이미지 목록 조회
        images = db.query(self.shop_image_model).filter_by(shop_id=shop.id).all()
        result["images"] = [image.__dict__ for image in images]

        # 기술자 목록 조회
        technicians = db.query(self.technician_model).filter_by(shop_id=shop.id).all()
        result["technicians"] = [tech.__dict__ for tech in technicians]

        return result

    def create_shop(self, data: ShopCreate) -> Dict[str, Any]:
        """
        새 정비소를 등록합니다.
        """
        db = get_session()

        # 정비소 생성
        new_shop = self.shop_model(
            name=data.name,
            type=data.type,
            status=data.status,
            description=data.description,
            owner_id=data.owner_id
        )

        # 주소, 위치, 연락처 정보 설정
        new_shop.address = data.address.dict()
        new_shop.location = data.location.dict()
        new_shop.contact = data.contact.dict()

        # 영업 시간 설정
        new_shop.business_hours = [hours.dict() for hours in data.business_hours]

        db.add(new_shop)
        db.commit()
        db.refresh(new_shop)

        # 서비스 추가
        if data.services:
            for service_type in data.services:
                service = self.shop_service_model(
                    shop_id=new_shop.id,
                    service_type=service_type
                )
                db.add(service)

            db.commit()

        return self.get_shop_by_id(new_shop.id)

    def update_shop(self, shop_id: str, data: ShopUpdate) -> Dict[str, Any]:
        """
        정비소 정보를 업데이트합니다.
        """
        db = get_session()
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()

        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        # 기본 필드 업데이트
        update_data = data.dict(exclude_unset=True)

        # 중첩 모델 처리
        if "address" in update_data:
            shop.address = update_data.pop("address")

        if "location" in update_data:
            shop.location = update_data.pop("location")

        if "contact" in update_data:
            shop.contact = update_data.pop("contact")

        if "business_hours" in update_data:
            shop.business_hours = [hours.dict() for hours in update_data.pop("business_hours")]

        # 서비스 업데이트
        if "services" in update_data:
            services = update_data.pop("services")

            # 기존 서비스 삭제
            db.query(self.shop_service_model).filter_by(shop_id=shop_id).delete()

            # 새 서비스 추가
            for service_type in services:
                service = self.shop_service_model(
                    shop_id=shop_id,
                    service_type=service_type
                )
                db.add(service)

        # 나머지 필드 업데이트
        for field, value in update_data.items():
            setattr(shop, field, value)

        db.commit()
        db.refresh(shop)

        return self.get_shop_by_id(shop_id)

    def delete_shop(self, shop_id: str) -> bool:
        """
        정비소를 삭제합니다.
        """
        db = get_session()
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()

        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        # 관련 서비스 삭제
        db.query(self.shop_service_model).filter_by(shop_id=shop_id).delete()

        # 관련 리뷰 삭제
        db.query(self.shop_review_model).filter_by(shop_id=shop_id).delete()

        # 관련 이미지 삭제
        db.query(self.shop_image_model).filter_by(shop_id=shop_id).delete()

        # 관련 기술자 삭제
        db.query(self.technician_model).filter_by(shop_id=shop_id).delete()

        # 정비소 삭제
        db.delete(shop)
        db.commit()

        return True

    def get_shop_reviews(self, shop_id: str, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """정비소 리뷰 목록을 조회합니다."""
        db = get_session()
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()
        
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        total = db.query(self.shop_review_model).filter_by(shop_id=shop_id).count()
        reviews = db.query(self.shop_review_model).filter_by(shop_id=shop_id).order_by(
            self.shop_review_model.created_at.desc()
        ).offset(skip).limit(limit).all()

        result_reviews = [
            {
                **review.__dict__,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email
                } if (user := db.query(self.user_model).filter_by(id=review.user_id).first()) else None
            }
            for review in reviews
        ]

        return {"reviews": result_reviews, "total": total}

    def create_shop_review(self, shop_id: str, data: ShopReviewCreate) -> Dict[str, Any]:
        """
        정비소 리뷰를 작성합니다.
        
        Args:
            shop_id: 정비소 ID
            data: 리뷰 생성 데이터
            
        Returns:
            생성된 리뷰 정보
            
        Raises:
            ValueError: 정비소를 찾을 수 없는 경우
        """
        db = get_session()

        # 정비소 존재 여부 확인
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        # 리뷰 생성
        new_review = self.shop_review_model(
            shop_id=shop_id,
            user_id=data.user_id,
            rating=data.rating,
            title=data.title,
            content=data.content
        )

        db.add(new_review)
        db.commit()
        db.refresh(new_review)

        return new_review.__dict__

    def find_nearby_shops(
        self,
        latitude: float,
        longitude: float,
        distance: float,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        근처 정비소를 검색합니다.
        
        Args:
            latitude: 현재 위치 위도
            longitude: 현재 위치 경도
            distance: 검색 반경(km)
            limit: 최대 반환 개수
            
        Returns:
            거리순으로 정렬된 정비소 목록
        """
        db = get_session()

        # 모든 정비소를 한 번에 조회하여 N+1 쿼리 문제 방지
        shops = db.query(self.shop_model).filter_by(status=ShopStatus.ACTIVE).all()
        shop_ids = [shop.id for shop in shops]
        
        # 정비소 ID 목록이 비어있으면 빈 결과 반환
        if not shop_ids:
            return []
        
        # 리뷰 정보를 한 번에 조회
        stats_query = db.query(
            self.shop_review_model.shop_id,
            sql_func.avg(self.shop_review_model.rating).label("avg_rating"),
            sql_func.count(self.shop_review_model.id).label("review_count")
        ).filter(
            self.shop_review_model.shop_id.in_(shop_ids)
        ).group_by(self.shop_review_model.shop_id).all()
        
        review_stats = {
            shop_id: {
                "rating": float(avg_rating) if avg_rating else None,
                "review_count": review_count
            }
            for shop_id, avg_rating, review_count in stats_query
        }
        
        # 서비스 정보를 한 번에 조회
        services_by_shop = defaultdict(list)
        services_query = db.query(
            self.shop_service_model.shop_id,
            self.shop_service_model.service_type
        ).filter(
            self.shop_service_model.shop_id.in_(shop_ids)
        ).all()
        
        for shop_id, service_type in services_query:
            services_by_shop[shop_id].append(service_type)
        
        # 거리 계산 및 필터링
        client_location = (latitude, longitude)
        result = []
        
        for shop in shops:
            shop_location = (shop.location.latitude, shop.location.longitude)
            shop_distance = geodesic(client_location, shop_location).kilometers
            
            if shop_distance <= distance:
                shop_dict = shop.__dict__.copy()
                shop_dict["distance"] = round(shop_distance, 2)
                
                # 리뷰 정보 추가
                shop_stats = review_stats.get(shop.id, {"rating": None, "review_count": 0})
                shop_dict["rating"] = shop_stats["rating"]
                shop_dict["review_count"] = shop_stats["review_count"]
                
                # 서비스 정보 추가
                shop_dict["services"] = services_by_shop.get(shop.id, [])
                
                result.append(shop_dict)
        
        # 거리 기준 정렬
        result.sort(key=lambda x: x["distance"])
        
        return result[:limit]

    def upload_shop_image(self, shop_id: str, file) -> Dict[str, Any]:
        """
        정비소 이미지를 업로드합니다.
        """
        db = get_session()

        # 정비소 존재 여부 확인
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        # 파일 저장 및 이미지 레코드 생성 로직
        # 실제 구현 시에는 파일 스토리지 서비스 사용 필요
        filename = file.filename
        file_url = f"/storage/shops/{shop_id}/{filename}"

        new_image = self.shop_image_model(
            shop_id=shop_id,
            file_name=filename,
            file_url=file_url,
            file_type=file.content_type,
            is_main=False  # 기본적으로 주 이미지가 아님
        )

        db.add(new_image)
        db.commit()
        db.refresh(new_image)

        return new_image.__dict__

    def delete_shop_image(self, shop_id: str, image_id: str) -> bool:
        """
        정비소 이미지를 삭제합니다.
        """
        db = get_session()
        image = db.query(self.shop_image_model).filter_by(
            id=image_id,
            shop_id=shop_id
        ).first()

        if not image:
            raise ValueError(f"ID가 {image_id}인 이미지를 찾을 수 없습니다.")

        # 파일 삭제 로직
        # 실제 구현 시에는 파일 스토리지 서비스 사용 필요

        db.delete(image)
        db.commit()

        return True

    def get_shop_services(self, shop_id: str) -> List[Dict[str, Any]]:
        """
        정비소에서 제공하는 서비스 목록을 조회합니다.
        """
        db = get_session()

        # 정비소 존재 여부 확인
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        services = db.query(self.shop_service_model).filter_by(shop_id=shop_id).all()

        return [service.__dict__ for service in services]

    def check_shop_availability(self, shop_id: str, service_date: str) -> Dict[str, Any]:
        """
        정비소의 특정 날짜 예약 가능 여부를 확인합니다.
        """
        db = get_session()

        # 정비소 존재 여부 확인
        shop = db.query(self.shop_model).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")

        # 날짜 파싱
        try:
            date_obj = datetime.strptime(service_date, "%Y-%m-%d").date()
        except ValueError as parse_error:
            raise ValueError("날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식이어야 합니다.") from parse_error

        # 요일 확인 (영업일 여부)
        weekday = date_obj.strftime("%A").lower()
        
        # 영업 시간 확인
        is_business_day = False
        for hours in shop.business_hours:
            if hours["day"] == weekday:
                if not hours["is_closed"]:
                    is_business_day = True
                break

        # 예약 시간대 조회 (시간별 가용성)
        # 실제 구현에서는 예약 테이블 활용
        time_slots = [
            "09:00", "10:00", "11:00", "12:00", "13:00",
            "14:00", "15:00", "16:00", "17:00"
        ]
        
        # 영업일인 경우 예약 가능 시간대 생성
        available_slots = []
        if is_business_day:
            available_slots = [
                {"time": slot, "is_available": True}
                for slot in time_slots
            ]

        return {
            "date": service_date,
            "is_business_day": is_business_day,
            "available_slots": available_slots
        }

    def get_shop_statistics(self) -> Dict[str, Any]:
        """정비소 통계 정보를 조회합니다."""
        db = get_session()
        
        # 통계 데이터 수집
        total_shops = db.query(Shop).count()
        active_shops = db.query(Shop).filter(Shop.status == ShopStatus.ACTIVE).count()
        
        # 정비소 유형별 통계
        shop_type_stats = db.query(
            Shop.type,
            sql_func.count(Shop.id).label("count")
        ).group_by(Shop.type).all()
        
        type_distribution = {
            str(shop_type): count 
            for shop_type, count in shop_type_stats
        }
        
        # 서비스 유형별 통계
        service_type_stats = db.query(
            ShopService.service_type,
            sql_func.count(ShopService.id).label("count")
        ).group_by(ShopService.service_type).all()
        
        service_distribution = {
            str(service_type): count 
            for service_type, count in service_type_stats
        }
        
        return {
            "total_shops": total_shops,
            "active_shops": active_shops,
            "type_distribution": type_distribution,
            "service_distribution": service_distribution,
            "updated_at": datetime.now(timezone.utc)
        }

    @property
    def shop_model(self) -> Type[Shop]:
        """Shop 모델 반환"""
        try:
            from ...database.models import Shop
            return Shop
        except ImportError:
            logger.warning("Shop 모델을 찾을 수 없습니다. 더미 모델을 사용합니다.")
            from ...core.dummy_models import DummyShop
            return DummyShop

    @property
    def shop_service_model(self) -> Type[ShopService]:
        """ShopService 모델 반환"""
        try:
            from ...database.models import ShopService
            return ShopService
        except ImportError:
            logger.warning("ShopService 모델을 찾을 수 없습니다. 더미 모델을 사용합니다.")
            from ...core.dummy_models import DummyShopService
            return DummyShopService

    @property
    def shop_review_model(self) -> Type[ShopReview]:
        """ShopReview 모델 반환"""
        try:
            from ...database.models import ShopReview
            return ShopReview
        except ImportError:
            logger.warning("ShopReview 모델을 찾을 수 없습니다. 더미 모델을 사용합니다.")
            from ...core.dummy_models import DummyShopReview
            return DummyShopReview

    @property
    def shop_image_model(self):
        """ShopImage 모델 반환"""
        try:
            from ...database.models import ShopImage
            return ShopImage
        except ImportError:
            logger.warning("ShopImage 모델을 찾을 수 없습니다. 더미 모델을 사용합니다.")
            from ...core.dummy_models import DummyShopImage
            return DummyShopImage

    @property
    def technician_model(self):
        """Technician 모델 반환"""
        try:
            from ...database.models import Technician
            return Technician
        except ImportError:
            logger.warning("Technician 모델을 찾을 수 없습니다. 더미 모델을 사용합니다.")
            from ...core.dummy_models import DummyTechnician
            return DummyTechnician

    @property
    def user_model(self):
        """User 모델 반환"""
        try:
            from ...database.models import User
            return User
        except ImportError:
            logger.warning("User 모델을 찾을 수 없습니다. 더미 모델을 사용합니다.")
            from ...core.dummy_modules import DummyUser
            return DummyUser


# 싱글톤 인스턴스 생성
shop_service = ShopService()

def get_shop_statistics(db: Session, shop_id: str) -> Dict[str, Any]: # type: ignore
    """정비소 통계 정보를 조회합니다."""
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise ValueError("정비소를 찾을 수 없습니다")

    reviews = db.query(ShopReview).filter(ShopReview.shop_id == shop_id).all()
    services = db.query(ShopService).filter(ShopService.shop_id == shop_id).all()
    
    # 리뷰 통계
    review_stats = {
        'total_reviews': len(reviews),
        'average_rating': sum(r.rating for r in reviews) / len(reviews) if reviews else 0,
        'rating_distribution': {
            str(i): len([r for r in reviews if r.rating == i]) for i in range(1, 6)
        }
    }
    
    # 서비스 통계
    service_stats = {
        'total_services': len(services),
        'average_price': sum(s.price for s in services) / len(services) if services else 0,
        'service_types': {s.service_type: s.price for s in services}
    }
    
    return {
        'shop_id': shop_id,
        'review_statistics': review_stats,
        'service_statistics': service_stats,
        'updated_at': datetime.now(timezone.utc)
    }