from contextlib import contextmanager
from typing import Generator, Any, Dict, List, Optional, Tuple, Union
import sqlite3
import os
import json
from config import config
from logger import Logger
import urllib.parse

logger = Logger.get_logger(__name__)

# psycopg2 가져오기 시도
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRESQL_AVAILABLE = True
except ImportError:
    POSTGRESQL_AVAILABLE = False
    logger.warning("psycopg2 패키지를 가져올 수 없습니다. PostgreSQL 연결이 비활성화됩니다.")

class Database:
    """Database connection and operation handler."""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one database connection instance exists."""
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self) -> None:
        """Initialize the database connection."""
        self._conn = None
        self.db_type = None
        self._connect()
        
    def _connect(self) -> None:
        """Establish database connection based on configuration."""
        try:
            database_url = config.get_database_url()
            
            # 데이터베이스 유형 결정
            if database_url.startswith('sqlite:///'):
                self._connect_sqlite(database_url)
            elif database_url.startswith('postgresql://'):
                if not POSTGRESQL_AVAILABLE:
                    logger.error("PostgreSQL 연결이 요청되었지만 psycopg2 패키지가 설치되지 않았습니다.")
                    logger.info("대체로 SQLite를 사용합니다.")
                    # PostgreSQL URL을 SQLite 형식으로 변환
                    parsed_url = urllib.parse.urlparse(database_url)
                    dbname = parsed_url.path[1:]  # /dbname에서 첫 번째 / 제거
                    sqlite_url = f"sqlite:///{dbname}.db"
                    self._connect_sqlite(sqlite_url)
                else:
                    self._connect_postgresql(database_url)
            else:
                raise ValueError(f"지원되지 않는 데이터베이스 URL: {database_url}")
                
            logger.info(f"데이터베이스 연결 완료: {self.db_type}")
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패: {str(e)}")
            raise
    
    def _connect_sqlite(self, database_url: str) -> None:
        """SQLite 데이터베이스에 연결"""
        self.db_type = "sqlite"
        db_path = database_url.replace("sqlite:///", "")
        
        # 데이터베이스 파일 디렉터리 생성
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)
            
        self._conn = sqlite3.connect(db_path)
        self._conn.row_factory = sqlite3.Row
    
    def _connect_postgresql(self, database_url: str) -> None:
        """PostgreSQL 데이터베이스에 연결"""
        if not POSTGRESQL_AVAILABLE:
            raise ImportError("psycopg2 패키지가 설치되지 않았습니다.")
            
        self.db_type = "postgresql"
        
        # database_url에서 연결 정보 파싱
        # postgresql://user:password@host:port/dbname 형식
        parsed_url = urllib.parse.urlparse(database_url)
        dbname = parsed_url.path[1:]  # /dbname에서 첫 번째 / 제거
        user = parsed_url.username
        password = parsed_url.password
        host = parsed_url.hostname
        port = parsed_url.port or 5432
        
        # PostgreSQL 연결
        try:
            self._conn = psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                host=host,
                port=port
            )
        except psycopg2.Error as e:
            logger.error(f"PostgreSQL 연결 실패: {str(e)}")
            raise
            
    @contextmanager
    def get_cursor(self) -> Generator[Union[sqlite3.Cursor, psycopg2.extensions.cursor], None, None]:
        """
        Get a database cursor with context management.
        
        Yields:
            A database cursor
        
        Raises:
            Exception: If any database error occurs
        """
        if self._conn is None or not self._is_connection_valid():
            self._connect()
            
        cursor = None
        try:
            if self.db_type == "postgresql":
                cursor = self._conn.cursor(cursor_factory=RealDictCursor)
            else:  # sqlite
                cursor = self._conn.cursor()
            
            yield cursor
            self._conn.commit()
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            try:
                if self._conn:
                    self._conn.rollback()
            except Exception as rollback_error:
                logger.error(f"Rollback error: {str(rollback_error)}")
            raise
        finally:
            if cursor:
                cursor.close()
                
    def _is_connection_valid(self) -> bool:
        """Check if the database connection is valid and active."""
        if not self._conn:
            return False
            
        try:
            # 데이터베이스 유형에 따라 연결 확인
            if self.db_type == "postgresql":
                # psycopg2는 기본적으로 연결 상태를 확인하는 속성을 제공하지 않음
                # 대신 간단한 쿼리를 실행하여 확인
                cursor = self._conn.cursor()
                try:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()  # 결과 소비 (중요)
                    return True
                except Exception:
                    return False
                finally:
                    cursor.close()
            else:  # sqlite
                # SQLite는 단순 쿼리 실행으로 연결 상태 확인
                self._conn.execute("SELECT 1").fetchone()
                return True
        except Exception as e:
            self.logger.debug(f"Connection validity check failed: {str(e)}")
            return False
            
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        Execute a database query and return results.
        
        Args:
            query: The SQL query to execute
            params: Optional parameters for the query
            
        Returns:
            A list of dictionaries representing the query results
        """
        if self._conn is None or not self._is_connection_valid():
            self._connect()
            
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            
            # PostgreSQL(RealDictCursor)은 이미 딕셔너리 형태로 결과 반환
            if self.db_type == "postgresql":
                return cursor.fetchall() or []
            else:  # sqlite
                if cursor.description is None:  # DML 문장(INSERT, UPDATE, DELETE)은 description이 None
                    return []
                columns = [col[0] for col in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
            
    def execute_many(self, query: str, params_list: List[tuple]) -> int:
        """
        Execute a query with multiple parameter sets.
        
        Args:
            query: The SQL query to execute
            params_list: List of parameter tuples
            
        Returns:
            Number of affected rows
        """
        if self._conn is None or not self._is_connection_valid():
            self._connect()
            
        with self.get_cursor() as cursor:
            cursor.executemany(query, params_list)
            return cursor.rowcount
            
    def execute_update(self, query: str, params: Optional[tuple] = None) -> int:
        """
        Execute an update/insert/delete query.
        
        Args:
            query: The SQL query to execute
            params: Optional parameters for the query
            
        Returns:
            Number of affected rows
        """
        if self._conn is None or not self._is_connection_valid():
            self._connect()
            
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            try:
                return cursor.rowcount
            except (AttributeError, TypeError) as e:
                logger.warning(f"rowcount를 가져올 수 없음: {str(e)}")
                return 0  # 영향 받은 행 수를 알 수 없는 경우 0 반환
            
    def close(self) -> None:
        """Close the database connection."""
        if self._conn:
            try:
                self._conn.close()
            except Exception as e:
                logger.warning(f"Error closing database connection: {str(e)}")
            finally:
                self._conn = None
                logger.debug("Database connection closed")

    def reset_test_database(self) -> bool:
        """
        Reset the test database - drops and recreates tables.
        This should only be used in a testing environment.
        
        Returns:
            True if reset was successful, False otherwise
        """
        if not config.TESTING:
            logger.warning("Attempted to reset database outside of testing environment")
            return False
            
        try:
            self.close()  # Close existing connection
            
            # Get the database path and remove the file if it exists
            database_url = config.get_database_url()
            db_path = database_url.replace("sqlite:///", "")
            
            if os.path.exists(db_path):
                os.remove(db_path)
                logger.info(f"Test database file removed: {db_path}")
                
            # Reconnect to create a fresh database
            self._connect()
            return True
        except Exception as e:
            logger.error(f"Failed to reset test database: {str(e)}")
            return False
                
    def create_tables_if_not_exists(self, table_schemas: Dict[str, str]) -> None:
        """
        Create database tables if they don't exist.
        
        Args:
            table_schemas: Dictionary mapping table names to their CREATE TABLE statements
        """
        if self._conn is None or not self._is_connection_valid():
            self._connect()
            
        with self.get_cursor() as cursor:
            for table_name, create_statement in table_schemas.items():
                try:
                    cursor.execute(create_statement)
                    logger.info(f"Table {table_name} created or already exists")
                except Exception as e:
                    logger.error(f"Failed to create table {table_name}: {str(e)}")
                    raise

    def drop_table(self, table_name: str) -> bool:
        """
        Drop a table from the database.
        
        Args:
            table_name: Name of the table to drop
            
        Returns:
            True if successful, False otherwise
        """
        if not config.TESTING:
            logger.warning(f"Attempted to drop table {table_name} outside of testing environment")
            return False
            
        try:
            with self.get_cursor() as cursor:
                cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
                logger.info(f"Table {table_name} dropped")
            return True
        except Exception as e:
            logger.error(f"Failed to drop table {table_name}: {str(e)}")
            return False

# Singleton instance
db = Database()