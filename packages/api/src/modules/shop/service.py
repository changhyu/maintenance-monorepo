"""
Shop service module.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import math

from sqlalchemy.orm import Session
from sqlalchemy import func
from geopy.distance import geodesic

from ...database import get_session
from ...models.schemas import ShopCreate, ShopUpdate, ShopReviewCreate, ShopStatus


class ShopService:
    """정비소 서비스 클래스."""
    
    def get_shops(self, skip: int = 0, limit: int = 100, filters: Dict = None) -> Dict[str, Any]:
        """
        정비소 목록을 조회합니다.
        """
        db = get_session()
        
        # 쿼리 생성
        query = db.query(self.ShopModel)
        
        # 필터 적용
        if filters:
            if "search" in filters and filters["search"]:
                search = f"%{filters['search']}%"
                query = query.filter(
                    self.ShopModel.name.ilike(search) | 
                    self.ShopModel.description.ilike(search)
                )
            
            if "service_type" in filters and filters["service_type"]:
                query = query.join(self.ShopServiceModel).filter(
                    self.ShopServiceModel.service_type == filters["service_type"]
                )
            
            # 지리적 필터링
            if "location" in filters and all(
                k in filters["location"] for k in ["latitude", "longitude", "distance"]
            ):
                # 클라이언트 측 필터링 (쿼리 후 계산)
                # 실제 구현에서는 지리적 인덱스나 PostGIS 등의 기능 활용 권장
                pass
        
        # 정렬
        query = query.order_by(self.ShopModel.name)
        
        # 페이지네이션 (지리적 필터링이 없는 경우)
        if not (filters and "location" in filters):
            total = query.count()
            shops = query.offset(skip).limit(limit).all()
            
            result_shops = []
            for shop in shops:
                shop_dict = shop.__dict__
                
                # 리뷰 정보 조회
                review_stats = db.query(
                    func.avg(self.ShopReviewModel.rating).label("avg_rating"),
                    func.count(self.ShopReviewModel.id).label("review_count")
                ).filter(self.ShopReviewModel.shop_id == shop.id).one()
                
                shop_dict["rating"] = float(review_stats.avg_rating) if review_stats.avg_rating else None
                shop_dict["review_count"] = review_stats.review_count
                
                # 서비스 목록 조회
                services = db.query(self.ShopServiceModel).filter_by(shop_id=shop.id).all()
                shop_dict["services"] = [service.service_type for service in services]
                
                result_shops.append(shop_dict)
            
            return {
                "shops": result_shops,
                "total": total
            }
        else:
            # 지리적 필터링이 있는 경우 (클라이언트 측 필터링)
            shops = query.all()
            client_location = (
                filters["location"]["latitude"],
                filters["location"]["longitude"]
            )
            max_distance = filters["location"]["distance"]
            
            # 거리 계산 및 필터링
            filtered_shops = []
            for shop in shops:
                shop_location = (shop.location.latitude, shop.location.longitude)
                distance = geodesic(client_location, shop_location).kilometers
                
                if distance <= max_distance:
                    shop_dict = shop.__dict__
                    shop_dict["distance"] = round(distance, 2)
                    
                    # 리뷰 정보 조회
                    review_stats = db.query(
                        func.avg(self.ShopReviewModel.rating).label("avg_rating"),
                        func.count(self.ShopReviewModel.id).label("review_count")
                    ).filter(self.ShopReviewModel.shop_id == shop.id).one()
                    
                    shop_dict["rating"] = float(review_stats.avg_rating) if review_stats.avg_rating else None
                    shop_dict["review_count"] = review_stats.review_count
                    
                    # 서비스 목록 조회
                    services = db.query(self.ShopServiceModel).filter_by(shop_id=shop.id).all()
                    shop_dict["services"] = [service.service_type for service in services]
                    
                    filtered_shops.append(shop_dict)
            
            # 거리 기준 정렬
            filtered_shops.sort(key=lambda x: x["distance"])
            
            # 페이지네이션
            total = len(filtered_shops)
            paginated_shops = filtered_shops[skip:skip + limit]
            
            return {
                "shops": paginated_shops,
                "total": total
            }
    
    def get_shop_by_id(self, shop_id: str) -> Dict[str, Any]:
        """
        특정 정비소의 상세 정보를 조회합니다.
        """
        db = get_session()
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        result = shop.__dict__
        
        # 리뷰 정보 조회
        review_stats = db.query(
            func.avg(self.ShopReviewModel.rating).label("avg_rating"),
            func.count(self.ShopReviewModel.id).label("review_count")
        ).filter(self.ShopReviewModel.shop_id == shop.id).one()
        
        result["rating"] = float(review_stats.avg_rating) if review_stats.avg_rating else None
        result["review_count"] = review_stats.review_count
        
        # 서비스 목록 조회
        services = db.query(self.ShopServiceModel).filter_by(shop_id=shop.id).all()
        result["services"] = [service.service_type for service in services]
        
        # 이미지 목록 조회
        images = db.query(self.ShopImageModel).filter_by(shop_id=shop.id).all()
        result["images"] = [image.__dict__ for image in images]
        
        # 기술자 목록 조회
        technicians = db.query(self.TechnicianModel).filter_by(shop_id=shop.id).all()
        result["technicians"] = [tech.__dict__ for tech in technicians]
        
        return result
    
    def create_shop(self, data: ShopCreate) -> Dict[str, Any]:
        """
        새 정비소를 등록합니다.
        """
        db = get_session()
        
        # 정비소 생성
        new_shop = self.ShopModel(
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
                service = self.ShopServiceModel(
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
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        
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
            db.query(self.ShopServiceModel).filter_by(shop_id=shop_id).delete()
            
            # 새 서비스 추가
            for service_type in services:
                service = self.ShopServiceModel(
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
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        # 관련 서비스 삭제
        db.query(self.ShopServiceModel).filter_by(shop_id=shop_id).delete()
        
        # 관련 리뷰 삭제
        db.query(self.ShopReviewModel).filter_by(shop_id=shop_id).delete()
        
        # 관련 이미지 삭제
        db.query(self.ShopImageModel).filter_by(shop_id=shop_id).delete()
        
        # 관련 기술자 삭제
        db.query(self.TechnicianModel).filter_by(shop_id=shop_id).delete()
        
        # 정비소 삭제
        db.delete(shop)
        db.commit()
        
        return True
    
    def get_shop_reviews(self, shop_id: str, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """
        정비소 리뷰 목록을 조회합니다.
        """
        db = get_session()
        
        # 정비소 존재 여부 확인
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        # 리뷰 조회
        total = db.query(self.ShopReviewModel).filter_by(shop_id=shop_id).count()
        reviews = db.query(self.ShopReviewModel).filter_by(shop_id=shop_id).order_by(
            self.ShopReviewModel.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        result_reviews = []
        for review in reviews:
            review_dict = review.__dict__
            
            # 사용자 정보 조회
            user = db.query(self.UserModel).filter_by(id=review.user_id).first()
            if user:
                review_dict["user"] = {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email
                }
            
            result_reviews.append(review_dict)
        
        return {
            "reviews": result_reviews,
            "total": total
        }
    
    def create_shop_review(self, shop_id: str, data: ShopReviewCreate) -> Dict[str, Any]:
        """
        정비소 리뷰를 작성합니다.
        """
        db = get_session()
        
        # 정비소 존재 여부 확인
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        # 사용자 정보 (인증된 사용자 ID 사용)
        # 실제 구현에서는 인증된 사용자 정보 활용
        user_id = "current_user_id"
        
        # 리뷰 생성
        new_review = self.ShopReviewModel(
            shop_id=shop_id,
            user_id=user_id,
            rating=data.rating,
            title=data.title,
            content=data.content
        )
        
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        
        return new_review.__dict__
    
    def find_nearby_shops(self, latitude: float, longitude: float, distance: float, limit: int = 10) -> List[Dict[str, Any]]:
        """
        근처 정비소를 검색합니다.
        """
        db = get_session()
        
        # 모든 정비소 조회 후 클라이언트 측 필터링
        # 실제 구현에서는 지리적 인덱스나 PostGIS 등의 기능 활용 권장
        shops = db.query(self.ShopModel).filter_by(status=ShopStatus.ACTIVE).all()
        
        client_location = (latitude, longitude)
        result = []
        
        for shop in shops:
            shop_location = (shop.location.latitude, shop.location.longitude)
            shop_distance = geodesic(client_location, shop_location).kilometers
            
            if shop_distance <= distance:
                shop_dict = shop.__dict__
                shop_dict["distance"] = round(shop_distance, 2)
                
                # 리뷰 정보 조회
                review_stats = db.query(
                    func.avg(self.ShopReviewModel.rating).label("avg_rating"),
                    func.count(self.ShopReviewModel.id).label("review_count")
                ).filter(self.ShopReviewModel.shop_id == shop.id).one()
                
                shop_dict["rating"] = float(review_stats.avg_rating) if review_stats.avg_rating else None
                shop_dict["review_count"] = review_stats.review_count
                
                # 서비스 목록 조회
                services = db.query(self.ShopServiceModel).filter_by(shop_id=shop.id).all()
                shop_dict["services"] = [service.service_type for service in services]
                
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
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        # 파일 저장 및 이미지 레코드 생성 로직
        # 실제 구현 시에는 파일 스토리지 서비스 사용 필요
        filename = file.filename
        file_url = f"/storage/shops/{shop_id}/{filename}"
        
        new_image = self.ShopImageModel(
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
        image = db.query(self.ShopImageModel).filter_by(
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
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        services = db.query(self.ShopServiceModel).filter_by(shop_id=shop_id).all()
        
        return [service.__dict__ for service in services]
    
    def check_shop_availability(self, shop_id: str, service_date: str) -> Dict[str, Any]:
        """
        정비소의 특정 날짜 예약 가능 여부를 확인합니다.
        """
        db = get_session()
        
        # 정비소 존재 여부 확인
        shop = db.query(self.ShopModel).filter_by(id=shop_id).first()
        if not shop:
            raise ValueError(f"ID가 {shop_id}인 정비소를 찾을 수 없습니다.")
        
        # 날짜 파싱
        try:
            date_obj = datetime.strptime(service_date, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식이어야 합니다.")
        
        # 예약 시간대 조회 (시간별 가용성)
        # 실제 구현에서는 예약 테이블 활용
        available_slots = []
        time_slots = [
            "09:00", "10:00", "11:00", "12:00", "13:00", 
            "14:00", "15:00", "16:00", "17:00"
        ]
        
        # 요일 확인 (영업일 여부)
        weekday = date_obj.strftime("%A").lower()
        
        # 영업 시간 확인
        is_business_day = False
        for hours in shop.business_hours:
            if hours["day"] == weekday:
                if not hours["is_closed"]:
                    is_business_day = True
                break
        
        # 영업일인 경우 예약 가능 시간대 생성
        if is_business_day:
            for slot in time_slots:
                # 더미 가용성 데이터 (실제 구현에서는 예약 테이블 확인)
                availability = {
                    "time": slot,
                    "is_available": True
                }
                available_slots.append(availability)
        
        return {
            "date": service_date,
            "is_business_day": is_business_day,
            "available_slots": available_slots
        }
    
    def get_shop_statistics(self, period: str = "month") -> Dict[str, Any]:
        """
        정비소 통계 정보를 조회합니다.
        """
        db = get_session()
        
        # 기간 설정
        today = datetime.now()
        
        if period == "week":
            start_date = today - timedelta(days=7)
        elif period == "month":
            start_date = today - timedelta(days=30)
        elif period == "year":
            start_date = today - timedelta(days=365)
        else:
            start_date = today - timedelta(days=30)  # 기본값은 한 달
        
        # 등록된 정비소 수
        total_shops = db.query(self.ShopModel).count()
        active_shops = db.query(self.ShopModel).filter_by(status=ShopStatus.ACTIVE).count()
        
        # 기간 내 등록된 정비소 수
        new_shops = db.query(self.ShopModel).filter(
            self.ShopModel.created_at >= start_date
        ).count()
        
        # 기간 내 작성된 리뷰 수
        new_reviews = db.query(self.ShopReviewModel).filter(
            self.ShopReviewModel.created_at >= start_date
        ).count()
        
        # 정비소 유형별 분포
        shop_types = db.query(
            self.ShopModel.type,
            func.count(self.ShopModel.id).label("count")
        ).group_by(self.ShopModel.type).all()
        
        type_distribution = {str(shop_type): count for shop_type, count in shop_types}
        
        # 서비스 유형별 분포
        service_types = db.query(
            self.ShopServiceModel.service_type,
            func.count(self.ShopServiceModel.id).label("count")
        ).group_by(self.ShopServiceModel.service_type).all()
        
        service_distribution = {str(service_type): count for service_type, count in service_types}
        
        return {
            "period": period,
            "total_shops": total_shops,
            "active_shops": active_shops,
            "new_shops": new_shops,
            "new_reviews": new_reviews,
            "type_distribution": type_distribution,
            "service_distribution": service_distribution
        }
    
    @property
    def ShopModel(self):
        from ...database.models import Shop
        return Shop
    
    @property
    def ShopServiceModel(self):
        from ...database.models import ShopService
        return ShopService
    
    @property
    def ShopReviewModel(self):
        from ...database.models import ShopReview
        return ShopReview
    
    @property
    def ShopImageModel(self):
        from ...database.models import ShopImage
        return ShopImage
    
    @property
    def TechnicianModel(self):
        from ...database.models import Technician
        return Technician
    
    @property
    def UserModel(self):
        from ...database.models import User
        return User


# 싱글톤 인스턴스 생성
shop_service = ShopService() 