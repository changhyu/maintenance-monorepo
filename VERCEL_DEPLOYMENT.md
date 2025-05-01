# Vercel 배포 가이드

이 문서는 Maintenance Monorepo 프로젝트의 Vercel 배포 프로세스를 설명합니다.

## 1. 개요

프로젝트는 다음과 같은 서비스로 구성됩니다:

- **API 서버**: FastAPI 기반 백엔드 서버
- **웹사이트**: Next.js 기반 프론트엔드

## 2. 환경 변수 설정

### 2.1 API 서버 환경 변수

```env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
```

### 2.2 웹사이트 환경 변수

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WEBSITE_URL=https://your-domain.com
```

## 3. 배포 프로세스

### 3.1 API 서버 배포

1. **프로젝트 설정**:
   ```bash
   # vercel.json
   {
     "version": 2,
     "builds": [
       {
         "src": "packages/api/main.py",
         "use": "@vercel/python"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "packages/api/main.py"
       }
     ]
   }
   ```

2. **배포 명령어**:
   ```bash
   vercel deploy packages/api
   ```

### 3.2 웹사이트 배포

1. **프로젝트 설정**:
   ```bash
   # vercel.json
   {
     "version": 2,
     "builds": [
       {
         "src": "website/package.json",
         "use": "@vercel/next"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "website/$1"
       }
     ]
   }
   ```

2. **배포 명령어**:
   ```bash
   vercel deploy website
   ```

## 4. 배포 후 확인사항

### 4.1 API 서버 확인

1. **상태 확인**:
   ```bash
   curl https://api.your-domain.com/health
   ```

2. **로그 확인**:
   ```bash
   vercel logs api
   ```

### 4.2 웹사이트 확인

1. **빌드 로그 확인**:
   ```bash
   vercel logs website
   ```

2. **성능 모니터링**:
   - Vercel 대시보드에서 성능 메트릭 확인
   - Lighthouse 점수 확인

## 5. 문제 해결

### 5.1 일반적인 문제

1. **빌드 실패**:
   - 의존성 충돌 확인
   - 환경 변수 설정 확인
   - 빌드 캐시 정리

2. **배포 실패**:
   - 로그 확인
   - 롤백 실행
   - 이전 버전으로 복구

### 5.2 디버깅 도구

- **Vercel CLI**:
  ```bash
  vercel logs
  vercel inspect
  ```

- **API 테스트**:
  ```bash
  curl -v https://api.your-domain.com/health
  ```

## 6. 모니터링

### 6.1 성능 모니터링

- Vercel 대시보드에서 성능 메트릭 확인
- API 응답 시간 모니터링
- 웹사이트 로딩 시간 모니터링

### 6.2 오류 모니터링

- Vercel 로그 확인
- 에러 알림 설정
- 성능 저하 감지

## 7. 보안 고려사항

### 7.1 환경 변수 보안

- 민감한 정보는 환경 변수로 관리
- API 키 및 비밀번호 보호
- 접근 권한 제한

### 7.2 네트워크 보안

- HTTPS 강제
- CORS 설정
- 방화벽 규칙 설정

## 8. 참고 자료

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)