#!/usr/bin/env python3
import os
import sys
from sqlalchemy import create_engine

# 필요한 경로 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 데이터베이스 연결
DB_PATH = os.path.join(current_dir, "app.db")
DB_URL = f"sqlite:///{DB_PATH}"

def create_tables():
    try:
        # 모델 임포트
        from src.models.location import VehicleLocation
        from src.models.base import Base
        
        print("모델을 성공적으로 임포트했습니다.")
        print(f"데이터베이스 경로: {DB_PATH}")
        
        # 엔진 생성
        engine = create_engine(DB_URL, echo=True)
        
        # 테이블 생성 (VehicleLocation 모델만)
        # 주의: 이 방법은 해당 모델과 연관된 테이블만 생성합니다
        VehicleLocation.__table__.create(engine, checkfirst=True)
        
        print("\nVehicleLocation 테이블이 성공적으로 생성되었습니다.")
        
    except ImportError as e:
        print(f"모듈 가져오기 오류: {e}")
    except Exception as e:
        print(f"테이블 생성 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("vehicle_locations 테이블 생성을 시작합니다...")
    create_tables()
    print("완료.") 