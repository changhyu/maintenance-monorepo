# 차량 정비 관리 시스템 공통 Python 패키지

이 패키지는 차량 정비 관리 시스템 모노레포의 다양한 Python 기반 서비스에서 사용되는 공통 유틸리티, 설정, 모델, 로깅 등의 기능을 제공합니다.

## 설치

모노레포 내에서 이 패키지를 의존성으로 추가하려면:

```bash
# 개발 모드로 설치
pip install -e /path/to/maintenance-monorepo/packages/shared-python

# 또는 프로젝트 루트에서 스크립트 사용
./scripts/install_shared_python.sh
```

`requirements.txt`에 추가하기:

```
maintenance-shared-python==0.1.0
```

## 주요 기능

- **FastAPI 애플리케이션 팩토리**: 표준화된 FastAPI 애플리케이션 생성
- **API 응답 포맷**: 일관된 API 응답 구조 및 유틸리티
- **데이터베이스 유틸리티**: SQLAlchemy를 사용한 데이터베이스 연결 및 CRUD 작업
- **로깅 설정**: 일관된 로깅 구성 및 유틸리티
- **미들웨어**: 공통 미들웨어 구성
- **기타 유틸리티**: 환경 설정, 데이터 검증, 변환 등 다양한 공통 기능

## 사용 예시

### FastAPI 애플리케이션 생성

```python
from maintenance_shared_python import create_fastapi_app
from pydantic import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "정비 이력 서비스"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://example.com"]
    
    class Config:
        env_file = ".env"

settings = Settings()

def configure_routes(app):
    from api.v1.api import api_router
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

app = create_fastapi_app(
    settings=settings,
    title=settings.APP_NAME,
    description="차량 정비 이력 관리 API",
    version="0.1.0",
    configure_routes_func=configure_routes
)
```

### API 응답 생성

```python
from fastapi import APIRouter, Depends, HTTPException
from maintenance_shared_python import (
    create_success_response,
    create_error_response,
    create_paginated_response,
    create_not_found_response
)
from sqlalchemy.orm import Session
from . import crud, schemas
from .deps import get_db

router = APIRouter()

@router.get("/vehicles", summary="차량 목록 조회")
def get_vehicles(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    vehicles = crud.vehicle.get_multi(db, skip=skip, limit=limit)
    total = crud.vehicle.count(db)
    
    return create_paginated_response(
        items=vehicles,
        total_items=total,
        page=(skip // limit) + 1,
        per_page=limit,
        message="차량 목록 조회 성공"
    )

@router.get("/vehicles/{vehicle_id}", summary="차량 상세 조회")
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = crud.vehicle.get(db, id=vehicle_id)
    if not vehicle:
        return create_not_found_response("차량", vehicle_id)
    
    return create_success_response(
        data=vehicle,
        message="차량 상세 정보 조회 성공"
    )
```

### 데이터베이스 모델 및 CRUD 작업

```python
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from maintenance_shared_python import Base, ModelBase, CRUDBase
from maintenance_shared_python.database import DatabaseConfig, initialize_database
from . import schemas

# 데이터베이스 설정 및 초기화
db_config = DatabaseConfig(
    url="sqlite:///./maintenance.db",
    echo=True
)
db = initialize_database(db_config)

# 모델 정의
class Vehicle(Base, ModelBase):
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    vin = Column(String(17), unique=True, index=True)
    license_plate = Column(String(20), unique=True, index=True)
    
    # 관계
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle")
    
    def __repr__(self):
        return f"<Vehicle {self.year} {self.make} {self.model}>"

# CRUD 클래스 정의
class CRUDVehicle(CRUDBase[Vehicle, schemas.VehicleCreate, schemas.VehicleUpdate]):
    def get_by_vin(self, db, vin: str):
        return db.query(Vehicle).filter(Vehicle.vin == vin).first()
    
    def get_by_license_plate(self, db, license_plate: str):
        return db.query(Vehicle).filter(Vehicle.license_plate == license_plate).first()

# CRUD 인스턴스 생성
vehicle = CRUDVehicle(Vehicle)
```

### 로깅 설정

