"""
SQLAlchemy를 사용한 데이터베이스 연결 테스트
"""

import os

import sqlalchemy
from sqlalchemy import create_engine, text

# postgres 역할이 없으므로 현재 사용자 이름으로 변경
DATABASE_URL = "postgresql://gongchanghyeon:zDYQj96BLxNFR39f@localhost:5432/maintenance"


def test_db_connection():
    """데이터베이스 연결 테스트"""
    try:
        # 엔진 생성
        engine = create_engine(DATABASE_URL)

        # 연결 테스트
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("데이터베이스 연결 성공!")

            # 현재 데이터베이스 이름 확인
            db_result = connection.execute(text("SELECT current_database()"))
            db_name = db_result.fetchone()[0]
            print(f"현재 데이터베이스: {db_name}")

            # 테이블 목록 확인
            tables_result = connection.execute(
                text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )
            )
            tables = [row[0] for row in tables_result]
            print(f"테이블 목록: {tables}")

            return True
    except Exception as e:
        print(f"데이터베이스 연결 오류: {str(e)}")
        return False


if __name__ == "__main__":
    test_db_connection()
