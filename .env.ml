# 머신러닝 서비스 기본 설정
DEBUG=true
ML_SERVICE_PORT=8001
PYTHONUNBUFFERED=1

# 데이터베이스 연결 설정
DATABASE_URL=postgresql://postgres:postgres@db:5432/maintenance

# 모델 경로 설정
MODEL_DIR=/app/models
LOG_DIR=/app/logs

# 모델 설정
DEFAULT_MAINTENANCE_MODEL=maintenance_predictor_v1
DEFAULT_ANOMALY_MODEL=anomaly_detector_v1
DEFAULT_PART_LIFETIME_MODEL=part_lifetime_v1

# 텔레메트리 데이터 처리 설정
MAX_HISTORY_LENGTH=1000
PREDICTION_CONFIDENCE_THRESHOLD=0.7

# 레디스 캐시 설정
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# MLflow 설정 (선택적)
MLFLOW_TRACKING_URI=http://mlflow:5000
EXPERIMENT_NAME=vehicle_maintenance