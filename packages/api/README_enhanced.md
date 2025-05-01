# 차량 관리 API 서버

이 API 서버는 차량 관리 및 정비 일정 관리를 위한 서버입니다.

## 🚀 기능

- 사용자 인증 및 관리
- 차량 정보 관리
- 법정검사 일정 관리
- 정비 기록 관리
- 정비소 정보 관리

## 📋 요구사항

- Python 3.9 이상
- pip (패키지 관리자)

## 🔧 설치 및 실행 방법

1. 저장소 클론
```bash
git clone https://github.com/your-repo/maintenance-monorepo.git
cd maintenance-monorepo/packages/api
```

2. 권한 부여
```bash
chmod +x chmod_scripts.sh
./chmod_scripts.sh
```

3. 향상된 서버 실행
```bash
./run_enhanced.sh
```

## 🔑 사용 가능한 스크립트

- `run_enhanced.sh`: 모든 기능(인증, 차량 관리 등)이 포함된 향상된 서버를 실행합니다.
- `run_updated.sh`: 기본 라우터와 모델이 구현된 버전을 실행합니다.
- `fix_and_run.sh`: 문제를 해결하고 기본 서버를 실행합니다.
- `complete_fix.sh`: 모든 문제를 해결하고 기본 기능만 가진 서버를 실행합니다.

## 📚 API 문서

서버가 실행되면 다음 주소에서 API 문서를 확인할 수 있습니다:

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## 🔍 주요 API 엔드포인트

### 인증 API
- `POST /api/auth/register`: 신규 사용자 등록
- `POST /api/auth/login`: 로그인 및 토큰 발급
- `POST /api/auth/token`: OAuth2 호환 토큰 발급
- `POST /api/auth/refresh`: 리프레시 토큰으로 액세스 토큰 갱신
- `GET /api/auth/status`: 인증 서비스 상태 확인

### 차량 API
- `GET /api/vehicles`: 차량 목록 조회
- `POST /api/vehicles`: 신규 차량 등록
- `GET /api/vehicles/{id}`: 특정 차량 조회
- `PUT /api/vehicles/{id}`: 차량 정보 업데이트
- `DELETE /api/vehicles/{id}`: 차량 삭제

### 법정검사 API
- `GET /api/vehicle-inspections`: 법정검사 목록 조회
- `GET /api/vehicle-inspections/upcoming`: 다가오는 법정검사 조회
- `POST /api/vehicle-inspections`: 법정검사 등록
- `GET /api/vehicle-inspections/{id}`: 특정 법정검사 조회
- `PUT /api/vehicle-inspections/{id}`: 법정검사 업데이트
- `DELETE /api/vehicle-inspections/{id}`: 법정검사 삭제

## 🔒 인증 방식

JWT(JSON Web Token) 기반 인증을 사용합니다:

1. `POST /api/auth/login`에 사용자 인증 정보를 전송하여 토큰 발급
2. 발급받은 토큰을 요청 헤더에 포함하여 API 호출:
```
Authorization: Bearer {access_token}
```
3. 토큰 만료 시 리프레시 토큰으로 새 토큰 발급

## 💻 개발 환경

- Python 3.9+
- FastAPI
- SQLAlchemy (ORM)
- Uvicorn (ASGI 서버)
- JWT 인증

## 🔐 환경 변수

실제 서비스 배포 시 다음 환경 변수를 설정해야 합니다:

- `SECRET_KEY`: JWT 서명에 사용할 비밀키
- `DATABASE_URL`: 데이터베이스 연결 문자열

## 📝 문제 해결

만약 서버 실행 중 오류가 발생하면 다음 명령으로 필요한 패키지를 설치하세요:

```bash
pip install msgpack pydantic-settings pydantic[email] fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart
```

데이터베이스 관련 오류가 발생하면:

```bash
cd src
python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
```
