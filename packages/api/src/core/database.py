"""
API 데이터베이스 모듈
"""

import contextlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from packages.api.src.coreconfig import config
from packages.api.src.coreexceptions import DatabaseException
from packages.api.src.corelogger import logger


class Database:
    """데이터베이스 연결 및 쿼리 관리 클래스"""

    def __init__(self):
        """데이터베이스 초기화"""
        self.db_path = Path(config.get_database_config()["path"])
        self._setup_database()

    def _setup_database(self) -> None:
        """데이터베이스 설정"""
        try:
            # 데이터베이스 디렉토리 생성
            self.db_path.parent.mkdir(parents=True, exist_ok=True)

            # 초기 스키마 생성
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # 사용자 테이블
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                # 리포지토리 테이블
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS repositories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        path TEXT UNIQUE NOT NULL,
                        owner_id INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (owner_id) REFERENCES users (id)
                    )
                """
                )

                # 커밋 테이블
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS commits (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        hash TEXT NOT NULL,
                        message TEXT NOT NULL,
                        author TEXT NOT NULL,
                        email TEXT NOT NULL,
                        date TIMESTAMP NOT NULL,
                        repository_id INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (repository_id) REFERENCES repositories (id)
                    )
                """
                )

                conn.commit()

        except Exception as e:
            raise DatabaseException(f"데이터베이스 설정에 실패했습니다: {str(e)}")

    @contextlib.contextmanager
    def get_connection(self) -> sqlite3.Connection:
        """데이터베이스 연결 컨텍스트 관리자"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def execute(self, query: str, params: Optional[Tuple[Any, ...]] = None) -> None:
        """쿼리 실행"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params or ())
                conn.commit()
        except Exception as e:
            raise DatabaseException(f"쿼리 실행에 실패했습니다: {str(e)}")

    def fetch_one(
        self, query: str, params: Optional[Tuple[Any, ...]] = None
    ) -> Optional[Dict[str, Any]]:
        """단일 레코드 조회"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params or ())
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            raise DatabaseException(f"레코드 조회에 실패했습니다: {str(e)}")

    def fetch_all(
        self, query: str, params: Optional[Tuple[Any, ...]] = None
    ) -> List[Dict[str, Any]]:
        """모든 레코드 조회"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params or ())
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            raise DatabaseException(f"레코드 조회에 실패했습니다: {str(e)}")

    def insert(self, table: str, data: Dict[str, Any]) -> int:
        """레코드 삽입"""
        try:
            columns = ", ".join(data.keys())
            placeholders = ", ".join("?" * len(data))
            query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"

            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, tuple(data.values()))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            raise DatabaseException(f"레코드 삽입에 실패했습니다: {str(e)}")

    def update(
        self,
        table: str,
        data: Dict[str, Any],
        where: str,
        params: Optional[Tuple[Any, ...]] = None,
    ) -> None:
        """레코드 업데이트"""
        try:
            set_clause = ", ".join(f"{k} = ?" for k in data.keys())
            query = f"UPDATE {table} SET {set_clause} WHERE {where}"

            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, tuple(data.values()) + (params or ()))
                conn.commit()
        except Exception as e:
            raise DatabaseException(f"레코드 업데이트에 실패했습니다: {str(e)}")

    def delete(
        self, table: str, where: str, params: Optional[Tuple[Any, ...]] = None
    ) -> None:
        """레코드 삭제"""
        try:
            query = f"DELETE FROM {table} WHERE {where}"

            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params or ())
                conn.commit()
        except Exception as e:
            raise DatabaseException(f"레코드 삭제에 실패했습니다: {str(e)}")


# 전역 데이터베이스 인스턴스
db = Database()
