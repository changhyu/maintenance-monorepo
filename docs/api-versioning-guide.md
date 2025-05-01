# API 버전 관리 가이드

이 문서는 프로젝트의 API 버전 관리 전략에 대한 가이드입니다. API는 시간이 지남에 따라 변경될 수 있으며, 클라이언트와의 호환성을 유지하기 위해 적절한 버전 관리가 필요합니다.

## 버전 관리 원칙

1. **하위 호환성 유지**: 기존 API 버전은 가능한 한 하위 호환성을 유지합니다.
2. **URL 기반 버전 관리**: API 버전은 URL 경로에 포함되어 명시됩니다.
3. **쉬운 마이그레이션**: 새로운 버전으로의 전환이 쉽도록 설계합니다.
4. **리디렉션 지원**: 하위 호환성을 위해 이전 버전의 API 요청을 새 버전으로 리디렉션합니다.

## 버전 형식

API 버전은 다음과 같은 형식으로 URL에 포함됩니다:

```
/api/v{MAJOR}/endpoint
```

예시:
- `/api/v1/users` - API 버전 1의 사용자 엔드포인트
- `/api/v2/users` - API 버전 2의 사용자 엔드포인트

## 버전 업데이트 기준

1. **주 버전(Major Version)**: 호환성이 깨지는 변경사항이 있을 때
2. **부 버전(Minor Version)**: 하위 호환성을 유지하면서 새로운 기능을 추가할 때
3. **패치 버전(Patch Version)**: 버그 수정이나 성능 개선과 같은 작은 변경사항이 있을 때

주 버전만 URL에 포함되고, 부 버전과 패치 버전은 API 응답 헤더에 포함됩니다.

## 백엔드 구현

### FastAPI에서의 버전 관리

현재 우리 프로젝트는 FastAPI를 사용하며, URL 경로에 버전을 포함하여 관리합니다.

```python
# config.py
API_V1_STR = "/api/v1"

# main.py
app.include_router(users_router, prefix=settings.API_V1_STR)
```

### 리디렉션 지원

하위 호환성을 유지하기 위해 이전 버전의 API 요청을 새 버전으로 리디렉션합니다.

```python
# main.py
@app.get("/api/users{path:path}")
async def redirect_users(path: str, request: Request):
    return RedirectResponse(url=f"{settings.API_V1_STR}/users{path}")
```

## 프론트엔드 구현

### API 클라이언트

프론트엔드에서는 공통 API 클라이언트를 사용하여 버전 관리를 일관되게 처리합니다.

```typescript
// api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

export const getApiUrl = (path: string, includeVersion: boolean = true): string => {
  // 경로 앞에 슬래시가 없으면 추가
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 버전이 포함된 경로 생성
  if (includeVersion) {
    return `${API_BASE_URL}/api/${API_VERSION}${normalizedPath}`;
  }
  
  // 버전이 포함되지 않은 경로 생성
  return `${API_BASE_URL}/api${normalizedPath}`;
};
```

### 환경 변수 설정

`.env` 파일에 API 버전을 설정하여 쉽게 변경할 수 있도록 합니다.

```
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1
```

## 버전 이전(마이그레이션) 전략

새로운 API 버전으로 이전할 때 다음 단계를 따르세요:

1. **새 버전 개발**: 새로운 API 버전을 개발하고 테스트합니다.
2. **문서화**: 변경사항을 문서화하고 마이그레이션 가이드를 작성합니다.
3. **병행 운영**: 일정 기간 동안 이전 버전과 새 버전을 병행 운영합니다.
4. **클라이언트 업데이트**: 클라이언트 코드를 새 버전에 맞게 업데이트합니다.
5. **사용 중단 공지**: 이전 버전의 사용 중단 시점을 공지합니다.
6. **이전 버전 지원 종료**: 정해진 시점에 이전 버전에 대한 지원을 종료합니다.

## 버전별 기능 관리

각 버전별 특징과 변경사항을 관리하기 위해 다음과 같은 구조로 코드를 유지합니다:

```
/api
  /v1
    endpoints/
    models/
    services/
  /v2
    endpoints/
    models/
    services/
```

## API 응답 헤더

모든 API 응답에는 다음과 같은 헤더가 포함됩니다:

- `X-API-Version`: 현재 API 버전
- `X-API-Version-Date`: API 버전의 출시 날짜

```python
response.headers["X-API-Version"] = settings.API_VERSION
response.headers["X-API-Version-Date"] = settings.API_VERSION_DATE
```

## 버전 관리 모범 사례

1. **API 버전 번호는 변경하지 않습니다**: 이미 출시된 API 버전의 번호는 변경하지 않습니다.
2. **하위 호환성 유지**: 가능한 한 하위 호환성을 유지합니다.
3. **충분한 전환 기간 제공**: 새로운 버전으로 전환할 때 충분한 시간을 제공합니다.
4. **변경사항 문서화**: 모든 변경사항을 명확하게 문서화합니다.
5. **테스트 자동화**: 모든 API 버전에 대한 테스트를 자동화합니다.

## 지원되는 API 버전

현재 지원되는 API 버전은 다음과 같습니다:

| 버전 | 상태 | 출시일 | 지원 종료일 |
|------|------|--------|------------|
| v1   | 활성 | 2023-07-01 | 미정 |

## 참고 자료

- [REST API 버전 관리 모범 사례](https://restfulapi.net/versioning/)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
