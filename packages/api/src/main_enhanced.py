"""
API 애플리케이션 메인 모듈 - 향상된 버전
"""
import logging
import sys
import os
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, Request, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

# 기본 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api.log")
    ]
)
logger = logging.getLogger("api")
logger.info("로깅 시스템 초기화 완료")

# 애플리케이션 설정
app = FastAPI(
    title="차량 관리 API",
    description="차량 관리 및 정비 일정 관리를 위한 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# JWT 설정
SECRET_KEY = "your-secret-key-here"  # 실제 서비스 시 환경 변수로 관리해야 함
ALGORITHM = "HS256"

# 데이터베이스 초기화
try:
    from database import engine, Base, get_db
    from sqlalchemy.orm import Session
    
    # 모델 클래스 임포트
    from models.user import User
    from models.vehicle import Vehicle
    
    # DB 테이블 생성
    Base.metadata.create_all(bind=engine)
    logger.info("데이터베이스 스키마가 생성되었습니다.")
except Exception as e:
    logger.error(f"데이터베이스 초기화 오류: {e}")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 서비스에서는 허용할 도메인을 명시해야 함
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# 의존성 정의
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    현재 사용자 가져오기
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 토큰 디코딩
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        # 토큰 타입 확인
        if token_type != "access":
            raise credentials_exception
        
        # 사용자 ID가 없는 경우
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    # 사용자 조회
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # 비활성 사용자 체크
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
        
    return user

async def get_admin_user(user: User = Depends(get_current_user)):
    """
    관리자 사용자 가져오기
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

# 에러 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"예외 발생: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": f"내부 서버 오류: {str(exc)}"}
    )

# 헬스 체크 라우트
@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "active", 
        "message": "API 서버가 정상적으로 실행 중입니다.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "environment": "development"
    }

# 라우터 등록
try:
    # 인증 라우터
    from routers.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/auth", tags=["인증"])
    
    # 차량 라우터
    from routers.vehicles import router as vehicles_router
    app.include_router(vehicles_router, prefix="/api/vehicles", tags=["차량"])
    
    logger.info("라우터가 성공적으로 등록되었습니다.")
    
except ImportError as e:
    logger.error(f"라우터 임포트 오류: {e}")
    
    # 기본 라우터 생성
    auth_router = APIRouter(prefix="/api/auth", tags=["인증"])
    vehicles_router = APIRouter(prefix="/api/vehicles", tags=["차량"])
    maintenance_router = APIRouter(prefix="/api/maintenance", tags=["정비"])
    schedules_router = APIRouter(prefix="/api/schedules", tags=["일정"])
    shops_router = APIRouter(prefix="/api/shops", tags=["정비소"])
    notifications_router = APIRouter(prefix="/api/notifications", tags=["알림"])
    admin_router = APIRouter(prefix="/api/admin", tags=["관리자"])
    vehicle_inspection_router = APIRouter(prefix="/api/vehicle-inspections", tags=["법정검사"])
    
    # 기본 라우트 구현
    @auth_router.get("/status")
    async def auth_status():
        return {"status": "active", "message": "인증 서비스 연결 정상"}
    
    @vehicles_router.get("/")
    async def list_vehicles():
        return {"vehicles": [], "message": "현재 등록된 차량이 없습니다."}
    
    @maintenance_router.get("/")
    async def list_maintenance():
        return {"records": [], "message": "정비 기록이 없습니다."}
    
    @schedules_router.get("/")
    async def list_schedules():
        return {"schedules": [], "message": "예정된 일정이 없습니다."}
    
    @shops_router.get("/")
    async def list_shops():
        return {"shops": [], "message": "등록된 정비소가 없습니다."}
    
    @notifications_router.get("/")
    async def list_notifications():
        return {"notifications": [], "message": "알림이 없습니다."}
    
    @admin_router.get("/status")
    async def admin_status():
        return {"status": "active", "message": "관리자 서비스 연결 정상"}
    
    @vehicle_inspection_router.get("/")
    async def list_inspections():
        return {"inspections": [], "message": "법정검사 일정이 없습니다."}
    
    # 라우터 등록
    app.include_router(auth_router)
    app.include_router(vehicles_router)
    app.include_router(maintenance_router)
    app.include_router(schedules_router)
    app.include_router(shops_router)
    app.include_router(notifications_router)
    app.include_router(admin_router)
    app.include_router(vehicle_inspection_router)
    
    logger.info("기본 라우터가 등록되었습니다.")

# 시작 이벤트
@app.on_event("startup")
async def startup_event():
    """
    서버 시작 시 실행되는 이벤트
    """
    logger.info("API 서버가 시작되었습니다.")

# 종료 이벤트
@app.on_event("shutdown")
async def shutdown_event():
    """
    서버 종료 시 실행되는 이벤트
    """
    logger.info("API 서버가 종료되었습니다.")

# 서버 실행 (직접 실행 시)
if __name__ == "__main__":
    import uvicorn
    logger.info("서버를 시작합니다...")
    uvicorn.run("main_enhanced:app", host="0.0.0.0", port=8000, reload=True)
