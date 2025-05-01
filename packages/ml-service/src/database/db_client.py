"""
ML 서비스를 위한 데이터베이스 클라이언트
차량 데이터, 텔레메트리, 정비 이력 등의 데이터 접근을 제공합니다.
"""
import asyncio
from typing import Any, Dict, List, Optional

import asyncpg
from maintenance_shared_python.logging import get_logger

# 로깅 설정
logger = get_logger("ml_db_client")

class DatabaseClient:
    """
    ML 서비스용 데이터베이스 접근 클라이언트
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        """
        데이터베이스 클라이언트 초기화
        
        Args:
            db_config: 데이터베이스 연결 설정
        """
        self.db_config = db_config
        self.pool = None
    
    async def initialize(self):
        """
        데이터베이스 풀 초기화
        """
        try:
            logger.info("데이터베이스 연결 풀 초기화 중...")
            self.pool = await asyncpg.create_pool(
                host=self.db_config.get("host", "localhost"),
                port=self.db_config.get("port", 5432),
                user=self.db_config.get("user", "postgres"),
                password=self.db_config.get("password", ""),
                database=self.db_config.get("database", "maintenance_db"),
                min_size=self.db_config.get("min_connections", 5),
                max_size=self.db_config.get("max_connections", 20)
            )
            logger.info("데이터베이스 연결 풀 초기화 완료")
            return True
        except Exception as e:
            logger.error(f"데이터베이스 연결 풀 초기화 실패: {str(e)}")
            raise
    
    async def close(self):
        """
        데이터베이스 연결 풀 종료
        """
        if self.pool:
            await self.pool.close()
            logger.info("데이터베이스 연결 풀 종료")
    
    async def get_vehicle_telemetry(
        self, 
        vehicle_id: str, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        차량 텔레메트리 데이터 조회
        
        Args:
            vehicle_id: 차량 ID
            start_date: 시작 날짜 (ISO 형식)
            end_date: 종료 날짜 (ISO 형식)
            limit: 최대 레코드 수
            
        Returns:
            List[Dict[str, Any]]: 텔레메트리 데이터 목록
        """
        if not self.pool:
            raise RuntimeError("데이터베이스 연결이 초기화되지 않았습니다")
        
        try:
            query = """
            SELECT 
                id, 
                vehicle_id, 
                timestamp, 
                engine_temp, 
                rpm, 
                speed, 
                fuel_level, 
                battery_voltage,
                tire_pressure,
                data
            FROM 
                vehicle_telemetry
            WHERE 
                vehicle_id = $1
            """
            
            params = [vehicle_id]
            if start_date:
                query += " AND timestamp >= $2"
                params.append(start_date)
            
            if end_date:
                query += f" AND timestamp <= ${len(params) + 1}"
                params.append(end_date)
            
            query += f" ORDER BY timestamp DESC LIMIT ${len(params) + 1}"
            params.append(limit)
            
            async with self.pool.acquire() as conn:
                records = await conn.fetch(query, *params)
                
                return [dict(record) for record in records]
        
        except Exception as e:
            logger.error(f"텔레메트리 조회 실패: {str(e)}")
            raise
    
    async def get_service_history(
        self, 
        vehicle_id: str, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        차량 정비 이력 조회
        
        Args:
            vehicle_id: 차량 ID
            limit: 최대 레코드 수
            
        Returns:
            List[Dict[str, Any]]: 정비 이력 목록
        """
        if not self.pool:
            raise RuntimeError("데이터베이스 연결이 초기화되지 않았습니다")
        
        try:
            query = """
            SELECT 
                id, 
                vehicle_id, 
                service_date, 
                service_type, 
                service_items,
                mileage,
                notes,
                completed
            FROM 
                service_history
            WHERE 
                vehicle_id = $1
            ORDER BY 
                service_date DESC
            LIMIT $2
            """
            
            async with self.pool.acquire() as conn:
                records = await conn.fetch(query, vehicle_id, limit)
                
                return [dict(record) for record in records]
        
        except Exception as e:
            logger.error(f"정비 이력 조회 실패: {str(e)}")
            raise
    
    async def save_prediction_result(
        self, 
        vehicle_id: str, 
        prediction_type: str, 
        prediction_results: Dict[str, Any]
    ) -> str:
        """
        예측 결과 저장
        
        Args:
            vehicle_id: 차량 ID
            prediction_type: 예측 유형 (maintenance, anomaly, part_lifetime)
            prediction_results: 예측 결과 데이터
            
        Returns:
            str: 생성된 예측 결과 ID
        """
        if not self.pool:
            raise RuntimeError("데이터베이스 연결이 초기화되지 않았습니다")
        
        try:
            query = """
            INSERT INTO prediction_results
            (vehicle_id, prediction_type, prediction_data, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id
            """
            
            async with self.pool.acquire() as conn:
                result_id = await conn.fetchval(query, 
                                               vehicle_id, 
                                               prediction_type, 
                                               prediction_results)
                
                logger.info(f"예측 결과 저장 성공: {result_id}")
                return result_id
        
        except Exception as e:
            logger.error(f"예측 결과 저장 실패: {str(e)}")
            raise
    
    async def get_vehicle_info(self, vehicle_id: str) -> Optional[Dict[str, Any]]:
        """
        차량 정보 조회
        
        Args:
            vehicle_id: 차량 ID
            
        Returns:
            Optional[Dict[str, Any]]: 차량 정보
        """
        if not self.pool:
            raise RuntimeError("데이터베이스 연결이 초기화되지 않았습니다")
        
        try:
            query = """
            SELECT 
                id, 
                make, 
                model, 
                year, 
                vin, 
                current_mileage, 
                last_service_date
            FROM 
                vehicles
            WHERE 
                id = $1
            """
            
            async with self.pool.acquire() as conn:
                record = await conn.fetchrow(query, vehicle_id)
                
                return dict(record) if record else None
        
        except Exception as e:
            logger.error(f"차량 정보 조회 실패: {str(e)}")
            raise