```python
from maintenance_shared_python import setup_logging, get_logger

# 애플리케이션 로거 설정
logger = setup_logging(
    name="maintenance_service",
    log_level="INFO",
    log_file="logs/service.log"
)

# 로거 사용
logger.info("서비스가 시작되었습니다.")
logger.warning("잠재적인 문제가 발생했습니다.")
logger.error("오류가 발생했습니다.", exc_info=True)

# 다른 모듈에서 로거 가져오기
module_logger = get_logger("maintenance_service")
```

## API 문서

### 애플리케이션 생성 (`fastapi_app`)

| 함수 | 설명 |
|------|------|
| `create_fastapi_app` | 표준화된 FastAPI 애플리케이션 생성 |

### API 응답 (`api_responses`)

| 함수 | 설명 | 예시 |
|------|------|------|
| `create_success_response` | 성공 응답 생성 | `create_success_response(data=result)` |
| `create_error_response` | 오류 응답 생성 | `create_error_response(message="잘못된 요청")` |
| `create_paginated_response` | 페이지네이션된 응답 생성 | `create_paginated_response(items=results, total_items=100)` |
| `create_validation_error_response` | 유효성 검사 오류 응답 생성 | `create_validation_error_response(errors=form_errors)` |
| `create_not_found_response` | 리소스 없음 응답 생성 | `create_not_found_response("차량", vehicle_id)` |
| `create_server_error_response` | 서버 오류 응답 생성 | `create_server_error_response()` |
| `create_unauthorized_response` | 인증 필요 응답 생성 | `create_unauthorized_response()` |
| `create_forbidden_response` | 권한 없음 응답 생성 | `create_forbidden_response()` |

### 데이터베이스 (`database`)

| 클래스/함수 | 설명 |
|------------|------|
| `Base` | SQLAlchemy 모델 기본 클래스 |
| `ModelBase` | 모든 모델의 기본 클래스 (공통 필드 정의) |
| `Database` | 데이터베이스 관리 클래스 |
| `DatabaseConfig` | 데이터베이스 설정 모델 |
| `CRUDBase` | 기본 CRUD 작업 클래스 |
| `initialize_database` | 데이터베이스 초기화 및 연결 함수 |
| `get_db` | FastAPI 종속성 주입용 세션 생성기 |
| `create_all_tables` | 모든 테이블 생성 |
| `drop_all_tables` | 모든 테이블 삭제 |
| `handle_db_error` | 데이터베이스 오류 처리 데코레이터 |
| `model_to_dict` | SQLAlchemy 모델을 사전으로 변환 |
| `dict_to_model` | 사전에서 SQLAlchemy 모델 생성 |

### 로깅 (`logging`)

| 함수 | 설명 |
|------|------|
| `setup_logging` | 로깅 설정 초기화 |
| `get_logger` | 이름으로 로거 가져오기 |
| `set_log_level` | 로거의 로그 레벨 설정 |

### 미들웨어 (`middleware`)

| 함수 | 설명 |
|------|------|
| `configure_cors` | CORS 미들웨어 설정 |
| `request_id_middleware` | 요청 ID 미들웨어 |
| `error_handler_middleware` | 오류 처리 미들웨어 |
| `logging_middleware` | 로깅 미들웨어 |
| `cache_control_middleware` | 캐시 제어 미들웨어 |

### 유틸리티 (`utils`)

| 함수 | 설명 |
|------|------|
| `get_environment` | 현재 환경 가져오기 |
| `load_env_file` | 환경 변수 파일 로드 |
| `parse_bool` | 문자열을 불리언으로 파싱 |
| `parse_list` | 문자열을 리스트로 파싱 |
| `parse_int` | 문자열을 정수로 파싱 |
| `sha256_hash` | SHA-256 해시 생성 |
| `mask_sensitive_data` | 민감한 데이터 마스킹 |
| `validate_email` | 이메일 유효성 검사 |
| `sanitize_filename` | 파일 이름 정리 |

## 기여하기

1. 새로운 유틸리티를 추가하기 전에 중복 기능이 없는지 확인해주세요.
2. 모든 함수와 클래스에 타입 힌트와 문서 문자열을 포함해야 합니다.
3. 유틸리티 추가 시 README 업데이트와 단위 테스트를 함께 작성해주세요.
4. 변경 사항은 Pull Request를 통해 제출해주세요.

## 라이센스

내부용 - 무단 배포 금지
