"""
Vehicle database models.
"""

from sqlalchemy.orm import relationship
from sqlalchemy import Column, String, Integer, ForeignKey, Enum



from ...models.base import BaseModel
from ...models.schemas import VehicleStatus, VehicleType


class Vehicle(BaseModel):
    """차량 데이터베이스 모델."""

    __tablename__ = "vehicles"

    vin = Column(String, unique=True, index=True, nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(Enum(VehicleType), nullable=False)
    color = Column(String)
    plate = Column(String)
    mileage = Column(Integer)
    status = Column(
        Enum(VehicleStatus),
        default=VehicleStatus.ACTIVE,
        nullable=False
    )
    owner_id = Column(String, ForeignKey("users.id"))

    # 관계 정의
    owner = relationship("User", back_populates="vehicles")
    maintenance_records = relationship(
        "Maintenance",
        back_populates="vehicle",
        cascade="all, delete-orphan"
    )
    todos = relationship("Todo", back_populates="vehicle")