"""
Database models for SQLAlchemy.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

# from sqlalchemy.ext.declarative import declarative_base
# REMOVED: from typing import Optional
from typing import Any, Dict, List, Optional

from packagesmodels.base import BaseModel
from packagesmodels.vehicle import VehicleModel as Vehicle  # Vehicle 모델 통일

# REMOVED: from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

# Base를 직접 정의하지 않고 패키지에서 가져옵니다
from packages.api.src.database import Base

# 로거 설정
logger = logging.getLogger(__name__)

# 테이블 ID 상수 정의
SHOPS_TABLE_ID = "shops.id"
USERS_TABLE_ID = "users.id"
VEHICLES_TABLE_ID = "vehicles.id"

logger.info("데이터베이스 모델 로드 중...")


# Shop 관련 모델
class Shop(BaseModel):
    """정비소 모델"""

    __tablename__ = "shops"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    status = Column(String(20), default="ACTIVE")
    description = Column(Text, nullable=True)
    address = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)

    # 위치 정보
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # 시간 정보 - datetime.utcnow로 통일
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    services = relationship("ShopService", back_populates="shop")
    reviews = relationship("ShopReview", back_populates="shop")
    images = relationship("ShopImage", back_populates="shop")
    technicians = relationship("Technician", back_populates="shop")
    schedules = relationship(
        "ScheduleModel", back_populates="shop", cascade="all, delete-orphan"
    )

    @property
    def location(self):
        """위치 정보 반환"""

        class Location:
            def __init__(self, lat, lng):
                self.latitude = lat
                self.longitude = lng

        return Location(self.latitude, self.longitude)

    def __repr__(self):
        return f"<Shop {self.name}>"


class ShopService(BaseModel):
    """정비소 서비스 모델"""

    __tablename__ = "shop_services"

    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey(SHOPS_TABLE_ID), nullable=False)
    service_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    # Relationships
    shop = relationship("Shop", back_populates="services")

    def __repr__(self):
        return f"<ShopService {self.service_type}>"


class ShopReview(BaseModel):
    """정비소 리뷰 모델"""

    __tablename__ = "shop_reviews"

    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey(SHOPS_TABLE_ID), nullable=False)
    user_id = Column(String(36), ForeignKey(USERS_TABLE_ID), nullable=False)
    rating = Column(Integer, nullable=False)
    title = Column(String(100), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    shop = relationship("Shop", back_populates="reviews")
    user = relationship("User")

    def __repr__(self):
        return f"<ShopReview {self.id}>"


class ShopImage(BaseModel):
    """정비소 이미지 모델"""

    __tablename__ = "shop_images"

    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey(SHOPS_TABLE_ID), nullable=False)
    file_name = Column(String(100), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=True)
    file_size = Column(Integer, nullable=True)
    is_main = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shop = relationship("Shop", back_populates="images")

    def __repr__(self):
        return f"<ShopImage {self.file_name}>"


class Technician(BaseModel):
    """정비소 기술자 모델"""

    __tablename__ = "technicians"

    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey(SHOPS_TABLE_ID), nullable=False)
    name = Column(String(100), nullable=False)
    specialty = Column(String(100), nullable=True)
    experience_years = Column(Integer, nullable=True)
    certification = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)

    # Relationships
    shop = relationship("Shop", back_populates="technicians")

    def __repr__(self):
        return f"<Technician {self.name}>"


class User(BaseModel):
    """사용자 모델"""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="USER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Vehicle 모델과의 관계 정의
    vehicles = relationship("Vehicle", back_populates="owner")
    # 할 일(Todo) 모델과의 관계 정의 - 완전하게 구현됨
    todos = relationship("Todo", foreign_keys="Todo.user_id", back_populates="user")
    assigned_todos = relationship(
        "Todo", foreign_keys="Todo.assignee_id", back_populates="assignee"
    )

    def __repr__(self):
        return f"<User {self.email}>"


class Todo(BaseModel):
    """Todo 모델"""

    __tablename__ = "todos"

    id = Column(String(36), primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="PENDING")
    priority = Column(String(20), default="MEDIUM")
    vehicle_id = Column(String(36), ForeignKey(VEHICLES_TABLE_ID), nullable=True)
    user_id = Column(String(36), ForeignKey(USERS_TABLE_ID), nullable=False)
    assignee_id = Column(String(36), ForeignKey(USERS_TABLE_ID), nullable=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    tags = Column(JSON, nullable=True)
    extra_metadata = Column(JSON, nullable=True)
    category = Column(String(100), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="todos")
    assignee = relationship(
        "User", foreign_keys=[assignee_id], back_populates="assigned_todos"
    )
    vehicle = relationship("Vehicle", back_populates="todos")

    # 관련 투두 기능 구현
    related_todos = []  # 내부 사용 변수

    def find_related_todos(self, db_session) -> List[Dict[str, Any]]:
        """
        관련된 할 일들을 찾습니다.

        Args:
            db_session: 데이터베이스 세션

        Returns:
            List[Dict[str, Any]]: 관련 할 일 목록
        """
        # 같은 차량에 대한 할 일 찾기
        if self.vehicle_id:
            self.related_todos = (
                db_session.query(Todo)
                .filter(Todo.vehicle_id == self.vehicle_id, Todo.id != self.id)
                .all()
            )

        # 같은 사용자가 할당된 할 일 찾기
        elif self.assignee_id:
            self.related_todos = (
                db_session.query(Todo)
                .filter(Todo.assignee_id == self.assignee_id, Todo.id != self.id)
                .all()
            )

        return [todo.to_dict() for todo in self.related_todos]

    def __repr__(self):
        return f"<Todo {self.title}>"


logger.info("데이터베이스 모델 로드 완료")
