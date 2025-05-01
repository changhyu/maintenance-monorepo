#!/usr/bin/env python3
"""
백엔드 모듈 임포트 테스트 스크립트
"""

try:
    from core.database import get_db, Base
    print("성공: 데이터베이스 모듈 가져오기 성공")
except Exception as e:
    print(f"오류: {e}") 