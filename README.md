# Maintenance Monorepo

차량 정비 관리를 위한 통합 시스템입니다. FastAPI 기반의 백엔드 API와 Next.js 기반의 웹사이트로 구성되어 있습니다.

## 프로젝트 구조

```
maintenance-monorepo/
├── packages/              # 공유 패키지
│   ├── api/              # API 서버
│   └── core/             # 공통 코어 모듈
├── website/              # Next.js 웹사이트
├── backend/              # 백엔드 서비스
├── docs/                 # 문서
└── scripts/              # 유틸리티 스크립트
```

## 주요 기능

- 차량 관리
- 정비 기록 관리
- Git 저장소 연동
- 사용자 및 권한 관리

## 기술 스택

### 백엔드
- Python 3.8+
- FastAPI
- PostgreSQL
- Redis
- SQLAlchemy
- JWT

### 프론트엔드
- TypeScript
- Next.js
- React Context API
- Tailwind CSS

### 인프라
- Docker & Docker Compose
- GitHub Actions
- Prometheus & Grafana
- Nginx

## 설치 방법

### 사전 요구사항
- Python 3.8 이상
- Node.js 16 이상
- Docker 및 Docker Compose
- Git

### 개발 환경 설정

1. 저장소 복제:
```bash
git clone https://github.com/your-org/maintenance-monorepo.git
cd maintenance-monorepo
```

2. 환경 변수 설정:
```bash
cp .env.example .env
```

3. 의존성 설치:
```bash
# API 서버
cd packages/api
pip install -r requirements.txt

# 웹사이트
cd ../../website
npm install
```

4. 데이터베이스 설정:
```bash
cd ../packages/api
alembic upgrade head
```

5. 개발 서버 실행:
```bash
# API 서버
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 웹사이트
cd ../../website
npm run dev
```

### Docker로 실행

```bash
docker-compose up -d
```

## 테스트 실행

```bash
# Python 테스트
cd packages/api
pytest

# Node.js 테스트
cd ../../website
npm test
```

## 배포

자세한 배포 가이드는 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)를 참조하세요.

## 문서

- [아키텍처 문서](./docs/architecture.md)
- [배포 가이드](./docs/deployment.md)
- [개발 환경 설정 가이드](./docs/setup.md)
- [모니터링 가이드](./docs/monitoring.md)

## 라이선스

MIT License