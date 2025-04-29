#!/usr/bin/env python
"""
기본 API 서버 구현
FastAPI를 사용한 미니멀한 구현
"""
import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="차량 정비 API",
    description="차량 정비 관리를 위한 API",
    version="1.0.0",
)

# CORS 설정 개선 - 프론트엔드 도메인 명시적 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
async def root():
    """API 상태 확인 엔드포인트"""
    return {"message": "차량 정비 API가 정상 작동 중입니다"}


@app.get("/health", tags=["health"])
async def health():
    """상세 상태 확인 엔드포인트"""
    return {
        "status": "ok",
        "version": app.version,
        "database_connected": False,  # 데이터베이스 연결 없음
    }


@app.get("/api/vehicles", tags=["vehicles"])
async def get_vehicles():
    """차량 목록 조회 - 데모 데이터"""
    return {
        "success": True,
        "message": "차량 목록을 성공적으로 조회했습니다",
        "data": [
            {
                "id": "12345",
                "make": "현대",
                "model": "아반떼",
                "year": 2023,
                "type": "SEDAN",
                "color": "파랑",
                "status": "AVAILABLE",
            }
        ],
    }


@app.get("/api/users", tags=["users"])
async def get_users():
    """사용자 목록 조회 - 데모 데이터"""
    return {
        "success": True,
        "message": "사용자 목록을 성공적으로 조회했습니다",
        "data": [
            {
                "id": "54321",
                "name": "테스트 사용자",
                "email": "test@example.com",
                "role": "USER",
            }
        ],
    }


@app.get("/api/maintenance", tags=["maintenance"])
async def get_maintenance():
    """정비 기록 목록 조회 - 데모 데이터"""
    return {
        "success": True,
        "message": "정비 기록 목록을 성공적으로 조회했습니다",
        "data": [
            {
                "id": "67890",
                "vehicle_id": "12345",
                "description": "정기 점검",
                "date": "2023-04-15T10:00:00",
                "status": "COMPLETED",
            }
        ],
    }


if __name__ == "__main__":
    # 환경 변수에서 포트 가져오기, 기본값 8081 사용
    port = int(os.getenv("PORT", 8081))
    print(f"API 서버 시작: 포트 {port}")

    # 서버 실행
    uvicorn.run(app, host="0.0.0.0", port=port)
