from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class DriverStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"
    SUSPENDED = "SUSPENDED"

class DriverBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    license_number: str
    status: DriverStatus
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None
    vehicle_id: Optional[str] = None

class DriverCreate(DriverBase):
    birth_date: datetime
    hire_date: datetime
    license_expiry: datetime

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    status: Optional[DriverStatus] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None
    vehicle_id: Optional[str] = None
    birth_date: Optional[datetime] = None
    hire_date: Optional[datetime] = None
    license_expiry: Optional[datetime] = None
    safety_score: Optional[int] = None

class Driver(DriverBase):
    id: str
    firstName: str
    lastName: str
    birth_date: datetime
    hire_date: datetime
    license_expiry: datetime
    created_at: datetime
    updated_at: datetime
    safety_score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class DriverStats(BaseModel):
    total_trips: int
    total_distance: float
    average_rating: float
    safety_score: int
    fuel_efficiency: float
    incident_count: int
    completed_maintenance_checks: int
    last_active_date: datetime

class DriverFilters(BaseModel):
    status: Optional[DriverStatus] = None
    vehicle_id: Optional[str] = None
    search_query: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    page: Optional[int] = 1
    limit: Optional[int] = 10

class Document(BaseModel):
    id: str
    driver_id: str
    type: str
    name: str
    url: str
    uploaded_at: datetime
    expiry_date: Optional[datetime] = None
    status: Optional[str] = "VALID"

    model_config = ConfigDict(from_attributes=True)

class PaginatedDriverList(BaseModel):
    items: List[Driver]
    totalCount: int
    page: int
    limit: int
    totalPages: int 