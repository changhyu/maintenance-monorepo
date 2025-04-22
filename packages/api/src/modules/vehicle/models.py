"""
Vehicle database models.
"""

from packagesmodels.base import BaseModel
from packagesmodels.schemas import VehicleStatus, VehicleType
from sqlalchemy import Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class Vehicle(BaseModel):
    """차량 데이터베이스 모델."""

    __tablename__ = "vehicles"
    __table_args__ = {"extend_existing": True}

    vin = Column(String, unique=True, index=True, nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(Enum(VehicleType), nullable=False)
    color = Column(String)
    plate = Column(String)
    mileage = Column(Integer)
    status = Column(Enum(VehicleStatus), default=VehicleStatus.ACTIVE, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"))

    # 관계 정의
    owner = relationship("User", back_populates="vehicles")
    maintenance_records = relationship(
        "Maintenance", back_populates="vehicle", cascade="all, delete-orphan"
    )
    todos = relationship("Todo", back_populates="vehicle")
