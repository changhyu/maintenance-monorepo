# API 서버 실행 안내

이 API 서버는 차량 관리 및 정비 일정 관리를 위한 서버입니다.

## 설치 및 실행 방법

1. 권한 부여:
```bash
chmod +x chmod_scripts.sh
./chmod_scripts.sh
```

2. 업데이트된 서버 실행:
```bash
./run_updated.sh
```

## 사용 가능한 스크립트

- `run_updated.sh`: 최신 기능이 모두 적용된 서버를 실행합니다.
- `fix_and_run.sh`: 문제를 해결하고 기본 서버를 실행합니다.
- `complete_fix.sh`: 모든 문제를 해결하고 기본 기능만 가진 서버를 실행합니다.

## API 엔드포인트

서버가 실행되면 다음 엔드포인트를 사용할 수 있습니다:

- `/health`: 서버 상태 확인
- `/api/auth/status`: 인증 서비스 상태 확인
- `/api/vehicles`: 차량 목록 조회
- `/api/maintenance`: 정비 기록 조회
- `/api/schedules`: 일정 목록 조회
- `/api/shops`: 정비소 목록 조회
- `/api/notifications`: 알림 목록 조회
- `/api/admin/status`: 관리자 서비스 상태 확인
- `/api/vehicle-inspections`: 법정검사 일정 조회

## 개발 환경

- Python 3.9+
- FastAPI
- SQLAlchemy
- Uvicorn

## 문제 해결

만약 서버 실행 중 오류가 발생하면 다음 명령으로 필요한 패키지를 설치하세요:

```bash
pip install msgpack pydantic-settings fastapi uvicorn sqlalchemy
```
