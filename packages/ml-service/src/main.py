"""
차량 정비 예측 머신러닝 서비스 메인 엔트리포인트
"""

import os
import sys
from typing import Any, Dict, List, Optional

import uvicorn

# 현재 디렉토리를 시스템 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 내부 모듈 임포트
from fastapi import Depends, HTTPException
from maintenance_shared_python.config import BaseAppSettings
# 공유 패키지 임포트
from maintenance_shared_python.fastapi_app import create_fastapi_app
from maintenance_shared_python.logging import get_logger, setup_logging
from pydantic import BaseModel
# ML 서비스 모듈 임포트
from .services.model_service import ModelService
from .database.db_client import DatabaseClient

# 로깅 설정
logger = setup_logging("ml_service")
logger.info("ML 서비스 초기화 시작")


# 설정 클래스 생성
class MLServiceSettings(BaseAppSettings):
    PROJECT_NAME: str = "차량 정비 예측 API"
    PORT: int = 8001
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_NAME: str = "maintenance_db"
    DB_MIN_CONNECTIONS: int = 5
    DB_MAX_CONNECTIONS: int = 20


# 설정 인스턴스 생성
settings = MLServiceSettings()

# 모델 서비스 초기화
model_service = ModelService()

# 데이터베이스 클라이언트 초기화
db_config = {
    "host": settings.DB_HOST,
    "port": settings.DB_PORT,
    "user": settings.DB_USER,
    "password": settings.DB_PASSWORD,
    "database": settings.DB_NAME,
    "min_connections": settings.DB_MIN_CONNECTIONS,
    "max_connections": settings.DB_MAX_CONNECTIONS,
}
db_client = DatabaseClient(db_config)


# 데이터 모델 정의
class TelemetryData(BaseModel):
    vehicle_id: str
    timestamp: str
    mileage: int
    engine_temp: float
    oil_level: float
    battery_voltage: float
    tire_pressure: List[float]
    brake_pad_thickness: Optional[float] = None
    diagnostic_codes: Optional[List[str]] = None


class MaintenancePredictionRequest(BaseModel):
    vehicle_id: str
    telemetry_history: List[TelemetryData]
    service_history: Optional[List[Dict[str, Any]]] = None


class AnomalyDetectionRequest(BaseModel):
    vehicle_id: str
    telemetry_data: TelemetryData


class PartLifetimeRequest(BaseModel):
    vehicle_id: str
    telemetry_history: List[TelemetryData]
    service_history: Optional[List[Dict[str, Any]]] = None


# FastAPI 애플리케이션 생성 및 설정 (공통 모듈 사용)
app = create_fastapi_app(
    settings=settings,
    title="차량 정비 예측 API",
    description="차량 정비 일정 및 부품 수명 예측을 위한 머신러닝 API",
    version="0.1.0",
    logger=logger,
)


# 시작/종료 함수 정의
@app.on_event("startup")
async def startup_event():
    """서비스 시작 시 모델 로드 및 DB 연결"""
    logger.info("ML 서비스 시작 - 모델 로딩 중...")
    try:
        await model_service.load_models()
        await db_client.initialize()
        logger.info("ML 서비스 시작 완료")
    except Exception as e:
        logger.error(f"ML 서비스 시작 중 오류 발생: {str(e)}")
        # 애플리케이션 종료
        import sys

        sys.exit(1)


@app.on_event("shutdown")
async def shutdown_event():
    """서비스 종료 시 DB 연결 종료"""
    logger.info("ML 서비스 종료 중...")
    try:
        await db_client.close()
        logger.info("ML 서비스 정상 종료")
    except Exception as e:
        logger.error(f"ML 서비스 종료 중 오류 발생: {str(e)}")


# API 라우트 정의
@app.get("/health")
async def health_check():
    """
    서비스 상태 확인 엔드포인트
    """
    return {
        "status": "healthy",
        "models_loaded": model_service.models_loaded,
        "available_models": model_service.get_available_models(),
    }


