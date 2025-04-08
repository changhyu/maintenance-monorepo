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
├── services/
│   └── convex/               # Convex 서비스
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

3. **Convex 서비스 구성**
   - 스키마 정의
   - 함수 구현

4. **배포 설정**
   - Docker 설정
   - CI/CD 파이프라인 구성

## 라이선스

MIT 