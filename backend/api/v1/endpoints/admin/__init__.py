"""
관리자 API 라우터
"""
from fastapi import APIRouter

from backend.api.v1.endpoints.admin.inquiries import router as inquiries_router

# 관리자 라우터 생성
router = APIRouter(prefix="/admin", tags=["관리자"])

# 문의 관리 라우터 포함
router.include_router(inquiries_router)