@app.get("/models")
async def get_models_info():
    """
    사용 가능한 ML 모델 정보 반환
    """
    if not model_service.models_loaded:
        raise HTTPException(status_code=503, detail="모델이 로드되지 않았습니다")

    return {
        "models": model_service.get_available_models(),
        "training_info": model_service.get_last_training_info(),
    }


@app.post("/predict/maintenance")
async def predict_maintenance(request: MaintenancePredictionRequest):
    """
    차량 정비 일정 예측 API
    """
    try:
        # 차량 정보 및 서비스 히스토리 조회
        if not request.service_history:
            service_history = await db_client.get_service_history(request.vehicle_id)
        else:
            service_history = request.service_history

        # 예측 수행
        prediction = await model_service.predict_maintenance(
            request.vehicle_id, request.telemetry_history, service_history
        )

        # 예측 결과 저장
        result_id = await db_client.save_prediction_result(
            request.vehicle_id, "maintenance", prediction
        )

        # 예측 결과에 ID 추가
        prediction["result_id"] = result_id

        return prediction
    except Exception as e:
        logger.error(f"정비 예측 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"예측 처리 중 오류가 발생했습니다: {str(e)}")


@app.post("/detect/anomalies")
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    차량 텔레메트리 데이터의 이상 감지 API
    """
    try:
        # 이상 감지 수행
        anomalies = await model_service.detect_anomalies(
            request.vehicle_id, request.telemetry_data
        )

        # 이상이 감지된 경우 결과 저장
        if anomalies:
            result_id = await db_client.save_prediction_result(
                request.vehicle_id, "anomaly", {"anomalies": anomalies}
            )

            return {
                "result_id": result_id,
                "anomalies": anomalies,
                "count": len(anomalies),
            }

        return {
            "anomalies": [],
            "count": 0,
            "message": "이상이 감지되지 않았습니다",
        }
    except Exception as e:
        logger.error(f"이상 감지 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이상 감지 중 오류가 발생했습니다: {str(e)}")


@app.post("/predict/part-lifetime")
async def estimate_part_lifetime(request: PartLifetimeRequest):
    """
    부품 수명 예측 API
    """
    try:
        # 차량 정보 및 서비스 히스토리 조회
        if not request.service_history:
            service_history = await db_client.get_service_history(request.vehicle_id)
        else:
            service_history = request.service_history

        # 예측 수행
        lifetime_estimates = await model_service.estimate_part_lifetime(
            request.vehicle_id, request.telemetry_history, service_history
        )

        # 예측 결과 저장
        result_id = await db_client.save_prediction_result(
            request.vehicle_id, "part_lifetime", lifetime_estimates
        )

        # 예측 결과에 ID 추가
        lifetime_estimates["result_id"] = result_id

        return lifetime_estimates
    except Exception as e:
        logger.error(f"부품 수명 예측 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"부품 수명 예측 중 오류가 발생했습니다: {str(e)}")


@app.get("/vehicle/{vehicle_id}/info")
async def get_vehicle_info(vehicle_id: str):
    """
    차량 정보 조회 API
    """
    try:
        vehicle_info = await db_client.get_vehicle_info(vehicle_id)

        if not vehicle_info:
            raise HTTPException(status_code=404, detail=f"차량 정보를 찾을 수 없습니다: {vehicle_id}")

        return vehicle_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"차량 정보 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"차량 정보 조회 중 오류가 발생했습니다: {str(e)}")


# 애플리케이션 실행
if __name__ == "__main__":
    try:
        # 환경 변수에서 포트 가져오기, 기본값은 8001
        port = int(os.getenv("ML_SERVICE_PORT", settings.PORT))
        logger.info(f"ML 서비스 시작 중... (포트: {port})")

        # uvicorn 서버 설정
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=settings.DEBUG,
            log_level="info" if not settings.DEBUG else "debug",
        )
    except Exception as e:
        logger.error(f"ML 서비스 시작 중 오류 발생: {str(e)}")
        raise
