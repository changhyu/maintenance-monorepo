from datetime import datetime, timedelta
import uuid

# 샘플 차량 데이터
VEHICLES = [
    {
        "id": str(uuid.uuid4()),
        "name": "현대 포터 1호",
        "plate_number": "서울 12가 3456",
        "model": "포터 II",
        "manufacturer": "현대",
        "year": 2022,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "기아 봉고 1호",
        "plate_number": "서울 34나 5678",
        "model": "봉고 III",
        "manufacturer": "기아",
        "year": 2023,
    },
]

# 샘플 드라이버 데이터
DRIVERS = [
    {
        "id": str(uuid.uuid4()),
        "name": "홍길동",
        "email": "hong@example.com",
        "phone": "010-1234-5678",
        "license_number": "11-11-123456-78",
        "status": "active",
        "address": "서울시 강남구 테헤란로 123",
        "emergency_contact": "010-8765-4321",
        "notes": "우수 운전자",
        "vehicle_id": VEHICLES[0]["id"],
        "birth_date": datetime(1990, 1, 1),
        "hire_date": datetime(2020, 1, 1),
        "license_expiry": datetime.now() + timedelta(days=365),
    },
    {
        "id": str(uuid.uuid4()),
        "name": "김철수",
        "email": "kim@example.com",
        "phone": "010-2345-6789",
        "license_number": "11-11-234567-89",
        "status": "active",
        "address": "서울시 서초구 서초대로 456",
        "emergency_contact": "010-9876-5432",
        "notes": "신입 운전자",
        "vehicle_id": VEHICLES[1]["id"],
        "birth_date": datetime(1995, 5, 5),
        "hire_date": datetime(2023, 1, 1),
        "license_expiry": datetime.now() + timedelta(days=730),
    },
    {
        "id": str(uuid.uuid4()),
        "name": "이영희",
        "email": "lee@example.com",
        "phone": "010-3456-7890",
        "license_number": "11-11-345678-90",
        "status": "on_leave",
        "address": "서울시 송파구 올림픽로 789",
        "emergency_contact": "010-7654-3210",
        "notes": "휴가 중",
        "vehicle_id": None,
        "birth_date": datetime(1988, 12, 31),
        "hire_date": datetime(2021, 6, 1),
        "license_expiry": datetime.now() + timedelta(days=545),
    },
]

# 샘플 문서 데이터
DOCUMENTS = [
    {
        "id": str(uuid.uuid4()),
        "driver_id": DRIVERS[0]["id"],
        "type": "license",
        "name": "운전면허증.pdf",
        "url": "/uploads/drivers/홍길동/운전면허증.pdf",
        "uploaded_at": datetime.now(),
    },
    {
        "id": str(uuid.uuid4()),
        "driver_id": DRIVERS[0]["id"],
        "type": "insurance",
        "name": "보험증서.pdf",
        "url": "/uploads/drivers/홍길동/보험증서.pdf",
        "uploaded_at": datetime.now(),
    },
    {
        "id": str(uuid.uuid4()),
        "driver_id": DRIVERS[1]["id"],
        "type": "license",
        "name": "운전면허증.pdf",
        "url": "/uploads/drivers/김철수/운전면허증.pdf",
        "uploaded_at": datetime.now(),
    },
    {
        "id": str(uuid.uuid4()),
        "driver_id": DRIVERS[2]["id"],
        "type": "medical",
        "name": "건강검진결과.pdf",
        "url": "/uploads/drivers/이영희/건강검진결과.pdf",
        "uploaded_at": datetime.now(),
    },
] 