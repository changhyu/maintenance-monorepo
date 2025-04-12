# 차량 정비 관리 시스템 모노레포

차량 정비 기록 및 관리를 위한 통합 시스템입니다.

## 프로젝트 구조

```
maintenance-monorepo/
├── packages/
│   ├── api/                  # 백엔드 API 서비스
│   ├── frontend/             # React 프론트엔드
│   ├── database/             # 데이터베이스 모델 및 접근 레이어
│   ├── shared/               # 공유 타입 및 유틸리티
│   └── api-client/           # API 클라이언트
├── docs/                     # 프로젝트 문서
├── scripts/                  # 빌드 및 배포 스크립트
├── config/                   # 공통 설정
└── tests/                    # 통합 테스트
```

## 시작하기

### 필수 조건

- Node.js v16 이상
- pnpm v8 이상
- Python 3.8 이상 (API 서비스용)
- PostgreSQL 14 이상

### 설치 및 개발 환경 설정

1. 저장소 클론:
```bash
git clone <repository-url>
cd maintenance-monorepo
```

2. 의존성 설치:
```bash
pnpm install
```

3. 환경 변수 설정:
```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 환경 변수 설정
```

4. 개발 모드 실행:
```bash
pnpm dev
```

## 패키지 사용 방법

### API 서비스

```bash
cd packages/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m src.main
```

### 프론트엔드

```bash
cd packages/frontend
pnpm dev
```

## 리팩토링 진행 현황

### 완료된 작업

1. **모노레포 기본 구조 설정**
   - 디렉토리 구조 생성
   - 패키지별 기본 파일 설정

2. **API 패키지 리팩토링**
   - 코어 모듈 구현 (config, security, dependencies)
   - 모델 및 스키마 정의
   - 비즈니스 로직 모듈화 (차량 모듈)
   - API 라우터 구현 (인증, 차량)

3. **데이터베이스 패키지 구성**
   - Prisma 스키마 정의
   - 데이터베이스 모델 서비스 구현 (차량 모델)

### 진행 예정 작업

1. **프론트엔드 패키지 구현**
   - 컴포넌트 구조 개선
   - API 통합 서비스
   - 상태 관리 구현

2. **공유 패키지 구현**
   - 공통 타입 정의
   - 유틸리티 함수 구현

3. **배포 설정**
   - Docker 설정
   - CI/CD 파이프라인 구성

## 코드 개선 사항

최근 코드베이스 개선 작업이 완료되었습니다. 아래는 주요 개선 사항입니다:

### 구조적 개선
- 더미 클래스를 별도 파일로 분리하여 코드 중복 제거
- 예외 처리 강화 및 모듈화 개선
- 코드 중복 제거 및 함수 재사용성 증가

### 보안 강화
- 토큰 관리 기능 개선 (액세스 토큰 및 리프레시 토큰 분리)
- 환경 변수 검증 로직 추가
- 프로덕션 환경에서의 보안 설정 강화

### 로깅 및 디버깅
- 로깅 시스템 추가 및 강화
- 오류 추적 개선
- 디버깅 정보 확장

### 설정 관리
- 환경 변수 처리 기능 강화
- 기본값 설정 개선
- 설정 유효성 검증 추가

### 기타 개선
- API 응답 형식 표준화
- 코드 문서화 개선
- 서비스 클래스 기능 확장

### 코드 모듈 구성

#### 주요 모듈
- 모듈명: 기능 설명
- `packages/api/src/core`: 핵심 기능 및 설정
- `packages/api/src/modules`: 비즈니스 로직 모듈
- `packages/api/src/routers`: API 라우터
- `packages/api/src/models`: 데이터 모델 및 스키마

#### 주요 클래스
- `ShopService`: 정비소 관련 기능
- `MaintenanceService`: 정비 관련 기능
- `UserService`: 사용자 관리 기능

#### 주요 함수
- `verify_password`: 비밀번호 검증
- `create_access_token`: 액세스 토큰 생성
- `create_refresh_token`: 리프레시 토큰 생성
- `get_current_user`: 현재 인증된 사용자 조회
- `export_data`: 데이터 내보내기 기능

## 라이선스

MIT 

## 개발 환경 설정 가이드

이 문서는 프로젝트의 개발 환경을 설정하고 실행하는 방법을 설명합니다.

### 시스템 요구사항

- Node.js 16.0.0 이상
- Python 3.8 이상
- npm 9.6.0 이상

### 환경 설정

#### 1. 의존성 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 모든 패키지의 의존성을 설치합니다.

```bash
# 루트 디렉토리에서
npm install
```

#### 2. 환경 변수 설정

프론트엔드 환경 변수:

```
# packages/frontend/.env
VITE_API_URL=http://localhost:8000
VITE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

API 환경 변수:

```
# packages/api/.env
DATABASE_URL=sqlite:///app.db
SECRET_KEY=your_secret_key
ENVIRONMENT=development
```

#### 3. 가상 환경 및 데이터베이스 설정

API 패키지에서 Python 가상 환경을 설정하고 필요한 패키지를 설치합니다:

```bash
cd packages/api
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

### 실행 방법

#### 개발 서버 실행

##### 모든 패키지 동시에 실행

```bash
# 루트 디렉토리에서
npm run dev:all
```

##### 각 패키지 개별 실행

프론트엔드:

```bash
# 루트 디렉토리에서
npm run dev:frontend

# 또는 프론트엔드 패키지 디렉토리에서
cd packages/frontend
npm run dev
```

API 서버:

```bash
# 루트 디렉토리에서
npm run dev:api

# 또는 API 패키지 디렉토리에서
cd packages/api
./run.sh
```

### 빌드

```bash
# 루트 디렉토리에서 전체 빌드
npm run build

# 또는 개별 패키지 빌드
npm run build:frontend
npm run build:api
```

### 개발 포트

- 프론트엔드: http://localhost:3000
- API 서버: http://localhost:8000

## 트러블슈팅

### 실행 권한 오류
API 실행 스크립트에 실행 권한이 없는 경우 다음 명령어를 실행합니다:

```bash
chmod +x packages/api/run.sh
```

### API 서버 연결 오류
API 서버에 연결할 수 없는 경우 다음을 확인하세요:

1. `.env` 파일의 `VITE_API_URL` 값이 올바른지 확인
2. API 서버가 실행 중인지 확인
3. 네트워크 설정 확인

### Google Maps API 오류
지도 기능이 작동하지 않는 경우:

1. `.env` 파일에 유효한 Google Maps API 키가 설정되었는지 확인
2. Google Cloud Console에서 API 키가 활성화되어 있는지 확인 