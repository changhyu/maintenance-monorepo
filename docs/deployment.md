# 배포 가이드

이 문서는 Maintenance Monorepo 프로젝트의 배포 프로세스를 설명합니다.

## 1. 개요

프로젝트는 다음과 같은 환경으로 배포됩니다:

- **개발 환경**: 로컬 개발 서버
- **스테이징 환경**: Vercel Preview
- **프로덕션 환경**: Vercel Production

## 2. 배포 아키텍처

### 2.1 환경 구성

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  개발 환경      │     │  스테이징 환경  │     │  프로덕션 환경  │
│  (로컬)         │     │  (Vercel)       │     │  (Vercel)       │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2.2 서비스 구성

- **API 서버**: FastAPI 애플리케이션
- **웹사이트**: Next.js 애플리케이션
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **API 게이트웨이**: Nginx

## 3. CI/CD 파이프라인

### 3.1 GitHub Actions 워크플로우

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run tests
        run: pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Vercel CLI
        run: npm install -g vercel
      - name: Deploy to Vercel
        run: vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 4. 수동 배포 가이드

### 4.1 필수 조건

- Node.js 16 이상
- Python 3.8 이상
- Vercel CLI
- PostgreSQL
- Redis

### 4.2 환경 변수 설정

#### 4.2.1 API 서버

```env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
```

#### 4.2.2 웹사이트

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WEBSITE_URL=https://your-domain.com
```

### 4.3 배포 단계

#### 4.3.1 API 서버 배포

1. **의존성 설치**:
   ```bash
   cd packages/api
   pip install -r requirements.txt
   ```

2. **데이터베이스 마이그레이션**:
   ```bash
   alembic upgrade head
   ```

3. **Vercel 배포**:
   ```bash
   vercel deploy
   ```

#### 4.3.2 웹사이트 배포

1. **의존성 설치**:
   ```bash
   cd website
   npm install
   ```

2. **빌드**:
   ```bash
   npm run build
   ```

3. **Vercel 배포**:
   ```bash
   vercel deploy
   ```

## 5. 롤백 절차

### 5.1 자동 롤백

- Vercel의 자동 롤백 기능 활용
- 배포 실패 시 이전 버전으로 자동 복구

### 5.2 수동 롤백

1. **이전 버전 확인**:
   ```bash
   vercel deployments list
   ```

2. **롤백 실행**:
   ```bash
   vercel rollback <deployment-id>
   ```

## 6. 모니터링 및 유지보수

### 6.1 로깅

- **API 서버 로그**:
  ```bash
  vercel logs api
  ```

- **웹사이트 로그**:
  ```bash
  vercel logs website
  ```

### 6.2 성능 모니터링

- Vercel 대시보드에서 성능 메트릭 확인
- API 응답 시간 모니터링
- 웹사이트 로딩 시간 모니터링

### 6.3 정기 유지보수

1. **의존성 업데이트**:
   ```bash
   # Python
   pip install -U -r requirements.txt

   # Node.js
   npm update
   ```

2. **데이터베이스 백업**:
   ```bash
   pg_dump -U user -d dbname > backup.sql
   ```

3. **캐시 정리**:
   ```bash
   redis-cli FLUSHALL
   ```

## 7. 문제 해결

### 7.1 일반적인 문제

1. **빌드 실패**:
   - 의존성 충돌 확인
   - 환경 변수 설정 확인
   - 빌드 캐시 정리

2. **배포 실패**:
   - 로그 확인
   - 롤백 실행
   - 이전 버전으로 복구

### 7.2 디버깅 도구

- **Vercel CLI**:
  ```bash
  vercel logs
  vercel inspect
  ```

- **API 테스트**:
  ```bash
  curl -v https://api.your-domain.com/health
  ```

## 8. 보안 고려사항

### 8.1 환경 변수 보안

- 민감한 정보는 환경 변수로 관리
- API 키 및 비밀번호 보호
- 접근 권한 제한

### 8.2 네트워크 보안

- HTTPS 강제
- CORS 설정
- 방화벽 규칙 설정

## 9. 참고 자료

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
