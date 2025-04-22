"""
더미 모델 클래스 정의.

이 모듈은 실제 데이터베이스 모델이 없을 때 사용되는 더미 모델 구현을 제공합니다.
"""

from datetime import datetime


class DummyShop:
    """더미 Shop 모델"""

    id = None
    name = ""
    type = ""
    status = None
    description = ""

    class location:
        latitude = 0
        longitude = 0

    business_hours = []

    def __init__(self):
        self.__dict__ = {
            "id": None,
            "name": "",
            "type": "",
            "status": None,
            "description": "",
            "location": {"latitude": 0, "longitude": 0},
            "business_hours": [],
        }


class DummyShopService:
    """더미 ShopService 모델"""

    id = None
    shop_id = None
    service_type = ""

    def __init__(self, shop_id=None, service_type=None):
        self.shop_id = shop_id
        self.service_type = service_type
        self.__dict__ = {"id": None, "shop_id": shop_id, "service_type": service_type}


class DummyShopReview:
    """더미 ShopReview 모델"""

    id = None
    shop_id = None
    user_id = None
    rating = 0
    title = ""
    content = ""
    created_at = datetime.now()

    def __init__(self, shop_id=None, user_id=None, rating=0, title="", content=""):
        self.shop_id = shop_id
        self.user_id = user_id
        self.rating = rating
        self.title = title
        self.content = content
        self.__dict__ = {
            "id": None,
            "shop_id": shop_id,
            "user_id": user_id,
            "rating": rating,
            "title": title,
            "content": content,
            "created_at": datetime.now(),
        }


class DummyShopImage:
    """더미 ShopImage 모델"""

    id = None
    shop_id = None
    file_name = ""
    file_url = ""
    file_type = ""
    is_main = False

    def __init__(
        self, shop_id=None, file_name="", file_url="", file_type="", is_main=False
    ):
        self.shop_id = shop_id
        self.file_name = file_name
        self.file_url = file_url
        self.file_type = file_type
        self.is_main = is_main
        self.__dict__ = {
            "id": None,
            "shop_id": shop_id,
            "file_name": file_name,
            "file_url": file_url,
            "file_type": file_type,
            "is_main": is_main,
        }


class DummyTechnician:
    """더미 Technician 모델"""

    id = None
    shop_id = None
    name = ""
    specialty = ""
    experience_years = 0

    def __init__(self):
        self.__dict__ = {
            "id": None,
            "shop_id": None,
            "name": "",
            "specialty": "",
            "experience_years": 0,
        }


class DummyUser:
    """더미 User 모델"""

    id = None
    name = ""
    email = ""

    def __init__(self):
        self.__dict__ = {"id": None, "name": "", "email": ""}


class DummyVehicle:
    """더미 Vehicle 모델"""

    id = None
    make = ""
    model = ""
    year = 0
    user_id = None

    def __init__(self):
        self.__dict__ = {
            "id": None,
            "make": "",
            "model": "",
            "year": 0,
            "user_id": None,
        }


class DummyMaintenance:
    """더미 Maintenance 모델"""

    id = None
    vehicle_id = None
    type = ""
    description = ""
    status = ""
    date = datetime.now()

    def __init__(self):
        self.__dict__ = {
            "id": None,
            "vehicle_id": None,
            "type": "",
            "description": "",
            "status": "",
            "date": datetime.now(),
        }
