# 시스템 아키텍처

이 문서는 Maintenance Monorepo 프로젝트의 시스템 아키텍처를 설명합니다.

## 1. 개요

프로젝트는 다음과 같은 주요 컴포넌트로 구성됩니다:

- **API 서버**: FastAPI 기반 백엔드 서버
- **웹사이트**: Next.js 기반 프론트엔드
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **API 게이트웨이**: Nginx

## 2. 시스템 아키텍처

### 2.1 논리적 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  웹사이트       │────▶│  API 게이트웨이  │────▶│  API 서버       │
│  (Next.js)      │     │  (Nginx)        │     │  (FastAPI)      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  모니터링       │     │  캐시           │     │  데이터베이스   │
│  (Prometheus)   │     │  (Redis)        │     │  (PostgreSQL)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2.2 컴포넌트 구조

#### 2.2.1 API 서버

```
packages/api/
├── main.py              # FastAPI 애플리케이션 진입점
├── routers/             # API 라우터
│   ├── auth.py          # 인증 관련 엔드포인트
│   ├── vehicles.py      # 차량 관리 엔드포인트
│   └── maintenance.py   # 정비 기록 엔드포인트
├── models/              # 데이터베이스 모델
│   ├── user.py          # 사용자 모델
│   ├── vehicle.py       # 차량 모델
│   └── maintenance.py   # 정비 기록 모델
├── schemas/             # Pydantic 스키마
│   ├── user.py          # 사용자 스키마
│   ├── vehicle.py       # 차량 스키마
│   └── maintenance.py   # 정비 기록 스키마
└── services/            # 비즈니스 로직
    ├── auth.py          # 인증 서비스
    ├── vehicle.py       # 차량 서비스
    └── maintenance.py   # 정비 기록 서비스
```

#### 2.2.2 웹사이트

```
website/
├── app/                 # Next.js 앱 디렉토리
│   ├── api/             # API 라우트
│   ├── components/      # React 컴포넌트
│   ├── hooks/           # 커스텀 훅
│   ├── lib/             # 유틸리티 함수
│   ├── pages/           # 페이지 컴포넌트
│   └── styles/          # 스타일시트
├── public/              # 정적 파일
└── tests/               # 테스트 파일
```

## 3. 데이터 아키텍처

### 3.1 데이터베이스 스키마

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   User      │     │   Vehicle   │     │ Maintenance │
│             │     │             │     │             │
└─────┬───────┘     └──────┬──────┘     └──────┬──────┘
      │                    │                    │
      │                    │                    │
      ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   Role      │     │   Model     │     │   Part      │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 3.2 데이터 흐름

1. **사용자 인증**
   - 웹사이트 → API 게이트웨이 → API 서버 → 데이터베이스
   - JWT 토큰 발급 및 검증

2. **차량 관리**
   - 웹사이트 → API 게이트웨이 → API 서버 → 데이터베이스
   - Redis 캐시 활용

3. **정비 기록**
   - 웹사이트 → API 게이트웨이 → API 서버 → 데이터베이스
   - 비동기 처리 및 캐싱

## 4. 배포 아키텍처

### 4.1 환경 구성

- **개발 환경**: 로컬 개발 서버
- **스테이징 환경**: Vercel Preview
- **프로덕션 환경**: Vercel Production

### 4.2 CI/CD 파이프라인

1. **코드 품질 검사**
   - ESLint, Prettier
   - TypeScript 타입 체크
   - Python 린팅

2. **테스트**
   - 단위 테스트
   - 통합 테스트
   - E2E 테스트

3. **빌드 및 배포**
   - Next.js 빌드
   - FastAPI 배포
   - 데이터베이스 마이그레이션

## 5. 보안 아키텍처

### 5.1 인증 및 권한

- JWT 기반 인증
- RBAC(Role-Based Access Control)
- API 키 관리

### 5.2 데이터 보안

- 데이터 암호화
- SQL 인젝션 방지
- XSS 방지
- CSRF 보호

## 6. 모니터링 아키텍처

### 6.1 메트릭 수집

- Prometheus 메트릭
- Grafana 대시보드
- 로그 수집

### 6.2 알림 시스템

- Slack 알림
- 이메일 알림
- SMS 알림

## 7. 기술 스택

### 7.1 백엔드

- **프레임워크**: FastAPI
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **ORM**: SQLAlchemy
- **인증**: JWT

### 7.2 프론트엔드

- **프레임워크**: Next.js
- **상태 관리**: React Context API
- **스타일링**: Tailwind CSS
- **테스트**: Jest, React Testing Library

### 7.3 인프라

- **호스팅**: Vercel
- **CI/CD**: GitHub Actions
- **모니터링**: Prometheus, Grafana
- **로깅**: ELK Stack

## 8. 참고 자료

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [Next.js 문서](https://nextjs.org/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [Redis 문서](https://redis.io/documentation)
